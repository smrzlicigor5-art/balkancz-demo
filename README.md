# BalkanCZ Asistent / Asistenta.ro — Problem-First Demo

Mobile-first React + Tailwind demo for Ex-Yu and Romanian communities living in Czechia. It combines problem-first triage, a verified expert directory and a mock AI assistant. The first step is education and a free document assessment; the demo does not display fixed prices or shopping carts.

## Included

- bilingual Ex-Yu / Romanian language toggle
- two-path hero: free document triage or simple AI chat question
- free-first-step flow with no fixed price tags
- contact form with e-mail, phone/WhatsApp, selected expert, description and consent
- PDF/JPG/PNG upload validation (3 MB client limit)
- Vercel `/api/submit` proxy that keeps the Make webhook URL out of the browser
- six expandable life-event problem cards with basic rules and relevant experts
- verified expert directory with compact profile cards
- floating mock AI chat widget with escalation to human help
- mobile-first intake modal with camera-friendly upload
- Make.com setup guide in [`MAKE_SETUP.md`](./MAKE_SETUP.md)

React, Babel, Tailwind and Lucide are loaded via CDN. Vercel automatically detects the `api/submit.js` serverless function.

## Required Vercel environment variables

```text
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/...
MAKE_WEBHOOK_API_KEY=<optional>
```

Without `MAKE_WEBHOOK_URL`, the form intentionally returns a clear “Make webhook još nije konfiguriran” message. No OpenAI, Telegram, Gmail or Make secret is committed to the repository.
