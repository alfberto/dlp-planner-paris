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
  initProgress();

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
