// ===============================================
//                    APP.JS
//          Personal Media Platform Logic
// ===============================================

// ===== UTIL SHORTCUTS =====
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const pad = n => (n<10?"0":"")+n;
const fmt = secs => {
  if (!isFinite(secs)) return "0:00";
  const m = Math.floor(secs/60); const s = Math.floor(secs%60);
  return `${m}:${pad(s)}`;
};

// ===== CONTENT ARRAYS =====
// IMPORTANT: Put your media files under /public
// Example audio path: public/musical works/My Song.mp3
// Then reference as:  "musical%20works/My Song.mp3"  (URL-encoded space)
const TRACKS = [
  { title: "123456", artist: "Elliott Peil", src: "123456.wav" },
  // Add more like: { title:"My Song", artist:"Elliott Peil", src:"My Song.wav" }
];

// ===== MUSIC PLAYER =====
const Music = (() => {
  const els = {
    list:   $('#mp-tracks'),
    count:  $('#mp-count'),
  };

  function resolveSrc(s){
    // if the path already has a slash or protocol, use it; otherwise try direct, then music/ as fallback in HTML
    return s;
  }

  function buildList() {
    if (!els.list) return;
    els.list.innerHTML = '';
    TRACKS.forEach((t) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="mp-title">${t.title}${t.artist?` — ${t.artist}`:''}</span>
        <audio controls>
          <source src="${resolveSrc(t.src)}" type="audio/wav">
          Your browser does not support the audio element.
        </audio>
      `;
      els.list.appendChild(li);
    });
    if (els.count) els.count.textContent = `${TRACKS.length} track${TRACKS.length === 1 ? '' : 's'}`;
  }

  function init() {
    if (!els.list) return;
    buildList();
    console.log('TRACKS loaded:', TRACKS.length);
  }

  return { init };
})();

// ===== SECTION OBSERVER / DESKTOP FOLDERS =====
function initSectionObserver() {
  const desktop = document.getElementById('desktop');
  if (!desktop) return;
  const links = $$('a[data-target]', desktop);
  const targets = links.map(a => $('#' + a.dataset.target)).filter(Boolean);
  if (!targets.length) return;

  const io = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if (!visible) return;
    const id = visible.target.id;
    links.forEach(a => a.classList.toggle('active', a.dataset.target === id));
  }, { rootMargin: `-140px 0px -60% 0px`, threshold: [0.2, 0.6, 1] });

  targets.forEach(t => io.observe(t));
  links.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.dataset.target;
      const det = (id === 'music') ? document.getElementById('mp-accordion') : null;
      if (det && !det.open) det.open = true;
      const el = document.getElementById(id);
      const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 140);
      window.scrollTo({ top, behavior: 'smooth' });
      history.pushState(null, '', '#' + id);
    });
  });
}

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  try { Music.init(); } catch(e) { console.error('Music init failed', e); }
  initSectionObserver();
});
// Responsive ASCII header scale
(function(){
  const DESIGN_W = 960;
  const MIN_SCALE = 0.40;
  const MAX_SCALE = 1.00;

  function updateVars(){
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const target = 0.95 * vw / DESIGN_W;
    const scale  = Math.max(MIN_SCALE, Math.min(MAX_SCALE, target));
    document.documentElement.style.setProperty('--asciiscale', String(scale));

    const c = document.getElementById('canvas');
    if (c && c.height) {
      document.documentElement.style.setProperty('--canvasH', c.height + 'px');
    }
  }

  window.addEventListener('load', updateVars, { passive: true });
  window.addEventListener('resize', updateVars, { passive: true });
  window.addEventListener('orientationchange', updateVars, { passive: true });
})();