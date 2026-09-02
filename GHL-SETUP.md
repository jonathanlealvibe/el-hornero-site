# El Hornero — GoHighLevel + Website Setup

Created 2026-09-02 from the Abba Systems agency.

## What exists in GoHighLevel

| Item | Value |
|---|---|
| Sub-account | El Hornero |
| Location ID | J8OjgOKtEzbNq2JGilXG |
| Sub-account URL | https://app.gohighlevel.com/v2/location/J8OjgOKtEzbNq2JGilXG/dashboard |
| Voice AI agent | "El Hornero - Asistente de Voz" |
| Agent builder URL | https://app.gohighlevel.com/v2/location/J8OjgOKtEzbNq2JGilXG/ai-agents/voice-ai/builder/6a98217049512109575048b1 |
| Agent settings | Language: Spanish · Voice: Dakota H (Latin American Spanish, female) · Model: GPT 4.1 · Greeting: "Hola, gracias por llamar a El Hornero. ¿En qué puedo ayudarte hoy?" |
| Web chat widget | "El Hornero - Asistente de Voz Widget" · type: Voice AI · widget language: Spanish |
| Widget ID | 6a9821d40d86c69c86ba3ce1 |
| Widget builder URL | https://app.gohighlevel.com/v2/location/J8OjgOKtEzbNq2JGilXG/funnels-websites/chat-widget/builder/6a9821d40d86c69c86ba3ce1 |

Sub-account contact/address were filled with Abba Systems placeholders
(Jonathan Leal, jonlealfinances@gmail.com, +1 520 756 8346, 4975 S Liberty Ave B212, Tucson AZ 85706).
Time zone is America/Bogota (GMT-5, same as Ecuador). Edit in Settings > Business Profile when you have the client's real info.

## For the Voice AI expert

1. Open the agent builder URL above.
2. Replace the default prompt in the big text box with the system prompt.
3. Right panel > "Knowledge Base" > connect or upload the knowledge base
   (or upload first under AI Agents > Knowledge Base, then link it here).
4. Optional: right panel > Actions (transfer call, book appointment, etc.).
5. Click Save. Test with "Start Web Call" on the right side.
6. If phone calls are also wanted: Deploy tab > Buy new number (or assign an existing one).

## Embed code for the website

Paste this once, before `</body>` in `index.html` of the Vite project:

```html
<script
  src="https://widgets.leadconnectorhq.com/loader.js"
  data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
  data-widget-id="6a9821d40d86c69c86ba3ce1">
</script>
```

That is all the code needed. The widget shows a floating "Call us" button that starts
a browser voice call with the agent (microphone permission is requested by the browser).

If you prefer to load it from React instead of index.html, add this component and render
it once in `App.jsx`:

```jsx
// src/components/VoiceAgent.jsx
import { useEffect } from "react";

export default function VoiceAgent() {
  useEffect(() => {
    if (document.querySelector('script[data-widget-id="6a9821d40d86c69c86ba3ce1"]')) return;
    const s = document.createElement("script");
    s.src = "https://widgets.leadconnectorhq.com/loader.js";
    s.setAttribute("data-resources-url", "https://widgets.leadconnectorhq.com/chat-widget/loader.js");
    s.setAttribute("data-widget-id", "6a9821d40d86c69c86ba3ce1");
    document.body.appendChild(s);
  }, []);
  return null;
}
```

## Hosting on elhornero.conciergeai.space

Facts found:
- conciergeai.space DNS is at Hostinger (nameservers hermes/artemis.dns-parking.com).
- www.conciergeai.space already points to GoHighLevel site hosting (sites.ludicrous.cloud).
- elhornero.conciergeai.space does not exist yet.
- GoHighLevel's site builder cannot host a Vite/React app, so the subdomain must point
  to a static host.

Steps (Vercel; Netlify or Cloudflare Pages work the same way):

1. Build check locally:
   ```bash
   npm run build
   ```
2. Push the project to GitHub, import it in Vercel (Framework: Vite). Vercel builds and
   gives a `*.vercel.app` URL.
