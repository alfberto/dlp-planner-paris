/* ═══════════════════════════════════════════════════════════
   DLP PLANNER — app.js  v3.0  (rewrite completo)
   APIs: Queue-Times.com via proxy CORS (codetabs)
   Parques: 4 = Disneyland Park · 28 = Disney Adventure World
   Clima: Open-Meteo (París, gratuito, sin API key)
   Grupo: 4 adultos + 5 niños (5-9 años) · Newport Bay Club
   19-23 agosto 2026
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── CONFIG ─────────────────────────────────────────────────── */
const CORS_PROXY   = 'https://api.codetabs.com/v1/proxy?quest=';
const API_DLP      = 'https://queue-times.com/en-US/parks/4/queue_times.json';
const API_DAW      = 'https://queue-times.com/en-US/parks/28/queue_times.json';
// Open-Meteo: lat/lon de Chessy (Marne-la-Vallée, Disneyland Paris)
const API_WEATHER  = 'https://api.open-meteo.com/v1/forecast?latitude=48.8722&longitude=2.7758&current=temperature_2m,weathercode,windspeed_10m,precipitation_probability,apparent_temperature&hourly=temperature_2m,weathercode,precipitation_probability&timezone=Europe%2FParis&forecast_days=1';
const REFRESH_MS   = 5 * 60 * 1000;
const PARK_OPEN_H  = 8.5;   // Extra Magic Time (hotel)
const PARK_CLOSE_H = 23.0;

/* ── METADATOS ATRACCIONES DLP (por ID Queue-Times) ─────────── */
const META_DLP = {
  22: { rank:1,  emoji:'🧚', height:null,    family:true,  tip:'IR AL ABRIR 8:30 (Extra Magic). Sin espera vs 70+ min en horario normal' },
  25: { rank:2,  emoji:'⛏️', height:'102cm', family:true,  tip:'Mina de oro. ≥102cm. Reserva Lightning Lane en agosto' },
  3:  { rank:3,  emoji:'🏴‍☠️', height:null,    family:true,  tip:'Clásico imprescindible. Cola moderada incluso en agosto' },
  26: { rank:4,  emoji:'👻', height:null,    family:true,  tip:'Puede asustar a niños de 5-6 años. Cola corta' },
  5:  { rank:5,  emoji:'🎯', height:null,    family:true,  tip:'Juego de disparos interactivo. Favorito niños 5-9 años' },
  8:  { rank:6,  emoji:'🚀', height:'120cm', family:false, tip:'Solo ≥120cm. Adultos: ideal en Extra Magic Time' },
  19: { rank:7,  emoji:'🌍', height:null,    family:true,  tip:'Clásico. Cola corta incluso en agosto' },
  18: { rank:8,  emoji:'🐘', height:null,    family:true,  tip:'Favorito de los peques 5-6 años' },
  2:  { rank:9,  emoji:'🌿', height:'140cm', family:false, tip:'Solo adultos y niños más altos. Cola corta vs otras' },
  9:  { rank:10, emoji:'🌠', height:'102cm', family:true,  tip:'Simulador. Colas cortas. Niños 7-9 años lo adoran' },
  4:  { rank:11, emoji:'🚗', height:null,    family:true,  tip:'Los niños conducen su coche' },
  20: { rank:12, emoji:'🍵', height:null,    family:true,  tip:'Sin colas largas. Perfecto entre atracciones' },
  23: { rank:13, emoji:'🎭', height:null,    family:true,  tip:'Atracción suave. Colas cortas al mediodía' },
  15: { rank:14, emoji:'🍎', height:null,    family:true,  tip:'Clásico oscuro. Puede asustar un poco. Cola corta' },
  13: { rank:15, emoji:'🐭', height:null,    family:true,  tip:'Meet Mickey Mouse. Espera larga pero los niños lo adoran' },
};

/* ── METADATOS ATRACCIONES DAW (por nombre, IDs cambian) ─────── */
const META_DAW_NAMES = [
  { key:"Crush's Coaster",           rank:1,  emoji:'🌊', height:'107cm', family:false, tip:'La más demandada de DAW. Reserva Lightning Lane imprescindible' },
  { key:'Ratatouille',               rank:2,  emoji:'🐭', height:null,    family:true,  tip:'Favorito de niños. Sin restricción de altura. Cola alta' },
  { key:'Avengers Assemble',         rank:3,  emoji:'🦸', height:'120cm', family:false, tip:'Solo ≥120cm. Coaster de Avengers' },
  { key:'Spider-Man W.E.B.',         rank:4,  emoji:'🕷️', height:null,    family:true,  tip:'Juego interactivo. Sin restricción de altura. Niños encantados' },
  { key:'Tower of Terror',           rank:5,  emoji:'🏙️', height:'102cm', family:false, tip:'Torre del terror. ≥102cm. Los de 9 años lo querrán intentar' },
  { key:'Frozen Ever After',         rank:6,  emoji:'❄️', height:null,    family:true,  tip:'NUEVO 2026. Barca de Frozen. Ir temprano — cola muy alta' },
  { key:'RC Racer',                  rank:7,  emoji:'🏎️', height:'120cm', family:false, tip:'Columpio gigante. Solo ≥120cm. Single rider disponible' },
  { key:'Cars ROAD TRIP',            rank:8,  emoji:'🚙', height:null,    family:true,  tip:'Paseo temático de Cars. Sin restricción. Colas moderadas' },
  { key:'Toy Soldiers Parachute',    rank:9,  emoji:'🪖', height:'81cm',  family:true,  tip:'Caída libre suave. ≥81cm. Favorito de los pequeños' },
  { key:'Slinky',                    rank:10, emoji:'🐕', height:null,    family:true,  tip:'Tiovivo de Slinky. Sin restricción. Cola corta' },
  { key:'Raiponce',                  rank:11, emoji:'👸', height:null,    family:true,  tip:'Tiovivo de Rapunzel. Sin restricción. Sin colas' },
  { key:'Flying Carpets',            rank:12, emoji:'🪄', height:null,    family:true,  tip:'Alfombras voladoras. Sin restricción. Cola corta' },
  { key:'Cars Quatre',               rank:13, emoji:'🏁', height:null,    family:true,  tip:'Montaña rusa suave de Cars. Sin restricción' },
];

/* ── DESFILES Y SHOWS ───────────────────────────────────────── */
const SHOWS = [
  { name:'Extra Magic Time · Entrada anticipada', times:['08:30'],
    location:'Todas las tierras', accent:'var(--color-gold)', tag:'gold', tagLabel:'Solo hotel',
    tip:'Aprovecha para Peter Pan, Big Thunder y Frozen sin colas', emoji:'⭐' },
  { name:'Disney Stars on Parade', times:['11:30','16:30'],
    location:'Main Street U.S.A.', accent:'var(--color-primary)', tag:'default', tagLabel:'Desfile',
    tip:'Llega 30 min antes para buen sitio con 9 personas', emoji:'🎺' },
  { name:'A Million Splashes of Colour', times:['13:00','17:00'],
    location:'Central Plaza → Main Street', accent:'var(--color-magic)', tag:'magic', tagLabel:'Nuevo 2026',
    tip:'Mickey, Joy, Mirabel, Timon — favorito de los niños', emoji:'🎨' },
  { name:'Frozen Ever After · Cavalcada Princesas', times:['12:00','15:00','18:00'],
    location:'Disney Adventure World', accent:'var(--color-magic)', tag:'magic', tagLabel:'DAW',
    tip:'Desfile de princesas. Colas altas: ir al abrir', emoji:'❄️' },
  { name:'Mickey & the Magician', times:['11:00','14:00','16:00','18:30'],
    location:'Animagique Theater, DAW', accent:'var(--color-primary)', tag:'default', tagLabel:'Show',
    tip:'Perfecto para el descanso al mediodía. Aire acondicionado 🧊', emoji:'🎩' },
  { name:'Disney Tales of Magic · Nocturno', times:['22:00','22:30'],
    location:'Castillo Bella Durmiente', accent:'var(--color-gold)', tag:'gold', tagLabel:'Nocturno',
    tip:'Proyecciones + fuegos. Posición: al fondo de Main Street', emoji:'🌟' },
];

