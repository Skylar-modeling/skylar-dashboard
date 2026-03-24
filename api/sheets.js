// Vercel serverless function — proxies Google Sheets API calls
// so the API key stays server-side, never exposed to the browser.

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_ID || '1qT6iDfbXXLtkS617cSfhdV09S3AneDgK4ry9BRfgQXA';

  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key' });
  }

  // Forward the ranges query parameter
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet`);
  const ranges = req.query.ranges;
  if (ranges) {
    const rangeArr = Array.isArray(ranges) ? ranges : [ranges];
    rangeArr.forEach((r) => url.searchParams.append('ranges', r));
  }
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Google Sheets API error' });
    }
    const data = await response.json();
    // Cache for 60 seconds at CDN, 300 at browser
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
}
