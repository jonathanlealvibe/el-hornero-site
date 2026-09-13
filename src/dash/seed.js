// Datos de ejemplo para la demostración. Volumen realista de un piloto:
// pocos locales encendidos y entre 9 y 26 pedidos al día, que es exactamente
// la situación en la que el tablero tiene que verse serio.
import { MENU } from '../data.js'
import { LOCALES } from '../locales.js'
import * as S from './store.js'

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
  'cumbaya', 'isla-floreana', 'bicentenario']

const REPARTIDORES = ['Wilson', 'Édison', 'Kevin', 'Bryan', 'Dario', 'Alexis', 'Jefferson', 'Steeven']

const MOTIVOS = ['precio', 'fuera de cobertura', 'demora estimada', 'producto no disponible', 'solo consultaba']

const vendibles = MENU.filter((m) => !m.extra)

export function sembrar({ dias = 14 } = {}) {
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
    const nPedidos = finde ? entre(18, 26) : entre(9, 16)

    for (let i = 0; i < nPedidos; i++) {
      const persona = pick(gente)
      const local = pick(PILOTO)
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

      const nItems = entre(1, 3)
      const items = []
      let subtotal = 0
      for (let k = 0; k < nItems; k++) {
        const m = pick(vendibles)
        const tam = m.sizes ? pick(m.sizes) : null
        const precio = tam ? tam.p : m.price
        const cant = rnd() > 0.85 ? 2 : 1
        items.push({
          nombre: m.name, categoria: m.cat, tamano: tam ? tam.t : null,
          cantidad: cant, precio_unitario: precio,
        })
        subtotal += precio * cant
      }
      const envio = modalidad === 'retiro' || subtotal >= 25 ? 0 : 2.5
      const dirs = persona.direcciones
      const dir = modalidad === 'domicilio' && dirs.length ? pick(dirs) : null

      // Los últimos pedidos de hoy quedan en curso, y varios a domicilio ya en la
      // calle, para que el mapa de la flota tenga algo que mostrar.
      const esHoy = d === 0
      let estado = 'entregado'
      if (esHoy && i >= nPedidos - 8) {
        // Tres motos en la calle siempre: el mapa de la demo tiene que mostrar algo.
        if (i < nPedidos - 5) { modalidad = 'domicilio'; estado = 'camino' }
        else estado = modalidad === 'domicilio' ? pick(['camino', 'horno', 'recibido']) : pick(['horno', 'recibido'])
        // Lo que está en marcha entró hace poco: un ticket de 150 minutos no existe.
        t.setTime(Date.now() - entre(estado === 'recibido' ? 1 : estado === 'horno' ? 6 : 12, estado === 'camino' ? 44 : 22) * 60000)
      }

      const pedido = S.registrarPedido({
        persona_id: persona.persona_id,
        local_id: local,
        direccion_id: dir ? dir.direccion_id : null,
        modalidad, canal, estado,
        subtotal, envio_cobrado: envio,
        total_cobrado: Math.round((subtotal + envio) * 100) / 100,
        forma_pago: pick(['efectivo', 'tarjeta', 'tarjeta', 'transferencia']),
        creado_en: t.getTime(),
        minutos_entrega: estado === 'entregado' ? entre(22, 48) : null,
        repartidor: modalidad === 'domicilio' ? pick(REPARTIDORES) : null,
        salio_en: estado === 'camino' ? Math.min(Date.now() - 3 * 60000, t.getTime() + entre(6, 10) * 60000) : null,
        rider: null,   // se calcula abajo, sobre la ruta local -> casa
        items,
      })

      // La moto va en algún punto entre el local y la casa, según el tiempo que
      // lleva fuera. Encima de la casa parecería que ya llegó y nadie abrió.
      if (estado === 'camino' && dir && dir.lat != null) {
        const sede = LOCALES.find((l) => l.id === local)
        if (sede && sede.lat != null) {
          const min = Math.round((Date.now() - pedido.salio_en) / 60000)
          const f = Math.min(0.92, Math.max(0.08, min / 30))
          S.estado().pedidos[pedido.pedido_id].rider = {
            lat: sede.lat + (dir.lat - sede.lat) * f,
            lng: sede.lng + (dir.lng - sede.lng) * f,
            at: Date.now(),
          }
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
    for (let i = 0; i < perdidas; i++) {
      const t = new Date(fecha); t.setHours(entre(12, 21), entre(0, 59), 0, 0)
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
