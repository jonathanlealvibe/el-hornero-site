// Datos de ejemplo para la demostración. Volumen realista de un piloto:
// pocos locales encendidos y entre 9 y 26 pedidos al día, que es exactamente
// la situación en la que el tablero tiene que verse serio.
import { MENU } from '../data.js'
import { LOCALES } from '../locales.js'
import * as S from './store.js'
import { dayKey } from './format.js'

// Generador determinista: la demo se ve igual cada vez que se abre.
let semilla = 20260913
const rnd = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296 }
const pick = (a) => a[Math.floor(rnd() * a.length)]
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1))

// Cédula ecuatoriana con dígito verificador correcto, para que la validación
// del tablero no marque toda la demo como inválida.
function cedulaValida() {
  const prov = String(entre(1, 24)).padStart(2, '0')
  const cuerpo = prov + entre(0, 5) + String(entre(0, 999999)).padStart(6, '0')
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let v = +cuerpo[i] * (i % 2 === 0 ? 2 : 1)
    if (v > 9) v -= 9
    suma += v
  }
  return cuerpo + ((10 - (suma % 10)) % 10)
}

const celular = () => '09' + String(entre(10000000, 99999999)).slice(0, 8)
const fijo = () => '02' + String(entre(2000000, 2999999))

const NOMBRES = ['Mauricio', 'Luis', 'Andrea', 'Paulina', 'Diego', 'Gabriela', 'Santiago', 'Verónica',
  'Esteban', 'Carolina', 'Fernando', 'Daniela', 'Jorge', 'María José', 'Cristian', 'Belén',
  'Xavier', 'Doménica', 'Patricio', 'Silvana', 'Byron', 'Johanna', 'Marco', 'Ximena']
const APELLIDOS = ['Barragán', 'Andrade', 'Cevallos', 'Jaramillo', 'Salazar', 'Vaca', 'Moncayo',
  'Espinosa', 'Zambrano', 'Herrera', 'Pazmiño', 'Terán', 'Guerrero', 'Villacís', 'Ponce', 'Yépez']

const SECTORES = ['La Carolina', 'La Floresta', 'González Suárez', 'Cumbayá', 'El Batán',
  'La Pradera', 'Bellavista', 'Guápulo', 'Quito Tenis', 'El Inca', 'Tumbaco', 'Ponceano']
const CALLES = ['Av. Amazonas y Naciones Unidas', 'Isabel La Católica y Coruña',
  'Av. 6 de Diciembre y Portugal', 'Av. República del Salvador y Suecia',
  'Av. Eloy Alfaro y Portugal', 'Av. 12 de Octubre y Cordero', 'Shyris y Río Coca',
  'Av. Interoceánica y Francisco de Orellana', 'Av. de la Prensa y Vaca de Castro']
const REFERENCIAS = ['Edificio Torres del Parque, piso 4', 'Casa esquinera portón verde',
  'Frente al parque', 'Junto a la farmacia', 'Edificio Girasoles, dpto 302',
  'Casa blanca de dos pisos', 'Entrada por la calle posterior']

// Solo los locales del piloto: encender los 29 con 11 pedidos al día haría que
// 21 sedes muestren cero y el tablero parezca roto.
const PILOTO = ['floresta', 'gonzalez-suarez', 'republica-del-salvador', 'veintimilla',
  'cumbaya', 'isla-floreana', 'bicentenario', 'tumbaco', 'ponciano', 'quitumbe', 'plaza-del-valle', 'carapungo']

