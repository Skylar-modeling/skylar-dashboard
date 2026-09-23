// Fetch Airtable's Enrolled Students, cache module-level, refresh on interval.
// Same 5-min refresh cadence as useSheetData so the two data sources stay in
// sync for the drift comparison.
import { useEffect, useState } from 'react';

let cached = null;
let cacheFetchedAt = 0;
let inFlight = null;
const TTL = 5 * 60 * 1000; // 5 minutes

async function fetchOnce() {
  const now = Date.now();
  if (cached && now - cacheFetchedAt < TTL) return cached;
  if (inFlight) return inFlight;
  inFlight = fetch('/api/airtable/enrollment-status')
    .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then((json) => {
      cached = json.enrollments || [];
      cacheFetchedAt = Date.now();
      return cached;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useAirtableEnrollment() {
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(!cached);
    fetchOnce()
      .then((rows) => { if (!cancelled) { setData(rows); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
