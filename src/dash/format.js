// Reglas de formato del tablero. Ninguna pantalla formatea por su cuenta.
// Ecuador continental es UTC-5 y no mueve el reloj.

import { locale } from './i18n.js'
export const TZ = 'America/Guayaquil'

// El menú impreso y el recibo escriben $14.50. Si el tablero dijera $14,50
// (que es lo que devuelve es-EC), alguien leería $1.284 como un dólar con 28.
export const money = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const num = (n) => Number(n || 0).toLocaleString('en-US')

// Para los ejes de los gráficos: $1,500 sin centavos, que a ese tamaño no se leen.
export const money0 = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

// La única definición de "hoy" en todo el tablero. Sin esto, a las 20:30 de
// Quito el servidor en UTC ya cree que es mañana y Hoy muestra $0.00.
export const dayKey = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)

export const hhmm = (d) =>
  new Intl.DateTimeFormat(locale(), { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(typeof d === 'number' ? new Date(d) : d)

export const fecha = (d) =>
  new Intl.DateTimeFormat(locale(), { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(typeof d === 'number' ? new Date(d) : d)

export const fechaLarga = (d) =>
  new Intl.DateTimeFormat(locale(), { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
    .format(typeof d === 'number' ? new Date(d) : d)

export const dur = (s) => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`)

// Cero no es lo mismo que sin dato. "0" = medimos y fue cero. "—" = aún no medimos.
export const SIN_DATO = '—'

// Umbrales de volumen. Cada componente pregunta antes de dibujar, para que
// nadie encienda un gráfico antes de tiempo por entusiasmo.
export const UMBRALES = {
  porcentaje: 20,      // denominador mínimo para mostrar un %
  comparacion: 5,      // pedidos mínimos en la base para mostrar variación
  serie14: 14,         // días de historia para la barra de 14 días
  histograma: 40,      // pedidos para el histograma de ticket
  porHora: 400,        // pedidos acumulados para Ventas por hora
}

// Con 11 pedidos al día, "79 %" sacado de 11/14 promete una precisión que no
// existe: mañana cae a 64 % porque una persona colgó.
export function tasa(parte, total) {
  if (!total) return { texto: SIN_DATO, exacto: false }
  if (total < UMBRALES.porcentaje) return { texto: `${parte} ${locale() === 'en-US' ? 'of' : 'de'} ${total}`, exacto: false }
  return { texto: `${Math.round((parte / total) * 100)} %`, exacto: true }
}

// Nunca "+300%" sobre una base de 2 pedidos.
export function variacion(actual, base, unidad = 'dinero') {
  if (base == null) return null
  const d = actual - base
  const dir = d > 0 ? 'up' : d < 0 ? 'down' : 'flat'
  const glifo = d > 0 ? '▲' : d < 0 ? '▼' : '=';
  const abs = unidad === 'dinero' ? money(Math.abs(d)) : `${Math.abs(d)}`
  return { dir, glifo, texto: `${glifo} ${abs}` }
}

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
