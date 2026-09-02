# El Hornero — Ordering automation plan (Pizza Hut / Domino's benchmark)

Written 2026-09-02. Goal: give El Hornero the same "it just remembers me" ordering
experience the big chains have, using GoHighLevel (GHL) as the CRM/voice layer plus a
small custom app on conciergeai.space.

## What the chains actually do

| Capability | Domino's | Pizza Hut | El Hornero equivalent |
|---|---|---|---|
| Customer profile with saved address + payment | "Pizza Profile" | Account with saved details | GHL contact + custom fields (cédula, direcciones, forma de pago habitual) |
| One-tap reorder of the usual | "Easy Order": favorite order + delivery/carryout + address + payment saved together, reorder in ~5 clicks / ~30 s | "Reorder in three taps", saved favorites | Camila reads `pedido_favorito` at call start: "¿Lo de siempre, la Súper Criolla de dieciséis a la casa?" |
| Recent orders list | "Your Recent Orders" | Order history | "Pedido" records in a GHL custom object (one per call), visible on the contact |
| Multiple saved addresses | Yes (home, work) | Yes | Custom object "Dirección" (alias, calle principal, secundaria, referencia, sector, local que cubre) |
| Order tracker | Tracker tied to POS stations: received → prep → bake → quality check → out for delivery | Tracker with 3 stages + **text alerts** without reopening the app | Workflow that sends SMS/WhatsApp at "Recibido", "En el horno", "En camino" (triggered by the local via a link or by the POS when integrated) |
| Schedule ahead | Yes | "Future orders up to 7 days in advance" | Camila captures `fecha_hora_entrega`; workflow reminder to the local + confirmation to the customer |
| Loyalty | Domino's Rewards | Hut Rewards points | Points field + tag "cliente frecuente"; birthday offer workflow |
| Guest checkout | Yes | Yes | Web widget form (Nombre, Teléfono, Cédula) — no account needed |
| Curbside / contactless | Yes | Check-in with one click | "Para retirar" mode + SMS "ya llegué" reply that alerts the local |
| Multi-channel ordering | AnyWare (Alexa, car, watch…) | App, web, text | Voice widget on the web, phone number, WhatsApp — all hitting the same Camila agent |

## Data model to build in GHL

Contact (person) — already has: Cédula.
Add: `pedido_favorito` (text), `modo_preferido` (A domicilio / Para retirar),
`forma_pago_habitual`, `local_habitual`, `ultimo_pedido_fecha` (date), `total_pedidos` (number),
`puntos` (number), `fecha_nacimiento` (native DOB field).

Custom object **Pedido** (one per call): fecha/hora, modalidad, dirección usada, local,
ítems (texto), subtotal, forma de pago, cambio para, tipo de factura, cédula/RUC factura,
correo factura, notas alérgenos, estado (Recibido / En horno / En camino / Entregado),
origen (web widget / teléfono / WhatsApp), transcript link.

Custom object **Dirección** (many per contact): alias, calle principal, secundaria,
número, referencia, sector, ciudad, local que cubre, última vez usada.

## Phases

1. **Capture (now → next session).** One "Update contact field" action per field in the
   Camila agent, plus a post-call workflow that creates the Pedido record from the call
   summary. Result: every call leaves a clean order row and an updated customer profile.
2. **Memory.** Camila reads the contact's fields at call start (GHL passes contact data to
   the agent). Greeting becomes personal for returning callers; addresses are offered
   instead of re-asked; favorite order is offered first.
3. **Reminders & tracker.** Workflows: order-status texts (3 stages, Pizza Hut style),
   "hace X días que no pides", birthday offer, Friday-night regulars, scheduled-order
   confirmations. Requires a GHL phone number (SMS) and/or WhatsApp Business.
4. **Intelligent dashboard.** Small web app on conciergeai.space reading GHL via API:
   orders by day/hour, favorites, lapsed customers, upcoming birthdays, revenue by local,
   plus "next best offer" per customer. This is the layer that learns patterns.
5. **Ordering from memory.** Camila proposes the full usual order (items + address +
   payment) and only asks "¿Confirmamos?". Outbound reminders can carry a one-tap
   "Sí, lo de siempre" reply that creates the Pedido without a call.

## Decisions needed from Jon
- SMS vs WhatsApp for reminders and tracker texts (WhatsApp is the norm in Ecuador).
- Whether the locals will update order status manually (link in SMS) or via POS integration.
- Payment: cash/transfer/card on delivery only, or online payment later (Pizza Hut/Domino's save cards; GHL can do payment links).

Sources: Domino's Pizza Profile / Easy Order announcement (CBS Detroit), Domino's Order
Tracker page, Pizza Hut Delivery Tracker launch post, Pizza Hut app store listing.
