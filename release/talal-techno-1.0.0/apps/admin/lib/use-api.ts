'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, getToken } from './api';

export function useApi<T>(path: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'api' | 'demo'>('demo');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) {
      setData(fallback);
      setSource('demo');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    apiGet<T>(path)
      .then((result) => {
        if (!active) return;
        setData(result);
        setSource('api');
        setError(null);
      })
      .catch((reason: Error) => {
        if (!active) return;
        setData(fallback);
        setSource('demo');
        setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // fallback is intentionally not a dependency: pages pass literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick]);

  return { data, loading, source, error, refresh };
}
