// Proxy for Airtable's Enrolled Students table. Returns the authoritative
// per-student enrollment status from Airtable so the dashboard can compare
// against Google Sheets and surface any drift (e.g. an Airtable cancellation
// that never propagated to STUDENTS_MASTER).
//
// Airtable API key is per-account and stays server-side. Cached at the CDN
// for 60s so repeated dashboard loads don't hammer the 5 req/sec base limit.

const BASE_ID = 'apphmIaPEDmjgzRwc';
const TABLE_ID = 'tbllLmLLZaZwe5lzJ'; // Enrolled Students

// Field IDs — locked to IDs (not names) so a rename in Airtable can't break us.
const FLD = {
  email: 'fldOT8Uto110oIIHr',
  fullName: 'fldhsRjeo7EWdugj6',
  enrollmentStatus: 'flds2Qb29lh5Ul8R9',
  cancellationDate: 'fldpspyw9hZKmAMMk',
  location: 'fldq9hkyamtD3mJ7t',
  lastModified: 'fldrOtlKK363aleze',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.AIRTABLE_API_KEY;
  if (!key) return res.status(500).json({ error: 'Server misconfigured: missing AIRTABLE_API_KEY' });

  try {
    // Paginate through all records. Airtable returns 100 per page.
    const rows = [];
    let offset;
    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('returnFieldsByFieldId', 'true');
      Object.values(FLD).forEach((id) => url.searchParams.append('fields[]', id));
      if (offset) url.searchParams.set('offset', offset);

      const resp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!resp.ok) {
        const text = await resp.text();
        return res.status(resp.status).json({ error: 'Airtable error', details: text.slice(0, 500) });
      }
      const data = await resp.json();
      for (const rec of data.records || []) {
        const f = rec.fields || {};
        rows.push({
          airtableId: rec.id,
          email: (f[FLD.email] || '').trim().toLowerCase(),
          fullName: f[FLD.fullName] || '',
          location: f[FLD.location]?.name || f[FLD.location] || '',
          enrollmentStatus: f[FLD.enrollmentStatus]?.name || f[FLD.enrollmentStatus] || '',
          cancellationDate: f[FLD.cancellationDate] || '',
          lastModified: f[FLD.lastModified] || rec.createdTime,
        });
      }
      offset = data.offset;
    } while (offset);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ enrollments: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
