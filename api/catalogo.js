export default async function handler(req, res) {
  try {
    const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const range   = process.env.GOOGLE_SHEETS_RANGE || 'bd!A2:D5000';

    if (!apiKey || !sheetId) {
      res.status(500).json({ error: 'Faltan variables de entorno de Google Sheets (GOOGLE_SHEETS_API_KEY / GOOGLE_SHEETS_ID)' });
      return;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      res.status(resp.status).json({ error: 'Error en Google Sheets', details: text });
      return;
    }

    const data = await resp.json();
    res.status(200).json({ values: data.values ?? [] });
  } catch (err) {
    console.error('catalogo error', err);
    res.status(500).json({ error: 'Error interno en catalogo', details: String(err) });
  }
}
