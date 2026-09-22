const MAX_QUESTION_LENGTH = 1200;

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

function demoAnswer(question, language) {
  const normalized = question.toLowerCase();

  if (language === 'ro') {
    if (normalized.includes('vzp') || normalized.includes('asigur')) {
      return 'La VZP, obligația și termenul depind de schimbarea locului de muncă și de statutul tău. Verifică scrisoarea sau contul de asigurare; dacă ai o notificare cu termen, trimite fotografia pentru o verificare gratuită.';
    }
    if (normalized.includes('oamp') || normalized.includes('traduc')) {
      return 'Pentru cererile OAMP, traducerea autorizată nu este necesară în fiecare situație. Depinde de document și de instrucțiunile primite; dacă scrisoarea cere traducere oficială sau completări, un specialist o poate verifica înainte să răspunzi.';
    }
    if (normalized.includes('datov') || normalized.includes('scriso') || normalized.includes('termen')) {
      return 'Nu ignora o scrisoare oficială sau un mesaj din datová schránka. Termenul exact este în document și poate începe de la comunicare; trimite-l pentru o verificare a datei și a următorului pas.';
    }
    return 'Pot explica pe scurt informații generale despre scrisori, VZP, OAMP, muncă și chirie. Pentru un termen sau un document concret, trimite o fotografie și echipa noastră îl poate verifica gratuit.';
  }

  if (normalized.includes('vzp') || normalized.includes('osigur')) {
    return 'Kod VZP obveza i rok ovise o tome što se promijenilo — posao, ugovor ili status osiguranja. Pogledaj dopis ili svoj status; ako imaš obavijest s rokom, pošalji je na besplatnu provjeru.';
  }
  if (normalized.includes('oamp') || normalized.includes('prevod')) {
    return 'Za OAMP sudski prevoditelj nije potreban u svakoj situaciji. Ovisi o dokumentu i uputama koje si dobio; ako dopis traži ovjereni prijevod ili dopunu, stručnjak ga može provjeriti prije odgovora.';
  }
  if (normalized.includes('datov') || normalized.includes('pismo') || normalized.includes('rok')) {
    return 'Nemoj ignorirati službeno pismo ili poruku u datovoj schránki. Točan rok piše u dokumentu i može početi teći od dostave; pošalji ga na besplatnu provjeru datuma i sljedećeg koraka.';
  }
  return 'Mogu kratko objasniti opće informacije o dopisima, VZP-u, OAMP-u, poslu i najmu. Za konkretan rok ili dokument pošalji fotografiju pa ga naš tim može besplatno pregledati.';
}

function systemPrompt(language) {
  if (language === 'ro') {
    return 'Ești asistentul digital BalkanCZ. Răspunde în română, simplu și calm, în maximum 3 puncte scurte. Oferă doar informații generale despre administrația din Cehia; nu te prezenta ca avocat sau consultant fiscal. Nu inventa termene sau documente necesare. Dacă întrebarea depinde de o scrisoare, de statutul persoanei sau de o instituție, spune clar că trebuie verificat documentul și invită utilizatorul să îl trimită pentru o evaluare umană gratuită. Nu cere date personale sensibile în chat.';
  }
  return 'Ti si digitalni asistent BalkanCZ. Odgovaraj na hrvatskom/bosanskom/srpskom, jednostavno i mirno, u najviše 3 kratke točke. Daj samo opće administrativne informacije za Češku; ne predstavljaj se kao odvjetnik ili porezni savjetnik. Ne izmišljaj rokove ni obavezne dokumente. Ako odgovor ovisi o dopisu, statusu osobe ili instituciji, jasno reci da treba provjeriti dokument i pozovi korisnika da ga pošalje na besplatnu ljudsku procjenu. U chatu ne traži osjetljive osobne podatke.';
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { return sendJson(res, 400, { error: 'Neispravan JSON zahtjev.' }); }
  }

  const question = typeof payload?.question === 'string' ? payload.question.trim().slice(0, MAX_QUESTION_LENGTH) : '';
  const language = payload?.language === 'ro' ? 'ro' : 'exyu';
  if (!question) return sendJson(res, 400, { error: 'Upiši pitanje.' });

  const fallback = demoAnswer(question, language);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return sendJson(res, 200, { ok: true, answer: fallback, mode: 'demo' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 320,
        messages: [
          { role: 'system', content: systemPrompt(language) },
          { role: 'user', content: question }
        ]
      })
    });

    const result = await response.json().catch(() => ({}));
    const answer = result?.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !answer) return sendJson(res, 200, { ok: true, answer: fallback, mode: 'demo-fallback' });
    return sendJson(res, 200, { ok: true, answer, mode: 'openai' });
  } catch {
    return sendJson(res, 200, { ok: true, answer: fallback, mode: 'demo-fallback' });
  }
};