/* ── CONSEJOS ───────────────────────────────────────────────── */
const TIPS = [
  '🎢 <strong>Extra Magic Time es tu superpoder.</strong> Entra a las 8:30 directo a Peter Pan — llegarás sin cola mientras el parque abre a las 9:30 para el resto.',
  '🗺️ <strong>Divide y vencerás.</strong> Con 4 adultos y 5 niños, dividíos en 2 grupos: unos van a atracciones con restricción de altura, los otros a las familiares.',
  '🍱 <strong>Reserva restaurante para 9 personas</strong> con antelación. Ve a las 11:30 o después de las 14:30 para evitar el pico 12:00-14:00.',
  '⚡ <strong>Lightning Lane (Premier Access).</strong> En agosto merece la pena para Peter Pan, Crush\'s Coaster y Ratatouille. Actívalo en la app Disney nada más entrar.',
  '🌞 <strong>Agosto = sol fuerte.</strong> Protector solar 50+, sombreros y botella de agua. Hay fuentes gratuitas en el parque.',
  '😴 <strong>Descanso al mediodía (12:00-15:00).</strong> El parque está en su pico. Ideal para Mickey & the Magician (cubierto) o volver al hotel.',
  '📍 <strong>Posición para el desfile.</strong> Con 9 personas, ocupa sitio en Main Street 30 min antes. Los niños en primera fila.',
  '🏨 <strong>Newport Bay Club → Parque.</strong> Bus gratuito cada ~20 min. Para la Extra Magic Time, toma el de las 8:00 o camina los 15 min.',
];

/* ── CÓDIGOS METEOROLÓGICOS WMO → texto + emoji ──────────────── */
const WMO_CODES = {
  0:  { desc:'Despejado', emoji:'☀️' },
  1:  { desc:'Mayormente despejado', emoji:'🌤️' },
  2:  { desc:'Parcialmente nublado', emoji:'⛅' },
  3:  { desc:'Nublado', emoji:'☁️' },
  45: { desc:'Niebla', emoji:'🌫️' },
  48: { desc:'Niebla helada', emoji:'🌫️' },
  51: { desc:'Llovizna ligera', emoji:'🌦️' },
  53: { desc:'Llovizna moderada', emoji:'🌦️' },
  55: { desc:'Llovizna fuerte', emoji:'🌧️' },
  61: { desc:'Lluvia ligera', emoji:'🌧️' },
  63: { desc:'Lluvia moderada', emoji:'🌧️' },
  65: { desc:'Lluvia fuerte', emoji:'🌧️' },
  80: { desc:'Chubascos ligeros', emoji:'🌦️' },
  81: { desc:'Chubascos moderados', emoji:'🌧️' },
  82: { desc:'Chubascos fuertes', emoji:'⛈️' },
  95: { desc:'Tormenta', emoji:'⛈️' },
  99: { desc:'Tormenta con granizo', emoji:'⛈️' },
};
function wmo(code) {
  return WMO_CODES[code] || { desc:'Variable', emoji:'🌡️' };
}

/* ── ESTADO GLOBAL ──────────────────────────────────────────── */
const STATE = {
  dlpRides: [], dawRides: [],
  lastUpdated: null, error: null, loading: false,
  filter: 'all', tab: 'dlp',
};

/* ══════════════════════════════════════════════════════════════
   ARRANQUE
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Orden importa: lucide primero
  if (window.lucide) lucide.createIcons();

  initTheme();
  initClock();
  renderHeroDate();
  renderShows();
  renderTip();
  initFilters();
  initParkTabs();
  initBottomNav();
  initVisualViewportAnchor();
  initProgress();
  renderPlan();
  renderHighlights();
  initChecklist();
  initChecklistShare();
  initMap();

  // Clima e.g. y colas en paralelo
  loadWeather();
  loadQueues();

  setInterval(loadQueues, REFRESH_MS);
  setInterval(initProgress, 60000);
});

/* ── CLIMA (Open-Meteo, datos reales de París) ──────────────── */
async function loadWeather() {
  try {
    const res = await fetch(API_WEATHER);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();

    const cur = d.current;
    const { desc, emoji } = wmo(cur.weathercode);
    const temp = Math.round(cur.temperature_2m);
    const feels = Math.round(cur.apparent_temperature);
    const wind = Math.round(cur.windspeed_10m);
    const rain = cur.precipitation_probability ?? 0;

    // Horario completo del día
    const now = new Date();
    const nowH = now.getHours();
    const hours = d.hourly.time.map((t, i) => ({
      hour: new Date(t).getHours(),
      temp: Math.round(d.hourly.temperature_2m[i]),
      code: d.hourly.weathercode[i],
    })).filter(h => h.hour >= nowH && h.hour <= 23).slice(0, 8);

    const maxT = Math.max(...d.hourly.temperature_2m.map(Math.round));
    const minT = Math.min(...d.hourly.temperature_2m.map(Math.round));

    setText('weather-temp',   `${temp}°C`);
    setText('weather-desc',   desc);
    setText('weather-rain',   `${rain}% lluvia`);
    setText('weather-wind',   `${wind} km/h`);
    setText('weather-minmax', `${minT}° / ${maxT}°`);
    setText('weather-uv',     `Sensación ${feels}°C`);

    const forecastEl = document.getElementById('weather-forecast');
    if (forecastEl) {
      forecastEl.innerHTML = hours.map(h => `
        <div class="forecast-item">
          <div class="forecast-hour">${String(h.hour).padStart(2,'0')}h</div>
          <div class="forecast-emoji">${wmo(h.code).emoji}</div>
          <div class="forecast-temp">${h.temp}°</div>
        </div>`).join('');
    }
  } catch (e) {
    console.warn('Weather error:', e.message);
    // fallback silencioso con datos históricos agosto París
    setText('weather-temp',   '26°C');
    setText('weather-desc',   'Datos históricos agosto');
    setText('weather-rain',   '15% lluvia');
    setText('weather-wind',   '14 km/h');
    setText('weather-minmax', '18° / 28°');
    setText('weather-uv',     'Sensación ~24°C');
  }
}

/* ── COLAS EN TIEMPO REAL ───────────────────────────────────── */
async function loadQueues() {
  if (STATE.loading) return;
  STATE.loading = true;
  showQueueLoading();

  try {
    const [dlpJson, dawJson] = await Promise.all([
      proxyFetch(API_DLP),
      proxyFetch(API_DAW),
    ]);
    const dlpFlat = flattenRides(dlpJson.lands || []);
    const dawFlat = flattenRides(dawJson.lands || []);

    // Si el parque está cerrado (todas cerradas), usar datos históricos de agosto
    const dlpOpen = dlpFlat.filter(r => r.is_open && r.wait_time > 0).length;
    const dawOpen = dawFlat.filter(r => r.is_open && r.wait_time > 0).length;

    if (dlpOpen === 0 && dawOpen === 0) {
      // Parque cerrado — mostrar estimaciones históricas de agosto
      STATE.dlpRides = fallbackDLP();
      STATE.dawRides = fallbackDAW();
      STATE.error = '🌙 Parque cerrado ahora · Estimaciones típicas de agosto';
      STATE.lastUpdated = new Date();
    } else {
      STATE.dlpRides = dlpFlat;
      STATE.dawRides = dawFlat;
      STATE.error = null;
      STATE.lastUpdated = new Date();
    }
  } catch (err) {
    console.warn('Queue fetch error:', err.message);
    STATE.error = 'Sin conexión — mostrando estimaciones de agosto';
    STATE.dlpRides = fallbackDLP();
    STATE.dawRides = fallbackDAW();
    STATE.lastUpdated = null;
  } finally {
    STATE.loading = false;
    renderQueues();
    renderLastUpdated();
  }
}

async function proxyFetch(url) {
  const res = await fetch(CORS_PROXY + encodeURIComponent(url), { cache: 'no-store' });
  if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
  return res.json();
}

function flattenRides(lands) {
  return lands.flatMap(land => (land.rides || []).map(r => ({ ...r, land: land.name })));
}