// Las diez motos que la demo enseña ahora mismo, todas en el centro-norte de
// Quito (Floresta, González Suárez, República del Salvador, Veintimilla, Isla
// Floreana). Con Cumbayá, Quitumbe o Carapungo el mapa compacto se aleja a todo
// el valle y los pines se funden en uno con un número. Rumbo y distancia de
// cada casa están elegidos a mano para que los diez pines queden a más de 60 px
// entre sí en el encuadre de 400 px, también mientras avanzan hacia la casa.
// Los minutos fuera van de 4 a 28; dos pasan de 35 a propósito (se ven tarde).
const MOTOS = [
  { local: 'isla-floreana', rumbo: 80, metros: 1200, min: 4, sector: 'El Inca' },
  { local: 'republica-del-salvador', rumbo: 90, metros: 700, min: 8, sector: 'Bellavista' },
  { local: 'veintimilla', rumbo: 340, metros: 1400, min: 11, sector: 'La Pradera' },
  { local: 'isla-floreana', rumbo: 270, metros: 1400, min: 14, sector: 'Quito Tenis' },
  { local: 'floresta', rumbo: 90, metros: 700, min: 18, sector: 'La Floresta' },
  { local: 'republica-del-salvador', rumbo: 250, metros: 1300, min: 22, sector: 'La Carolina' },
  { local: 'floresta', rumbo: 70, metros: 1500, min: 25, sector: 'Guápulo' },
  { local: 'gonzalez-suarez', rumbo: 20, metros: 1000, min: 28, sector: 'Bellavista' },
  { local: 'veintimilla', rumbo: 290, metros: 1300, min: 37, sector: 'Santa Clara' },
  { local: 'gonzalez-suarez', rumbo: 310, metros: 800, min: 43, sector: 'La Paz' },
]
// Un punto a `metros` del local, con rumbo en grados desde el norte.
const desplazar = (sede, rumbo, metros) => {
  const b = (rumbo * Math.PI) / 180
  return { lat: sede.lat + (metros * Math.cos(b)) / 111320, lng: sede.lng + (metros * Math.sin(b)) / (111320 * Math.cos((sede.lat * Math.PI) / 180)) }
}
const metrosEntre = (a, b) => Math.hypot((a.lat - b.lat) * 111320, (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180))

// Las cinco sedes del centro: todo lo que sale a la calle en la demo sale de
// aquí, para que el mapa compacto nunca tenga que alejarse a todo el valle.
const CENTRO = ['floresta', 'gonzalez-suarez', 'republica-del-salvador', 'veintimilla', 'isla-floreana']
const SECTORES_DE = {
  floresta: ['La Floresta', 'Guápulo'], 'gonzalez-suarez': ['Bellavista', 'La Paz', 'González Suárez'],
  'republica-del-salvador': ['La Carolina', 'Bellavista'], veintimilla: ['La Pradera', 'Santa Clara', 'La Mariscal'],
  'isla-floreana': ['El Inca', 'Quito Tenis', 'El Batán'],
}

// El recuadro del centro donde viven todas las casas de la demo: 4.3 km de
// norte a sur, lo que cabe en el mapa compacto a zoom 13.5. Una casa fuera
// alejaría el encuadre y los pines volverían a fundirse.
const ARENA = { latMin: -0.209, latMax: -0.17, lngMin: -78.512, lngMax: -78.462 }
const enArena = (c) => c.lat >= ARENA.latMin && c.lat <= ARENA.latMax && c.lng >= ARENA.lngMin && c.lng <= ARENA.lngMax

// --- la flota prevista: dónde estará cada moto en los próximos minutos ------
// Una moto de demo recorre la recta local → casa en 30 min (enRuta() la pinta
// entre el 8 % y el 92 % del camino); las dos que van tarde se quedan al 92 %.
const VIAJE = 30 * 60000
const SEDES_CENTRO = () => CENTRO.map((id) => LOCALES.find((l) => l.id === id))
function posicionEn(e, t) {
  if (t < e.salio) return null                       // todavía no salió
  const f = e.tarde ? 0.92 : t - e.salio > VIAJE ? null : Math.min(0.92, Math.max(0.08, (t - e.salio) / VIAJE))
  if (f == null) return null                         // ya llegó
  return { lat: e.sede.lat + (e.casa.lat - e.sede.lat) * f, lng: e.sede.lng + (e.casa.lng - e.sede.lng) * f }
}
// Lo más cerca que va a pasar una moto que sale de `sede` hacia `casa` en
// `salio` de todas las demás motos (`flota`: [{sede, casa, salio, tarde}]) y
// de los otros locales, en los próximos 30 min. En metros: 420 m son los 30 px
// a los que el mapa funde dos pines.
export const HOLGURA_MIN = 420
function holgura(sede, casa, salio, flota, desde) {
  let d = 1e9
  const yo = { sede, casa, salio }
  for (let t = Math.max(desde, salio); t <= salio + VIAJE; t += 2 * 60000) {
    const p = posicionEn(yo, t)
    if (!p) continue
    for (const e of flota) { const q = posicionEn(e, t); if (q) d = Math.min(d, metrosEntre(p, q)) }
    for (const sd of SEDES_CENTRO()) if (sd.id !== sede.id) d = Math.min(d, metrosEntre(p, sd))
  }
  return d
}
// Una casa nueva a 1–1.5 km del local, dentro del recuadro: la que deja la
// ruta entera más lejos de todo lo que hay y habrá en el mapa.
function casaLibre(sede, flota, salio, desde = salio) {
  let mejor = null, mejorD = -1
  const giro = entre(0, 23) * 15
  for (let r = 0; r < 360; r += 15) {
    for (const metros of [1000, 1250, 1500]) {
      const c = desplazar(sede, (r + giro) % 360, metros)
      if (!enArena(c)) continue
      const d = holgura(sede, c, salio, flota, desde)
      if (d > mejorD) { mejorD = d; mejor = c }
    }
  }
  return { casa: mejor || desplazar(sede, 90, 1000), holgura: mejorD }
}

