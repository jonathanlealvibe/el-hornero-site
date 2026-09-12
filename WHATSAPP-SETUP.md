# El Hornero — WhatsApp (opción B: enviar desde la subcuenta Abba Systems)

Estado al 11 de septiembre de 2026.

## El número

| | |
|---|---|
| Número | **096 894 3661** (Ecuador) |
| Nombre en WhatsApp | Concierge |
| Subcuenta | **Abba Systems** — `IETgmp0eXuzBm7mLOlnV` |
| Modo | Coexistence (también funciona la app de WhatsApp Business) |
| Estado de la cuenta | Approved |
| Verificación de negocio en Meta | **Not Verified** → tope de 250 conversaciones iniciadas por el negocio cada 24 h |
| Plantillas | 0 (hay que crearlas) |

El Hornero (`J8OjgOKtEzbNq2JGilXG`) **no** tiene WhatsApp: su pantalla pide una suscripción de $10/mes.
Por eso la opción B: el envío sale desde Abba Systems.

## Lo que Meta obliga

Una llamada telefónica **no abre** la ventana de 24 horas. Solo la abre un mensaje que el cliente
escriba al negocio. Entonces los dos mensajes después de la llamada son *iniciados por el negocio*
y **exigen plantillas pre-aprobadas**. Texto libre se rechaza.

Los botones de URL en una plantilla aceptan **una sola variable y solo al final** de una URL base
de nuestro dominio. Por eso el sitio ahora tiene URLs limpias:

```
https://elhornero.conciergeai.space/p/<pedido>.<payload>   → pago
https://elhornero.conciergeai.space/s/<pedido>.<payload>   → seguimiento
https://elhornero.conciergeai.space/r/<pedido>.<payload>   → repartidor
```

El `<payload>` lleva el pedido adentro, así que el link abre en cualquier celular sin servidor.

## Las dos plantillas (crear en Abba Systems → Settings → WhatsApp → Templates)

### 1. `el_hornero_link_de_pago`
- **Categoría:** Utility · **Idioma:** Spanish · **Header:** apagado
- **Body:**
  `Hola {{1}}, tu pedido {{2}} de El Hornero quedo reservado. Total a pagar: {{3}}. Toca el boton de abajo para pagar con tarjeta y lo mandamos al horno enseguida.`
- **Variables:** {{1}} → Contact/ First Name, ejemplo `Mauricio` · {{2}} ejemplo `EH1234` · {{3}} ejemplo `18.48 dolares`
- **Botón:** Visit website · texto `Pagar mi pedido` · URL Type **Dynamic**
  · base `elhornero.conciergeai.space/p/` · ejemplo `EH1234.eyJpIjoiRUgxMjM0In0`

### 2. `el_hornero_seguimiento`
- **Categoría:** Utility · **Idioma:** Spanish · **Header:** apagado
- **Body:**
  `Buenas noticias {{1}}, tu pedido {{2}} ya salio del local y va en camino. Toca el boton de abajo para ver a tu motorizado en el mapa en vivo.`
- **Variables:** {{1}} → Contact/ First Name · {{2}} ejemplo `EH1234`
- **Botón:** Visit website · texto `Seguir mi pedido` · URL Type **Dynamic**
  · base `elhornero.conciergeai.space/s/` · ejemplo `EH1234.eyJpIjoiRUgxMjM0In0`

Meta tarda hasta 24 h en aprobar. Mantener el tono transaccional (nada promocional) o
la categoría cambia a Marketing y cuesta ~6x más por mensaje en Ecuador.

## El workflow

Workflow **"El Hornero - Enviar links por WhatsApp"** creado en Abba Systems (en borrador).

Trigger: **Inbound webhook**. Ojo: GoHighLevel lo marca como *premium trigger* — cobra por
ejecución a la billetera de la agencia. El precio exacto no aparece en esa pantalla; se ve en
Settings → Billing / wallet de la agencia.

El selector "Mapping Reference" del webhook no acepta la muestra por automatización (los
componentes de GHL viven dentro de un iframe). Hay que hacerlo a mano:
1. Abrir el trigger, clic en **Fetch sample requests**.
2. Con esa pantalla abierta, mandar el POST de muestra (abajo).
3. Elegir el payload en el desplegable y guardar.

```bash
curl -X POST '<URL del webhook>' -H 'Content-Type: application/json' \
 -d '{"nombre":"Mauricio","telefono":"+593968943661","pedido":"EH1234","total":"18.48 dolares","link_pago":"EH1234.eyJpIjoiRUgxMjM0In0","link_seguimiento":"EH1234.eyJpIjoiRUgxMjM0In0"}'
```

Luego: acción **Send WhatsApp Message** → número Concierge → plantilla → mapear {{1}}, {{2}}, {{3}}.

## Pendientes del cliente

- Verificación de negocio en Meta (quita el tope de 250 conversaciones/24 h).
- Método de pago en la WABA antes del 30 de septiembre de 2026: desde el 1 de octubre Meta
  empieza a cobrar los mensajes de servicio y las WABA sin método de pago dejan de entregarlos.
- Cuenta Payphone (RUC + cuenta bancaria) cuando se quiera cobro real en vez del pago falso.
