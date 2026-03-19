import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllSheetData, getCachedData } from '../api/sheets';
import { REFRESH_INTERVAL } from '../config/constants';

export function useSheetData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const loadData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const result = await fetchAllSheetData();
      if (result) {
        setData(result);
        setLastUpdated(new Date());
        setError(null);
      } else {
        // No API key — use cached if available
        const cached = getCachedData();
        if (cached.data) {
          setData(cached.data);
          setLastUpdated(cached.lastFetchTime);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sheet data:', err);
      setError(err.message);
      // Fall back to cached data
      const cached = getCachedData();
      if (cached.data) {
        setData(cached.data);
        setLastUpdated(cached.lastFetchTime);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(() => loadData(true), REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  const refresh = useCallback(() => loadData(), [loadData]);

  return { data, loading, error, lastUpdated, refresh };
}
