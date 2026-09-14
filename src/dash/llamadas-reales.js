// Llamadas reales de Camila del 14 de septiembre de 2026, tal como quedaron en el
// registro de la plataforma: resumen, datos guardados, acciones y transcripción
// completa. La cédula, el celular y el número de casa del cliente de prueba van
// enmascarados porque este archivo viaja en el sitio público.
import * as S from './store.js'

export const LLAMADAS_REALES = [
 {
  "conversacion_id": "CV-REAL-20260914-0651",
  "origen": "real",
  "canal": "llamada",
  "contacto": "Luis Barragán",
  "telefono": null,
  "local_id": "cumbaya",
  "inicio": 1789386660000,
  "duracion_s": 28,
  "resultado": "colgo",
  "motivo_no_cierre": null,
  "cedula_capturada": false,
  "pedido_id": null,
  "total": null,
  "modalidad": "domicilio",
  "resumen": "Luis llamó para hacer un pedido a domicilio. Camila empezó a confirmar los datos de entrega y la llamada se cortó antes de terminar. No se guardó nada.",
  "datos": {},
  "acciones": [],
  "nota": "La llamada se cortó: la transcripción termina a mitad de frase.",
  "transcripcion": [
   {
    "q": "camila",
    "t": "¡Hola, Luis! Qué gusto, le habla Camila de El Hornero. ¿Qué se le antoja hoy, y se lo mandamos a casa o lo pasa a retirar?"
   },
   {
    "q": "cliente",
    "t": "Hola, Camila. Eh, quiero un pedido a domicilio y quiero pedir una pizza, por favor."
   },
   {
    "q": "camila",
    "t": "¡De una, Luis! Antes de tomarle la pizza, le confirmo rapidito sus datos para que todo llegue bien. ¿Me ayuda con su apellido y el número de celular con WhatsApp al que le llegan los links del"
   }
  ]
 },
 {
  "conversacion_id": "CV-REAL-20260914-0654",
  "origen": "real",
  "canal": "llamada",
  "contacto": "Luis Barragán",
  "telefono": null,
  "local_id": "cumbaya",
  "inicio": 1789386840000,
  "duracion_s": 285,
  "resultado": "pedido",
  "motivo_no_cierre": null,
  "cedula_capturada": true,
  "pedido_id": null,
  "total": 17.8,
  "modalidad": "domicilio",
  "resumen": "Luis pidió a domicilio en Cumbayá una Súper Criolla mediana de masa fina. Eligió pagar con tarjeta y pidió factura con sus datos. Camila confirmó el pedido, repitió la dirección y le indicó cómo recibir los links de pago y seguimiento por WhatsApp.",
  "datos": {
   "Cliente": "Luis Barragán",
   "Sector": "Cumbayá",
   "Dirección": "Elisa Mariño [número] y Ángel Rojas",
   "Local asignado": "Cumbayá",
   "Modalidad": "A domicilio",
   "Pedido": "Súper Criolla mediana, masa fina × 1 · $15.30",
   "Envío": "$2.50",
   "Total a pagar": "$17.80",
   "Pago": "Tarjeta, por el link",
   "Factura": "Con datos (cédula guardada)"
  },
  "acciones": [
   "Guardar nombre",
   "Guardar apellido",
   "Guardar teléfono",
   "Guardar cédula",
   "Guardar sector",
   "Guardar dirección",
   "Guardar local",
   "Guardar modalidad",
   "Guardar pedido",
   "Guardar total",
   "Guardar link"
  ],
  "nota": null,
  "transcripcion": [
   {
    "q": "camila",
    "t": "¡Hola, Luis! Qué gusto, le habla Camila de El Hornero. ¿Qué se le antoja hoy, y se lo mandamos a casa o lo pasa a retirar?"
   },
   {
    "q": "cliente",
    "t": "Hola, Camila. Quiero un pedido a domicilio de pizza, por favor."
   },
   {
    "q": "camila",
    "t": "¡Perfecto, Luis! Le tomo el pedido en un minuto; primero le confirmo sus datos para que todo le llegue bien. ¿Me ayuda con su apellido, por favor?"
   },
   {
    "q": "cliente",
    "t": "Barragán."
   },
   {
    "q": "camila",
    "t": "Gracias, Luis. ¿Le mando los links a este mismo número que termina en…? ¿Me puede confirmar los últimos tres dígitos de su celular, por favor?"
   },
   {
    "q": "cliente",
    "t": "[…]."
   },
   {
    "q": "camila",
    "t": "Listo, Luis. ¿A qué sector de la ciudad va el pedido?"
   },
   {
    "q": "camila",
    "t": "Luis, ¿me ayuda confirmando el sector o barrio a donde va el pedido? Así le"
   },
   {
    "q": "cliente",
    "t": "Vaya."
   },
   {
    "q": "camila",
    "t": "recomiendo el local más cercano y seguimos con la pizza."
   },
   {
    "q": "cliente",
    "t": "A Cumbayá."
   },
   {
    "q": "camila",
    "t": "Perfecto, Luis, entonces el pedido va para Cumbayá. ¿Me dicta la dirección completa, por favor? Calle principal, secundaria, número y una referencia para el motorizado."
   },
   {
    "q": "cliente",
    "t": "Elisa Mariño, [número], y Ángel Rojas."
   },
   {
    "q": "camila",
    "t": "Gracias, Luis. Le confirmo: Luis Barragán, celular termina en […], sector Cumbayá, dirección Elisa Mariño, [número], y Ángel Rojas. ¿Todo correcto?"
   },
   {
    "q": "cliente",
    "t": "Sí."
   },
   {
    "q": "camila",
    "t": "Listo, Luis, ya tenemos todo para el envío a domicilio en Cumbayá. ¿Para cuántas personas es la pizza y qué se le antoja: tradicional, especial, hawaiana, pepperoni…? Así le recomiendo el tamaño ideal."
   },
   {
    "q": "cliente",
    "t": "Eh... quiero una criolla, tamaño mediano."
   },
   {
    "q": "camila",
    "t": "¡Esa Súper Criolla mediana es mi debilidad, Luis! Le viene con diez pedazos, perfecta para tres o cuatro personas. ¿La prefiere con masa original o fina? Y si quiere, le puedo agregar un pan de ajo o una bebida familiar para completar el combo. ¿Cómo la armamos?"
   },
   {
    "q": "cliente",
    "t": "Masa fina."
   },
   {
    "q": "camila",
    "t": "Listo, Luis, Criolla mediana con masa fina. ¿Le agrego pan de ajo, papas Hornero o alguna bebida familiar para acompañar? Si"
   },
   {
    "q": "cliente",
    "t": "No."
   },
   {
    "q": "camila",
    "t": "no, seguimos directo al cierre."
   },
   {
    "q": "cliente",
    "t": "No."
   },
   {
    "q": "camila",
    "t": "Perfecto, solo la Súper Criolla mediana con masa fina. El subtotal es quince con treinta. ¿Desea ají extra por un dólar o mayonesa picante por veinticinco centavos, o lo dejamos así nomás?"
   },
   {
    "q": "cliente",
    "t": "No, así está bien."
   },
   {
    "q": "camila",
    "t": "Listo, Luis. Le leo el pedido: Súper Criolla mediana, masa fina, para domicilio en Cumbayá, dirección Elisa Mariño, [número], y Ángel Rojas. Total quince con treinta más el envío de dos con cincuenta, suman diecisiete con ochenta. ¿Confirmamos?"
   },
   {
    "q": "cliente",
    "t": "Sí."
   },
   {
    "q": "camila",
    "t": "Luis, ¿cómo prefiere pagar: en efectivo, transferencia o con tarjeta por el link? Y para la factura, ¿a consumidor final o con datos?"
   },
   {
    "q": "cliente",
    "t": "Eh... Con tarjeta, por favor. Y... Y. Con factura a mi nombre."
   },
   {
    "q": "camila",
    "t": "Perfecto, Luis, pago con tarjeta y factura a su nombre. ¿Me dicta su número de cédula, por favor? Se lo repito para que quede bien en la factura."
   },
   {
    "q": "cliente",
    "t": "[cédula]."
   },
   {
    "q": "camila",
    "t": "Luis, ¿me confirma si su cédula es [cédula dictada]? ¿O es un RUC de"
   },
   {
    "q": "cliente",
    "t": "Correcto."
   },
   {
    "q": "camila",
    "t": "trece dígitos? Me parece que faltan números."
   },
   {
    "q": "cliente",
    "t": "No, está bien."
   },
   {
    "q": "cliente",
    "t": "[cédula]."
   },
   {
    "q": "camila",
    "t": "Listo, Luis, ya queda la factura a su nombre con la cédula [cédula dictada]. Para que le lleguen sus links, toque el botón verde de WhatsApp que ve en la pantalla, abajo a la izquierda, y envíe el mensaje que ya está escrito. En segundos le llegan dos links: uno para pagar con tarjeta y otro para seguir a su motorizado en el mapa."
   },
   {
    "q": "camila",
    "t": "Su pedido ya va al horno, en unos treinta minutos le llega. ¡Gracias por elegir El Hornero, Luis! ¿Necesita algo más antes de que cuelgue?"
   },
   {
    "q": "cliente",
    "t": "No, nada más. Gracias."
   },
   {
    "q": "camila",
    "t": "¡Gracias, Luis! Que disfrute la pizza y tenga un excelente día. Hasta la próxima."
   }
  ]
 },
 {
  "conversacion_id": "CV-REAL-20260914-0747",
  "origen": "real",
  "canal": "llamada",
  "contacto": "Luis Barragán",
  "telefono": null,
  "local_id": "cumbaya",
  "inicio": 1789390020000,
  "duracion_s": 292,
  "resultado": "pedido",
  "motivo_no_cierre": null,
  "cedula_capturada": false,
  "pedido_id": null,
  "total": 11.1,
  "modalidad": "domicilio",
  "resumen": "Camila reconoció a Luis, le confirmó la dirección y le ofreció repetir su pedido anterior. Luis preguntó por el Súper Chivito y por la Criolla, pidió las promociones y se decidió por una lasaña de carne con una Coca-Cola personal. Pago con tarjeta por el link y factura a consumidor final. Colgó mientras Camila explicaba cómo recibir los links.",
  "datos": {
   "Cliente": "Luis Barragán (cliente que vuelve)",
   "Dirección confirmada": "Cumbayá, Elisa Mariño [número] y Ángel Rojas",
   "Local asignado": "Cumbayá",
   "Modalidad": "A domicilio",
   "Pedido": "Lasaña de carne × 1 · $8.80; Coca-Cola personal × 1 · $2.30",
   "Total a pagar": "$11.10",
   "Pago": "Tarjeta, por el link",
   "Factura": "Consumidor final"
  },
  "acciones": [
   "Consulta al menú",
   "Guardar pedido",
   "Guardar total",
   "Guardar modalidad",
   "Guardar local",
   "Guardar link"
  ],
  "nota": "El cliente colgó mientras Camila explicaba cómo recibir los links: la transcripción termina a mitad de frase.",
  "transcripcion": [
   {
    "q": "camila",
    "t": "¡Hola, Luis! Qué gusto, le habla Camila de El Hornero. Ya tengo sus datos: le confirmo la entrega en un segundo y le tomo el pedido."
   },
   {
    "q": "camila",
    "t": "Luis, ¿sigue por ahí? Solo necesito que me confirme si la entrega es en Cumbayá, en Elisa Mariño, [número], y Ángel Rojas. ¿Está correcto para enviar su pedido?"
   },
   {
    "q": "cliente",
    "t": "Sí."
   },
   {
    "q": "camila",
    "t": "Perfecto, Luis, gracias por confirmar. La última vez se llevó una Súper Criolla mediana, masa fina, una unidad. ¿Repetimos ese pedido o le antojo algo diferente hoy?"
   },
   {
    "q": "cliente",
    "t": "No, quiero otra cosa."
   },
   {
    "q": "camila",
    "t": "Listo, Luis, de una. ¿Para cuántas personas es el pedido hoy y qué se le antoja: pizza, pollo, pasta, algo diferente? Así le recomiendo lo ideal."
   },
   {
    "q": "cliente",
    "t": "A ver, eh... cuéntame: ¿qué tiene el Super Chivito?"
   },
   {
    "q": "camila",
    "t": "El Súper Chivito viene con lomo fino, tocino, queso mozzarella, pimiento, lechuga, jamón y tomate. Es bien completo y viene en pan suave, tipo sánduche grande. ¿Le gustaría con papas o solo el Chivito, Luis?"
   },
   {
    "q": "cliente",
    "t": "No. Quiero ver la pizza criolla."
   },
   {
    "q": "cliente",
    "t": "¿Qué tiene la pizza criolla?"
   },
   {
    "q": "camila",
    "t": "La pizza Criolla lleva tocino y choclo, Luis. Es una de las más pedidas, bien sabrosa y con masa original o fina, como prefiera. ¿Le gustaría en tamaño mediana, grande, o quiere que le recomiende según cuántos son?"
   },
   {
    "q": "camila",
    "t": "Luis, ¿sigue por ahí? Si quiere le ayudo a elegir el tamaño de la pizza Criolla según cuántos son, o me"
   },
   {
    "q": "cliente",
    "t": "Ah, no, aquí sigo."
   },
   {
    "q": "camila",
    "t": "dice si prefiere mediana,"
   },
   {
    "q": "cliente",
    "t": "Quiero que me... quiero que me ayudes con la lasaña, por favor."
   },
   {
    "q": "camila",
    "t": "Claro, Luis. Tenemos lasaña de carne, de pollo o de ricotta con espinaca, todas a ocho con ochenta. Vienen bien servidas, con salsa y queso gratinado. ¿Cuál le"
   },
   {
    "q": "cliente",
    "t": "Ya."
   },
   {
    "q": "camila",
    "t": "provoca?"
   },
   {
    "q": "cliente",
    "t": "Cuéntame, ¿me puedes ayudar con una promoción?"
   },
   {
    "q": "camila",
    "t": "Por supuesto, Luis. Le cuento las ofertas del momento: la pizza de dieciséis pedazos está en siete con noventa y nueve, la de doce pedazos en seis con noventa y nueve, y la de veinticuatro pedazos en diez con noventa y nueve — todas con un ingrediente a elección. Rinden bastante y salen rapidito. ¿Le gustaría aprovechar alguna de estas promos o seguimos con la lasaña?"
   },
   {
    "q": "cliente",
    "t": "No, quiero la lasaña por."
   },
   {
    "q": "camila",
    "t": "Perfecto, Luis. ¿La lasaña la prefiere de carne, de pollo o de ricotta con espinaca?"
   },
   {
    "q": "cliente",
    "t": "De carne, por favor."
   },
   {
    "q": "camila",
    "t": "Listo, Luis, una lasaña de carne. ¿Le gustaría agregar pan de ajo, ensalada o alguna bebida para acompañar?"
   },
   {
    "q": "camila",
    "t": "Luis, ¿sigue por ahí? Solo para confirmar si le agrego algo más a la lasaña de carne, o la dejamos solita. ¿Le ayudo con"
   },
   {
    "q": "cliente",
    "t": "Regálame una"
   },
   {
    "q": "camila",
    "t": "bebida o pan de"
   },
   {
    "q": "cliente",
    "t": "Coca-Cola, por favor."
   },
   {
    "q": "camila",
    "t": "¡Perfecto, Luis! Le pongo una lasaña de carne y una Coca-Cola. ¿La Coca-Cola la prefiere personal o familiar? La personal es dos con treinta y la familiar es tres con ochenta."
   },
   {
    "q": "cliente",
    "t": "Personal, por favor."
   },
   {
    "q": "camila",
    "t": "Listo, Luis. Entonces va una lasaña de carne y una Coca-Cola personal. El total sería once con diez. ¿Le gustaría agregar pan de ajo, ají extra o lo dejamos así?"
   },
   {
    "q": "cliente",
    "t": "No, así está bien, gracias."
   },
   {
    "q": "camila",
    "t": "Perfecto, Luis. Le leo el pedido: una lasaña de carne, ocho con ochenta, y una Coca-Cola personal, dos con treinta. Total, once con diez, para domicilio en Cumbayá, Elisa Mariño, [número], y Ángel Rojas. ¿Confirmamos?"
   },
   {
    "q": "cliente",
    "t": "Confirmado."
   },
   {
    "q": "camila",
    "t": "Listo, Luis, pedido confirmado: una lasaña de carne y una Coca-Cola personal, total once con diez, para domicilio en Cumbayá. ¿Cómo prefiere pagar: en efectivo, transferencia o con tarjeta por el link?"
   },
   {
    "q": "cliente",
    "t": "Con tarjeta por el link."
   },
   {
    "q": "camila",
    "t": "Perfecto, Luis. ¿La factura la desea como consumidor final o con datos? Si es con datos, solo necesito la cédula o RUC y el correo."
   },
   {
    "q": "cliente",
    "t": "Sí. A ver, quiero que sea con consumidor final."
   },
   {
    "q": "camila",
    "t": "Listo, Luis. Para que le lleguen sus links, toque el botón verde de WhatsApp que ve en la pantalla, abajo a la izquierda, y envíe el mensaje que ya está escrito. En segundos le llegan dos links: uno para pagar con tarjeta y otro para seguir a su motorizado en el mapa cuando"
   }
  ]
 },
 {
  "conversacion_id": "CV-REAL-20260914-0820",
  "origen": "real",
  "canal": "llamada",
  "contacto": "Luis Barragán",
  "telefono": null,
  "local_id": "cumbaya",
  "inicio": 1789392000000,
  "duracion_s": 24,
  "resultado": "colgo",
  "motivo_no_cierre": null,
  "cedula_capturada": false,
  "pedido_id": null,
  "total": null,
  "modalidad": "domicilio",
  "resumen": "Camila saludó a Luis y empezó a confirmar los datos de entrega en Cumbayá. La llamada se cortó a los 24 segundos.",
  "datos": {},
  "acciones": [],
  "nota": "La llamada se cortó: la transcripción termina a mitad de frase.",
  "transcripcion": [
   {
    "q": "camila",
    "t": "¡Hola, Luis! Qué gusto, le habla Camila de El Hornero. Ya tengo sus datos: le confirmo la entrega en un segundo y le tomo el pedido."
   },
   {
    "q": "cliente",
    "t": "Sí, hola, Camila, ¿cómo estás?"
   },
   {
    "q": "camila",
    "t": "¡Muy bien, Luis, gracias por preguntar! Listo, le confirmo rapidito: su pedido va al sector Cumbayá, a Elisa Mariño, [número]"
   }
  ]
 },
 {
  "conversacion_id": "CV-REAL-20260914-0822",
  "origen": "real",
  "canal": "llamada",
  "contacto": "Jonathan Leal",
  "telefono": null,
  "local_id": "republica-del-salvador",
  "inicio": 1789392120000,
  "duracion_s": 203,
  "resultado": "pedido",
  "motivo_no_cierre": null,
  "cedula_capturada": false,
  "pedido_id": null,
  "total": 16.15,
  "modalidad": "domicilio",
  "resumen": "Jonathan pidió una pizza y preguntó por las promociones vigentes. Camila las consultó en vivo y las explicó, armó una Pepperoni Especial mediana de masa original con una Coca-Cola familiar, confirmó el total con envío a domicilio en La Carolina, le indicó cómo recibir los links y le envió la app por WhatsApp.",
  "datos": {
   "Cliente": "Jonathan Leal",
   "Sector": "La Carolina",
   "Local asignado": "República del Salvador (cubre La Carolina)",
   "Modalidad": "A domicilio",
   "Pedido": "Pepperoni Especial mediana, masa original × 1 · $11.15; Coca-Cola familiar × 1 · $2.50",
   "Envío": "$2.50",
   "Total a pagar": "$16.15",
   "Promociones": "Consultadas en vivo",
   "App enviada": "Sí, por WhatsApp"
  },
  "acciones": [
   "Consulta al menú",
   "Consulta de promociones",
   "Guardar link",
   "Guardar local",
   "Guardar pedido",
   "Guardar total",
   "Guardar modalidad",
   "Enviar app"
  ],
  "nota": "Al inicio el micrófono captó la voz de Camila como si fuera del cliente (eco del altavoz); por eso hay frases repetidas.",
  "transcripcion": [
   {
    "q": "camila",
    "t": "¡Hola, Jonathan! Qué gusto, le"
   },
   {
    "q": "cliente",
    "t": "Hola, Jonathan. Un gusto, te"
   },
   {
    "q": "camila",
    "t": "habla Camila de El Hornero. Ya tengo sus"
   },
   {
    "q": "cliente",
    "t": "habla Camila de Lorna."
   },
   {
    "q": "camila",
    "t": "¡Hola,"
   },
   {
    "q": "cliente",
    "t": "Hola, Jonathan. ¿Qué coincidencia!"
   },
   {
    "q": "camila",
    "t": "Jonathan! Qué coincidencia, casi tocayas de nombre"
   },
   {
    "q": "cliente",
    "t": "Hola, hola, ¿cómo estás?"
   },
   {
    "q": "cliente",
    "t": "cómo estás?"
   },
   {
    "q": "camila",
    "t": "¡Hola,"
   },
   {
    "q": "cliente",
    "t": "Hola, Jonathan."
   },
   {
    "q": "camila",
    "t": "Jonathan! Todo bien por acá, gracias por preguntar. ¿Y tú, cómo vas hoy? ¿Listo para un antojo de El Hornero o solo pasabas a saludar?"
   },
   {
    "q": "cliente",
    "t": "Ah, no, quiero ordenar una pizza. ¿Cuáles son sus promociones ahorita?"
   },
   {
    "q": "camila",
    "t": "¡De una, Jonathan! Las promociones vigentes ahorita son estas:"
   },
   {
    "q": "camila",
    "t": "- Oferta de dieciséis pedazos a siete noventa y nueve, con un ingrediente, perfecta para cuatro personas."
   },
   {
    "q": "camila",
    "t": "- Oferta de doce pedazos a seis noventa y nueve, también de un ingrediente."
   },
   {
    "q": "camila",
    "t": "- Oferta de veinticuatro pedazos a diez noventa y nueve, para grupos grandes."
   },
   {
    "q": "camila",
    "t": "- Si tu pedido supera treinta dólares, puedes añadir una pizza precocida de dieciséis pedazos por cinco noventa y nueve para hornear en casa."
   },
   {
    "q": "camila",
    "t": "¿Te animas con alguna de estas o prefieres que te recomiende según cuántos son?"
   },
   {
    "q": "camila",
    "t": "Jonathan, ¿sigues por ahí? Si quieres te ayudo a elegir la pizza según cuántos son o lo que se les antoje. ¿Te animas con alguna de las ofertas o prefieres que te recomiende algo especial?"
   },
   {
    "q": "cliente",
    "t": "Ah. Una, quiero una, una pizza nomás, pepperoni mediana."
   },
   {
    "q": "cliente",
    "t": "Ah, y una Coca-Cola, por favor."
   },
   {
    "q": "camila",
    "t": "Perfecto, Jonathan. Entonces te sale una Pepperoni Especial mediana, diez pedazos, a once con quince, y una Coca-Cola familiar a dos con cincuenta. ¿La pizza la prefieres con masa original o fina?"
   },
   {
    "q": "cliente",
    "t": "Original, por favor."
   },
   {
    "q": "camila",
    "t": "Listo, Jonathan. Entonces tenemos: una Pepperoni Especial mediana, masa original, once con quince, y una Coca-Cola familiar, dos con cincuenta. ¿Te gustaría añadir pan de ajo, papas Hornero o algún postre para completar"
   },
   {
    "q": "cliente",
    "t": "Nada, nada, es todo,"
   },
   {
    "q": "camila",
    "t": "el pedido, o lo"
   },
   {
    "q": "cliente",
    "t": "es todo, es todo."
   },
   {
    "q": "camila",
    "t": "Perfecto, Jonathan. Te leo el pedido completo: una Pepperoni Especial mediana, masa original, once con quince, y una Coca-Cola familiar, dos con cincuenta. El subtotal es trece con sesenta y cinco. El envío es dos con cincuenta, porque el total es menor a veinticinco dólares. El total a pagar es dieciséis con quince, a domicilio en Edificio IQON, sector La Carolina."
   },
   {
    "q": "camila",
    "t": "¿Confirmamos?"
   },
   {
    "q": "cliente",
    "t": "Sí, por favor."
   },
   {
    "q": "camila",
    "t": "Listo, Jonathan, tu pedido ya va al horno. Para que te lleguen los links, toca el botón verde de WhatsApp que ves en la pantalla, abajo a la izquierda, y envía el mensaje que ya está escrito. En segundos te llegan dos links: uno para pagar con tarjeta si prefieres, y otro para seguir a tu motorizado en el mapa cuando salga."
   },
   {
    "q": "camila",
    "t": "Y te mando ahorita la app de El Hornero a este mismo número: te llega el botón de descargar, la instalas en un toque y el próximo pedido lo haces en segundos, ¿te parece?"
   },
   {
    "q": "cliente",
    "t": "Va, gracias."
   },
   {
    "q": "camila",
    "t": "Ya te llegó, Jonathan, revisa tu WhatsApp. Su pedido ya va al horno, en unos treinta minutos te llega. ¿Necesitas algo más antes de que me despida?"
   },
   {
    "q": "cliente",
    "t": "No, es todo, gracias."
   },
   {
    "q": "camila",
    "t": "¡Gracias por elegir El Hornero, Jonathan!"
   }
  ]
 },
 {
  "conversacion_id": "CV-REAL-20260914-0828",
  "origen": "real",
  "canal": "llamada",
  "contacto": "Luis Barragán",
  "telefono": null,
  "local_id": "cumbaya",
  "inicio": 1789392480000,
  "duracion_s": 117,
  "resultado": "pedido",
  "motivo_no_cierre": null,
  "cedula_capturada": false,
  "pedido_id": null,
  "total": 11.1,
  "modalidad": "domicilio",
  "resumen": "Camila reconoció a Luis, confirmó su dirección en Cumbayá y le ofreció repetir el pedido anterior. Luis aceptó: lasaña de carne y Coca-Cola personal por $11.10. Camila le envió la app por WhatsApp y confirmó la entrega en unos 30 minutos.",
  "datos": {
   "Cliente": "Luis Barragán (cliente que vuelve)",
   "Dirección confirmada": "Cumbayá, Elisa Mariño [número]",
   "Local asignado": "Cumbayá",
   "Modalidad": "A domicilio",
   "Pedido": "Lasaña de carne × 1; Coca-Cola personal × 1",
   "Total a pagar": "$11.10",
   "App enviada": "Sí, por WhatsApp"
  },
  "acciones": [
   "Guardar modalidad",
   "Guardar local",
   "Guardar pedido",
   "Guardar total",
   "Guardar link",
   "Enviar app"
  ],
  "nota": null,
  "transcripcion": [
   {
    "q": "camila",
    "t": "¡Hola, Luis! Qué gusto, le habla Camila de El Hornero. Ya tengo sus datos: le confirmo la entrega en un segundo y le tomo el pedido."
   },
   {
    "q": "cliente",
    "t": "Hola, Camila."
   },
   {
    "q": "camila",
    "t": "Luis, ¿sigue en línea? Solo necesito que me confirme si la entrega es en Cumbayá, en Elisa Mariño [número], para avanzar con su pedido."
   },
   {
    "q": "cliente",
    "t": "Sí, por favor."
   },
   {
    "q": "camila",
    "t": "¡Perfecto, Luis! Entonces su pedido va al sector Cumbayá, a Elisa Mariño [número]. ¿Correcto?"
   },
   {
    "q": "cliente",
    "t": "Correcto."
   },
   {
    "q": "camila",
    "t": "Listo, Luis. ¿Le antojo lo mismo de la última vez — una lasaña de carne y una Coca-Cola personal — o quiere probar algo diferente hoy?"
   },
   {
    "q": "cliente",
    "t": "No, el mismo pedido, gracias."
   },
   {
    "q": "camila",
    "t": "De una, Luis. Le leo el pedido para confirmar: una lasaña de carne y una Coca-Cola personal. El total es once dólares con diez, a domicilio en Cumbayá, Elisa Mariño [número]. ¿Confirmamos?"
   },
   {
    "q": "cliente",
    "t": "Sí."
   },
   {
    "q": "cliente",
    "t": "Camila."
   },
   {
    "q": "camila",
    "t": "Listo, Luis, su pedido ya va al horno: una lasaña de carne y una Coca-Cola personal, total once con diez, a domicilio en Cumbayá, Elisa Mariño [número]. Le mando ahorita a este mismo número la app de El Hornero: le llega el botón de descargar, la instala en un toque y el próximo pedido lo hace en segundos. Ya le llegó, revise su WhatsApp."
   },
   {
    "q": "camila",
    "t": "¿Necesita algo más o le ayudo con otra cosa?"
   },
   {
    "q": "cliente",
    "t": "No, no quiero otra cosa."
   },
   {
    "q": "camila",
    "t": "Perfecto, Luis. Su pedido ya va al horno, en unos treinta minutos le llega. ¡Gracias por elegir El Hornero, que tenga un excelente día!"
   }
  ]
 }
]

// Idempotente: mete las llamadas que falten en el cajón activo (demo o vivo).
// Se llama al abrir el tablero y en cada refresco, porque la siembra de la
// demostración borra todo cuando envejece.
export function importarLlamadasReales() {
  const db = S.estado()
  const faltan = LLAMADAS_REALES.filter((l) => !db.conversaciones[l.conversacion_id])
  if (!faltan.length) return 0
  S.enBloque(() => { for (const l of faltan) S.registrarConversacion(l) })
  return faltan.length
}
