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

## Prueba real — 12 de septiembre de 2026, 9:16 AM (GMT-5)

**Resultado: funcionó.** El mensaje salió por WhatsApp y llegó al celular.

Lo que se usó en vez de las plantillas: el **atajo de la ventana de 24 horas**. El contacto
"Jon" (jonlealfinances+wa@gmail.com) escribió "Hola" por WhatsApp el 11 de septiembre a las
8:26 PM y 8:37 PM. Eso abrió la ventana hasta las 8:37 PM del día 12. Dentro de esa ventana
Meta permite **texto libre**, así que la acción usa la plantilla `None - Free form message`:
sin aprobación de Meta, sin plantillas, sin costo premium.

### El workflow que quedó publicado

| | |
|---|---|
| Nombre | **El Hornero - Links de pago y seguimiento** |
| ID | `36d80e1e-aede-44a9-b66d-0e3a16340888` |
| Subcuenta | Abba Systems `IETgmp0eXuzBm7mLOlnV` |
| Estado | **Published** |
| Trigger | **Customer Replied**, filtrado a `Reply channel is WhatsApp` (trigger estándar, no premium) |
| Acción 1 | WhatsApp · plantilla `None - Free form message` · Enable branches OFF · desde **+593 96 894 3661 - default** |

Cuerpo del mensaje (el chip `{{contact.first_name}}` resolvió bien, llegó como "Hola Jon"):

```
Hola {{contact.first_name}}, tu pedido EHDEMO01 de El Hornero quedo reservado.
Total a pagar: 21.25 dolares. Toca el link para pagar con tarjeta y lo mandamos
al horno enseguida: <link /p/>
-- Y aqui puedes seguir a tu motorizado en vivo: <link /s/>
```

### Registro de la ejecución

| Hora | Evento | Estado |
|---|---|---|
| 9:16:24 AM | Add to workflow | Added To Workflow |
| 9:16:28 AM | WhatsApp | **Executed** (Event Status: Success) |
| 9:16:29 AM | Removed by - End Of Workflow | Finished |

En Conversaciones el mensaje aparece a las 09:16 AM con **doble check = entregado**.

### Lo que se verificó de los links

Los dos links viajaron enteros, sin que WhatsApp los cortara, y abren bien:

- `/p/EHDEMO01.<payload>` → checkout falso: **$21.25**, "Pedido EHDEMO01 · Mauricio",
  formulario de tarjeta, aviso "Demostración: no se procesa ningún cobro".
- `/s/EHDEMO01.<payload>` → seguimiento: **EHDEMO01**, chip "Esperando tu pago",
  aviso "Falta tu pago: $21.25" con botón Pagar, la línea de 4 pasos y el mapa con
  la casa y el motorizado.

Detalle menor: el geocodificador no ubicó "Av. Amazonas y Naciones Unidas" y la página
muestra el aviso "dirección no ubicada en el mapa, se muestra un punto de referencia".
El mapa igual sale; solo el pin cae en un punto aproximado.

### Lo único que falta comprobar

La prueba se corrió con el botón **Test workflow**, que **salta el trigger** y mete el
contacto directo en el workflow. O sea: está probado que la *acción* manda el WhatsApp y que
los links llegan y abren. Falta ver el *trigger* dispararse solo.

Para comprobarlo basta que alguien escriba cualquier cosa por WhatsApp al **096 894 3661**.
Ahí el workflow debería enrolarlo solo y contestar con los dos links. Se ve en
Automation → El Hornero - Links de pago y seguimiento → Enrollment history.

### Ojo con la ventana

Fuera de las 24 horas desde el último mensaje del cliente, el texto libre **deja de entregarse**
y vuelven a hacer falta las dos plantillas Utility de más arriba. Para el demo no estorba,
porque el trigger es justamente un mensaje entrante: el cliente escribe, la ventana se abre,
el workflow contesta. Para la producción real (mandar los links después de una *llamada*,
sin que el cliente escriba) sí hay que crear las plantillas.