3. In Vercel > Project > Settings > Domains, add `elhornero.conciergeai.space`.
   Vercel shows a CNAME target (usually `cname.vercel-dns.com`).
4. In Hostinger > Domains > conciergeai.space > DNS, add:
   - Type: CNAME · Name: `elhornero` · Target: `cname.vercel-dns.com` · TTL: default
5. Wait for propagation (minutes to an hour). Vercel issues HTTPS automatically.
6. Open https://elhornero.conciergeai.space and confirm the call button appears
   bottom-right. Allow the microphone and talk to the agent.

Note: the GoHighLevel widget works on any domain, so no domain needs to be added
inside GoHighLevel for the widget to load.

## Deployment (done 2026-09-02)

| Item | Value |
|---|---|
| Live URL | https://elhornero.conciergeai.space |
| Source repo | https://github.com/jonathanlealvibe/el-hornero-site (branch `main`) |
| Hosting | GitHub Pages, served from branch `gh-pages` (built `dist/`) |
| DNS | Hostinger: CNAME `elhornero` → `jonathanlealvibe.github.io` (added 2026-09-02) |
| Widget | Loaded from `index.html` (script tag before `</body>`) |

### Updating the site
```bash
cd "/Users/jon/El Hornero"
# edit src/…, then:
git add -A && git commit -m "…" && git push
npm run deploy   # builds and force-pushes dist/ to gh-pages
```

GitHub Actions is not used because the `gh` CLI token lacks the `workflow` scope.
A ready-made workflow is in `deploy/github-pages-workflow.yml.txt`; to switch to it, run
`gh auth refresh -s workflow`, move the file to `.github/workflows/deploy.yml`, and set
Pages source to "GitHub Actions".

## Persona copy (updated 2026-09-02)

The agent and widget now read as El Hornero's order-taker, in Ecuadorian Spanish (tú, not vos):

| Where | Text |
|---|---|
| Agent name | El Hornero - Asistente de Pedidos |
| Agent greeting (spoken first) | ¡Hola! Bienvenido a El Hornero, mucho más que pizza. Soy tu asistente de pedidos. ¿Qué se te antoja hoy: una pizza, un combo o algo de la casa? |
| Agent prompt | Provisional Spanish order-taking prompt (greet, take items, delivery/pickup, name + phone, repeat order, close). The expert replaces it with the final prompt + knowledge base. |
| Widget title | ¿Pedimos algo rico? 🍕 |
| Widget button | Haz tu pedido por voz |
| Widget agent name / description | Asistente de Pedidos · El Hornero / Pide tu pizza, combo o plato favorito por voz. ¡Te lo tomo en segundos! |
| Bubble (first visit) | ¡Hola! ¿Se te antoja una pizza? Dime qué quieres y te tomo el pedido en segundos 🍕 |
| Bubble (returning) | ¡Qué gusto verte de nuevo, {{name}}! ¿Lo de siempre o probamos algo nuevo? 🍕 |

Site copy was also switched from voseo ("Tenés", "Probá", "Elegí") to tú forms for Ecuador.

## Cédula → CRM (added 2026-09-02)

| Item | Value |
|---|---|
| Custom field | **Cédula** — Contact object, folder "Additional Info", type Single line, key `{{contact.cedula}}` |
| Agent action | "Guardar cedula del cliente" — Update contact field, **during the call**, mode Replace Value, target field Cédula. Instruction: save digits only (10 for cédula, 13 for RUC), confirm in groups of 2–3 digits, skip if "consumidor final". Examples: 0912345678, 1712345678001 |
| Widget contact form | Enabled (Nombre + Teléfono required) so every web caller becomes a contact before the call; the cédula action then writes to that contact. Prefilled message: "Quiero hacer un pedido". |
| Agent greeting | Aligned with the expert's Camila prompt: "¡Hola, El Hornero, habla Camila! ¿Su pedido es a domicilio o para retirar?" |

The expert's prompt (already loaded) lists the other fields Camila should capture:
modalidad, dirección completa, local asignado, pedido detallado, subtotal, forma de pago,
cambio para, tipo de factura, correo factura, notas de alérgenos. Create each as a contact
custom field and add one "Update contact field" action per field, same as the cédula one.
