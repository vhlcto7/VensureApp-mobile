import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '../../utils/errors';

type PageResult<T> = {
  data: T[];
  meta: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
};

type UsePagedListOptions<T, Q> = {
  query: Q;
  fetchPage: (query: Q, page: number, bypassCache: boolean) => Promise<PageResult<T>>;
  fetchAll?: boolean;
};

export function usePagedList<T, Q>({ query, fetchPage, fetchAll = false }: UsePagedListOptions<T, Q>) {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreLock = useRef(false);
  const fetchPageRef = useRef(fetchPage);
  const queryRef = useRef(query);
  const fetchAllRef = useRef(fetchAll);
  const queryKey = JSON.stringify(query) + `|${fetchAll ? 'all' : 'page'}`;

  fetchPageRef.current = fetchPage;
  queryRef.current = query;
  fetchAllRef.current = fetchAll;

  const load = useCallback(async (mode: 'replace' | 'append' | 'refresh') => {
    if (mode === 'append') {
      if (loadingMoreLock.current || !hasMoreRef.current) return;
      loadingMoreLock.current = true;
      setLoadingMore(true);
    } else if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');
    const currentRequest = ++requestId.current;
    const currentQuery = queryRef.current;
    const all = fetchAllRef.current;
    const nextPage = mode === 'append' ? pageRef.current + 1 : 1;

    try {
      if (all) {
        const first = await fetchPageRef.current(currentQuery, 1, mode === 'refresh');
        let collected = first.data;
        const totalPages = Math.min(Math.max(first.meta.totalPages, 1), 10);
        for (let current = 2; current <= totalPages; current += 1) {
          const next = await fetchPageRef.current(currentQuery, current, mode === 'refresh');
          collected = collected.concat(next.data);
        }
        if (currentRequest !== requestId.current) return;
        pageRef.current = totalPages;
        hasMoreRef.current = false;
        setHasMore(false);
        setItems(collected);
        return;
      }

      const result = await fetchPageRef.current(currentQuery, nextPage, mode === 'refresh');
      if (currentRequest !== requestId.current) return;
      pageRef.current = result.meta.page || nextPage;
      hasMoreRef.current =
        result.meta.totalPages > 0
          ? pageRef.current < result.meta.totalPages
          : result.data.length >= 20;
      setHasMore(hasMoreRef.current);
      setItems((current) => (mode === 'append' ? [...current, ...result.data] : result.data));
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      setError(getErrorMessage(loadError, 'Unable to load this list.'));
      if (mode !== 'append') setItems([]);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        loadingMoreLock.current = false;
      }
    }
  }, []);

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = false;
    void load('replace');
  }, [load, queryKey]);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh: () => {
      void load('refresh');
    },
    loadMore: () => {
      void load('append');
    },
  };
}
