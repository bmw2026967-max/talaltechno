'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

type Point = { date: string; sales: number; returns?: number };

const compact = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
};

const dayLabel = (date: string) => {
  const parts = String(date).slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
};

export function SalesChart({ data, className }: { data: Point[]; className?: string }) {
  const gradientId = useId().replace(/:/g, '');
  const width = 720;
  const height = 250;
  const pad = { top: 18, right: 18, bottom: 34, left: 48 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const rows = data.length ? data : [{ date: '', sales: 0, returns: 0 }];
  const max = Math.max(100, ...rows.map((row) => Math.max(row.sales, row.returns || 0))) * 1.15;
  const step = innerWidth / Math.max(1, rows.length - 1);

  const pointFor = (row: Point, index: number) => ({
    x: pad.left + index * step,
    y: pad.top + innerHeight - ((row.sales || 0) / max) * innerHeight
  });

  const points = rows.map(pointFor);
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const area = `${line} L ${(pad.left + innerWidth).toFixed(2)} ${(pad.top + innerHeight).toFixed(2)} L ${pad.left.toFixed(2)} ${(pad.top + innerHeight).toFixed(2)} Z`;
  const returnsLine = rows
    .map((row, index) => {
      const x = pad.left + index * step;
      const y = pad.top + innerHeight - ((row.returns || 0) / max) * innerHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const gridValues = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="مخطط المبيعات"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B3D2E" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0B3D2E" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {gridValues.map((ratio) => {
        const y = pad.top + innerHeight - ratio * innerHeight;
        return (
          <g key={ratio}>
            <line
              x1={pad.left}
              x2={pad.left + innerWidth}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="4 5"
            />
            <text
              x={pad.left - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
              fillOpacity="0.45"
              direction="ltr"
            >
              {compact(max * ratio)}
            </text>
          </g>
        );
      })}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="#0B3D2E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-[#D8B13A]" />
      <path d={returnsLine} fill="none" stroke="#C9A227" strokeWidth="1.7" strokeDasharray="5 4" strokeLinecap="round" />

      {points.map((point, index) => (
        <g key={`${rows[index].date}-${index}`}>
          <circle cx={point.x} cy={point.y} r="3.4" fill="#0B3D2E" stroke="#fff" strokeWidth="1.4" className="dark:fill-[#D8B13A]" />
          <title>{`${dayLabel(rows[index].date)} — ${rows[index].sales.toFixed(2)} SAR`}</title>
        </g>
      ))}

      {rows.map((row, index) => {
        const x = pad.left + index * step;
        return (
          <text
            key={`label-${row.date}-${index}`}
            x={x}
            y={height - 10}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            fillOpacity="0.55"
            direction="ltr"
          >
            {dayLabel(row.date)}
          </text>
        );
      })}
    </svg>
  );
}

export function ChartLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#0B3D2E] dark:bg-[#D8B13A]" />
        المبيعات
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded bg-brand-gold" />
        المرتجعات
      </span>
    </div>
  );
}
