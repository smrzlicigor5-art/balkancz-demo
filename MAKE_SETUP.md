# BalkanCZ — Make.com setup

Ovaj dokument opisuje scenario s četiri modula. Prije uključivanja produkcije napravi test s izmišljenim dokumentom i uključi `Keep data confidential` u postavkama scenarija jer payload sadrži osobne podatke i dokument.

## Tok

1. `Webhooks → Custom webhook`
2. `OpenAI (ChatGPT, Sora, Whisper) → Make an API call` — vision/document analiza
3. `Telegram Bot → Send a Text Message or Reply`
4. `Gmail → Send an Email`

To je četiri Make modula po zahtjevu. Ne dodaj `Webhook Response`; Make za uspješno zaprimljen instant webhook vraća zadani HTTP odgovor, a Vercel proxy klijentu vraća potvrdu nakon što Make prihvati zahtjev.

## 1. Custom webhook

U Makeu napravi novi scenario i dodaj `Webhooks → Custom webhook`.

- Naziv: `BalkanCZ document assessment`
- Kopiraj generirani webhook URL.
- Preporučeno: napravi webhook API key i koristi ga kao `MAKE_WEBHOOK_API_KEY` u Vercelu.
- Klikni `Re-determine data structure` / `Determine data structure` i pošalji testni JSON.

Frontend šalje dokument na `/api/submit`. Vercel proxy uklanja sirovi `data_url` iz vanjskog payload-a i dodaje `document.openai_content_part`, tako da Make dobiva ovaj oblik:

```json
{
  "source": "balkancz-vercel-demo",
  "language": "exyu",
  "communication_language": "exyu",
  "submitted_at": "2026-09-22T12:00:00.000Z",
  "client": {
    "name": "Ana Horvat",
    "email": "ana@example.com",
    "phone": "+420 777 123 456"
  },
  "problem": "Pismo od úřada / Datová schránka",
  "problem_id": "letter",
  "description": "Ne razumijem rok za odgovor.",
  "consent": true,
  "document": {
    "filename": "dopis.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 245000,
    "public_url": "https://storage.example/signed-document-url",
    "openai_content_part": {
      "type": "file",
      "file": {
        "filename": "dopis.pdf",
        "file_data": "data:application/pdf;base64,<base64>"
      }
    }
  }
}
```

Za sliku će `openai_content_part` biti:

```json
{
  "type": "image_url",
  "image_url": {
    "url": "data:image/jpeg;base64,<base64>",
    "detail": "high"
  }
}
```

`public_url` je opcionalan u trenutačnom demo proxyju. Za pravi klikabilni link u Telegramu treba ga popuniti sigurnim, vremenski ograničenim URL-om iz Vercel Blob/Cloudinary/drugog storagea. Bez storagea pošalji dokument kao Telegram attachment ili prikaži samo naziv datoteke — nemoj koristiti webhook URL kao link dokumenta.

## 2. OpenAI vision/document analiza

Dodaj `OpenAI (ChatGPT, Sora, Whisper) → Make an API call` i napravi OpenAI connection. U Make UI koristi `POST` na:

```text
/v1/chat/completions
```

U request bodyju mapiraj collection `document.openai_content_part` kao drugi element `messages[1].content`. Ako UI nudi native `Messages/Content parts` editor, koristi njega; nemoj collection umetnuti kao tekst pod navodnicima.

```json
{
  "model": "gpt-4o-mini",
  "temperature": 0.1,
  "messages": [
    {
      "role": "system",
      "content": "YOU ARE THE BALKANCZ DOCUMENT TRIAGE ANALYST. Read the attached Czech document. Never invent a deadline, institution, legal conclusion, or personal fact. If something is not visible, write 'nije pronađeno'. Return exactly this plain-text card, with no code fence and no extra introduction:\n\nINSTITUCIJA: <institution or nije pronađeno>\nVRSTA DOKUMENTA: <type or nije pronađeno>\nROK / LHŮTA: <exact Czech wording and normalized date if visible, otherwise nije pronađeno>\nHITNOST: <HITNO | USKORO | NIJE JASNO>\nRAZINA: <Razina 1 | Razina 2 | Razina 3>\nSAŽETAK: <3-5 short sentences in Croatian/Bosnian/Serbian>\nZA TIM: <one practical next step and the exact uncertainty that must be checked by an expert>\n\nRules: preserve Czech names such as OAMP, VZP and Finanční úřad; distinguish a stated deadline from an estimate; use Razina 3 only when a missed deadline, enforcement, legal threat, identity/residence risk, or multiple institutions are visible; use Razina 2 for a concrete response or form with a non-immediate deadline; use Razina 1 for explanation/translation or low-risk guidance. This is administrative triage, not legal or tax advice."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Klijent: {{1.client.name}}\nE-mail: {{1.client.email}}\nProblem koji je odabran u obrascu: {{1.problem}}\nAnaliziraj priloženi dokument i vrati karticu prema sistemskoj uputi."
        },
        {{1.document.openai_content_part}}
      ]
    }
  ]
}
```

