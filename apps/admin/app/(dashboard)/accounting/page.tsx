'use client';

import * as React from 'react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { StatCard } from '@/components/stat-card';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import {
  demoAccounts,
  demoBalanceSheet,
  demoExpenses,
  demoIncomeStatement,
  demoJournal,
  demoTrialBalance
} from '@/lib/demo';
import { apiPost, getToken } from '@/lib/api';
import { formatSAR } from '@/lib/utils';

type JournalLine = {
  id?: string;
  accountId?: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
};

type JournalEntry = {
  id: string;
  number: string;
  date: string;
  description: string;
  sourceType: string;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  lines: JournalLine[];
};

type JournalResponse = { data: JournalEntry[]; meta?: { total?: number } };
type TrialResponse = { data: { rows: Array<{ accountId: string; accountCode: string; accountName: string; debit: number; credit: number; balance: number }>; totalDebit: number; totalCredit: number; balanced: boolean } };
type IncomeResponse = { data: { revenue: number; returns: number; discounts: number; otherIncome: number; netSales: number; cogs: number; grossProfit: number; operatingExpenses: number; netProfit: number; note?: string } };
type BalanceResponse = { data: { asOf: string; assets: number; liabilities: number; equity: number; profit: number; balanced: boolean; lines: Array<{ accountCode: string; accountName: string; type: string; balance: number }> } };
type ExpenseResponse = { data: Array<{ id: string; category: string; amount: number; method: string; notes: string; date: string; branchName: string; createdByName: string }>; meta?: { total?: number } };
type Account = { id: string; code: string; name: string; type: string };
type AccountsResponse = { data: Account[] };

const methodLabels: Record<string, string> = {
  cash: 'نقدي',
  bank: 'بنكي',
  mada: 'مدى',
  card: 'شبكة',
  credit: 'آجل'
};