/* ── RENDER COLAS ───────────────────────────────────────────── */
function renderQueues() {
  const rides = STATE.tab === 'dlp' ? STATE.dlpRides : STATE.dawRides;
  const filter = STATE.filter;

  // Enriquecer con metadatos
  let enriched = rides.map(ride => {
    const meta = STATE.tab === 'dlp'
      ? (META_DLP[ride.id] || null)
      : findDawMeta(ride.name);
    return { ...ride, meta };
  });

  // Filtrar
  if (filter === 'open')   enriched = enriched.filter(r => r.is_open && r.wait_time > 0);
  if (filter === 'family') enriched = enriched.filter(r => r.meta?.family === true);
  if (filter === 'thrill') enriched = enriched.filter(r => r.meta?.height != null);
  if (filter === 'all')    enriched = enriched.filter(r => r.meta != null || (r.is_open && r.wait_time > 0));

  // Ordenar: por rank (priorizadas) luego por espera desc
  enriched.sort((a, b) => {
    const ra = a.meta?.rank ?? 999, rb = b.meta?.rank ?? 999;
    if (ra !== rb) return ra - rb;
    return b.wait_time - a.wait_time;
  });

  const list = document.getElementById('attractions-list');
  if (!list) return;

  if (enriched.length === 0) {
    list.innerHTML = '<div class="empty-state">No hay datos para este filtro.</div>';
    return;
  }

  list.innerHTML = enriched.map((r, i) => {
    const meta = r.meta;
    const rank = meta?.rank ?? (i + 1);
    const emoji = meta?.emoji ?? '🎡';

    let chipClass, chipLabel;
    if (!r.is_open) {
      chipClass = 'closed'; chipLabel = '🔒 Cerrada';
    } else if (r.wait_time === 0) {
      chipClass = 'low'; chipLabel = '🟢 Sin espera';
    } else if (r.wait_time < 20) {
      chipClass = 'low'; chipLabel = `${r.wait_time} min`;
    } else if (r.wait_time < 45) {
      chipClass = 'med'; chipLabel = `${r.wait_time} min`;
    } else {
      chipClass = 'high'; chipLabel = `${r.wait_time} min`;
    }

    const heightBadge = meta?.height
      ? `<span class="attr-height">↑ ${meta.height}</span>`
      : `<span class="attr-height ok">✓ Todos</span>`;

    const fallbackBadge = r.fallback ? '<span class="fallback-badge">est.</span>' : '';

    return `
      <div class="attraction-item ${!r.is_open ? 'is-closed' : ''}">
        <div class="attr-rank">${rank}</div>
        <div class="attr-info">
          <div class="attr-name">${emoji} ${r.name}</div>
          <div class="attr-meta">
            <span class="attr-zone">${r.land}</span>
            ${heightBadge}
          </div>
          ${meta?.tip ? `<div class="attr-tip">${meta.tip}</div>` : ''}
        </div>
        <div class="attr-right">
          <span class="wait-chip ${chipClass}">${chipLabel}</span>
          ${fallbackBadge}
        </div>
      </div>`;
  }).join('');

  // Stats
  const open = enriched.filter(r => r.is_open && r.wait_time > 0);
  const avg = open.length ? Math.round(open.reduce((s,r) => s + r.wait_time, 0) / open.length) : 0;
  const statsEl = document.getElementById('live-stats');
  if (statsEl && open.length > 0) {
    statsEl.innerHTML = `<span>${open.length} atracciones abiertas · espera media <strong>${avg} min</strong></span>`;
  }
}

function findDawMeta(name) {
  const n = name.toLowerCase();
  return META_DAW_NAMES.find(m => n.includes(m.key.toLowerCase().substring(0,10))) || null;
}

function showQueueLoading() {
  const list = document.getElementById('attractions-list');
  if (list) list.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <span>Cargando colas en tiempo real…</span>
    </div>`;
}

function renderLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el) return;
  if (STATE.error) {
    el.innerHTML = `<span class="update-error">⚠️ ${STATE.error}</span>`;
  } else if (STATE.lastUpdated) {
    const hh = String(STATE.lastUpdated.getHours()).padStart(2,'0');
    const mm = String(STATE.lastUpdated.getMinutes()).padStart(2,'0');
    el.innerHTML = `
      <span class="update-ok">🟢 Datos en vivo · ${hh}:${mm}</span>
      <span class="update-source">Fuente: <a href="https://queue-times.com" target="_blank" rel="noopener">Queue-Times.com</a></span>`;
  }
}

/* ── FALLBACK HISTÓRICO AGOSTO ──────────────────────────────── */
function fallbackDLP() {
  return [
    {id:22,name:"Peter Pan's Flight",      land:'Fantasyland',   is_open:true, wait_time:75, fallback:true},
    {id:25,name:'Big Thunder Mountain',     land:'Frontierland',  is_open:true, wait_time:55, fallback:true},
    {id:3, name:'Pirates of the Caribbean', land:'Adventureland', is_open:true, wait_time:35, fallback:true},
    {id:26,name:'Phantom Manor',            land:'Frontierland',  is_open:true, wait_time:25, fallback:true},
    {id:5, name:'Buzz Lightyear Laser Blast',land:'Discoveryland',is_open:true, wait_time:30, fallback:true},
    {id:8, name:'Star Wars Hyperspace Mountain',land:'Discoveryland',is_open:true,wait_time:60,fallback:true},
    {id:19,name:"\"it's a small world\"",   land:'Fantasyland',   is_open:true, wait_time:15, fallback:true},
    {id:18,name:'Dumbo the Flying Elephant',land:'Fantasyland',   is_open:true, wait_time:40, fallback:true},
    {id:2, name:'Indiana Jones™ and the Temple of Peril',land:'Adventureland',is_open:true,wait_time:30,fallback:true},
    {id:9, name:'Star Tours',               land:'Discoveryland', is_open:true, wait_time:20, fallback:true},
    {id:4, name:'Autopia',                  land:'Discoveryland', is_open:true, wait_time:35, fallback:true},
    {id:20,name:"Mad Hatter's Tea Cups",    land:'Fantasyland',   is_open:true, wait_time:15, fallback:true},
    {id:23,name:'Les Voyages de Pinocchio', land:'Fantasyland',   is_open:true, wait_time:20, fallback:true},
  ];
}
function fallbackDAW() {
  return [
    {id:9001,name:"Crush's Coaster",         land:'Toon Studio',          is_open:true, wait_time:65, fallback:true},
    {id:9002,name:'Ratatouille Adventure',    land:'Toon Studio',          is_open:true, wait_time:50, fallback:true},
    {id:9003,name:'Avengers Assemble Flight Force',land:'Marvel Campus',   is_open:true, wait_time:30, fallback:true},
    {id:9004,name:'Spider-Man W.E.B. Adventure',land:'Marvel Campus',      is_open:true, wait_time:25, fallback:true},
    {id:9005,name:'Tower of Terror',          land:'Production Courtyard', is_open:true, wait_time:30, fallback:true},
    {id:9006,name:'Frozen Ever After',        land:'World of Frozen',      is_open:true, wait_time:55, fallback:true},
    {id:9007,name:'RC Racer',                 land:'Toon Studio',          is_open:true, wait_time:30, fallback:true},
    {id:9008,name:'Cars ROAD TRIP',           land:'Toon Studio',          is_open:true, wait_time:25, fallback:true},
    {id:9009,name:'Toy Soldiers Parachute Drop',land:'Toon Studio',        is_open:true, wait_time:20, fallback:true},
    {id:9010,name:'Slinky® Dog Zigzag Spin',  land:'Toon Studio',          is_open:true, wait_time:10, fallback:true},
  ];
}

/* ── HERO DATE ──────────────────────────────────────────────── */
function renderHeroDate() {
  const el = document.getElementById('hero-date');
  if (!el) return;
  const now = new Date();
  const tripStart = new Date('2026-08-19T00:00:00');
  const tripEnd   = new Date('2026-08-23T23:59:59');
  const days = Math.ceil((tripStart - now) / 86400000);

  const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
                 'agosto','septiembre','octubre','noviembre','diciembre'];

  if (now >= tripStart && now <= tripEnd) {
    el.textContent = `${DIAS[now.getDay()]} ${now.getDate()} de ${MESES[now.getMonth()]}`;
  } else if (days > 0) {
    el.textContent = `⏳ Faltan ${days} días · 19-23 agosto 2026`;
  } else {
    el.textContent = '🎉 ¡Bienvenido a Disneyland Paris!';
  }
}

/* ── PROGRESO DEL DÍA ───────────────────────────────────────── */
function initProgress() {
  const now = new Date();
  const cur = now.getHours() + now.getMinutes() / 60;
  const pct = Math.max(0, Math.min(100,
    ((cur - PARK_OPEN_H) / (PARK_CLOSE_H - PARK_OPEN_H)) * 100));

  const fill  = document.getElementById('day-progress');
  const dot   = document.getElementById('progress-dot');
  const label = document.getElementById('progress-time-label');
  if (fill)  fill.style.width = pct + '%';
  if (dot)   dot.style.left   = pct + '%';
  if (label) label.textContent =
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0');
}

/* ── RELOJ ──────────────────────────────────────────────────── */
function initClock() {
  function tick() {
    const n = new Date();
    setText('live-clock',
      String(n.getHours()).padStart(2,'0') + ':' +
      String(n.getMinutes()).padStart(2,'0'));
  }
  tick();
  setInterval(tick, 1000);
}

/* ── SHOWS ──────────────────────────────────────────────────── */
function renderShows() {
  const el = document.getElementById('shows-list');
  if (!el) return;
  el.innerHTML = SHOWS.map(s => {
    const extra = s.times.slice(1).join(' · ');
    return `
      <div class="show-item" style="--accent:${s.accent}">
        <div class="show-time-block">
          <span class="show-time">${s.times[0]}</span>
          ${extra ? `<div class="show-times-extra">${extra}</div>` : ''}
        </div>
        <div class="show-info">
          <div class="show-name">${s.emoji} ${s.name}</div>
          <div class="show-meta">
            <span>${s.location}</span>
            <span class="show-tag ${s.tag}">${s.tagLabel}</span>
          </div>
          <div class="show-meta" style="margin-top:4px;font-size:0.7rem;opacity:0.75">${s.tip}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── CONSEJO ROTATIVO ───────────────────────────────────────── */
function renderTip() {
  const el = document.getElementById('tip-content');
  if (!el) return;
  let i = new Date().getHours() % TIPS.length;
  el.innerHTML = `<p>${TIPS[i]}</p>`;
  setInterval(() => {
    i = (i + 1) % TIPS.length;
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      el.innerHTML = `<p>${TIPS[i]}</p>`;
      el.style.opacity = '1';
    }, 400);
  }, 8000);
}

