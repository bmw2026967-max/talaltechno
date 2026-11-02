export function BrandMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="طلال تكنو"
    >
      <defs>
        <linearGradient id="tt-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0F5138" />
          <stop offset="1" stopColor="#082A20" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#tt-mark)" />
      <rect x="2" y="2" width="60" height="60" rx="18" fill="none" stroke="#C9A227" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M16 18h32v8H36v24h-8V26H16z" fill="#D8B13A" />
      <circle cx="50" cy="14" r="3.5" fill="#D8B13A" />
      <path d="M50 18v6h-6M14 46v-5h5" fill="none" stroke="#D8B13A" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="14" cy="46" r="2" fill="#D8B13A" fillOpacity="0.8" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={compact ? 38 : 46} />
      <div className="leading-tight">
        <div className="text-base font-extrabold tracking-tight text-current">طلال تكنو</div>
        <div className="text-[10px] font-semibold tracking-[0.22em] text-brand-gold/90">TALAL TECHNO</div>
      </div>
    </div>
  );
}
