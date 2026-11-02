'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';

export function SourceBadge({
  source,
  loading,
  error,
  onRefresh
}: {
  source: 'api' | 'demo';
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {source === 'api' ? (
        <Badge variant="success">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          متصل بالـ API
        </Badge>
      ) : (
        <Badge variant="gold" title={error || undefined}>
          <Icon name="sparkles" size={12} />
          بيانات العرض التجريبي
        </Badge>
      )}
      {loading ? <span className="text-[11px] text-muted-foreground">جارٍ التحديث…</span> : null}
      {onRefresh ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onRefresh}
          title="تحديث البيانات"
          aria-label="تحديث البيانات"
        >
          <Icon name="refresh" size={15} className={loading ? 'animate-spin' : undefined} />
        </Button>
      ) : null}
    </div>
  );
}