/* ── FILTROS ────────────────────────────────────────────────── */
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.filter = btn.dataset.filter;
      renderQueues();
    });
  });
}

/* ── TABS DE PARQUE ─────────────────────────────────────────── */
function initParkTabs() {
  document.querySelectorAll('[data-park-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-park-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      STATE.tab = tab.dataset.parkTab;
      renderQueues();
    });
  });
}

/* ── BOTTOM NAV ─────────────────────────────────────────────── */
function initVisualViewportAnchor() {
  // Ancla la .bottom-nav al visual viewport para que quede pegada al borde inferior
  // real de la pantalla, incluso cuando la barra del navegador móvil está visible o cambia.
  if (!window.visualViewport) return;
  const root = document.documentElement;
  let raf = 0;
  const update = () => {
    const vv = window.visualViewport;
    // Distancia entre el borde inferior del layout viewport y el del visual viewport
    const bottomGap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    root.style.setProperty('--vv-bottom', bottomGap + 'px');
  };
  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  };
  window.visualViewport.addEventListener('resize', schedule);
  window.visualViewport.addEventListener('scroll', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule);
  update();
}

function initBottomNav() {
  const navBtns = document.querySelectorAll('.nav-btn');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cls = btn.dataset.scroll;
      const target = document.querySelector('.' + cls);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Resaltar botón al hacer scroll
  const cards = document.querySelectorAll('.card');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const cls = Array.from(e.target.classList).find(c => c.startsWith('card-') && c !== 'card');
        if (!cls) return;
        navBtns.forEach(b => b.classList.toggle('active', b.dataset.scroll === cls));
      });
    }, { threshold: 0.5 });
    cards.forEach(c => obs.observe(c));
  }
}

/* ── TEMA ───────────────────────────────────────────────────── */
function initTheme() {
  const btn  = document.querySelector('[data-theme-toggle]');
  const html = document.documentElement;
  const saved = localStorage.getItem('dlp-theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  let theme = saved || system;
  html.setAttribute('data-theme', theme);
  updateThemeIcon(btn, theme);
  if (btn) btn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', theme);
    localStorage.setItem('dlp-theme', theme);
    updateThemeIcon(btn, theme);
  });
}

