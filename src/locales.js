// Locales de El Hornero, tomados de su propio sitio elhornero.com.ec el 2026-09-13.
// 29 locales en 8 ciudades. Horario general: abren 11:00 (Latacunga 10:00).
// Camila necesita estos datos para proponer el local mas cercano en pedidos para llevar.

// lat/lng son APROXIMADAS: sirven para dibujar el mapa de la flota. Las exactas
// se piden al cliente, o se toman del GPS del motorizado la primera vez que entrega.
export const LOCALES = [
  { id: "gonzalez-suarez", nombre: "González Suárez", direccion: "Av. González Suárez y Gonessiat", ciudad: "Quito" , lat: -0.201, lng: -78.483 },
  { id: "floresta", nombre: "La Floresta", direccion: "Isabel La Católica N24-685", ciudad: "Quito" , lat: -0.205, lng: -78.489 },
  { id: "republica-del-salvador", nombre: "República del Salvador", direccion: "República del Salvador N36-149 y Naciones Unidas", ciudad: "Quito" , lat: -0.179, lng: -78.479 },
  { id: "veintimilla", nombre: "Veintimilla", direccion: "Av. Gral. Ignacio de Veintimilla E4-66 y Amazonas", ciudad: "Quito" , lat: -0.207, lng: -78.493 },
  { id: "isla-floreana", nombre: "Isla Floreana", direccion: "Isla Floreana y Seymour, N41-145", ciudad: "Quito" , lat: -0.172, lng: -78.479 },
  { id: "cumbaya", nombre: "Cumbayá", direccion: "Centro Comercial Cumbayá", ciudad: "Quito" , lat: -0.205, lng: -78.429 },
  { id: "bicentenario", nombre: "Bicentenario", direccion: "Av. de la Prensa N51-20", ciudad: "Quito" , lat: -0.136, lng: -78.488 },
  { id: "maldonado", nombre: "Maldonado", direccion: "Av. Maldonado S94-27", ciudad: "Quito" , lat: -0.279, lng: -78.54 },
  { id: "armenia", nombre: "Armenia", direccion: "Av. Sebastián de Benalcázar y Enrique Gil", ciudad: "Quito" , lat: -0.305, lng: -78.463 },
  { id: "atahualpa", nombre: "Atahualpa", direccion: "Mariscal Sucre s/n y Canelo, C.C. Atahualpa", ciudad: "Quito" , lat: -0.26, lng: -78.525 },
  { id: "tumbaco", nombre: "Tumbaco", direccion: "Av. Interoceánica", ciudad: "Quito" , lat: -0.21, lng: -78.4 },
  { id: "carapungo", nombre: "Carapungo", direccion: "Av. Geovanny Calles N70-55", ciudad: "Quito" , lat: -0.095, lng: -78.448 },
  { id: "ponciano", nombre: "Ponciano", direccion: "Av. Diego de Vásquez L1-3", ciudad: "Quito" , lat: -0.118, lng: -78.487 },
  { id: "plaza-del-valle", nombre: "Plaza del Valle", direccion: "Av. General Rumiñahui s/n y Av. Ilaló", ciudad: "Quito" , lat: -0.296, lng: -78.452 },
  { id: "puembo", nombre: "Puembo", direccion: "24 de Mayo", ciudad: "Quito" , lat: -0.183, lng: -78.356 },
  { id: "quitumbe", nombre: "Quitumbe", direccion: "Lirinan Oe2 y Ñusta S36G", ciudad: "Quito" , lat: -0.295, lng: -78.549 },
  { id: "san-pedro", nombre: "San Pedro", direccion: "Av. Agustín de Miranda", ciudad: "Quito" , lat: -0.322, lng: -78.446 },
  { id: "calderon", nombre: "Calderón", direccion: "Av. Capitán Geovanny Calles y Cacha", ciudad: "Quito" , lat: -0.098, lng: -78.425 },
  { id: "mitad-del-mundo", nombre: "Mitad del Mundo", direccion: "Av. Equinoccial s/n y Av. Manuel Córdova Galarza, Plaza Equinoccial", ciudad: "Quito" , lat: -0.002, lng: -78.456 },
  { id: "ibarra", nombre: "Ibarra", direccion: "Heleodoro Ayala y José Tobar", ciudad: "Ibarra" },
  { id: "santo-domingo", nombre: "Santo Domingo", direccion: "Km 5.5 vía a Quito, sector Chiguilpe", ciudad: "Santo Domingo" },
  { id: "latacunga", nombre: "Latacunga", direccion: "Cañar y Marco Aurelio Subía", ciudad: "Latacunga" },
  { id: "ambato", nombre: "Ambato", direccion: "Av. Los Guaytambos y Los Tomates", ciudad: "Ambato" },
  { id: "riobamba", nombre: "Riobamba", direccion: "Av. Daniel León Borja y Carlos Zambrano", ciudad: "Riobamba" },
  { id: "samborondon", nombre: "Samborondón", direccion: "Av. Samborondón Km 2.5, Club Deportivo Diana Quintana", ciudad: "Samborondón" },
  { id: "urdesa", nombre: "Urdesa", direccion: "Víctor Emilio Estrada N-906", ciudad: "Guayaquil" },
  { id: "centenario", nombre: "Centenario", direccion: "El Oro 1004 e intersección Ambato", ciudad: "Guayaquil" },
  { id: "cuenca", nombre: "Cuenca", direccion: "Rafael María Arízaga s/n y Juan Montalvo, Plaza Santa Ana", ciudad: "Cuenca" },
  { id: "salinas", nombre: "Salinas", direccion: "Av. General Enríquez Gallo y Lupercio Bazán Malavé", ciudad: "Salinas" },
]

export const CIUDADES = [...new Set(LOCALES.map((l) => l.ciudad))]
