import { useEffect, useMemo, useState } from 'react'
import { CATS, MENU, FREE_DELIVERY_OVER, DELIVERY_FEE, IVA } from './data.js'

const money = (n) => '$' + n.toFixed(2)
const CART_KEY = 'elhornero.cart'

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function App() {
  const [cat, setCat] = useState(null)
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState(loadCart)
  const [mode, setMode] = useState('delivery')
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch { /* ignore */ }
  }, [cart])

  useEffect(() => {
    if (!cartOpen) return
    const onKey = (e) => e.key === 'Escape' && setCartOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cartOpen])

  const q = query.trim().toLowerCase()
  const searching = q.length > 0
  const inCategory = searching || !!cat

  const items = useMemo(
    () => MENU.filter((m) =>
      (searching || m.cat === cat) &&
      (!searching || (m.name + ' ' + m.desc + ' ' + m.cat).toLowerCase().includes(q))),
    [searching, cat, q],
  )

  const add = (id) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
    setCartOpen(true)
  }
  const bump = (id, d) => {
    setCart((c) => {
      const next = { ...c }
      const qty = (next[id] || 0) + d
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  const cartLines = Object.keys(cart).map((id) => {
    const m = MENU.find((x) => x.id === id)
    return { id, name: m.name, qty: cart[id], total: m.price * cart[id] }
  })
  const cartCount = cartLines.reduce((a, l) => a + l.qty, 0)
  const subtotal = cartLines.reduce((t, l) => t + l.total, 0)
  const isPickup = mode === 'pickup'
  const ship = isPickup || subtotal === 0 || subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE
  const tax = subtotal * IVA
  const total = subtotal + ship + tax

  const sectionTitle = searching ? 'Resultados' : cat || 'Menú'
  const freeHint = isPickup
    ? 'Retiro en el local que elijas al pagar.'
    : subtotal >= FREE_DELIVERY_OVER
      ? 'Tienes envío gratis en este pedido.'
      : 'Envío gratis desde ' + money(FREE_DELIVERY_OVER) + '.'

  const selectCat = (key) => {
    setCat(key)
    setQuery('')
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const clearCat = () => { setCat(null); setQuery('') }

  return (
    <div className="page" id="inicio">
      <header id="topbar" className="topbar">
        <a href="#inicio" className="wordmark" onClick={clearCat}>el Hornero</a>

        <nav className="nav">
          <a href="#menu">Ordenar</a>
          <a href="#restaurantes">Restaurantes</a>
          <a href="#contactos">Contactos</a>
        </nav>

        <div className="topbar-right">
          <label className="search">
            <span className="search-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><line x1="15.5" y1="15.5" x2="21" y2="21" /></svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca tu comida favorita"
              aria-label="Buscar en el menú"
            />
          </label>

          <a href="#cupones" className="icon-link">
            <span className="chip-cupones">
              <svg width="18" height="12" viewBox="0 0 24 16" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round"><path d="M2 3h20v3a2 2 0 0 0 0 4v3H2v-3a2 2 0 0 0 0-4Z" /><line x1="9" y1="6" x2="15" y2="10" /></svg>
            </span>
            Cupones
          </a>
          <a href="#cuenta" className="icon-link">
            <span className="chip-perfil">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="9" r="4" /><path d="M4 24a8 8 0 0 1 16 0Z" /></svg>
            </span>
            Perfil
          </a>
          <button type="button" className="btn-ingresar">Ingresar</button>
          <button type="button" className="cart-btn" onClick={() => setCartOpen((o) => !o)} aria-label="Abrir mi pedido">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#1D1D1B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h2.6l2.9 11.2h10.2L21 6.4H6.1" /><circle cx="9.5" cy="19.5" r="1.7" /><circle cx="17.5" cy="19.5" r="1.7" /></svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </header>

      <div className="mode-strip">
        <div className="segment" role="tablist" aria-label="Modo de pedido">
          <span className="segment-pill" style={{ transform: isPickup ? 'translateX(100%)' : 'translateX(0)' }} />
          <button type="button" role="tab" aria-selected={!isPickup} onClick={() => setMode('delivery')}>A domicilio</button>
          <button type="button" role="tab" aria-selected={isPickup} onClick={() => setMode('pickup')}>Para llevar</button>
        </div>
        <button type="button" className="location-btn">Ingresa tu ubicación <span className="caret">▾</span></button>
      </div>

      <section id="hero" className="hero">
        <img src="/assets/hero-portada.png" alt="Encuentra promociones y descuentos exclusivos — descarga la app de el Hornero" />
      </section>

      <div className="catalog-cta">
        <a href="#menu">Conoce nuestro catálogo</a>
      </div>

      <section id="menu" className="menu">
        <div className="menu-head">
          <h2>{sectionTitle}</h2>
          {inCategory && (
            <button type="button" className="back-btn" onClick={clearCat}>← Volver al menú</button>
          )}
        </div>

        {!inCategory && (
          <div className="tiles">
            {CATS.map((c) => (
              <button type="button" key={c.key} className="tile" onClick={() => selectCat(c.key)}>
                <span className="tile-art"><img src={c.img} alt="" /></span>
                <span className="tile-label">
                  <span>{c.key}</span>
                  <span className="tile-rule" />
                </span>
              </button>
            ))}
          </div>
        )}

        {inCategory && items.length > 0 && (
          <div className="products">
            {items.map((m) => (
              <article key={m.id} className="card">
                <div className="card-media">
                  <span className="shot">{m.shot}</span>
                  {m.tag && <span className="tag">{m.tag}</span>}
                </div>
                <div className="card-body">
                  <h3>{m.name}</h3>
                  <p>{m.desc}</p>
                  <div className="card-row">
                    <span className="price">{money(m.price)}</span>
                    <button type="button" className="btn-add" onClick={() => add(m.id)}>Agregar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {inCategory && items.length === 0 && (
          <div className="empty">
            <p className="empty-title">Sin resultados</p>
            <p>Prueba con otra categoría o cambia la búsqueda.</p>
          </div>
        )}
      </section>

      <section id="promo-pair" className="promo-pair">
        <a id="cupones" href="#cupones" className="promo">
          <img src="/assets/banner-cupon.png" alt="#Cupones — descuentos y promociones" />
        </a>
        <a href="#cuenta" className="promo">
          <img src="/assets/banner-descarga.png" alt="#AppMobile — descarga la app de el Hornero" />
        </a>
      </section>

      <footer className="footer">
        <div id="site-footer" className="footer-grid">
          <div className="footer-brand">
            <span className="footer-wordmark">el Hornero</span>
            <span className="socials">
              <a href="#contactos" className="social-ig" aria-label="Instagram">IG</a>
              <a href="#contactos" className="social-fb" aria-label="Facebook">f</a>
            </span>
          </div>
          <div id="restaurantes" className="footer-links">
            <a href="#menu">Ordenar</a>
            <a href="#restaurantes">Restaurantes</a>
            <a href="#contactos">Términos legales</a>
            <a href="#contactos">Contactos</a>
            <a href="#cuenta">Sé parte de hornero</a>
            <a href="#cuenta">Comprobantes</a>
          </div>
        </div>
        <div id="contactos" className="footer-bar">
          <span>Copyright © HORNERO Ecuador. Todos los derechos reservados.</span>
          <span>Pedidos: 200 200 0011 · Todos los días 11h00 – 23h00</span>
        </div>
      </footer>

      {cartOpen && <div className="scrim" onClick={() => setCartOpen(false)} />}

      <aside className={'drawer' + (cartOpen ? ' open' : '')} aria-hidden={!cartOpen} aria-label="Mi pedido">
        <div className="drawer-head">
          <span className="drawer-title">
            <span>Mi pedido</span>
            <span className="drawer-mode">{isPickup ? 'PARA LLEVAR' : 'A DOMICILIO'}</span>
          </span>
          <button type="button" className="drawer-close" onClick={() => setCartOpen(false)} aria-label="Cerrar">×</button>
        </div>

        <div className="drawer-lines">
          {cartLines.map((l) => (
            <div key={l.id} className="line">
              <span className="line-thumb" />
              <span className="line-info">
                <span className="line-name">{l.name}</span>
                <span className="stepper">
                  <button type="button" onClick={() => bump(l.id, -1)} aria-label="Quitar uno">–</button>
                  <span>{l.qty}</span>
                  <button type="button" onClick={() => bump(l.id, 1)} aria-label="Agregar uno">+</button>
                </span>
              </span>
              <span className="line-total">{money(l.total)}</span>
            </div>
          ))}
          {cartLines.length === 0 && (
            <div className="drawer-empty">Tu pedido está vacío.<br />Elige una categoría del menú para empezar.</div>
          )}
        </div>

        <div className="drawer-totals">
          <span className="row">Subtotal <span>{money(subtotal)}</span></span>
          <span className="row">Envío <span>{ship === 0 ? 'Gratis' : money(ship)}</span></span>
          <span className="row">IVA 15% <span>{money(tax)}</span></span>
          <span className="row total">Total <span>{money(total)}</span></span>
          <button type="button" className="btn-pay" disabled={cartLines.length === 0}>Continuar al pago</button>
          <span className="hint">{freeHint}</span>
        </div>
      </aside>
    </div>
  )
}