export default function AccountingPage() {
  const journalApi = useApi<JournalResponse>('/accounting/journal?pageSize=50', demoJournal as unknown as JournalResponse);
  const trialApi = useApi<TrialResponse>('/accounting/trial-balance', demoTrialBalance as unknown as TrialResponse);
  const incomeApi = useApi<IncomeResponse>('/accounting/income-statement', demoIncomeStatement as unknown as IncomeResponse);
  const balanceApi = useApi<BalanceResponse>('/accounting/balance-sheet', demoBalanceSheet as unknown as BalanceResponse);
  const expensesApi = useApi<ExpenseResponse>('/accounting/expenses', demoExpenses as unknown as ExpenseResponse);
  const accountsApi = useApi<AccountsResponse>('/accounting/accounts', demoAccounts as unknown as AccountsResponse);
  const { toast } = useToast();

  const [tab, setTab] = useState<'journal' | 'trial' | 'income' | 'balance' | 'expenses'>('journal');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [description, setDescription] = useState('قيد تسوية يدوي');
  const [debitId, setDebitId] = useState('');
  const [creditId, setCreditId] = useState('');
  const [amount, setAmount] = useState('100');
  const [saving, setSaving] = useState(false);

  const accounts = accountsApi.data.data || [];

  useEffect(() => {
    if (accounts.length && !debitId) setDebitId(accounts[0].id);
    if (accounts.length > 1 && !creditId) setCreditId(accounts[1].id);
  }, [accounts, debitId, creditId]);

  const journal = journalApi.data.data || [];
  const trial = trialApi.data.data;
  const income = incomeApi.data.data;
  const balance = balanceApi.data.data;
  const expenses = expensesApi.data.data || [];
  const expensesTotal = expenses.reduce((total, row) => total + Number(row.amount || 0), 0);
  const source = journalApi.source;
  const loading = journalApi.loading || trialApi.loading || incomeApi.loading || balanceApi.loading || expensesApi.loading;

  const journalTotals = useMemo(
    () => ({
      debit: journal.reduce((total, row) => total + Number(row.totalDebit || 0), 0),
      credit: journal.reduce((total, row) => total + Number(row.totalCredit || 0), 0)
    }),
    [journal]
  );

  const refreshAll = () => {
    journalApi.refresh();
    trialApi.refresh();
    incomeApi.refresh();
    balanceApi.refresh();
    expensesApi.refresh();
  };

  const submitJournal = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!description.trim() || !debitId || !creditId || debitId === creditId) {
      toast('اختر حسابين مختلفين وأدخل وصفاً صحيحاً.', 'error');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast('أدخل مبلغاً أكبر من صفر.', 'error');
      return;
    }
    setSaving(true);
    if (getToken()) {
      try {
        await apiPost('/accounting/journal', {
          description,
          lines: [
            { accountId: debitId, debit: value, credit: 0, memo: description },
            { accountId: creditId, debit: 0, credit: value, memo: description }
          ]
        });
        toast('تم إنشاء القيد المحاسبي بنجاح.');
        setJournalOpen(false);
        setSaving(false);
        refreshAll();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر إنشاء القيد.', 'error');
        setSaving(false);
        return;
      }
    }
    toast(`تم إنشاء قيد يدوي بمبلغ ${formatSAR(value)} — محاكاة عرض، لم يُحفظ في قاعدة البيانات.`, 'success');
    setJournalOpen(false);
    setSaving(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="المحاسبة"
        title="المحاسبة والتقارير المالية"
        description="قيود مزدوجة متوازنة لكل عملية بيع ومرتجع ومصروف وهالك. ميزان مراجعة، قائمة دخل، ميزانية عمومية، ومصروفات."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={journalApi.error} onRefresh={refreshAll} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Icon name="download" size={15} />
              تصدير
            </Button>
            <Button size="sm" onClick={() => setJournalOpen(true)}>
              <Icon name="plus" size={15} />
              قيد يدوي
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${journalTotals.debit === journalTotals.credit ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
            <Icon name={journalTotals.debit === journalTotals.credit ? 'check' : 'alert'} size={18} />
          </span>
          <div>
            <p className="text-xs font-bold">توازن القيود المعروضة</p>
            <p className="text-[11px] text-muted-foreground">
              مدين {formatSAR(journalTotals.debit)} · دائن {formatSAR(journalTotals.credit)}
            </p>
          </div>
          <Badge variant={journalTotals.debit === journalTotals.credit ? 'success' : 'danger'} className="mr-auto">
            {journalTotals.debit === journalTotals.credit ? 'متوازن' : 'غير متوازن'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gold/15 text-[#8a6a0f] dark:text-brand-gold">
            <Icon name="shield" size={18} />
          </span>
          <div>
            <p className="text-xs font-bold">مصدر البيانات</p>
            <p className="text-[11px] text-muted-foreground">
              {source === 'api' ? 'قيود API الفعلية' : 'قيود عرض تجريبية متوازنة'} · ضريبة 15%
            </p>
          </div>
          <Badge variant="gold" className="mr-auto">Sandbox</Badge>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto">
        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { value: 'journal', label: 'اليومية', count: journal.length },
            { value: 'trial', label: 'ميزان المراجعة', count: trial.rows.length },
            { value: 'income', label: 'قائمة الدخل' },
            { value: 'balance', label: 'الميزانية' },
            { value: 'expenses', label: 'المصروفات', count: expenses.length }
          ]}
        />
      </div>

      {tab === 'journal' ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>قيود اليومية</CardTitle>
              <CardDescription>اضغط على القيد لعرض سطور المدين والدائن.</CardDescription>
            </div>
            <Badge variant="outline">{journalApi.data.meta?.total || journal.length} قيد</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>القيد</TH>
                    <TH>التاريخ</TH>
                    <TH>الوصف</TH>
                    <TH>المصدر</TH>
                    <TH>مدين</TH>
                    <TH>دائن</TH>
                    <TH>الحالة</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {journal.map((entry) => (
                    <Fragment key={entry.id}>
                      <TR className="cursor-pointer" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                        <TD className="font-mono text-[10px] font-bold" dir="ltr">{entry.number}</TD>
                        <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{entry.date}</TD>
                        <TD className="max-w-[260px] truncate text-xs">{entry.description}</TD>
                        <TD><Badge variant="secondary">{entry.sourceType}</Badge></TD>
                        <TD className="whitespace-nowrap text-[11px] font-semibold tabular-nums">{formatSAR(entry.totalDebit)}</TD>
                        <TD className="whitespace-nowrap text-[11px] font-semibold tabular-nums">{formatSAR(entry.totalCredit)}</TD>
                        <TD><Badge variant={entry.balanced ? 'success' : 'danger'}>{entry.balanced ? 'متوازن' : 'مكسور'}</Badge></TD>
                        <TD>
                          <Icon name="chevron-down" size={15} className={`text-muted-foreground transition ${expanded === entry.id ? 'rotate-180' : ''}`} />
                        </TD>
                      </TR>
                      {expanded === entry.id ? (
                        <tr>
                          <td colSpan={8} className="bg-muted/20 px-4 py-3">
                            <div className="overflow-x-auto rounded-xl border bg-card">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="border-b bg-muted/40 text-right text-[10px] text-muted-foreground">
                                    <th className="px-3 py-2">الحساب</th>
                                    <th className="px-3 py-2">مدين</th>
                                    <th className="px-3 py-2">دائن</th>
                                    <th className="px-3 py-2">ملاحظة</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.lines.map((line, index) => (
                                    <tr key={line.id || index} className="border-b last:border-0">
                                      <td className="px-3 py-2">
                                        <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">{line.accountCode}</span>
                                        <span className="mr-2 font-semibold">{line.accountName}</span>
                                      </td>
                                      <td className="px-3 py-2 tabular-nums">{line.debit ? formatSAR(line.debit) : '—'}</td>
                                      <td className="px-3 py-2 tabular-nums">{line.credit ? formatSAR(line.credit) : '—'}</td>
                                      <td className="px-3 py-2 text-muted-foreground">{line.memo || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'trial' ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>ميزان المراجعة</CardTitle>
              <CardDescription>أرصدة كل الحسابات — يجب أن يتساوى المدين والدائن.</CardDescription>
            </div>
            <Badge variant={trial.balanced ? 'success' : 'danger'}>{trial.balanced ? 'متوازن' : 'غير متوازن'}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>الحساب</TH>
                    <TH>مدين</TH>
                    <TH>دائن</TH>
                    <TH>الرصيد</TH>
                  </TR>
                </THead>
                <TBody>
                  {trial.rows.map((row) => (
                    <TR key={row.accountId}>
                      <TD>
                        <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">{row.accountCode}</span>
                        <span className="mr-2 text-xs font-semibold">{row.accountName}</span>
                      </TD>
                      <TD className="text-[11px] tabular-nums">{formatSAR(row.debit)}</TD>
                      <TD className="text-[11px] tabular-nums">{formatSAR(row.credit)}</TD>
                      <TD className={`text-xs font-bold tabular-nums ${row.balance >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>
                        {formatSAR(row.balance)}
                      </TD>
                    </TR>
                  ))}
                  <TR className="bg-muted/40 font-bold">
                    <TD className="text-xs">الإجمالي</TD>
                    <TD className="text-xs tabular-nums">{formatSAR(trial.totalDebit)}</TD>
                    <TD className="text-xs tabular-nums">{formatSAR(trial.totalCredit)}</TD>
                    <TD className="text-xs tabular-nums">{formatSAR(trial.totalDebit - trial.totalCredit)}</TD>
                  </TR>
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'income' ? (
        <div className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="صافي المبيعات" value={formatSAR(income.netSales)} hint={`إيراد ${formatSAR(income.revenue)} − مرتجع ${formatSAR(income.returns)}`} icon="sales" tone="green" />
            <StatCard label="تكلفة البضاعة" value={formatSAR(income.cogs)} hint="COGS من وصفات BOM" icon="inventory" tone="gold" />
            <StatCard label="الربح الإجمالي" value={formatSAR(income.grossProfit)} hint={`هامش ${income.netSales ? ((income.grossProfit / income.netSales) * 100).toFixed(1) : 0}%`} icon="trend" tone="navy" />
            <StatCard label="صافي الربح" value={formatSAR(income.netProfit)} hint={`بعد مصروفات ${formatSAR(income.operatingExpenses)}`} icon="wallet" tone="green" />
          </section>
          <Card>
            <CardHeader>
              <CardTitle>قائمة الدخل التفصيلية</CardTitle>
              <CardDescription>{income.note || 'تقرير Sandbox تجريبي — يعتمد على القيود المسجلة.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-2xl space-y-2 text-xs">
                {[
                  ['إيرادات المبيعات', income.revenue, 'positive'],
                  ['مرتجعات المبيعات', -income.returns, 'negative'],
                  ['خصومات المبيعات', -income.discounts, 'negative'],
                  ['إيرادات أخرى (خدمة/توصيل)', income.otherIncome, 'positive'],
                  ['صافي المبيعات', income.netSales, 'total'],
                  ['تكلفة البضاعة المباعة', -income.cogs, 'negative'],
                  ['الربح الإجمالي', income.grossProfit, 'total'],
                  ['المصروفات التشغيلية', -income.operatingExpenses, 'negative'],
                  ['صافي الربح', income.netProfit, 'grand']
                ].map(([label, value, tone]) => (
                  <div
                    key={String(label)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                      tone === 'grand' ? 'bg-primary text-primary-foreground' : tone === 'total' ? 'bg-muted font-bold' : 'border'
                    }`}
                  >
                    <span className={tone === 'grand' ? 'font-bold' : ''}>{label}</span>
                    <span className={`font-bold tabular-nums ${tone === 'negative' ? 'text-red-600 dark:text-red-300' : ''}`}>
                      {formatSAR(Number(value))}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'balance' ? (
        <div className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard label="الأصول" value={formatSAR(balance.assets)} hint="نقدية، بنك، مدينون، مخزون" icon="wallet" tone="green" />
            <StatCard label="الالتزامات" value={formatSAR(balance.liabilities)} hint="موردون وضريبة مخرجات" icon="accounting" tone="gold" />
            <StatCard label="حقوق الملكية" value={formatSAR(balance.equity)} hint={`تشمل ربح ${formatSAR(balance.profit)}`} icon="trend" tone="navy" />
          </section>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>الميزانية العمومية</CardTitle>
                <CardDescription>كما في {balance.asOf} — الأصول = الالتزامات + حقوق الملكية.</CardDescription>
              </div>
              <Badge variant={balance.balanced ? 'success' : 'danger'}>{balance.balanced ? 'متوازنة' : 'غير متوازنة'}</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-bold">الأصول</p>
                  <p className="mt-2 text-2xl font-extrabold tabular-nums">{formatSAR(balance.assets)}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-bold">الالتزامات</p>
                  <p className="mt-2 text-2xl font-extrabold tabular-nums">{formatSAR(balance.liabilities)}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-bold">حقوق الملكية + الربح</p>
                  <p className="mt-2 text-2xl font-extrabold tabular-nums">{formatSAR(balance.equity)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                {formatSAR(balance.assets)} = {formatSAR(balance.liabilities)} + {formatSAR(balance.equity)}{' '}
                <span className={balance.balanced ? 'font-bold text-emerald-600 dark:text-emerald-300' : 'font-bold text-red-600 dark:text-red-300'}>
                  {balance.balanced ? '✓ متوازنة' : '✗ فرق'}
                </span>
              </div>
              {balance.lines.length > 0 ? (
                <TableWrap className="mt-4 rounded-xl border">
                  <Table>
                    <THead>
                      <TR>
                        <TH>الحساب</TH>
                        <TH>النوع</TH>
                        <TH>الرصيد</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {balance.lines.map((line) => (
                        <TR key={line.accountCode}>
                          <TD className="text-xs">{line.accountCode} — {line.accountName}</TD>
                          <TD className="text-[11px] text-muted-foreground">{line.type}</TD>
                          <TD className="text-xs font-semibold tabular-nums">{formatSAR(line.balance)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'expenses' ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>المصروفات التشغيلية</CardTitle>
              <CardDescription>كل مصروف ينشئ قيداً تلقائياً على حساب المصروف المقابل.</CardDescription>
            </div>
            <Badge variant="gold">{formatSAR(expensesTotal)}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>الفئة</TH>
                    <TH>المبلغ</TH>
                    <TH>الدفع</TH>
                    <TH>ملاحظات</TH>
                    <TH>الفرع</TH>
                    <TH>بواسطة</TH>
                    <TH>التاريخ</TH>
                  </TR>
                </THead>
                <TBody>
                  {expenses.map((row) => (
                    <TR key={row.id}>
                      <TD className="text-xs font-semibold">{row.category}</TD>
                      <TD className="text-xs font-bold tabular-nums">{formatSAR(row.amount)}</TD>
                      <TD><Badge variant="secondary">{methodLabels[row.method] || row.method}</Badge></TD>
                      <TD className="max-w-[220px] truncate text-[11px] text-muted-foreground">{row.notes || '—'}</TD>
                      <TD className="text-[10px] text-muted-foreground">{row.branchName}</TD>
                      <TD className="text-[10px] text-muted-foreground">{row.createdByName}</TD>
                      <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{row.date}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        title="قيد محاسبي يدوي"
        description="قيد مزدوج بسيط من سطرين. يجب أن يتساوى المدين والدائن."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setJournalOpen(false)}>إلغاء</Button>
            <Button onClick={submitJournal} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="accounting" size={15} />}
              حفظ القيد
            </Button>
          </>
        }
      >
        <form onSubmit={submitJournal} className="space-y-4">
          <Field label="الوصف">
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field label="الحساب المدين">
            <Select value={debitId} onChange={(event) => setDebitId(event.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="الحساب الدائن">
            <Select value={creditId} onChange={(event) => setCreditId(event.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="المبلغ (SAR)">
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} dir="ltr" className="text-left" />
          </Field>
          <div className="rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            المدين: <span className="font-bold text-foreground">{formatSAR(Number(amount || 0))}</span> · الدائن:{' '}
            <span className="font-bold text-foreground">{formatSAR(Number(amount || 0))}</span>
          </div>
        </form>
      </Dialog>
    </>
  );
}
