'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandLockup, BrandMark } from '@/components/brand';
import { Icon } from '@/components/icons';
import { fetchMenu, submitPublicOrder } from '@/lib/api';
import type { CartLine, MenuData, MenuProduct, PublicOrder } from '@/lib/types';

const VAT_RATE = 15;
const CART_KEY = 'tt_emenu_cart';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

const sar = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
    numberingSystem: 'latn'
  }).format(Number(value || 0));

const qtyLabel = (value: number) =>
  new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2, numberingSystem: 'latn' }).format(value);

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [source, setSource] = useState<'api' | 'demo'>('demo');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('table') || '';
    const branch = params.get('branch') || '';
    fetchMenu(token, branch)
      .then((result) => {
        setMenu(result.data);
        setSource(result.source);
      })
      .finally(() => setLoading(false));

    try {
      const saved = window.sessionStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartLine[];
        if (Array.isArray(parsed)) setCart(parsed.filter((line) => line && line.productId && line.qty > 0));
      }
    } catch {
      // Session storage is optional.
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${BASE_PATH}/sw.js`).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota/private-mode errors.
    }
  }, [cart]);

  useEffect(() => {
    document.body.classList.toggle('no-scrollbar-body', cartOpen);
    return () => document.body.classList.remove('no-scrollbar-body');
  }, [cartOpen]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const categories = useMemo(() => {
    if (!menu) return [];
    const used = new Set(menu.products.map((product) => product.categoryId));
    return menu.categories.filter((category) => used.has(category.id));
  }, [menu]);

  const visibleProducts = useMemo(() => {
    if (!menu) return [];
    const needle = search.trim().toLowerCase();
    return menu.products.filter((product) => {
      const categoryOk = activeCategory === 'all' || product.categoryId === activeCategory;
      const text = `${product.name} ${product.nameEn || ''}`.toLowerCase();
      return categoryOk && (!needle || text.includes(needle));
    });
  }, [menu, activeCategory, search]);

  const sections = useMemo(() => {
    if (!menu) return [];
    const order = menu.categories.map((category) => category.id);
    const groups = new Map<string, MenuProduct[]>();
    for (const product of visibleProducts) {
      const key = product.categoryId || 'other';
      groups.set(key, [...(groups.get(key) || []), product]);
    }
    return [...groups.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([id, products]) => ({
        id,
        name: menu.categories.find((category) => category.id === id)?.name || 'أصناف أخرى',
        products
      }));
  }, [menu, visibleProducts]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((total, line) => total + line.price * line.qty, 0);
    const tax = (subtotal * VAT_RATE) / 100;
    const count = cart.reduce((total, line) => total + line.qty, 0);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100,
      count
    };
  }, [cart]);

  const addToCart = (product: MenuProduct) => {
    if (!product.available) {
      notify(`${product.name} غير متوفر حالياً`);
      return;
    }
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id ? { ...line, qty: Math.round((line.qty + 1) * 1000) / 1000 } : line
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          emoji: product.emoji,
          qty: 1
        }
      ];
    });
    notify(`أُضيف ${product.name} إلى السلة`);
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.productId === productId
            ? { ...line, qty: Math.round((line.qty + delta) * 1000) / 1000 }
            : line
        )
        .filter((line) => line.qty > 0)
    );
  };

  const openCart = () => {
    if (!menu?.settings.allowSelfOrder) {
      notify('الطلب الذاتي غير مفعّل — يرجى الطلب من الكاشير');
      return;
    }
    setError(null);
    setCartOpen(true);
  };

  const submitOrder = async () => {
    if (!menu || cart.length === 0) return;
    if (!menu.settings.allowSelfOrder) {
      setError('الطلب الذاتي غير مفعّل لهذا الفرع. يرجى الطلب من الكاشير.');
      return;
    }
    if (menu.settings.requireTable && !menu.table) {
      setError('يرجى مسح رمز QR الموجود على الطاولة لإرسال الطلب.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      table: menu.table?.token || undefined,
      branch: menu.branch.code,
      type: (menu.table ? 'dine_in' : 'takeaway') as 'dine_in' | 'takeaway',
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      items: cart.map((line) => ({ productId: line.productId, qty: line.qty, notes: line.notes }))
    };

    try {
      let created: PublicOrder;
      if (source === 'demo') {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        created = {
          id: `demo-${Date.now()}`,
          number: `ORD-D${String(Date.now()).slice(-4)}`,
          status: 'NEW',
          type: payload.type,
          tableName: menu.table?.name || null,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          items: cart.map((line) => ({ name: line.name, qty: line.qty, price: line.price })),
          message: 'تم إرسال طلبك إلى المطبخ — وضع العرض التجريبي، لم يُحفظ في قاعدة البيانات.'
        };
      } else {
        created = await submitPublicOrder(payload);
      }
      setOrder(created);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      try {
        window.sessionStorage.removeItem(CART_KEY);
      } catch {
        // Ignore.
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إرسال الطلب. حاول مجدداً.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeSheet = () => {
    setCartOpen(false);
    setOrder(null);
    setError(null);
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandMark size={64} />
          <div>
            <p className="text-lg font-extrabold text-brand-green">طلال تكنو</p>
            <p className="mt-1 text-xs text-[var(--muted)]">جارٍ تحميل القائمة…</p>
          </div>
          <span className="h-1 w-32 overflow-hidden rounded-full bg-brand-green/10">
            <span className="block h-full w-1/2 animate-pulse rounded-full bg-brand-gold" />
          </span>
        </div>
      </main>
    );
  }

  if (!menu) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="talal-card max-w-sm p-8 text-center">
          <BrandMark size={52} className="mx-auto" />
          <p className="mt-4 text-base font-bold">القائمة غير متاحة</p>
          <p className="mt-1 text-xs leading-6 text-[var(--muted)]">يرجى مسح رمز QR الموجود على الطاولة أو التواصل مع فريق المطعم.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl pb-32">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-dark/95 text-white backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <BrandLockup compact />
          <div className="flex items-center gap-2">
            {source === 'demo' ? (
              <span className="rounded-full border border-brand-gold/40 bg-brand-gold/15 px-2.5 py-1 text-[10px] font-bold text-brand-gold">
                وضع العرض
              </span>
            ) : null}
            <button
              type="button"
              onClick={openCart}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="فتح السلة"
            >
              <Icon name="cart" size={18} />
              {totals.count > 0 ? (
                <span className="absolute -left-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-brand-gold px-1 text-[10px] font-extrabold text-brand-dark">
                  {qtyLabel(totals.count)}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2 text-[10px] text-white/70">
          <Icon name="table" size={13} />
          <span>{menu.table ? `طاولة ${menu.table.name}` : 'طلب سفري'}</span>
          <span className="text-white/25">•</span>
          <span className="truncate">{menu.branch.name}</span>
          <span className="mr-auto flex items-center gap-1 text-brand-gold">
            <Icon name="sparkles" size={12} />
            قائمة QR
          </span>
        </div>
      </header>

      <section className="px-4 pt-4">
        <div className="pattern-gold relative overflow-hidden rounded-3xl bg-brand-green p-5 text-white shadow-soft">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-gold">TALAL TECHNO · E-MENU</p>
            <h1 className="mt-2 text-balance text-2xl font-extrabold leading-snug">{menu.tenant.name}</h1>
            <p className="mt-2 max-w-md text-xs leading-6 text-white/70">{menu.settings.welcomeText}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-semibold">
                {menu.table ? `طاولة ${menu.table.name}` : 'استلام من الفرع'}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-semibold">
                الأسعار شاملة ضريبة {VAT_RATE}%
              </span>
              <span className="rounded-full border border-brand-gold/30 bg-brand-gold/15 px-2.5 py-1 font-bold text-brand-gold">
                الدفع عند الكاشير
              </span>
            </div>
          </div>
          <div className="pointer-events-none absolute -left-6 -top-8 h-32 w-32 rounded-full border border-brand-gold/20" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-28 w-28 rounded-full border border-brand-gold/10" />
        </div>
      </section>

      <section className="sticky top-[97px] z-20 bg-brand-cream/95 px-4 py-3 backdrop-blur-lg">
        <div className="relative">
          <Icon name="search" size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن طبق أو مشروب…"
            className="h-11 w-full rounded-2xl border border-brand-green/15 bg-white pr-10 pl-4 text-sm shadow-sm outline-none transition focus:border-brand-green/40 focus:ring-2 focus:ring-brand-green/10"
            aria-label="البحث في القائمة"
          />
        </div>
        <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold transition ${
              activeCategory === 'all'
                ? 'bg-brand-green text-white shadow-sm'
                : 'border border-brand-green/15 bg-white text-[var(--muted)] hover:text-brand-green'
            }`}
          >
            كل القائمة
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold transition ${
                activeCategory === category.id
                  ? 'bg-brand-green text-white shadow-sm'
                  : 'border border-brand-green/15 bg-white text-[var(--muted)] hover:text-brand-green'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-6 px-4 pt-1">
        {sections.map((section) => (
          <section key={section.id} aria-label={section.name}>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-brand-green">{section.name}</h2>
              <span className="text-[10px] text-[var(--muted)]">{qtyLabel(section.products.length)} صنف</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {section.products.map((product) => {
                const inCart = cart.find((line) => line.productId === product.id);
                return (
                  <article
                    key={product.id}
                    className={`talal-card group relative flex flex-col overflow-hidden p-3 transition ${
                      product.available ? 'hover:-translate-y-0.5 hover:shadow-lg' : 'opacity-65'
                    }`}
                  >
                    <div className="relative mb-2.5 grid h-24 place-items-center rounded-2xl bg-gradient-to-br from-brand-sand to-[#efe6d2] text-5xl">
                      <span aria-hidden="true">{product.emoji || '🍽️'}</span>
                      {!product.available ? (
                        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-white/65 text-[10px] font-extrabold text-red-700 backdrop-blur-[1px]">
                          غير متوفر
                        </span>
                      ) : inCart ? (
                        <span className="absolute left-2 top-2 grid h-6 min-w-[24px] place-items-center rounded-full bg-brand-green px-1.5 text-[10px] font-extrabold text-white">
                          {qtyLabel(inCart.qty)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-extrabold leading-5 text-brand-dark">{product.name}</h3>
                    <p className="mt-0.5 truncate text-[9px] text-[var(--muted)]">{product.nameEn || product.unit}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold tabular-nums text-brand-green">{sar(product.price)}</p>
                        <p className="text-[9px] text-[var(--muted)]">شامل الضريبة</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={!product.available}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gold text-brand-dark shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:bg-brand-green/20 disabled:text-white/70"
                        aria-label={`إضافة ${product.name}`}
                      >
                        <Icon name="plus" size={17} strokeWidth={2.4} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {sections.length === 0 ? (
          <div className="talal-card px-5 py-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-sand text-brand-green">
              <Icon name="search" size={22} />
            </span>
            <p className="mt-3 text-sm font-bold">لا توجد نتائج مطابقة</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">جرّب كلمة أخرى أو اختر «كل القائمة».</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveCategory('all');
              }}
              className="mt-4 rounded-xl border border-brand-green/20 px-4 py-2 text-xs font-bold text-brand-green transition hover:bg-brand-green/5"
            >
              إعادة ضبط البحث
            </button>
          </div>
        ) : null}
      </div>

      <footer className="mt-8 border-t border-brand-green/10 px-5 pb-24 pt-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <BrandMark size={24} />
          <span className="text-[10px] font-bold text-brand-green">طلال تكنو · قائمة إلكترونية</span>
        </div>
        <p className="mx-auto mt-2 max-w-md text-[9px] leading-5 text-[var(--muted)]">{menu.disclaimer}</p>
        <p className="mt-1 text-[9px] text-[var(--muted)]">
          {menu.tenant.vatNumber ? `الرقم الضريبي ${menu.tenant.vatNumber}` : 'Sandbox / Demo'} · {menu.branch.code}
        </p>
      </footer>

      {!cartOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-3xl border-t border-brand-green/10 bg-white/95 px-4 py-3 backdrop-blur-xl">
          {menu.settings.allowSelfOrder ? (
            cart.length > 0 ? (
              <button
                type="button"
                onClick={openCart}
                className="flex h-14 w-full items-center gap-3 rounded-2xl bg-brand-green px-4 text-white shadow-lg transition active:scale-[0.99]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gold text-brand-dark">
                  <Icon name="cart" size={17} />
                </span>
                <span className="min-w-0 flex-1 text-right">
                  <span className="block text-[10px] text-white/60">{qtyLabel(totals.count)} صنف في السلة</span>
                  <span className="block text-sm font-extrabold tabular-nums">{sar(totals.total)}</span>
                </span>
                <span className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
                  عرض السلة
                  <Icon name="arrow" size={14} />
                </span>
              </button>
            ) : (
              <div className="flex h-14 items-center gap-3 rounded-2xl border border-dashed border-brand-green/20 bg-brand-sand/50 px-4">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-green/10 text-brand-green">
                  <Icon name="table" size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-brand-green">{menu.table ? `أنت على طاولة ${menu.table.name}` : 'طلب سفري'}</p>
                  <p className="text-[10px] text-[var(--muted)]">أضف أصنافاً من القائمة لبدء الطلب</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-50 px-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/15 text-amber-700">
                <Icon name="clock" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-900">الطلب عبر الكاشير</p>
                <p className="text-[10px] text-amber-800/70">الطلب الذاتي غير مفعّل — يُرجى الطلب من فريق المطعم.</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
          <div className="animate-fade-up rounded-full border border-brand-green/15 bg-white px-4 py-2 text-[11px] font-bold text-brand-green shadow-lg">
            {toast}
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="إغلاق السلة"
            className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm"
            onClick={closeSheet}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="سلة الطلب"
            className="animate-slide-up relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border-t border-brand-green/10 bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-brand-green/10 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <h2 className="text-base font-extrabold text-brand-dark">
                  {order ? 'تم إرسال الطلب' : 'سلة الطلب'}
                </h2>
                <p className="text-[10px] text-[var(--muted)]">
                  {menu.table ? `طاولة ${menu.table.name} · ${menu.branch.name}` : `سفري · ${menu.branch.name}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="grid h-9 w-9 place-items-center rounded-full border border-brand-green/15 text-[var(--muted)] transition hover:bg-brand-sand"
                aria-label="إغلاق"
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            {order ? (
              <div className="px-5 py-6">
                <div className="flex flex-col items-center text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Icon name="check" size={32} strokeWidth={2.4} />
                  </span>
                  <p className="mt-4 text-lg font-extrabold text-brand-dark">تم إرسال طلبك للمطبخ</p>
                  <p className="mt-1 max-w-sm text-[11px] leading-6 text-[var(--muted)]">{order.message}</p>
                  <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2 text-right">
                    <div className="rounded-xl border border-brand-green/10 bg-brand-sand/40 p-3">
                      <p className="text-[9px] text-[var(--muted)]">رقم الطلب</p>
                      <p className="mt-1 font-mono text-sm font-extrabold" dir="ltr">{order.number}</p>
                    </div>
                    <div className="rounded-xl border border-brand-green/10 bg-brand-sand/40 p-3">
                      <p className="text-[9px] text-[var(--muted)]">الإجمالي</p>
                      <p className="mt-1 text-sm font-extrabold tabular-nums">{sar(order.total)}</p>
                    </div>
                    <div className="rounded-xl border border-brand-green/10 bg-brand-sand/40 p-3">
                      <p className="text-[9px] text-[var(--muted)]">الطاولة</p>
                      <p className="mt-1 text-sm font-extrabold">{order.tableName || 'سفري'}</p>
                    </div>
                    <div className="rounded-xl border border-brand-green/10 bg-brand-sand/40 p-3">
                      <p className="text-[9px] text-[var(--muted)]">الحالة</p>
                      <p className="mt-1 text-sm font-extrabold text-emerald-600">أُرسل للمطبخ</p>
                    </div>
                  </div>
                </div>

                <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-brand-green/10 p-4">
                  <p className="mb-2 text-[11px] font-bold text-brand-green">ملخص الأصناف</p>
                  {order.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-center justify-between py-1 text-[11px]">
                      <span className="text-[var(--muted)]">
                        {qtyLabel(item.qty)} × {item.name}
                      </span>
                      <span className="font-semibold tabular-nums">{sar(item.qty * item.price)}</span>
                    </div>
                  ))}
                  <div className="mt-2 border-t border-brand-green/10 pt-2 text-[11px]">
                    <div className="flex items-center justify-between text-[var(--muted)]">
                      <span>قبل الضريبة</span>
                      <span className="tabular-nums">{sar(order.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--muted)]">
                      <span>ضريبة {VAT_RATE}%</span>
                      <span className="tabular-nums">{sar(order.tax)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between font-extrabold">
                      <span>الإجمالي</span>
                      <span className="tabular-nums">{sar(order.total)}</span>
                    </div>
                  </div>
                </div>

                <p className="mx-auto mt-4 max-w-sm rounded-xl border border-brand-gold/25 bg-brand-gold/10 p-3 text-center text-[10px] leading-5 text-[#7a5d0b]">
                  يرجى إتمام الدفع عند الكاشير. هذا الطلب لا يتضمن أي عملية دفع إلكتروني.
                </p>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setOrder(null);
                      setCartOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="h-11 rounded-xl border border-brand-green/15 px-5 text-xs font-bold text-brand-green transition hover:bg-brand-sand"
                  >
                    العودة للقائمة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrder(null);
                      setCartOpen(false);
                      setCart([]);
                    }}
                    className="h-11 rounded-xl bg-brand-green px-5 text-xs font-bold text-white transition hover:bg-brand-dark"
                  >
                    طلب جديد
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4">
                {cart.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-sand text-brand-green">
                      <Icon name="cart" size={26} />
                    </span>
                    <p className="mt-3 text-sm font-bold">السلة فارغة</p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">أضف أصنافاً من القائمة لبدء الطلب.</p>
                    <button
                      type="button"
                      onClick={closeSheet}
                      className="mt-4 rounded-xl bg-brand-green px-5 py-2.5 text-xs font-bold text-white"
                    >
                      تصفح القائمة
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map((line) => (
                        <div key={line.productId} className="flex items-center gap-3 rounded-2xl border border-brand-green/10 bg-white p-3">
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-sand text-2xl" aria-hidden="true">
                            {line.emoji || '🍽️'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-extrabold">{line.name}</p>
                            <p className="mt-0.5 text-[10px] text-[var(--muted)]">{sar(line.price)} للوحدة</p>
                            <p className="mt-0.5 text-[11px] font-bold tabular-nums text-brand-green">{sar(line.price * line.qty)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => changeQty(line.productId, -1)}
                              className="grid h-8 w-8 place-items-center rounded-full border border-brand-green/15 text-brand-green transition active:scale-95"
                              aria-label={`تقليل ${line.name}`}
                            >
                              <Icon name="minus" size={14} strokeWidth={2.4} />
                            </button>
                            <span className="w-6 text-center text-xs font-extrabold tabular-nums">{qtyLabel(line.qty)}</span>
                            <button
                              type="button"
                              onClick={() => changeQty(line.productId, 1)}
                              className="grid h-8 w-8 place-items-center rounded-full bg-brand-green text-white transition active:scale-95"
                              aria-label={`زيادة ${line.name}`}
                            >
                              <Icon name="plus" size={14} strokeWidth={2.4} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCart((current) => current.filter((row) => row.productId !== line.productId))}
                              className="mr-1 grid h-8 w-8 place-items-center rounded-full text-red-500 transition hover:bg-red-50"
                              aria-label={`حذف ${line.name}`}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-[var(--muted)]">
                          <Icon name="user" size={12} /> الاسم (اختياري)
                        </span>
                        <input
                          value={customerName}
                          onChange={(event) => setCustomerName(event.target.value)}
                          placeholder="اسمك الكريم"
                          className="h-10 w-full rounded-xl border border-brand-green/15 bg-white px-3 text-xs outline-none focus:border-brand-green/40 focus:ring-2 focus:ring-brand-green/10"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-[var(--muted)]">
                          <Icon name="phone" size={12} /> الجوال (اختياري)
                        </span>
                        <input
                          value={customerPhone}
                          onChange={(event) => setCustomerPhone(event.target.value)}
                          placeholder="05xxxxxxxx"
                          inputMode="tel"
                          dir="ltr"
                          className="h-10 w-full rounded-xl border border-brand-green/15 bg-white px-3 text-left text-xs outline-none focus:border-brand-green/40 focus:ring-2 focus:ring-brand-green/10"
                        />
                      </label>
                    </div>

                    <label className="mt-3 block">
                      <span className="mb-1 block text-[10px] font-bold text-[var(--muted)]">ملاحظات على الطلب (اختياري)</span>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={2}
                        placeholder="مثال: بدون بصل، طلب سريع…"
                        className="w-full rounded-xl border border-brand-green/15 bg-white px-3 py-2 text-xs outline-none focus:border-brand-green/40 focus:ring-2 focus:ring-brand-green/10"
                      />
                    </label>

                    {error ? (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-50 px-3 py-2.5 text-[10px] leading-5 text-red-700">
                        <Icon name="shield" size={14} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-2xl border border-brand-green/10 bg-brand-sand/40 p-4 text-[11px]">
                      <div className="flex items-center justify-between text-[var(--muted)]">
                        <span>المجموع قبل الضريبة</span>
                        <span className="tabular-nums">{sar(totals.subtotal)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[var(--muted)]">
                        <span>ضريبة القيمة المضافة {VAT_RATE}%</span>
                        <span className="tabular-nums">{sar(totals.tax)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-brand-green/10 pt-2 text-sm font-extrabold">
                        <span>الإجمالي</span>
                        <span className="tabular-nums text-brand-green">{sar(totals.total)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={submitOrder}
                      disabled={submitting || cart.length === 0}
                      className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-4 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          جارٍ إرسال الطلب…
                        </>
                      ) : (
                        <>
                          <Icon name="check" size={18} strokeWidth={2.4} />
                          إرسال الطلب إلى المطبخ
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-center text-[9px] leading-5 text-[var(--muted)]">
                      بإرسال الطلب، يتم إشعار المطبخ مباشرة. الدفع عند الكاشير.
                      {source === 'demo' ? ' — وضع العرض: لن يُحفظ الطلب في قاعدة البيانات.' : ''}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