const REPARTIDORES = ['Wilson', 'Édison', 'Kevin', 'Bryan', 'Darío', 'Alexis', 'Jefferson', 'Steeven', 'Marlon', 'Andrés', 'Fabián', 'Cristian', 'Luis', 'Paúl']

const MOTIVOS = ['precio', 'fuera de cobertura', 'demora estimada', 'producto no disponible', 'solo consultaba']

const vendibles = MENU.filter((m) => !m.extra)

// Uno a tres platos del menú, con su tamaño y su precio cobrado.
function armarItems() {
  const items = []
  let subtotal = 0
  for (let k = 0, n = entre(1, 3); k < n; k++) {
    const m = pick(vendibles)
    const tam = m.sizes ? pick(m.sizes) : null
    const precio = tam ? tam.p : m.price
    const cant = rnd() > 0.85 ? 2 : 1
    items.push({ nombre: m.name, categoria: m.cat, tamano: tam ? tam.t : null, cantidad: cant, precio_unitario: precio })
    subtotal += precio * cant
  }
  return { items, subtotal }
}

// Las personas de la demo, leídas de la base: renovarDemo() no necesita
// volver a sembrar para encontrarlas.
export const gente = () => Object.values(S.estado().personas).filter((p) => p.estado === 'activa')

export function sembrar({ dias = 14 } = {}) {
  // Todo en un bloque: una sola escritura al final y `sembrado` queda guardado
  // (antes se perdía y la demo se volvía a sembrar en cada carga).
  let resultado = null
  S.enBloque(() => { resultado = sembrarDentro({ dias }) })
  return resultado
}

