export default async function handler(req, res) {
  try {
    const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID || '1b5B9vp0GKc4T_mORssdj-J2vgc-xEO5YAFkcrVX-nHI';
    const range   = process.env.GOOGLE_SHEETS_PROV_RANGE || 'proveedores!C2:C1000';

    if (!apiKey) {
      return res.status(500).json({ error: 'Falta GOOGLE_SHEETS_API_KEY en variables de entorno.' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Error al consultar Google Sheets (proveedores)', details: text });
    }

    const data = await response.json();
    const providers = Array.isArray(data.values) ? data.values.flat().filter(Boolean) : [];
    return res.status(200).json({ providers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno en /api/proveedores' });
  }
}