function updateThemeIcon(btn, theme) {
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

/* ── UTIL ───────────────────────────────────────────────────── */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ═══════════════════════════════════════════════════════════════
   PLAN DIARIO DEL VIAJE (19-23 agosto 2026)
   Fuente: itinerario PDF + horarios oficiales de espectáculos
   ═══════════════════════════════════════════════════════════════ */

// === PLAN DEFINITIVO POR ZONAS (v4) ===
const TRIP_DAYS = [
  {
    key: 'mie', date: '2026-08-19', dow: 'Mié', day: 19, label: 'Miércoles 19',
    park: 'Disneyland Park',
    zone: 'Frontierland + Discoveryland',
    reservation: { name: 'Silver Spur Steakhouse', time: '15:15', emoji: '🥩', zone: 'Frontierland' },
    items: [
      { time: '07:45', title: 'Llegada a la entrada del parque', meta: 'Check-in previo o maletas ya listas · 20-30 min antes del EMT', emoji: '🏨', tag: 'Ritmo familiar' },
      { time: '08:15', title: 'Extra Magic Time', meta: 'Directos a Peter Pan y después Buzz Lightyear. Si Big Thunder abre en EMT, priorizarlo.', badge: 'emt', zone: 'Fantasyland → Discoveryland', emoji: '✨', highlight: true, tag: 'Alta demanda', note: 'Comprobad la app oficial esa mañana: no todas las atracciones abren durante el acceso anticipado.' },
      { time: '09:30', title: 'Discoveryland', meta: 'Star Tours, Orbitron y paseo por la zona', badge: 'dlp', zone: 'Discoveryland', emoji: '🚀', tag: 'Ruta compacta' },
      { time: '11:00', title: 'Central Plaza', meta: 'Castillo, fotos y espectáculo diurno si encaja con el horario oficial', badge: 'dlp', zone: 'Central Plaza', emoji: '🏰', tag: 'Descanso' },
      { time: '12:00', title: 'Frontierland', meta: 'Big Thunder Mountain, Phantom Manor, Thunder Mesa y Riverboat si está operativo', badge: 'dlp', zone: 'Frontierland', emoji: '🤠', tag: 'Quedar cerca' },
      { time: '15:15', title: 'Comida: Silver Spur Steakhouse', meta: 'Reserva confirmada · Dentro de Frontierland', kind: 'meal', emoji: '🥩' },
      { time: '16:45', title: 'Frontierland (tarde)', meta: 'Repetir Big Thunder o completar Phantom Manor / Riverboat', badge: 'dlp', zone: 'Frontierland', emoji: '🚢', tag: 'Sin cruces' },
      { time: '18:30', title: 'Main Street', meta: 'Cabalgata, tiendas y tentempié ligero', emoji: '🛍️', tag: 'Bajar ritmo' },
      { time: '22:00', title: 'Disney Tales of Magic', meta: 'Espectáculo nocturno · Central Plaza · Sitio 45-60 min antes para 9 personas', arrive: 60, rating: 5, kind: 'show', highlight: true, tag: 'Imprescindible' },
    ]
  },
  {
    key: 'jue', date: '2026-08-20', dow: 'Jue', day: 20, label: 'Jueves 20',
    park: 'Disneyland Park',
    zone: 'Fantasyland + Adventureland',
    reservation: { name: 'Agrabah Café', time: '15:30', emoji: '🧞', zone: 'Adventureland' },
    items: [
      { time: '07:45', title: 'Llegada al control de seguridad', meta: '20-30 min antes del inicio del EMT', emoji: '🏨', tag: 'Ritmo familiar' },
      { time: '08:15', title: 'Extra Magic Time', meta: 'Peter Pan, Dumbo y una atracción pendiente de Fantasyland', badge: 'emt', zone: 'Fantasyland', emoji: '✨', highlight: true, tag: 'Prioridad infantil' },
      { time: '09:30', title: 'Fantasyland', meta: "It's a Small World, Blancanieves, Pinocho, Carrousel y Laberinto de Alicia", badge: 'dlp', zone: 'Fantasyland', emoji: '🎠', tag: 'Zona única' },
      { time: '11:45', title: 'Fantasyland (personajes)', meta: 'Castillo, tiendas y encuentro con personajes si la espera es razonable', badge: 'dlp', zone: 'Fantasyland', emoji: '👸', tag: 'Ritmo suave' },
      { time: '13:15', title: 'Adventureland', meta: 'Pasaje de Aladdin, Adventure Isle y paseo hacia Agrabah', badge: 'dlp', zone: 'Adventureland', emoji: '🏝️', tag: 'Acercarse' },
      { time: '15:30', title: 'Comida: Agrabah Café', meta: 'Reserva confirmada · Entrada de Adventureland', kind: 'meal', emoji: '🧞' },
      { time: '17:00', title: 'Pirates of the Caribbean + Adventure Isle', meta: 'Cabaña de Robinson y zona ya cercana · Evita cruzar el parque', badge: 'dlp', zone: 'Adventureland', emoji: '🏴‍☠️', tag: 'Sin desplazamiento', note: 'No hagáis Pirates antes de comer si tiene mucha cola. Después de las 17:00 encaja mejor con vuestra ubicación.' },
      { time: '19:00', title: 'Central Plaza', meta: 'Cabalgata o espectáculo diurno según app', emoji: '🎡', tag: 'Flexible' },
      { time: '22:00', title: 'Noche opcional', meta: 'Repetir Tales of Magic o regresar al hotel temprano', kind: 'show', rating: 4, tag: 'Recuperación' },
    ]
  },
  {
    key: 'vie', date: '2026-08-21', dow: 'Vie', day: 21, label: 'Viernes 21',
    park: 'Disney Adventure World',
    zone: 'Frozen + Pixar + Marvel',
    reservation: { name: 'PYM Kitchen', time: '15:15', emoji: '🥪', zone: 'Avengers Campus' },
    items: [
      { time: '07:45', title: 'Llegada al control de seguridad', meta: '20-30 min antes del inicio del EMT · Preparad la app para la cola virtual', emoji: '🏨', tag: 'Ritmo familiar' },
      { time: '08:15', title: 'Extra Magic Time', meta: 'World of Frozen / Frozen Ever After si está incluido en EMT. Si no, priorizar Crush\'s Coaster.', badge: 'emt', zone: 'World of Frozen', emoji: '✨', highlight: true, tag: 'Máxima prioridad', note: 'El orden exacto depende de si Frozen Ever After opera durante Extra Magic Time. La app oficial de ese día manda.' },
      { time: '09:45', title: 'World of Frozen', meta: 'Arendelle, Frozen Ever After y solicitar cola virtual para Elsa y Anna si está disponible', badge: 'daw', zone: 'World of Frozen', emoji: '❄️', tag: 'Frozen', note: 'No prometáis un encuentro con Elsa y Anna sin haber conseguido antes la cola virtual.' },
      { time: '11:45', title: 'A Celebration in Arendelle', meta: 'World of Frozen · Sesión que mejor encaje', arrive: 25, rating: 4, kind: 'show', tag: 'Espectáculo' },
      { time: '12:30', title: 'Adventure Way', meta: 'Paseo por el lago y atracciones familiares de la zona', badge: 'daw', zone: 'Adventure Way', emoji: '🐸', tag: 'Camino natural' },
      { time: '13:30', title: 'Worlds of Pixar', meta: 'Ratatouille y una atracción cercana · Camino hacia Marvel', badge: 'daw', zone: 'Worlds of Pixar', emoji: '🐀', tag: 'Hacia Marvel' },
      { time: '15:15', title: 'Comida: PYM Kitchen', meta: 'Reserva confirmada · Avengers Campus', kind: 'meal', emoji: '🥪' },
      { time: '16:45', title: 'Avengers Campus', meta: 'Spider-Man W.E.B., Flight Force para quien quiera y apariciones Marvel', badge: 'daw', zone: 'Avengers Campus', emoji: '🦸', tag: 'Zona única' },
      { time: '19:00', title: 'Mickey and the Magician', meta: 'World Premiere Plaza si hay sesión compatible', arrive: 30, rating: 5, kind: 'show', tag: 'Interior' },
      { time: '22:00', title: 'Disney Cascade of Lights', meta: 'Espectáculo nocturno · Adventure Bay si está programado', arrive: 45, rating: 5, kind: 'show', highlight: true, tag: 'Final del día' },
    ]
  },
  {
    key: 'sab', date: '2026-08-22', dow: 'Sáb', day: 22, label: 'Sábado 22',
    park: 'Disneyland Park',
    zone: 'Adventureland + Fantasyland',
    reservation: { name: "Captain Jack's", time: '14:45', emoji: '🏴‍☠️', zone: 'Adventureland' },
    items: [
      { time: '07:45', title: 'Llegada al control de seguridad', meta: '20-30 min antes del inicio del EMT', emoji: '🏨', tag: 'Ritmo familiar' },
      { time: '08:15', title: 'Extra Magic Time', meta: 'Repetir la favorita más demandada: Big Thunder, Peter Pan o Buzz según colas de días anteriores', badge: 'emt', zone: 'Según colas previas', emoji: '✨', highlight: true, tag: 'Repetición inteligente' },
      { time: '09:30', title: 'Adventureland', meta: 'Pirates of the Caribbean, Adventure Isle y cuevas', badge: 'dlp', zone: 'Adventureland', emoji: '🏴‍☠️', tag: 'Zona del restaurante' },
      { time: '11:30', title: 'Cabaña de Robinson + Indiana Jones', meta: 'Para quienes cumplan altura y quieran', badge: 'dlp', zone: 'Adventureland', emoji: '🎩', tag: 'Opcional' },
      { time: '12:30', title: 'Adventureland (margen)', meta: 'Fotos, paseo tranquilo y atracciones pendientes sin alejarse', badge: 'dlp', zone: 'Adventureland', emoji: '📸', tag: 'Margen' },
      { time: '14:45', title: "Comida: Captain Jack's", meta: 'Reserva confirmada · DENTRO de Pirates of the Caribbean', kind: 'meal', emoji: '🏴‍☠️', note: 'La mesa está a orillas del agua dentro de la atracción. Es el mejor día para concentrar la mañana en Adventureland.' },
      { time: '16:15', title: 'Fantasyland', meta: 'Atracciones familiares pendientes o repetir Small World / Peter Pan', badge: 'dlp', zone: 'Fantasyland', emoji: '🎡', tag: 'Zona contigua' },
      { time: '18:00', title: 'Main Street', meta: 'Cabalgata, compras y fotos finales', emoji: '🛍️', tag: 'Despedida' },
      { time: '22:00', title: 'Disney Tales of Magic', meta: 'ÚLTIMA NOCHE — Central Plaza · Sitio 45-60 min antes para 9 personas', arrive: 60, rating: 5, kind: 'show', highlight: true, tag: 'Última noche' },
    ]
  },
  {
    key: 'dom', date: '2026-08-23', dow: 'Dom', day: 23, label: 'Domingo 23',
    park: 'Disney Adventure World',
    zone: 'Frozen + Adventure Way',
    reservation: null,
    items: [
      { time: '07:45', title: 'Llegada al control de seguridad', meta: '20-30 min antes del inicio del EMT · Último día', emoji: '🏨', tag: 'Ritmo familiar' },
      { time: '08:15', title: 'Extra Magic Time', meta: "Repetir Frozen Ever After o Crush's Coaster, según lo que haya quedado pendiente", badge: 'emt', zone: 'World of Frozen / Pixar', emoji: '✨', highlight: true, tag: 'Última prioridad' },
      { time: '09:30', title: 'Frozen / Pixar', meta: 'Última visita a Frozen, Ratatouille o Cars', badge: 'daw', zone: 'World of Frozen / Pixar', emoji: '❄️', tag: 'Sin prisas' },
      { time: '11:30', title: 'Cavalcade o espectáculo diurno', meta: 'Adventure Bay si coincide', arrive: 20, rating: 4, kind: 'show', tag: 'Cerca' },
      { time: '12:30', title: 'Comida rápida', meta: 'En la zona que hayáis elegido · Sin restaurante de mesa', emoji: '🍰', tag: 'Control del tiempo' },
      { time: '13:45', title: 'Tiendas / salida', meta: 'Compras finales y regreso al hotel', emoji: '🛍️', tag: 'Cierre' },
      { time: '14:30', title: 'Hotel', meta: 'Recoger equipaje y comprobar transporte', emoji: '🧳', tag: 'Margen' },
      { time: '15:30', title: 'Salida en van privado hacia ORY', meta: 'Salida entre 15:30 y 15:45 · No retrasar', emoji: '🚐', highlight: true, tag: 'No retrasar', note: 'Para 9 personas con equipaje, reservad un vehículo adecuado y confirmad el punto exacto de recogida el día anterior.' },
      { time: '17:00', title: 'Llegada estimada a ORY', meta: 'Margen amplio para facturación y controles', emoji: '🛩️', tag: 'Margen amplio' },
      { time: '20:40', title: 'Vuelo de regreso', meta: 'Paris-Orly → casa', emoji: '✈️', tag: 'Salida' },
    ]
  },
];

// Espectáculos mejor colocados (resumen curado por día)
const SHOW_HIGHLIGHTS = [
  { day: 'Miércoles', name: 'Espectáculo diurno + Disney Tales of Magic', zone: 'Central Plaza', emoji: '🏰' },
  { day: 'Jueves', name: 'Cabalgata de Disneyland Park', zone: 'Main Street / Central Plaza', emoji: '🚂' },
  { day: 'Viernes', name: 'A Celebration in Arendelle', zone: 'World of Frozen', emoji: '❄️' },
  { day: 'Viernes', name: 'Mickey and the Magician', zone: 'World Premiere Plaza', emoji: '🎩' },
  { day: 'Viernes', name: 'Disney Cascade of Lights', zone: 'Adventure Bay', emoji: '✨' },
  { day: 'Sábado', name: 'Cabalgata + Disney Tales of Magic', zone: 'Main Street / Central Plaza', emoji: '🎇' },
  { day: 'Domingo', name: 'Disney Princess Cavalcade', zone: 'Adventure Bay', emoji: '👑' },
];

// Puntos de interés con coordenadas reales (Disneyland Paris, Chessy)
const POINTS_OF_INTEREST = [
  // === ATRACCIONES DISNEYLAND PARK ===
  { id: 'peter-pan',    name: "Peter Pan's Flight",       cat: 'attraction', park: 'dlp', zone: 'Fantasyland',   lat: 48.8735, lon: 2.7776, emoji: '🧚' },
  { id: 'big-thunder',  name: 'Big Thunder Mountain',     cat: 'attraction', park: 'dlp', zone: 'Frontierland',  lat: 48.8724, lon: 2.7754, emoji: '🚠' },
  { id: 'pirates',      name: 'Pirates of the Caribbean', cat: 'attraction', park: 'dlp', zone: 'Adventureland', lat: 48.8721, lon: 2.7767, emoji: '🏴‍☠️' },
  { id: 'phantom-manor',name: 'Phantom Manor',            cat: 'attraction', park: 'dlp', zone: 'Frontierland',  lat: 48.8721, lon: 2.7748, emoji: '👻' },
  { id: 'buzz',         name: 'Buzz Lightyear Laser Blast', cat: 'attraction', park: 'dlp', zone: 'Discoveryland', lat: 48.8733, lon: 2.7788, emoji: '🚀' },
  { id: 'star-tours',   name: 'Star Tours',               cat: 'attraction', park: 'dlp', zone: 'Discoveryland', lat: 48.8734, lon: 2.7791, emoji: '⭐' },
  { id: 'hyperspace',   name: 'Hyperspace Mountain',      cat: 'attraction', park: 'dlp', zone: 'Discoveryland', lat: 48.8737, lon: 2.7789, emoji: '🚀' },
  { id: 'small-world',  name: "It's a Small World",       cat: 'attraction', park: 'dlp', zone: 'Fantasyland',   lat: 48.8738, lon: 2.7772, emoji: '🌍' },
  { id: 'dumbo',        name: 'Dumbo the Flying Elephant',cat: 'attraction', park: 'dlp', zone: 'Fantasyland',   lat: 48.8736, lon: 2.7774, emoji: '🐘' },
  { id: 'alice',        name: 'Laberinto de Alicia',      cat: 'attraction', park: 'dlp', zone: 'Fantasyland',   lat: 48.8734, lon: 2.7773, emoji: '🍄' },
  { id: 'adventure-isle', name: 'Adventure Isle',         cat: 'attraction', park: 'dlp', zone: 'Adventureland', lat: 48.8724, lon: 2.7765, emoji: '🌴' },
  { id: 'indiana',      name: 'Indiana Jones Temple of Peril', cat: 'attraction', park: 'dlp', zone: 'Adventureland', lat: 48.8722, lon: 2.7763, emoji: '🎩' },
  { id: 'robinson',     name: 'Cabaña de Robinson',       cat: 'attraction', park: 'dlp', zone: 'Adventureland', lat: 48.8725, lon: 2.7762, emoji: '🏡' },
  { id: 'orbitron',     name: 'Orbitron',                 cat: 'attraction', park: 'dlp', zone: 'Discoveryland', lat: 48.8735, lon: 2.7786, emoji: '🪐' },
  { id: 'riverboat',    name: 'Thunder Mesa Riverboat',   cat: 'attraction', park: 'dlp', zone: 'Frontierland',  lat: 48.8723, lon: 2.7752, emoji: '🚢' },

  // === ATRACCIONES ADVENTURE WORLD ===
  { id: 'frozen-ever-after', name: 'Frozen Ever After',   cat: 'attraction', park: 'daw', zone: 'World of Frozen', lat: 48.8676, lon: 2.7802, emoji: '❄️' },
  { id: 'raiponce',     name: 'Raiponce Tangled Spin',    cat: 'attraction', park: 'daw', zone: 'Adventure Way',  lat: 48.8672, lon: 2.7810, emoji: '👸' },
  { id: 'ratatouille',  name: 'Ratatouille: L’Aventure',  cat: 'attraction', park: 'daw', zone: 'Worlds of Pixar', lat: 48.8686, lon: 2.7825, emoji: '🐀' },
  { id: 'cars',         name: 'Cars Road Trip',           cat: 'attraction', park: 'daw', zone: 'Worlds of Pixar', lat: 48.8688, lon: 2.7820, emoji: '🚗' },
  { id: 'crush',        name: "Crush's Coaster",          cat: 'attraction', park: 'daw', zone: 'Worlds of Pixar', lat: 48.8687, lon: 2.7822, emoji: '🐢' },
  { id: 'toy-story',    name: 'Toy Story Playland',       cat: 'attraction', park: 'daw', zone: 'Worlds of Pixar', lat: 48.8689, lon: 2.7828, emoji: '🧸' },
  { id: 'spider',       name: 'Spider-Man W.E.B. Adventure', cat: 'attraction', park: 'daw', zone: 'Avengers Campus', lat: 48.8683, lon: 2.7815, emoji: '🕷️' },
  { id: 'flight-force', name: 'Avengers Assemble: Flight Force', cat: 'attraction', park: 'daw', zone: 'Avengers Campus', lat: 48.8685, lon: 2.7818, emoji: '🚀' },

  // === ESPECTÁCULOS ===
  { id: 'tales-magic',  name: 'Disney Tales of Magic',      cat: 'show', park: 'dlp', zone: 'Central Plaza', lat: 48.8730, lon: 2.7770, emoji: '🎇' },
  { id: 'stars-parade', name: 'Disney Stars on Parade',     cat: 'show', park: 'dlp', zone: 'Main Street',  lat: 48.8727, lon: 2.7770, emoji: '🚂' },
  { id: 'lion-king',    name: 'The Lion King',              cat: 'show', park: 'dlp', zone: 'Fantasyland',  lat: 48.8739, lon: 2.7775, emoji: '🦁' },
  { id: 'splashes',     name: 'A Million Splashes of Colour', cat: 'show', park: 'dlp', zone: 'Central Plaza', lat: 48.8730, lon: 2.7772, emoji: '💧' },
  { id: 'arendelle',    name: 'A Celebration in Arendelle', cat: 'show', park: 'daw', zone: 'World of Frozen', lat: 48.8676, lon: 2.7804, emoji: '❄️' },
  { id: 'mickey-magic', name: 'Mickey and the Magician',    cat: 'show', park: 'daw', zone: 'World Premiere Plaza', lat: 48.8695, lon: 2.7808, emoji: '🎩' },
  { id: 'together',     name: 'TOGETHER: A Pixar Musical',  cat: 'show', park: 'daw', zone: 'Worlds of Pixar', lat: 48.8687, lon: 2.7823, emoji: '🎤' },
  { id: 'cascade',      name: 'Disney Cascade of Lights',   cat: 'show', park: 'daw', zone: 'Adventure Bay', lat: 48.8680, lon: 2.7815, emoji: '✨' },
  { id: 'princess-cav', name: 'Disney Princess Cavalcade',  cat: 'show', park: 'daw', zone: 'Adventure Bay', lat: 48.8680, lon: 2.7815, emoji: '👑' },

  // === RESTAURANTES CON RESERVA ===
  { id: 'silver-spur',  name: 'Silver Spur Steakhouse',  cat: 'meal', park: 'dlp', zone: 'Frontierland',    lat: 48.8724, lon: 2.7751, emoji: '🥩', reservation: '19 ago · 15:15' },
  { id: 'agrabah',      name: 'Agrabah Café',            cat: 'meal', park: 'dlp', zone: 'Adventureland',   lat: 48.8722, lon: 2.7768, emoji: '🧞', reservation: '20 ago · 15:30' },
  { id: 'pym',          name: 'PYM Kitchen',             cat: 'meal', park: 'daw', zone: 'Avengers Campus', lat: 48.8684, lon: 2.7817, emoji: '🥪', reservation: '21 ago · 15:15' },
  { id: 'captains-jack',name: "Captain Jack's",          cat: 'meal', park: 'dlp', zone: 'Adventureland',   lat: 48.8721, lon: 2.7766, emoji: '🏴‍☠️', reservation: '22 ago · 14:45' },
];

let PLAN_ACTIVE_KEY = (() => {
  try { return localStorage.getItem('dlp-plan-active-day'); } catch { return null; }
})();

function todayTripKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const iso = `${y}-${m}-${d}`;
  return TRIP_DAYS.find(td => td.date === iso)?.key || null;
}

