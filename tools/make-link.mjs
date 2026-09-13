#!/usr/bin/env node
// Genera links CORTOS y bonitos para un pedido, sin servidor.
//
//   https://elhornero.conciergeai.space/seguir/EHK3M8P
//   https://elhornero.conciergeai.space/pagar/EHK3M8P
//
// Cómo: escribe una carpeta propia por pedido dentro de public/, con el pedido
// incrustado en el HTML en vez de en la URL. Vite copia public/ tal cual, así que
// GitHub Pages responde 200 y el robot de WhatsApp puede leer las etiquetas og:
// — y como las escribimos aquí, la tarjeta de vista previa lleva el número de
// pedido y el monto REALES de ese pedido.
//
// Límite honesto: cada pedido necesita un despliegue. Sirve para demostraciones y
// para pedidos puntuales. Para producción hace falta el Worker de backend/.
//
// Uso:  node tools/make-link.mjs pedido.json
//       node tools/make-link.mjs --demo

import fs from 'node:fs'
import path from 'node:path'
import LZString from 'lz-string'

const ORIGIN = 'https://elhornero.conciergeai.space'
const ROOT = path.resolve(import.meta.dirname, '..')
const money = (n) => '$' + Number(n || 0).toFixed(2)

const MODES = ['A domicilio', 'Para llevar']
const PAYS = ['efectivo', 'transferencia', 'tarjeta']
const FACTS = ['consumidor_final', 'con_datos']
const idx = (l, v) => Math.max(0, l.indexOf(v))
const r2 = (n) => Math.round((n || 0) * 100) / 100
const r5 = (n) => Math.round(n * 1e5) / 1e5

// Mismo formato v1 que src/api.js
function pack(o) {
  const d = o.direccion, ds = o.dest
  return LZString.compressToEncodedURIComponent(JSON.stringify([
    1, o.id, o.cliente?.nombre || '', o.cliente?.telefono || '',
    o.cliente?.cedula ? String(o.cliente.cedula).slice(-4) : '',
    idx(MODES, o.modalidad),
    d ? [d.calle || '', d.referencia || '', d.sector || ''] : 0,
    (o.items || []).map((x) => [x.nombre, x.cantidad, x.precio]),
    r2(o.subtotal), r2(o.envio), r2(o.iva), r2(o.total),
    idx(PAYS, o.payMethod), o.cambioPara || 0, idx(FACTS, o.factura),
    Math.round((o.createdAt || Date.now()) / 1000),
    ds ? [r5(ds.lat), r5(ds.lng)] : 0,
    o.paid === true ? 1 : o.paid === false ? 0 : 2,
    o.speed || 1,
  ]))
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page({ id, payload, route, title, desc, img }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="El Hornero">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ORIGIN}/assets/${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${ORIGIN}/${route === 'pedido' ? 'seguir' : route === 'pago' ? 'pagar' : 'entrega'}/${id}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ORIGIN}/assets/${img}">
<meta name="theme-color" content="#0E5A33">
<style>body{margin:0;font:15px -apple-system,system-ui,sans-serif;color:#0E5A33;display:grid;place-items:center;height:100vh;background:#fff}</style>
<script>location.replace('/#/${route}/${id}?d=${payload}')</script>
</head>
<body><p>Abriendo su pedido…</p></body>
</html>
`
}

function build(o) {
  const payload = pack(o)
  const short = (f) => `${ORIGIN}/${f}/${o.id}`
  const sector = o.direccion?.sector ? ` · ${o.direccion.sector}` : ''

  const files = [
    { folder: 'seguir', route: 'pedido', img: 'og-seguir.png',
      title: 'Su pedido va en camino 🛵',
      desc: `Pedido ${o.id} · ${money(o.total)}${sector}. Vea a su motorizado en el mapa en vivo.` },
    { folder: 'pagar', route: 'pago', img: 'og-pagar.png',
      title: `Pague su pedido · ${money(o.total)}`,
      desc: `Pedido ${o.id} de El Hornero. Pago con tarjeta en treinta segundos.` },
    { folder: 'entrega', route: 'repartidor', img: 'og-seguir.png',
      title: `Entrega · Pedido ${o.id}`,
      desc: 'Pantalla del motorizado.' },
  ]

  for (const f of files) {
    const dir = path.join(ROOT, 'public', f.folder, o.id)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'index.html'),
      page({ id: o.id, payload, route: f.route, title: f.title, desc: f.desc, img: f.img }))
  }

  return { pago: short('pagar'), seguimiento: short('seguir'), repartidor: short('entrega'), payload }
}

// ---- entrada ----
const arg = process.argv[2]
let order
if (!arg || arg === '--demo') {
  order = {
    id: 'EHK3M8P',
    cliente: { nombre: 'Jon', telefono: '0968943661', cedula: '1712345678' },
    modalidad: 'A domicilio',
    direccion: { calle: 'Av. 12 de Octubre y La Coruña', referencia: 'Edificio Girasoles, piso 4', sector: 'La Floresta, Quito' },
    items: [
      { nombre: 'Pizza El Hornero M', cantidad: 1, precio: 15.30 },
      { nombre: 'Alitas Hornero', cantidad: 1, precio: 6.75 },
      { nombre: 'Limonada de Jengibre', cantidad: 2, precio: 2.50 },
    ],
    subtotal: 27.05, envio: 0, iva: 3.53, total: 27.05,
    payMethod: 'tarjeta', cambioPara: null, factura: 'consumidor_final',
    createdAt: Date.now(), dest: { lat: -0.2010, lng: -78.4750 },
    paid: false, speed: 1,
  }
} else {
  order = JSON.parse(fs.readFileSync(arg, 'utf8'))
  order.createdAt = order.createdAt || Date.now()
}

const out = build(order)
console.log('Pedido   ', order.id, '·', money(order.total))
console.log('Pago     ', out.pago, `(${out.pago.length} caracteres)`)
console.log('Seguir   ', out.seguimiento, `(${out.seguimiento.length} caracteres)`)
console.log('Repartidor', out.repartidor)
console.log('\nFalta publicar:  npm run deploy')