function sembrarDentro({ dias }) {
  S.reset()
  semilla = 20260913

  // 1. Las personas. Algunas con varios teléfonos y varias direcciones, que es
  //    justo lo que el tablero tiene que saber demostrar.
  const gente = []
  for (let i = 0; i < 46; i++) {
    const nombre = NOMBRES[i % NOMBRES.length]
    const apellido = pick(APELLIDOS)
    const conCedula = rnd() > 0.22           // ~78 % da la cédula
    const p = S.crearPersona({
      nombre, apellido,
      cedula: conCedula ? cedulaValida() : null,
      telefono: celular(),
    })
    // Uno de cada cuatro llama también desde otro número: el mismo cliente.
    if (rnd() > 0.75) S.vincularTelefono(p.persona_id, celular(), conCedula ? 'confirmada' : 'inferida')
    if (rnd() > 0.88) S.vincularTelefono(p.persona_id, fijo(), 'confirmada')

    const nDirs = rnd() > 0.7 ? 2 : 1
    for (let k = 0; k < nDirs; k++) {
      const lid = pick(PILOTO)
      const base = LOCALES.find((l) => l.id === lid)
      // Alrededor de su local, dentro de unos dos kilómetros.
      const jitter = () => (rnd() - 0.5) * 0.028
      S.agregarDireccion(p.persona_id, {
        alias: k === 0 ? 'Casa' : pick(['Oficina', 'Casa de mi mamá', 'Departamento']),
        calle: pick(CALLES), referencia: pick(REFERENCIAS), sector: pick(SECTORES),
        ciudad: 'Quito', local_id: lid,
        lat: base && base.lat ? base.lat + jitter() : null,
        lng: base && base.lng ? base.lng + jitter() : null,
      })
    }
    gente.push(S.personaPorId(p.persona_id))
  }

  // 2. Un teléfono de hogar compartido por dos personas: el caso que rompe
  //    cualquier CRM que use el teléfono como identidad.
  const casa = fijo()
  S.vincularTelefono(gente[0].persona_id, casa, 'confirmada')
  S.vincularTelefono(gente[1].persona_id, casa, 'confirmada')

  // 3. Los días.
  const hoy = new Date()
  for (let d = dias - 1; d >= 0; d--) {
    const fecha = new Date(hoy.getTime() - d * 86400000)
    const dow = fecha.getDay()
    const finde = dow === 5 || dow === 6 || dow === 0
    const nPedidos = finde ? entre(30, 42) : entre(16, 26)
    const flotaPrevista = []        // las motos de hoy, para que las casas de cocina no crucen sus rutas

    for (let i = 0; i < nPedidos; i++) {
      const persona = pick(gente)
      let local = pick(PILOTO)
      let modalidad = rnd() > 0.28 ? 'domicilio' : 'retiro'
      const canal = rnd() > 0.45 ? 'llamada' : rnd() > 0.4 ? 'web' : 'whatsapp'

      // Hora realista: almuerzo y sobre todo cena. Los pedidos de HOY no pueden
      // ser de una hora que todavía no llegó, o la comparación contra la semana
      // pasada a la misma hora queda vacía y el tablero parece roto.
      const ahora = new Date()
      // Demo: si aún no abre o es temprano, el día de hoy igual se muestra
      // avanzado hasta las 15:00, porque un tablero vacío no demuestra nada.
      const tope = d === 0 ? Math.min(21, Math.max(15, ahora.getHours())) : 21
      let hora = rnd() > 0.62 ? entre(18, 21) : entre(12, 17)
      if (hora > tope) hora = entre(11, tope)
      const t = new Date(fecha)
      t.setHours(hora, hora === tope && d === 0 ? entre(0, Math.max(0, ahora.getMinutes())) : entre(0, 59), 0, 0)

      const { items, subtotal } = armarItems()
      const dirs = persona.direcciones
      let dir = modalidad === 'domicilio' && dirs.length ? pick(dirs) : null

      // Los últimos pedidos de hoy quedan en curso, y diez a domicilio ya en la
      // calle, para que el mapa de la flota tenga algo que mostrar.
      const esHoy = d === 0
      let estado = 'entregado'
      let moto = null, salio = null
      if (esHoy && i >= nPedidos - 16) {
        const k = i - (nPedidos - 16)
        if (k < MOTOS.length) {
          // Diez motos en la calle siempre: es lo que la demo tiene que enseñar.
          moto = MOTOS[k]
          modalidad = 'domicilio'; estado = 'camino'; local = moto.local
          const sede = LOCALES.find((l) => l.id === local)
          // Cada moto va a su propia casa, nueva para esa persona (la calle lleva
          // número para que no se funda con una dirección igual ya guardada).
          dir = S.agregarDireccion(persona.persona_id, {
            alias: pick(['Casa', 'Oficina', 'Departamento']),
            calle: `${pick(CALLES)} N${20 + k}-${entre(100, 999)}`, referencia: pick(REFERENCIAS), sector: moto.sector,
            ciudad: 'Quito', local_id: local,
            ...desplazar(sede, moto.rumbo, moto.metros),
          })
          salio = Date.now() - moto.min * 60000
          flotaPrevista.push({ sede, casa: dir, salio, tarde: moto.min > 35 })
          t.setTime(salio - entre(6, 10) * 60000)
        } else {
          // Los seis tickets de cocina también son del centro y, si son a
          // domicilio, tienen su casa cerca del local: cuando salgan a la calle
          // (renovarDemo) entran al mismo mapa sin alejarlo.
          estado = pick(['horno', 'recibido'])
          local = CENTRO[k % CENTRO.length]
          if (k >= MOTOS.length + CENTRO.length) modalidad = 'retiro'   // el sexto repite local: para llevar, sin moto
          // Lo que está en marcha entró hace poco: un ticket de 150 minutos no
          // existe. Recibido hace 1–4 min; en el horno desde hace 1–8 (entró a
          // los 4 de recibido), en el mismo ritmo con que renovarDemo() los mueve.
          t.setTime(Date.now() - (estado === 'recibido' ? entre(1, 4) : entre(5, 12)) * 60000)
          if (modalidad === 'domicilio') {
            const sede = LOCALES.find((l) => l.id === local)
            const saldra = t.getTime() + 12 * 60000        // recibido → horno a los 4, a la calle a los 12
            const { casa } = casaLibre(sede, flotaPrevista, saldra, Date.now())
            dir = S.agregarDireccion(persona.persona_id, {
              alias: pick(['Casa', 'Oficina', 'Departamento']),
              calle: `${pick(CALLES)} N${20 + k}-${entre(100, 999)}`, referencia: pick(REFERENCIAS), sector: pick(SECTORES_DE[local]),
              ciudad: 'Quito', local_id: local, ...casa,
            })
            flotaPrevista.push({ sede, casa, salio: saldra })
          }
        }
      }
      const envio = modalidad === 'retiro' || subtotal >= 25 ? 0 : 2.5

      const pedido = S.registrarPedido({
        persona_id: persona.persona_id,
        local_id: local,
        direccion_id: dir ? dir.direccion_id : null,
        modalidad, canal, estado,
        subtotal, envio_cobrado: envio,
        total_cobrado: Math.round((subtotal + envio) * 100) / 100,
        forma_pago: pick(['efectivo', 'tarjeta', 'tarjeta', 'transferencia']),
        creado_en: t.getTime(),
        historial: estado === 'horno' ? { recibido: t.getTime(), horno: t.getTime() + 4 * 60000 } : undefined,
        minutos_entrega: estado === 'entregado' ? entre(22, 48) : null,
        repartidor: modalidad === 'domicilio' ? (moto ? REPARTIDORES[i % REPARTIDORES.length] : pick(REPARTIDORES)) : null,
        salio_en: salio,
        rider: null,   // se calcula abajo, sobre la ruta local -> casa
        items,
      })

      // La moto va en algún punto entre el local y la casa, según el tiempo que
      // lleva fuera. Encima de la casa parecería que ya llegó y nadie abrió.
      // `demo: true` hace que enRuta() la vaya moviendo sola con cada refresco.
      if (moto && dir && dir.lat != null) {
        const sede = LOCALES.find((l) => l.id === local)
        const f = Math.min(0.92, Math.max(0.08, moto.min / 30))
        S.estado().pedidos[pedido.pedido_id].rider = {
          lat: sede.lat + (dir.lat - sede.lat) * f,
          lng: sede.lng + (dir.lng - sede.lng) * f,
          at: Date.now(), demo: true,
          // Las dos que van tarde son parte de la historia: renovarDemo() las
          // deja tarde (y las devuelve a sus minutos cuando pasan de 45).
          ...(moto.min > 35 ? { tarde: true, tardeMin: moto.min } : {}),
        }
      }

      if (canal === 'llamada') {
        S.registrarConversacion({
          persona_id: persona.persona_id,
          telefono: persona.telefonos[0]?.telefono,
          local_id: local, canal: 'llamada',
          inicio: t.getTime() - entre(120, 300) * 1000,
          duracion_s: entre(95, 260),
          resultado: 'pedido',
          cedula_capturada: !!persona.cedula,
          pedido_id: pedido.pedido_id,
        })
      }
    }

    // Llamadas que NO terminaron en pedido. Sin ellas el denominador miente y
    // la tasa de cierre sale del 100 %.
    const perdidas = finde ? entre(4, 9) : entre(2, 6)
    // Las de hoy tampoco pueden ser de una hora que todavía no llegó.
    const topeLlamadas = d === 0 ? Math.min(21, Math.max(15, new Date().getHours())) : 21
    for (let i = 0; i < perdidas; i++) {
      const t = new Date(fecha); t.setHours(entre(12, topeLlamadas), entre(0, 59), 0, 0)
      const noContesta = rnd() > 0.86
      S.registrarConversacion({
        telefono: celular(),
        local_id: pick(PILOTO), canal: 'llamada',
        inicio: t.getTime(),
        duracion_s: noContesta ? 0 : entre(20, 110),
        resultado: noContesta ? 'no_contestada' : rnd() > 0.5 ? 'sin_pedido' : 'colgo',
        motivo_no_cierre: noContesta ? null : pick(MOTIVOS),
        cedula_capturada: false,
      })
    }
  }

  const db = S.estado()
  db.sembrado = Date.now()
  return {
    personas: Object.keys(db.personas).length,
    pedidos: Object.keys(db.pedidos).length,
    conversaciones: Object.keys(db.conversaciones).length,
  }
}