function renderPlan() {
  const tabs = document.getElementById('day-tabs');
  if (!tabs) return;

  const todayKey = todayTripKey();
  PLAN_ACTIVE_KEY = PLAN_ACTIVE_KEY || todayKey || TRIP_DAYS[0].key;

  // Render tabs
  tabs.innerHTML = TRIP_DAYS.map(td => `
    <button class="day-tab ${td.key === PLAN_ACTIVE_KEY ? 'active' : ''} ${td.key === todayKey ? 'today' : ''}"
            data-day-key="${td.key}" role="tab" aria-selected="${td.key === PLAN_ACTIVE_KEY}">
      <span class="day-tab-dow">${td.dow}</span>
      <span class="day-tab-date">${td.day}</span>
    </button>
  `).join('');

  tabs.querySelectorAll('.day-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      PLAN_ACTIVE_KEY = btn.dataset.dayKey;
      try { localStorage.setItem('dlp-plan-active-day', PLAN_ACTIVE_KEY); } catch {}
      renderPlan();
    });
  });

  const active = TRIP_DAYS.find(td => td.key === PLAN_ACTIVE_KEY);
  if (!active) return;

  // Subtitle
  const sub = document.getElementById('plan-subtitle');
  if (sub) sub.textContent = `· ${active.park}`;

  // Reserva destacada
  const banner = document.getElementById('reservation-banner');
  if (banner) {
    if (active.reservation) {
      banner.className = 'reservation-banner';
      banner.innerHTML = `
        <div class="reservation-icon">${active.reservation.emoji}</div>
        <div class="reservation-info">
          <div class="reservation-label">Reserva confirmada</div>
          <div class="reservation-name">${active.reservation.name}</div>
        </div>
        <div class="reservation-time">${active.reservation.time}</div>
      `;
    } else {
      banner.className = 'reservation-banner empty';
      banner.innerHTML = '';
    }
  }

  // Timeline
  const tl = document.getElementById('day-timeline');
  if (!tl) return;

  tl.innerHTML = active.items.map(it => {
    const classes = ['timeline-item'];
    if (it.highlight) classes.push('highlight');
    if (it.kind === 'meal') classes.push('meal');
    if (it.kind === 'show') classes.push('show');

    const stars = it.rating ? '★'.repeat(it.rating) + '☆'.repeat(5 - it.rating) : '';
    const arrive = it.arrive ? `<span class="timeline-arrive">⏱ Llegar ${it.arrive} min antes</span>` : '';
    const rating = stars ? `<span class="timeline-rating">${stars}</span>` : '';
    const badge  = it.badge === 'emt' ? '<span class="timeline-badge emt">✨ Extra Magic Time</span>'
                  : it.badge === 'dlp' ? '<span class="timeline-badge dlp">Disneyland Park</span>'
                  : it.badge === 'daw' ? '<span class="timeline-badge daw">Adventure World</span>'
                  : '';
    const tag    = it.tag ? `<span class="timeline-tag">${it.tag}</span>` : '';
    const note   = it.note ? `<div class="timeline-note">💡 ${it.note}</div>` : '';
    const emoji  = it.emoji ? `<span class="timeline-emoji">${it.emoji}</span>` : '';
    if (it.badge === 'emt') classes.push('emt');

    return `
      <div class="${classes.join(' ')}">
        <div class="timeline-time">${it.time}</div>
        <div class="timeline-content">
          <div class="timeline-title">${emoji}${it.title}</div>
          <div class="timeline-meta">
            <span>${it.meta}</span>
            ${arrive}
            ${rating}
          </div>
          <div class="timeline-badges">
            ${badge}
            ${tag}
          </div>
          ${note}
        </div>
      </div>
    `;
  }).join('');

  // Reinicializar iconos (aunque no hay lucide en timeline)
  if (window.lucide) lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════════
   ESPECTÁCULOS MEJOR COLOCADOS
   ═══════════════════════════════════════════════════════════════ */
