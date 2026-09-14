// Número de WhatsApp que atiende los pedidos (la demo usa el de Concierge; al cerrar,
// va aquí el número oficial de El Hornero). Sin +, sin espacios.
export const WA_NUMERO = '593968943661'

// Link "click to chat": abre WhatsApp con el mensaje ya escrito; el cliente solo toca Enviar.
// Ese primer mensaje abre la ventana de 24 h de Meta y dispara el envío de los links.
export const waLink = (texto) => `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(texto)}`

export const MENSAJE_LINKS = 'Hola Camila, ya hice mi pedido por voz. Envíame mis links de pago y seguimiento 🍕'
