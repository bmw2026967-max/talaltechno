import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { reportSandbox, verifyChain } from '@talaltechno/domain';
import { ZATCA_WARNING, assertSandboxOnly, complianceChecklist, runtimeConfig } from '@talaltechno/zatca-engine';
import type { AuthUser } from '../common/types/auth-user';
import type { ReportZatcaDto } from './dto/zatca.dto';

const num = (value: unknown) => Number(value || 0);

@Injectable()
export class ZatcaService {
  constructor(private readonly prisma: PrismaService) {}

  private mapZatca(row: any) {
    return {
      id: row.id,
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoice?.number || '',
      customerName: row.invoice?.customerName || '',
      total: num(row.invoice?.total),
      type: row.type,
      uuid: row.uuid,
      invoiceHash: row.invoiceHash,
      previousHash: row.previousHash,
      qr: row.qr,
      signature: row.signature,
      status: row.status,
      environment: row.environment,
      warning: row.warning || ZATCA_WARNING,
      issuedAt: row.issuedAt.toISOString(),
      reportedAt: row.reportedAt ? row.reportedAt.toISOString() : null,
      retries: row.retries
    };
  }

  async status(tenantId: string) {
    assertSandboxOnly(process.env.ZATCA_ENVIRONMENT);
    const [reported, cleared, pending, rejected, last] = await Promise.all([
      this.prisma.zatcaInvoice.count({ where: { tenantId, status: 'REPORTED' } }),
      this.prisma.zatcaInvoice.count({ where: { tenantId, status: 'CLEARED' } }),
      this.prisma.zatcaInvoice.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.zatcaInvoice.count({ where: { tenantId, status: 'REJECTED' } }),
      this.prisma.zatcaInvoice.findFirst({ where: { tenantId }, orderBy: { issuedAt: 'desc' } })
    ]);

    return {
      data: {
        environment: 'sandbox',
        certified: false,
        warning: ZATCA_WARNING,
        counts: { reported, cleared, pending, rejected, total: reported + cleared + pending + rejected },
        lastHash: last?.invoiceHash || '0'.repeat(64),
        runtime: runtimeConfig(),
        checklist: complianceChecklist()
      }
    };
  }

  async invoices(tenantId: string, page = 1, pageSize = 50) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(200, Math.max(1, pageSize));
    const [rows, total] = await Promise.all([
      this.prisma.zatcaInvoice.findMany({
        where: { tenantId },
        include: { invoice: true },
        orderBy: { issuedAt: 'desc' },
        skip: (safePage - 1) * safeSize,
        take: safeSize
      }),
      this.prisma.zatcaInvoice.count({ where: { tenantId } })
    ]);
    return {
      data: rows.map((row) => this.mapZatca(row)),
      meta: { page: safePage, pageSize: safeSize, total, pages: Math.ceil(total / safeSize) }
    };
  }

  async invoice(tenantId: string, id: string) {
    const row = await this.prisma.zatcaInvoice.findFirst({
      where: { id, tenantId },
      include: { invoice: { include: { items: true } } }
    });
    if (!row) throw new NotFoundException('سجل ZATCA غير موجود.');
    return {
      data: {
        ...this.mapZatca(row),
        xml: row.xml,
        items: (row.invoice?.items || []).map((item: any) => ({
          name: item.name,
          qty: num(item.qty),
          price: num(item.price),
          taxAmount: num(item.taxAmount),
          total: num(item.total)
        }))
      }
    };
  }

  async verify(tenantId: string) {
    const rows = await this.prisma.zatcaInvoice.findMany({
      where: { tenantId },
      include: { invoice: true },
      orderBy: { issuedAt: 'asc' }
    });
    const domainInvoices = rows.map((row) => ({
      id: row.invoiceId,
      number: row.invoice?.number || row.uuid,
      createdAt: row.invoice?.createdAt?.toISOString() || row.issuedAt.toISOString(),
      zatca: {
        invoiceHash: row.invoiceHash,
        previousHash: row.previousHash,
        qr: row.qr,
        signature: row.signature,
        issuedAt: row.issuedAt.toISOString(),
        hashInput: null
      }
    }));
    const result = verifyChain(domainInvoices as any);
    return {
      data: {
        valid: result.valid,
        checked: result.checked,
        broken: result.broken,
        tampered: result.tampered,
        lastHash: result.lastHash,
        environment: 'sandbox',
        note: 'تحقق سلسلة التجزئة Sandbox — لا يمثل اعتماداً من هيئة الزكاة والضريبة والجمارك.'
      }
    };
  }

  async report(user: AuthUser, id: string, status: ReportZatcaDto['status']) {
    const row = await this.prisma.zatcaInvoice.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { invoice: true }
    });
    if (!row) throw new NotFoundException('سجل ZATCA غير موجود.');

    const next = reportSandbox(
      {
        uuid: row.uuid,
        type: row.type as 'standard' | 'simplified',
        invoiceHash: row.invoiceHash,
        previousHash: row.previousHash,
        qr: row.qr,
        signature: row.signature,
        status: row.status,
        environment: 'sandbox',
        warning: row.warning || ZATCA_WARNING
      },
      status
    );

    const updated = await this.prisma.zatcaInvoice.update({
      where: { id },
      data: {
        status: status as any,
        reportedAt: next.reportedAt ? new Date(next.reportedAt) : null,
        warning: next.warning,
        retries: { increment: 1 }
      },
      include: { invoice: true }
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'تحديث حالة ZATCA Sandbox',
        entity: 'zatca',
        entityId: id,
        details: `${row.invoice?.number || row.uuid} → ${status}`
      }
    });

    return { data: this.mapZatca(updated) };
  }
}
