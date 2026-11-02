import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertBalanced, incomeStatement as buildIncomeStatement, round2, trialBalance as buildTrialBalance } from '@talaltechno/domain';
import type { AuthUser } from '../common/types/auth-user';
import type { CreateExpenseDto, CreateJournalDto } from './dto/accounting.dto';

const num = (value: unknown) => Number(value || 0);
const dateOnly = (value: string | Date) => new Date(new Date(value).toISOString().slice(0, 10));

const EXPENSE_ACCOUNTS: Array<[RegExp, string]> = [
  [/راتب|رواتب|أجر|اجور|أجور/, '5102'],
  [/إيجار|ايجار/, '5103'],
  [/كهرب|مياه|مرافق|غاز/, '5104'],
  [/تسويق|إعلان|اعلان/, '5105'],
  [/صيانة|إصلاح|اصلاح/, '5106'],
  [/بنك|رسوم/, '5107'],
  [/هالك|فاقد/, '5108'],
  [/ضيافة/, '5110'],
  [/اتصال|جوال|إنترنت|انترنت/, '5111'],
  [/توصيل|شحن/, '5112'],
  [/مشتريات|مستلزمات|تنظيف|متنوعة|أخرى|اخرى/, '5109']
];

const expenseAccount = (category: string) => {
  const match = EXPENSE_ACCOUNTS.find(([pattern]) => pattern.test(category));
  return match ? match[1] : '5109';
};