export const haySemilla = () => !!S.estado().sembrado

// Un pedido de demo nuevo, ahora mismo: en cocina o ya en la calle, con la
// casa que eligió el que llama (casaLibre).
function crearPedidoDemo({ local, modalidad, estado, creado, salio = null, repartidor = null, casa = null, ahora }) {
  const personas = gente()
  const sede = LOCALES.find((l) => l.id === local)
  if (!personas.length || !sede) return null
  const persona = pick(personas)
  let dir = null
  if (modalidad === 'domicilio' && casa) {
    dir = S.agregarDireccion(persona.persona_id, {
      alias: pick(['Casa', 'Oficina', 'Departamento']),
      calle: `${pick(CALLES)} N${entre(20, 60)}-${entre(100, 999)}`, referencia: pick(REFERENCIAS), sector: pick(SECTORES_DE[local] || SECTORES),
      ciudad: 'Quito', local_id: local, lat: casa.lat, lng: casa.lng,
    })
  }
  const { items, subtotal } = armarItems()
  const envio = modalidad === 'retiro' || subtotal >= 25 ? 0 : 2.5
  const canal = rnd() > 0.45 ? 'llamada' : rnd() > 0.4 ? 'web' : 'whatsapp'
  const historial = { recibido: creado }
  if (estado === 'horno' || estado === 'camino') historial.horno = Math.min(creado + entre(3, 6) * 60000, salio || ahora)
  if (estado === 'camino') historial.camino = salio || ahora
  const enCalle = estado === 'camino' && modalidad === 'domicilio'
  const pedido = S.registrarPedido({
    persona_id: persona.persona_id, local_id: local, direccion_id: dir ? dir.direccion_id : null,
    modalidad, canal, estado, subtotal, envio_cobrado: envio,
    total_cobrado: Math.round((subtotal + envio) * 100) / 100,
    forma_pago: pick(['efectivo', 'tarjeta', 'tarjeta', 'transferencia']),
    creado_en: creado, historial,
    repartidor: modalidad === 'domicilio' ? repartidor || pick(REPARTIDORES) : null,
    salio_en: enCalle ? salio : null,
    rider: null, items,
  })
  if (enCalle && dir) {
    const f = Math.min(0.92, Math.max(0.08, (ahora - salio) / VIAJE))
    S.estado().pedidos[pedido.pedido_id].rider = { lat: sede.lat + (dir.lat - sede.lat) * f, lng: sede.lng + (dir.lng - sede.lng) * f, at: ahora, demo: true }
  }
  if (canal === 'llamada') {
    S.registrarConversacion({
      persona_id: persona.persona_id, telefono: S.personaPorId(persona.persona_id)?.telefonos[0]?.telefono,
      local_id: local, canal: 'llamada', inicio: creado - entre(120, 300) * 1000, duracion_s: entre(95, 260),
      resultado: 'pedido', cedula_capturada: !!persona.cedula, pedido_id: pedido.pedido_id,
    })
  }
  return { pedido, dir }
}

