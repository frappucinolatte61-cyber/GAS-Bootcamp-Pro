// Vercel Serverless Function: meneruskan request frontend ke Google Apps Script Web App.
// Set Environment Variable di Vercel: GAS_URL = https://script.google.com/macros/s/XXXX/exec
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!process.env.GAS_URL) {
    return res.status(500).json({ ok: false, error: 'GAS_URL belum dikonfigurasi di Vercel.' });
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (body.length > 100000) {
    return res.status(413).json({ ok: false, error: 'Payload terlalu besar.' });
  }

  try {
    // redirect: 'follow' wajib: GAS membalas 302 ke script.googleusercontent.com
    const r = await fetch(process.env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow'
    });
    const text = await r.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(text);
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'Backend tidak dapat dihubungi.' });
  }
}
