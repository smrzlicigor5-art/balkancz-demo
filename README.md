# BalkanCZ Problem-First Triage Demo

Mobile-first React + Tailwind demo centered on life events and document triage rather than an expert directory.

## Included

- contact form with e-mail consent
- PDF/JPG/PNG upload validation (3 MB client limit)
- Vercel `/api/submit` proxy that keeps the Make webhook URL out of the browser
- clickable life-event problem cards
- 3-tier service model and demo pricing cards
- interactive triage modal for “Rodilo mi se dijete”
- Make.com setup guide in [`MAKE_SETUP.md`](./MAKE_SETUP.md)

React, Babel, Tailwind and Lucide are loaded via CDN. Vercel automatically detects the `api/submit.js` serverless function.

## Required Vercel environment variables

```text
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/...
MAKE_WEBHOOK_API_KEY=<optional>
```

Without `MAKE_WEBHOOK_URL`, the form intentionally returns a clear “Make webhook još nije konfiguriran” message. No OpenAI, Telegram, Gmail or Make secret is committed to the repository.