// Mantiene viva la demo mientras la pestaña sigue abierta (se llama al cargar
// y en cada refresco de 30 s), sin tocar nada que Jon haya movido a mano:
//  · una moto que lleva más de 30 min llega (entregada) y, para que sigan
//    siendo diez, sale otra con el mismo repartidor y del mismo local (o del
//    local del centro que lleva más tiempo sin mandar una), recién salida y
//    a una casa nueva cuya ruta no se cruza con ninguna otra moto; si en este
//    momento no hay ruta limpia, espera al siguiente refresco;
//  · las dos que van tarde a propósito siguen tarde: cuando pasan de 45 min
//    vuelven a sus 37 y 43;
//  · en cocina, un ticket recibido pasa al horno a los 4 min y sale a los 8
//    si hay sitio en el mapa y su ruta está limpia (espera hasta 16, o 24 si
//    de su local acaba de salir otra, y entonces sale a una casa nueva); un
//    pedido para llevar queda listo a los
//    8 y se entrega a los 15; si quedan menos de tres tickets entra uno nuevo.
// Con más de diez motos, las que ya llevan 26 min llegan un poco antes.
export function renovarDemo({ ahora = Date.now() } = {}) {
  const db = S.estado()
  if (!db.sembrado) return null
  const hoy = dayKey(new Date(ahora))
  const min = (ts) => (ahora - (ts || ahora)) / 60000
  const sedeDe = (p) => LOCALES.find((l) => l.id === p.local_id)
  const dirDe = (p) => (p.direccion_id ? db.direcciones[p.direccion_id] : null)
  const vivos = Object.values(db.pedidos).filter((p) => p.dia === hoy && !p.manual && p.origen !== 'sitio' && ['recibido', 'horno', 'camino'].includes(p.estado))
  const esMoto = (p) => p.estado === 'camino' && p.modalidad === 'domicilio' && p.rider?.demo
  const motos = vivos.filter(esMoto)
  const limite = motos.length > 10 ? 26 : 30
  const llegaron = motos.filter((p) => !p.rider.tarde && min(p.salio_en) > limite)
  const tardes = motos.filter((p) => p.rider.tarde && min(p.salio_en) > 45)
  const alHorno = vivos.filter((p) => p.estado === 'recibido' && min(p.creado_en) > 4)
  const enHorno = (p) => min(p.historial?.horno || p.creado_en)
  const listos = vivos.filter((p) => p.estado === 'horno' && enHorno(p) > 8)
  const retirados = vivos.filter((p) => p.estado === 'camino' && p.modalidad === 'retiro' && min(p.historial?.camino || p.creado_en) > 15)
  const faltaCocina = vivos.filter((p) => p.estado === 'recibido' || p.estado === 'horno').length - listos.length < 3
  let enCalle = motos.length - llegaron.length
  if (!llegaron.length && !tardes.length && !alHorno.length && !listos.length && !retirados.length && !faltaCocina && enCalle >= 10) return { cambios: 0 }

  let cambios = 0
  S.enBloque(() => {
    // De qué local salió una moto hace poco: la siguiente de ahí espera.
    const ultimaSalida = {}
    for (const p of motos) if (!llegaron.includes(p)) ultimaSalida[p.local_id] = Math.max(ultimaSalida[p.local_id] || 0, p.salio_en || 0)
    const recien = (local) => ultimaSalida[local] && min(ultimaSalida[local]) < 12
    const enUso = new Set(motos.filter((p) => !llegaron.includes(p)).map((p) => p.repartidor))
    const nombreLibre = (preferido) => (preferido && !enUso.has(preferido) ? preferido : REPARTIDORES.find((n) => !enUso.has(n)) || pick(REPARTIDORES))

    for (const p of tardes) {
      const salio = ahora - (p.rider.tardeMin || 37) * 60000
      const delta = salio - p.salio_en
      p.salio_en = salio; p.creado_en += delta
      for (const k of Object.keys(p.historial || {})) p.historial[k] += delta
      p.rider = { ...p.rider, at: ahora }
      cambios++
    }
    for (const p of alHorno) { p.estado = 'horno'; p.historial = { ...(p.historial || {}), horno: ahora }; cambios++ }
    for (const p of retirados) {
      p.estado = 'entregado'; p.historial = { ...(p.historial || {}), entregado: ahora }
      p.minutos_entrega = Math.max(1, Math.round((ahora - p.creado_en) / 60000)); cambios++
    }
    const liberados = []
    for (const p of llegaron) {
      // Llegó hace un rato (en el mapa la moto se ve llegar hacia los 28 min).
      const llego = Math.min(ahora, p.salio_en + entre(16, 26) * 60000)
      p.estado = 'entregado'; p.historial = { ...(p.historial || {}), entregado: llego }
      p.minutos_entrega = Math.max(1, Math.round((llego - p.creado_en) / 60000))
      const casa = dirDe(p)
      if (casa?.lat != null) p.rider = { lat: casa.lat, lng: casa.lng, at: llego, demo: true }
      liberados.push({ local: p.local_id, repartidor: p.repartidor })
      cambios++
    }

    // La flota que sigue en el mapa (y la que va a entrar desde cocina).
    const flota = []
    for (const p of motos) if (!llegaron.includes(p) && dirDe(p)?.lat != null) flota.push({ sede: sedeDe(p), casa: dirDe(p), salio: p.salio_en, tarde: !!p.rider.tarde })
    for (const p of vivos) if (['recibido', 'horno'].includes(p.estado) && p.modalidad === 'domicilio' && dirDe(p)?.lat != null) flota.push({ sede: sedeDe(p), casa: dirDe(p), salio: ahora + Math.max(0, 8 - enHorno(p)) * 60000, ticket: p })

    // Cocina → calle. Para llevar: listo. A domicilio: sale si hay sitio y la
    // ruta está limpia; si lleva más de 16 min esperando, sale igual a una casa nueva.
    for (const p of listos) {
      if (p.modalidad !== 'domicilio') { p.estado = 'camino'; p.historial = { ...(p.historial || {}), camino: ahora }; cambios++; continue }
      const sede = sedeDe(p)
      if (!sede || sede.lat == null) continue
      const otras = flota.filter((e) => e.ticket !== p)
      let casa = dirDe(p)
      const forzado = enHorno(p) > 16
      if (enCalle > 10 && !forzado) continue
      if (recien(p.local_id) && enHorno(p) <= 24) continue      // de ese local acaba de salir una: dos juntas se pisan
      if (holgura(sede, casa, ahora, otras, ahora) < HOLGURA_MIN) {
        if (!forzado) continue
        const libre = casaLibre(sede, otras, ahora)
        const dir = S.agregarDireccion(p.persona_id, { alias: 'Casa', calle: `${pick(CALLES)} N${entre(20, 60)}-${entre(100, 999)}`, referencia: pick(REFERENCIAS), sector: pick(SECTORES_DE[p.local_id] || SECTORES), ciudad: 'Quito', local_id: p.local_id, ...libre.casa })
        p.direccion_id = dir.direccion_id; casa = dir
      }
      p.estado = 'camino'; p.historial = { ...(p.historial || {}), camino: ahora }
      p.salio_en = ahora; ultimaSalida[p.local_id] = ahora
      p.repartidor = nombreLibre(p.repartidor); enUso.add(p.repartidor)
      p.rider = { lat: sede.lat, lng: sede.lng, at: ahora, demo: true }
      const mio = flota.find((e) => e.ticket === p); if (mio) { mio.salio = ahora; mio.casa = casa; delete mio.ticket }
      enCalle++; cambios++
    }

    // Reponer hasta diez: primero el local del que acaba de llegar una moto,
    // luego el que lleva más tiempo sin mandar una. Sin ruta limpia, se espera.
    const candidatos = () => [...liberados.map((l) => l.local), ...[...CENTRO].sort((a, b) => (ultimaSalida[a] || 0) - (ultimaSalida[b] || 0))].filter((l, i, arr) => arr.indexOf(l) === i)
    while (enCalle < 10) {
      let hecho = false
      for (const local of candidatos()) {
        if (recien(local)) continue
        const sede = LOCALES.find((l) => l.id === local)
        const salio = ahora - entre(3, 6) * 60000
        const { casa, holgura: h } = casaLibre(sede, flota, salio, ahora)
        if (h < HOLGURA_MIN) continue
        const lib = liberados.find((l) => l.local === local) || liberados[0]
        const repartidor = nombreLibre(lib?.repartidor)
        const nuevo = crearPedidoDemo({ local, modalidad: 'domicilio', estado: 'camino', creado: salio - entre(6, 10) * 60000, salio, repartidor, casa, ahora })
        if (!nuevo) continue
        if (lib) liberados.splice(liberados.indexOf(lib), 1)
        enUso.add(repartidor); ultimaSalida[local] = salio
        flota.push({ sede, casa, salio }); enCalle++; cambios++; hecho = true
        break
      }
      if (!hecho) break
    }

    if (faltaCocina) {
      const modalidad = rnd() > 0.28 ? 'domicilio' : 'retiro'
      // El local del centro con menos tickets a domicilio esperando: dos del
      // mismo local saldrían juntos.
      const pendientes = (l) => flota.filter((e) => e.ticket && e.sede.id === l).length
      const local = [...CENTRO].sort((a, b) => pendientes(a) - pendientes(b) || rnd() - 0.5)[0]
      const creado = ahora - entre(1, 3) * 60000
      const sede = LOCALES.find((l) => l.id === local)
      const casa = modalidad === 'domicilio' ? casaLibre(sede, flota, creado + 12 * 60000, ahora).casa : null
      const nuevo = crearPedidoDemo({ local, modalidad, estado: 'recibido', creado, casa, ahora })
      if (nuevo) { if (casa) flota.push({ sede, casa, salio: creado + 12 * 60000 }); cambios++ }
    }
  })
  return { cambios, entregadas: llegaron.length + retirados.length }
}