U Makeovom mapperu `{{1...}}` znači polja prvog webhook modula; odaberi ih klikom iz mapping panela. `{{1.document.openai_content_part}}` mora ostati collection/object, ne string.

## 3. Telegram poruka

Dodaj `Telegram Bot → Send a Text Message or Reply`. Napravi bot preko BotFather, dodaj ga u privatnu grupu/kanal kao administratora i odaberi taj chat u Make konekciji.

- `Parse mode`: `HTML`
- `Chat ID`: privatni chat/grupa tima
- `Text`:

```html
<b>🆕 BalkanCZ — nova procjena</b>

<b>Kontakt:</b> {{1.client.name}}
<b>E-mail:</b> {{1.client.email}}
<b>Telefon:</b> {{1.client.phone}}
<b>Problem:</b> {{1.problem}}
<b>Dokument:</b> {{1.document.filename}}
<b>Dokument link:</b> {{1.document.public_url}}

<b>AI triage:</b>
{{2.choices[1].message.content}}

<i>AI rezultat je pomoćna procjena; stručnjak mora provjeriti rok i nadležnost.</i>
```

U mapperu klikni `choices → prvi rezultat → message → content`; nemoj ručno upisivati indeks ako ga Make prikaže drugačije. Ako `public_url` nije dostupan, ukloni red `Dokument link` i koristi Telegramov modul za slanje dokumenta kao privitka.

## 4. Gmail potvrda klijentu

Dodaj `Gmail → Send an Email`.

- `To`: `client.email` iz webhooka
- `Subject`: `BalkanCZ — zaprimili smo vaš dokument`
- `Content type`: HTML
- `Body`:

```html
<p>Pozdrav {{1.client.name}},</p>
<p>zaprimili smo vaš dokument i poslali ga timu BalkanCZ na početnu procjenu.</p>
<p>Javit ćemo vam se na ovaj e-mail s informacijom o sljedećem koraku. Ako dokument sadrži rok, molimo vas da ga dodatno provjerite — ova automatizirana procjena nije pravni ili porezni savjet.</p>
<p>Lijep pozdrav,<br/>BalkanCZ tim</p>
```

## Vercel environment varijable

U Vercel projektu `balkancz-demo` otvori `Settings → Environment Variables` i dodaj:

```text
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/...
MAKE_WEBHOOK_API_KEY=<opcionalni webhook API key>
```

Odaberi `Production` i `Preview`, spremi i napravi novi deploy. Taj URL ne stavljaj u javni HTML i ne šalji OpenAI, Telegram ili Gmail ključeve u frontend.

## Test redoslijed

1. U Make webhooku klikni `Run once`.
2. U Vercel demu pošalji testni JPG ili PDF s testnim e-mailom.
3. Provjeri da OpenAI vraća svih sedam redaka kartice.
4. Provjeri Telegram poruku i Gmail potvrdu.
5. Tek nakon uspješnog testa aktiviraj scenario.

## Ograničenja ove 4-modulne verzije

- Ne dodaj JSON Parse modul ako želiš ostati na četiri modula; OpenAI zato vraća gotovu tekstualnu karticu koju Telegram šalje cijelu.
- Za klikabilni dokument link potreban je storage URL; sam browser upload nije javna datoteka.
- Dokumenti s osobnim podacima traže jasnu privolu, ograničen pristup Telegram grupi i kratko čuvanje datoteka/logova.
