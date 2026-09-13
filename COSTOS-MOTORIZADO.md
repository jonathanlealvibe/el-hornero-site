# ¿Qué hay que pagar para que el motorizado funcione de verdad?

Verificado el 13 de septiembre de 2026 contra la página de precios de Cloudflare.

## La respuesta corta

**Para el piloto: cero dólares.** Para producción: **5 dólares al mes.**

## Por qué

Hoy la ubicación del motorizado no sale de su propio navegador. Para que el
cliente la vea desde otro teléfono hace falta un servidor que guarde la posición
y la entregue. Ese servidor ya está escrito en `backend/worker.js`, solo no se
ha encendido.

| | Plan gratis | Plan pagado |
|---|---|---|
| Precio | $0 | **$5 al mes** |
| Peticiones | 100.000 por día | 10 millones al mes |
| Base de datos D1: escrituras | 100.000 filas por día | 50 millones al mes |
| Base de datos D1: lecturas | 5 millones por día | 25 mil millones al mes |

Una entrega de 25 minutos, con el celular del motorizado mandando su posición
cada 10 segundos, son unas **150 escrituras**. Con el plan gratis eso da para
más de 600 entregas al día, muy por encima de lo que necesita el piloto.

El límite que sí importa es el de **peticiones**: el teléfono del cliente
consulta la posición mientras mira el mapa. A 20 entregas al día son unas 17.000
peticiones, cómodo dentro de las 100.000 gratis. Se pasa de ahí alrededor de las
**120 entregas diarias**, y ese es el día de pagar los 5 dólares.

## Un detalle que hay que corregir antes

El Worker está escrito contra **KV**, que en el plan gratis solo permite **1.000
escrituras al día**. Eso alcanza para unas 6 entregas. Hay que cambiarlo a **D1**,
que en el mismo plan gratis permite 100.000. Es un cambio de código, no de precio.

## Lo que NO hay que comprar

- **Ningún rastreador ni hardware.** El motorizado usa su propio celular.
- **Ninguna app.** Abre un link y toca "Salir a entregar".
- **Ningún mapa de pago.** Los mapas son de OpenStreetMap, sin costo ni clave.
- **Ningún plan de datos extra.** Va con el que el motorizado ya tiene.

## Lo único que hace falta de tu lado

Una **cuenta gratuita de Cloudflare**. Con eso el servidor queda encendido en
minutos. No pide tarjeta para el plan gratis.

## La limitación honesta, que conviene saber antes de prometerla

La pantalla del motorizado es una página web, no una aplicación. El celular deja
de compartir la ubicación si la pantalla se apaga o si cambia de aplicación. En
la práctica el motorizado tiene que dejar el teléfono encendido en esa pantalla,
en el soporte de la moto. Una aplicación de verdad resolvería eso, y es otro
proyecto.

Y algo que se suele pasar por alto: **las dos cifras que más importan no
necesitan GPS**. Cuánto tarda la cocina y cuánto tarda la calle salen de los dos
botones que el motorizado ya toca. El GPS solo compra el puntito en el mapa.
