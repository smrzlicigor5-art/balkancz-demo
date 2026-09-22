const MAX_FORWARD_BYTES = 4_500_000;

function sendJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });

  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeWebhookUrl) {
    return sendJson(res, 503, { error: 'Make webhook još nije konfiguriran na Vercelu.' });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { return sendJson(res, 400, { error: 'Neispravan JSON zahtjev.' }); }
  }

  const document = payload?.document;
  const client = payload?.client;
  if (!client?.email || !document?.data_url || !document?.filename || !document?.mime_type) {
    return sendJson(res, 400, { error: 'Nedostaje e-mail klijenta ili dokument.' });
  }

  const isImage = document.mime_type.startsWith('image/');
  const aiContentPart = isImage
    ? { type: 'image_url', image_url: { url: document.data_url, detail: 'high' } }
    : { type: 'file', file: { filename: document.filename, file_data: document.data_url } };

  const { data_url: _dataUrl, ...documentMetadata } = document;
  const outbound = {
    ...payload,
    document: {
      ...documentMetadata,
      openai_content_part: aiContentPart
    }
  };
  const body = JSON.stringify(outbound);
  if (Buffer.byteLength(body, 'utf8') > MAX_FORWARD_BYTES) {
    return sendJson(res, 413, { error: 'Dokument je prevelik za obradu. Odaberite datoteku do 3 MB.' });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.MAKE_WEBHOOK_API_KEY) headers['x-make-apikey'] = process.env.MAKE_WEBHOOK_API_KEY;

  try {
    const makeResponse = await fetch(makeWebhookUrl, { method: 'POST', headers, body });
    if (!makeResponse.ok) return sendJson(res, 502, { error: 'Make webhook nije prihvatio zahtjev.' });
    return sendJson(res, 200, { ok: true, message: 'Zahtjev je zaprimljen. Poslali smo potvrdu na vaš e-mail.' });
  } catch {
    return sendJson(res, 502, { error: 'Nije moguće povezati se s Make webhookom.' });
  }
};