function renderHighlights() {
  const el = document.getElementById('highlights-list');
  if (!el) return;
  el.innerHTML = SHOW_HIGHLIGHTS.map(h => `
    <div class="hl-item">
      <div class="hl-emoji">${h.emoji}</div>
      <div class="hl-body">
        <div class="hl-day">${h.day}</div>
        <div class="hl-name">${h.name}</div>
        <div class="hl-zone">📍 ${h.zone}</div>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════
   CHECKLIST DEL VIAJE
   ═══════════════════════════════════════════════════════════════ */
const CHK_STORAGE = 'dlp-checklist-v1';
let CHK_ACTIVE_CAT = 'dlp';

function chkLoad() {
  try {
    return JSON.parse(localStorage.getItem(CHK_STORAGE) || '{}');
  } catch { return {}; }
}
function chkSave(data) {
  try { localStorage.setItem(CHK_STORAGE, JSON.stringify(data)); } catch {}
}

function chkItemsFor(cat) {
  if (cat === 'dlp') return POINTS_OF_INTEREST.filter(p => p.cat === 'attraction' && p.park === 'dlp');
  if (cat === 'daw') return POINTS_OF_INTEREST.filter(p => p.cat === 'attraction' && p.park === 'daw');
  if (cat === 'shows') return POINTS_OF_INTEREST.filter(p => p.cat === 'show');
  if (cat === 'meals') return POINTS_OF_INTEREST.filter(p => p.cat === 'meal');
  return [];
}

function renderChecklist() {
  const list = document.getElementById('checklist-list');
  if (!list) return;

  const data = chkLoad();
  const items = chkItemsFor(CHK_ACTIVE_CAT);

  list.innerHTML = items.map(it => `
    <div class="chk-item ${data[it.id] ? 'done' : ''}" data-chk-id="${it.id}">
      <div class="chk-emoji">${it.emoji}</div>
      <div class="chk-body">
        <div class="chk-name">${it.name}</div>
        <div class="chk-zone">📍 ${it.zone}${it.reservation ? ' · ' + it.reservation : ''}</div>
      </div>
      <button class="chk-btn" data-chk-toggle="${it.id}" aria-label="Marcar como visto">
        <span class="checkmark">✓</span>
        <span class="label-todo">Marcar</span>
        <span class="label-done">Visto</span>
      </button>
    </div>
  `).join('');

  // Total contador (todos los items)
  const allIds = POINTS_OF_INTEREST.map(p => p.id);
  const done = allIds.filter(id => data[id]).length;
  const cnt = document.getElementById('checklist-count');
  if (cnt) cnt.textContent = `${done} / ${allIds.length}`;

  // Bind toggles
  list.querySelectorAll('[data-chk-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.chkToggle;
      const d = chkLoad();
      if (d[id]) delete d[id]; else d[id] = new Date().toISOString();
      chkSave(d);
      renderChecklist();
    });
  });
}

function initChecklist() {
  document.querySelectorAll('.chk-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chk-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      CHK_ACTIVE_CAT = tab.dataset.chkCat;
      renderChecklist();
    });
  });
  const reset = document.getElementById('checklist-reset');
  if (reset) reset.addEventListener('click', () => {
    if (confirm('¿Reiniciar todos los elementos marcados?')) {
      chkSave({});
      renderChecklist();
    }
  });
  renderChecklist();
}

/* ═══════════════════════════════════════════════════════════════
   MAPA CON GEOLOCALIZACIÓN
   ═══════════════════════════════════════════════════════════════ */
let USER_LOCATION = null;
let POI_ACTIVE_CAT = 'all';

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // radio de la Tierra
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function renderPOIs() {
  const list = document.getElementById('poi-list');
  if (!list) return;

  let items = POINTS_OF_INTEREST.slice();
  if (POI_ACTIVE_CAT !== 'all') {
    items = items.filter(p => p.cat === POI_ACTIVE_CAT);
  }

  // Añadir distancia si tenemos ubicación
  if (USER_LOCATION) {
    items = items.map(p => ({
      ...p,
      distance: haversineMeters(USER_LOCATION.lat, USER_LOCATION.lon, p.lat, p.lon)
    })).sort((a, b) => a.distance - b.distance);
  }

  const catLabels = { attraction: 'Atracción', show: 'Show', meal: 'Restaurante' };
  const parkLabels = { dlp: 'Disneyland Park', daw: 'Adventure World' };

  list.innerHTML = items.map(p => {
    const distHTML = (p.distance != null)
      ? `<span class="poi-distance">📍 ${formatDistance(p.distance)}</span>`
      : '';
    // URL de Google Maps para navegar (usa direcciones si hay origen)
    const dest = `${p.lat},${p.lon}`;
    const mapsUrl = USER_LOCATION
      ? `https://www.google.com/maps/dir/?api=1&origin=${USER_LOCATION.lat},${USER_LOCATION.lon}&destination=${dest}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;
    return `
      <div class="poi-item ${p.cat}">
        <div class="poi-emoji">${p.emoji}</div>
        <div class="poi-body">
          <div class="poi-name">${p.name}</div>
          <div class="poi-meta">
            <span>${catLabels[p.cat]} · ${p.zone}</span>
            <span>${parkLabels[p.park] || ''}</span>
            ${distHTML}
          </div>
        </div>
        <a class="poi-nav-btn" href="${mapsUrl}" target="_blank" rel="noopener" aria-label="Cómo llegar">
          <i data-lucide="navigation"></i>
          Ir
        </a>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function initMap() {
  const btn = document.getElementById('locate-btn');
  const status = document.getElementById('map-status');

  if (btn) btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      status.innerHTML = '<div class="map-hint">⚠️ Tu navegador no soporta geolocalización.</div>' + status.innerHTML;
      return;
    }
    btn.textContent = '⏳ Obteniendo ubicación…';
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        USER_LOCATION = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        btn.innerHTML = '<i data-lucide="check-circle"></i> Ubicación activa';
        btn.classList.add('active');
        btn.disabled = false;
        // Añadir info de ubicación
        let info = document.getElementById('map-user-info');
        if (!info) {
          info = document.createElement('div');
          info.id = 'map-user-info';
          info.className = 'map-user-info';
          status.appendChild(info);
        }
        info.innerHTML = `<i data-lucide="map-pin"></i> Ordenando por cercanía a ti`;
        if (window.lucide) lucide.createIcons();
        renderPOIs();
      },
      err => {
        btn.innerHTML = '<i data-lucide="locate"></i> Activar mi ubicación';
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
        let msg = 'No se pudo obtener tu ubicación.';
        if (err.code === 1) msg = 'Has denegado el acceso a tu ubicación.';
        if (err.code === 3) msg = 'Tiempo de espera agotado.';
        alert(msg + ' Puedes usar el mapa sin ubicación tocando "Ir" en cualquier lugar.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });

  document.querySelectorAll('.poi-filter-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.poi-filter-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      POI_ACTIVE_CAT = b.dataset.poiCat;
      renderPOIs();
    });
  });

  renderPOIs();
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTAR / IMPORTAR PROGRESO (compartir por WhatsApp)
   ═══════════════════════════════════════════════════════════════ */
function encodeProgress(data) {
  // Solo IDs de items marcados como true — mucho más compacto
  const ids = Object.keys(data);
  const payload = JSON.stringify(ids);
  // btoa admite ASCII; los IDs son slugs ASCII así que no hace falta escapar
  return btoa(payload).replace(/=+$/, '');
}
function decodeProgress(code) {
  code = code.trim().replace(/\s+/g, '');
  // Restaurar padding base64
  while (code.length % 4) code += '=';
  const json = atob(code);
  const ids = JSON.parse(json);
  if (!Array.isArray(ids)) throw new Error('Formato inválido');
  const now = new Date().toISOString();
  const out = {};
  ids.forEach(id => { if (typeof id === 'string') out[id] = now; });
  return out;
}

function buildWhatsAppMessage(code, count) {
  const url = 'https://alfberto.github.io/dlp-planner-paris/';
  const msg =
    `🏰 *DLP Planner — Progreso de la checklist*\n\n` +
    `He marcado ${count} atracciones/espectáculos. Ábre la app y pega este código en "Importar progreso" para sincronizar:\n\n` +
    `\`${code}\`\n\n` +
    `👉 ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

function openChkModal(mode) {
  const modal = document.getElementById('chk-modal');
  const title = document.getElementById('chk-modal-title');
  const hint = document.getElementById('chk-modal-hint');
  const ta = document.getElementById('chk-modal-textarea');
  const primary = document.getElementById('chk-modal-primary');
  const whatsappBtn = document.getElementById('chk-modal-whatsapp');
  const feedback = document.getElementById('chk-modal-feedback');
  feedback.textContent = '';
  feedback.classList.remove('error');

  if (mode === 'export') {
    const data = chkLoad();
    const ids = Object.keys(data);
    const code = encodeProgress(data);
    title.textContent = 'Compartir progreso';
    hint.innerHTML = `Tienes <strong>${ids.length}</strong> elementos marcados. Envíalo por WhatsApp con un toque, o copia el código para pegarlo donde quieras.`;
    ta.value = code;
    ta.readOnly = true;
    // Mostrar y configurar el botón de WhatsApp
    if (whatsappBtn) {
      whatsappBtn.hidden = false;
      whatsappBtn.onclick = () => {
        const waUrl = buildWhatsAppMessage(code, ids.length);
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        feedback.textContent = '✓ Abriendo WhatsApp…';
        feedback.classList.remove('error');
      };
    }
    primary.innerHTML = '<i data-lucide="copy"></i> Copiar código';
    primary.onclick = async () => {
      try {
        await navigator.clipboard.writeText(code);
        feedback.textContent = '✓ Copiado al portapapeles';
      } catch {
        // Fallback: seleccionar el texto
        ta.select();
        try {
          document.execCommand('copy');
          feedback.textContent = '✓ Copiado al portapapeles';
        } catch {
          feedback.textContent = 'Selecciona el texto y cópialo manualmente';
          feedback.classList.add('error');
        }
      }
    };
  } else {
    title.textContent = 'Importar progreso';
    hint.innerHTML = 'Pega aquí el código que te ha enviado tu familia. Se combinará con lo que ya tienes marcado (no borra nada).';
    ta.value = '';
    ta.readOnly = false;
    ta.placeholder = 'Pega aquí el código…';
    if (whatsappBtn) whatsappBtn.hidden = true;
    primary.innerHTML = '<i data-lucide="check"></i> Importar';
    primary.onclick = () => {
      const code = ta.value.trim();
      if (!code) {
        feedback.textContent = 'Introduce un código primero';
        feedback.classList.add('error');
        return;
      }
      try {
        const imported = decodeProgress(code);
        const current = chkLoad();
        const merged = { ...current, ...imported };
        chkSave(merged);
        renderChecklist();
        const added = Object.keys(imported).length;
        feedback.textContent = `✓ ${added} elementos importados y combinados`;
        feedback.classList.remove('error');
        setTimeout(() => closeChkModal(), 1600);
      } catch (e) {
        feedback.textContent = '✗ Código inválido. Comprueba que lo has pegado completo.';
        feedback.classList.add('error');
      }
    };
  }

  modal.hidden = false;
  if (window.lucide) lucide.createIcons();
  if (mode === 'export') {
    // Seleccionar el texto para copiar rápido
    setTimeout(() => { ta.select(); }, 100);
  } else {
    setTimeout(() => { ta.focus(); }, 100);
  }
}

function closeChkModal() {
  const modal = document.getElementById('chk-modal');
  if (modal) modal.hidden = true;
}

function initChecklistShare() {
  const exp = document.getElementById('checklist-export');
  const imp = document.getElementById('checklist-import');
  const close = document.getElementById('chk-modal-close');
  const modal = document.getElementById('chk-modal');

  if (exp) exp.addEventListener('click', () => openChkModal('export'));
  if (imp) imp.addEventListener('click', () => openChkModal('import'));
  if (close) close.addEventListener('click', closeChkModal);
  if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) closeChkModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeChkModal();
  });
}