const METHOD_ENUM: Record<string, string> = {
  cash: 'CASH',
  mada: 'MADA',
  applepay: 'APPLE_PAY',
  stcpay: 'STC_PAY',
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  card: 'CARD',
  bank: 'BANK',
  credit: 'CREDIT',
  wallet: 'WALLET'
};

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    if (!from && !to) return undefined;
    return {
      ...(from ? { gte: dateOnly(from) } : {}),
      ...(to ? { lte: dateOnly(to) } : {})
    };
  }

  async accounts(tenantId: string) {
    const rows = await this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' }
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        type: String(row.type).toLowerCase(),
        active: row.active
      }))
    };
  }

  private mapEntry(row: any) {
    return {
      id: row.id,
      number: row.number,
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
      createdAt: row.createdAt.toISOString(),
      description: row.description,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      sourceNumber: row.sourceNumber,
      posted: row.posted,
      totalDebit: num(row.totalDebit),
      totalCredit: num(row.totalCredit),
      balanced: Math.abs(num(row.totalDebit) - num(row.totalCredit)) < 0.01,
      lines: (row.lines || []).map((line: any) => ({
        id: line.id,
        accountId: line.accountId,
        accountCode: line.account?.code || '',
        accountName: line.account?.name || '',
        debit: num(line.debit),
        credit: num(line.credit),
        memo: line.memo || ''
      }))
    };
  }

  private domainEntries(rows: any[]) {
    return rows.map((row) => {
      const lines = (row.lines || []).map((line: any) => ({
        accountId: line.account?.code || line.accountId,
        accountCode: line.account?.code || '',
        accountName: line.account?.name || '',
        debit: num(line.debit),
        credit: num(line.credit),
        memo: line.memo || ''
      }));
      const totalDebit = round2(lines.reduce((sum: number, line: any) => sum + line.debit, 0));
      const totalCredit = round2(lines.reduce((sum: number, line: any) => sum + line.credit, 0));
      return {
        id: row.id,
        number: row.number,
        date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
        createdAt: row.createdAt.toISOString(),
        description: row.description,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        sourceNumber: row.sourceNumber,
        posted: row.posted,
        totalDebit,
        totalCredit,
        balanced: Math.abs(totalDebit - totalCredit) < 0.005,
        lines
      };
    });
  }

  async journal(tenantId: string, query: { from?: string; to?: string; page: number; pageSize: number }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize || 50));
    const where = {
      tenantId,
      ...(this.range(query.from, query.to) ? { date: this.range(query.from, query.to) } : {})
    };
    const [rows, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: { lines: { include: { account: true } } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.journalEntry.count({ where })
    ]);
    return {
      data: rows.map((row) => this.mapEntry(row)),
      meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) }
    };
  }

  async entry(tenantId: string, id: string) {
    const row = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { account: true } } }
    });
    if (!row) throw new NotFoundException('القيد المحاسبي غير موجود.');
    return { data: this.mapEntry(row) };
  }

  async createJournal(user: AuthUser, dto: CreateJournalDto) {
    const debit = round2(dto.lines.reduce((total, line) => total + (Number(line.debit) || 0), 0));
    const credit = round2(dto.lines.reduce((total, line) => total + (Number(line.credit) || 0), 0));
    if (Math.abs(debit - credit) > 0.01) {
      throw new BadRequestException(`القيد غير متوازن: مدين ${debit.toFixed(2)} ≠ دائن ${credit.toFixed(2)}.`);
    }
    if (debit <= 0) throw new BadRequestException('قيمة القيد يجب أن تكون أكبر من صفر.');

    const accounts = await this.prisma.account.findMany({
      where: { tenantId: user.tenantId, id: { in: dto.lines.map((line) => line.accountId) } }
    });
    const accountIds = new Set(accounts.map((account) => account.id));
    for (const line of dto.lines) {
      if (!accountIds.has(line.accountId)) throw new NotFoundException(`الحساب ${line.accountId} غير موجود.`);
      if (Number(line.debit) > 0 && Number(line.credit) > 0) {
        throw new BadRequestException('لا يمكن أن يكون الحساب مديناً ودائناً في نفس السطر.');
      }
    }

    assertBalanced({ lines: dto.lines.map((line) => ({ debit: line.debit, credit: line.credit })) } as any);

    const row = await this.prisma.journalEntry.create({
      data: {
        tenantId: user.tenantId,
        number: `JE-MAN-${Date.now()}`,
        date: dateOnly(dto.date || new Date()),
        description: dto.description,
        sourceType: 'manual',
        sourceNumber: 'قيد يدوي',
        totalDebit: debit,
        totalCredit: credit,
        createdById: user.sub,
        lines: {
          create: dto.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo || dto.description
          }))
        }
      },
      include: { lines: { include: { account: true } } }
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'قيد محاسبي يدوي',
        entity: 'journal',
        entityId: row.id,
        details: `${dto.description} — ${debit.toFixed(2)} SAR`
      }
    });

    return { data: this.mapEntry(row) };
  }

  private async entriesInRange(tenantId: string, from?: string, to?: string) {
    return this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        ...(this.range(from, to) ? { date: this.range(from, to) } : {})
      },
      include: { lines: { include: { account: true } } },
      orderBy: { date: 'asc' }
    });
  }

  async trialBalance(tenantId: string, query: { from?: string; to?: string }) {
    const rows = await this.entriesInRange(tenantId, query.from, query.to);
    const report = buildTrialBalance(this.domainEntries(rows));
    const accounts = await this.prisma.account.findMany({ where: { tenantId } });
    const names = new Map(accounts.map((account) => [account.code, account.name]));
    return {
      data: {
        ...report,
        rows: report.rows.map((row) => ({ ...row, accountName: names.get(row.accountId) || row.accountName }))
      }
    };
  }

  async incomeStatement(tenantId: string, query: { from?: string; to?: string }) {
    const rows = await this.entriesInRange(tenantId, query.from, query.to);
    const report = buildIncomeStatement(this.domainEntries(rows));
    const expenses = await this.prisma.expense.aggregate({
      where: {
        tenantId,
        ...(this.range(query.from, query.to) ? { date: this.range(query.from, query.to) } : {})
      },
      _sum: { amount: true }
    });
    return {
      data: {
        ...report,
        operatingExpenses: num(expenses._sum.amount),
        netProfit: round2(report.grossProfit - num(expenses._sum.amount)),
        note: 'تقرير Sandbox تجريبي — يعتمد على القيود المسجلة.'
      }
    };
  }

  async balanceSheet(tenantId: string, query: { to?: string }) {
    const trial = await this.trialBalance(tenantId, { to: query.to });
    const accounts = await this.prisma.account.findMany({ where: { tenantId } });
    const byCode = new Map(accounts.map((account) => [account.code, account]));
    const totals = { assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0 };
    const lines = trial.data.rows.map((row) => {
      const account = byCode.get(row.accountId);
      const type = account ? String(account.type) : 'ASSET';
      const balance = round2(row.debit - row.credit);
      if (type === 'ASSET') totals.assets = round2(totals.assets + balance);
      if (type === 'LIABILITY') totals.liabilities = round2(totals.liabilities + (row.credit - row.debit));
      if (type === 'EQUITY') totals.equity = round2(totals.equity + (row.credit - row.debit));
      if (type === 'REVENUE') totals.revenue = round2(totals.revenue + (row.credit - row.debit));
      if (type === 'EXPENSE') totals.expenses = round2(totals.expenses + balance);
      return { ...row, type: type.toLowerCase(), balance };
    });
    const profit = round2(totals.revenue - totals.expenses);
    return {
      data: {
        asOf: query.to || new Date().toISOString().slice(0, 10),
        assets: totals.assets,
        liabilities: totals.liabilities,
        equity: round2(totals.equity + profit),
        profit,
        balanced: Math.abs(totals.assets - (totals.liabilities + totals.equity + profit)) < 0.05,
        lines
      }
    };
  }

  async expenses(tenantId: string, query: { from?: string; to?: string }) {
    const rows = await this.prisma.expense.findMany({
      where: {
        tenantId,
        ...(this.range(query.from, query.to) ? { date: this.range(query.from, query.to) } : {})
      },
      include: { branch: true, createdBy: true },
      orderBy: { date: 'desc' },
      take: 200
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        category: row.category,
        amount: num(row.amount),
        method: String(row.method).toLowerCase(),
        notes: row.notes,
        date: row.date.toISOString().slice(0, 10),
        branchName: row.branch?.name || '',
        createdByName: row.createdBy?.name || '',
        shiftId: row.shiftId
      })),
      meta: { total: round2(rows.reduce((total, row) => total + num(row.amount), 0)) }
    };
  }

  async createExpense(user: AuthUser, dto: CreateExpenseDto) {
    const branch = user.branchId
      ? await this.prisma.branch.findFirst({ where: { id: user.branchId, tenantId: user.tenantId } })
      : await this.prisma.branch.findFirst({ where: { tenantId: user.tenantId } });
    if (!branch) throw new BadRequestException('لا يوجد فرع مهيّأ.');

    const accounts = await this.prisma.account.findMany({ where: { tenantId: user.tenantId } });
    const byCode = new Map(accounts.map((account) => [account.code, account.id]));
    const expenseCode = expenseAccount(dto.category);
    const creditCode = (dto.method || 'cash') === 'cash' ? '1101' : '1102';
    if (!byCode.has(expenseCode) || !byCode.has(creditCode)) {
      throw new BadRequestException('شجرة الحسابات غير مكتملة. أعد تشغيل بيانات التهيئة.');
    }

    const amount = round2(dto.amount);
    const date = dateOnly(dto.date || new Date());
    const row = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          tenantId: user.tenantId,
          branchId: branch.id,
          shiftId: dto.shiftId || null,
          category: dto.category,
          amount,
          method: METHOD_ENUM[dto.method || 'cash'] as any || 'CASH',
          notes: dto.notes || null,
          date,
          createdById: user.sub
        }
      });
      await tx.journalEntry.create({
        data: {
          tenantId: user.tenantId,
          number: `JE-EXP-${Date.now()}`,
          date,
          description: `مصروف — ${dto.category}`,
          sourceType: 'expense',
          sourceId: expense.id,
          sourceNumber: `EXP-${expense.id.slice(-6)}`,
          totalDebit: amount,
          totalCredit: amount,
          createdById: user.sub,
          lines: {
            create: [
              { accountId: byCode.get(expenseCode)!, debit: amount, credit: 0, memo: dto.category },
              { accountId: byCode.get(creditCode)!, debit: 0, credit: amount, memo: dto.method || 'cash' }
            ]
          }
        }
      });
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          action: 'تسجيل مصروف',
          entity: 'expense',
          entityId: expense.id,
          details: `${dto.category} — ${amount.toFixed(2)} SAR`
        }
      });
      return expense;
    });

    return {
      data: {
        id: row.id,
        category: row.category,
        amount: num(row.amount),
        method: String(row.method).toLowerCase(),
        date: row.date.toISOString().slice(0, 10),
        accountCode: expenseCode
      }
    };
  }
}
