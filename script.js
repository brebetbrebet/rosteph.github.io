const $ = s => document.querySelector(s);
const intro = $('#intro'), stage = $('#stage'), book = $('#book');
const bookWrap = $('#bookWrap');
const leftSlot = $('#leftSlot'), rightSlot = $('#rightSlot');
const turnSheet = $('#turnSheet'), sheetFront = $('#sheetFront'), sheetBack = $('#sheetBack');
const edgeNext = $('#edgeNext'), edgePrev = $('#edgePrev');
const nextBtn = $('#nextBtn'), prevBtn = $('#prevBtn'), progressBar = $('#progressBar'), pageLabel = $('#pageLabel');

const totalPages = 9;
let spread = 0; // desktop: cover+blank, 1+2, 3+4, 5+6, 7+blank
let animating = false, drag = null, quizFinished = false;
const mobile = () => matchMedia('(max-width:760px)').matches;
const maxSpread = () => mobile() ? totalPages - 1 : 4;
const clonePage = i => {
  const id = (i >= 0 && i < totalPages) ? `p${i}` : 'blank';
  return document.getElementById(id).content.cloneNode(true);
};
function pageFor(side, s = spread) {
  if (mobile()) return s;
  if (s === 0) return side === 'right' ? 0 : -1;
  const left = (s * 2) - 1;
  return side === 'left' ? left : left + 1;
}
function fill(el, idx) { el.innerHTML = ''; el.appendChild(clonePage(idx)); wireInteractive(el) }
function render() {
  bookWrap.classList.toggle('cover-mode', spread === 0 && !mobile());
  if (mobile()) {
    leftSlot.innerHTML = '';
    fill(rightSlot, spread);
    pageLabel.textContent = spread === 0 ? 'cover' : `${String(spread).padStart(2, '0')} / 08`;
    progressBar.style.width = `${spread / maxSpread() * 100}%`;
  } else {
    fill(leftSlot, pageFor('left'));
    fill(rightSlot, pageFor('right'));
    pageLabel.textContent = spread === 0 ? 'cover' : `${String(pageFor('left')).padStart(2, '0')}–${String(Math.min(8, pageFor('right'))).padStart(2, '0')}`;
    progressBar.style.width = `${spread / maxSpread() * 100}%`;
  }
  prevBtn.disabled = spread <= 0; nextBtn.disabled = !canNext();
  edgePrev.classList.toggle('disabled', spread <= 0); edgeNext.classList.toggle('disabled', !canNext());
}
function setCoverVisual(active) {
  if (mobile()) return;
  bookWrap.classList.toggle('cover-mode', active);
}
function isReturningToCover(mode) {
  return !mobile() && mode === 'prev' && spread === 1;
}

function canNext() {
  if (spread >= maxSpread()) return false;
  if (!mobile() && spread === 2 && !quizFinished) return false; // quiz is p4 on right of spread 2
  if (mobile() && spread === 4 && !quizFinished) return false;
  return true;
}
function wireInteractive(root) {
  root.querySelector('.startQuiz')?.addEventListener('click', e => { e.stopPropagation(); startQuiz(root) });
  root.querySelector('.quizAgain')?.addEventListener('click', e => { e.stopPropagation(); quizFinished = false; goToQuiz() });
  root.querySelector('.final-answer')?.addEventListener('click', e => { e.stopPropagation(); root.querySelector('.after-answer')?.classList.add('show') });
}
function goToQuiz() { spread = mobile() ? 4 : 2; render() }

function setSheet(mode, frontIdx, backIdx) {
  turnSheet.className = 'turn-sheet' + (mode === 'prev' ? ' prev-mode' : '');
  sheetFront.innerHTML = ''; sheetBack.innerHTML = '';
  sheetFront.appendChild(clonePage(frontIdx)); sheetBack.appendChild(clonePage(backIdx));
  wireInteractive(sheetFront); wireInteractive(sheetBack);
}
function setAngle(deg, curl = .7, y = 50) {
  turnSheet.style.setProperty('--angle', `${deg}deg`);
  turnSheet.style.setProperty('--curl', String(curl));
  turnSheet.style.setProperty('--grab-y', `${y}%`);
}
function animateTo(from, to, duration, done) {
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 4);
  function f(now) { const t = Math.min(1, (now - start) / duration), v = from + (to - from) * ease(t); setAngle(v, Math.min(1, Math.sin(t * Math.PI) * 1.15 + .12)); if (t < 1) requestAnimationFrame(f); else done?.() }
  requestAnimationFrame(f);
}
function turnNext() {
  if (animating || !canNext()) return;
  animating = true;
  const front = mobile() ? spread : pageFor('right');
  const back = mobile() ? spread + 1 : pageFor('left', spread + 1);
  setSheet('next', front, back);
  turnSheet.style.visibility = 'visible'; setAngle(0, .08, 50);
  // reveal next page under the turning leaf
  if (mobile()) fill(rightSlot, spread + 1); else fill(rightSlot, pageFor('right', spread + 1));
  animateTo(0, -180, 760, () => { spread++; turnSheet.style.visibility = 'hidden'; setAngle(0, 0); render(); animating = false });
}
function turnPrev() {
  if (animating || spread <= 0) return;
  animating = true;
  const returningCover = isReturningToCover('prev');
  const front = mobile() ? spread : pageFor('left');
  const back = mobile() ? spread - 1 : pageFor('right', spread - 1);
  setSheet('prev', front, back);
  // Prepare the closed-cover geometry BEFORE the leaf starts moving.
  // The turning sheet still contains page 01, so there is no visual jump.
  if (returningCover) setCoverVisual(true);
  turnSheet.style.visibility = 'visible'; setAngle(0, .08, 50);
  if (mobile()) fill(rightSlot, spread - 1); else fill(leftSlot, pageFor('left', spread - 1));
  animateTo(0, 180, 760, () => { spread--; turnSheet.style.visibility = 'hidden'; setAngle(0, 0); render(); animating = false });
}

function beginDrag(e, mode) {
  if (animating || (mode === 'next' && !canNext()) || (mode === 'prev' && spread <= 0)) return;
  if (e.button !== undefined && e.button !== 0) return;
  const rect = book.getBoundingClientRect();
  const front = mode === 'next' ? (mobile() ? spread : pageFor('right')) : (mobile() ? spread : pageFor('left'));
  const back = mode === 'next' ? (mobile() ? spread + 1 : pageFor('left', spread + 1)) : (mobile() ? spread - 1 : pageFor('right', spread - 1));
  setSheet(mode, front, back); turnSheet.style.visibility = 'visible';
  const returningCover = isReturningToCover(mode);
  if (returningCover) setCoverVisual(true);
  if (mode === 'next') { if (mobile()) fill(rightSlot, spread + 1); else fill(rightSlot, pageFor('right', spread + 1)); }
  else { if (mobile()) fill(rightSlot, spread - 1); else fill(leftSlot, pageFor('left', spread - 1)); }
  drag = { mode, id: e.pointerId, rect, startX: e.clientX, lastX: e.clientX, angle: 0, returningCover };
  e.currentTarget.setPointerCapture?.(e.pointerId); book.classList.remove('curl-next', 'curl-prev');
  e.preventDefault();
}
edgeNext.addEventListener('pointerdown', e => beginDrag(e, 'next'));
edgePrev.addEventListener('pointerdown', e => beginDrag(e, 'prev'));
window.addEventListener('pointermove', e => {
  if (!drag) {
    if (mobile()) return;
    const r = book.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    const y = ((e.clientY - r.top) / r.height) * 100;
    const nearR = e.clientX > r.right - r.width * .11 && e.clientX < r.right + 8 && canNext();
    const nearL = e.clientX < r.left + r.width * .11 && e.clientX > r.left - 8 && spread > 0;
    book.style.setProperty('--corner-y', `${y}%`);
    book.style.setProperty('--corner', nearR || nearL ? '.9' : '0');
    book.classList.toggle('curl-next', nearR); book.classList.toggle('curl-prev', nearL);
    return;
  }
  if (e.pointerId !== drag.id) return;
  const half = mobile() ? drag.rect.width : drag.rect.width / 2;
  const localX = drag.mode === 'next' ? drag.rect.right - e.clientX : e.clientX - drag.rect.left;
  const p = Math.max(0, Math.min(1, localX / half));
  const angle = (drag.mode === 'next' ? -180 : 180) * p;
  const y = Math.max(4, Math.min(96, ((e.clientY - drag.rect.top) / drag.rect.height) * 100));
  drag.angle = angle; drag.lastX = e.clientX; setAngle(angle, .18 + Math.sin(p * Math.PI) * .92, y); e.preventDefault();
}, { passive: false });
function endDrag(e, cancel = false) {
  if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
  const d = drag; drag = null; animating = true;
  const committed = !cancel && Math.abs(d.angle) > 72;
  const target = committed ? (d.mode === 'next' ? -180 : 180) : 0;
  const from = d.angle;
  animateTo(from, target, committed ? 430 : 360, () => {
    turnSheet.style.visibility = 'hidden'; setAngle(0, 0);
    if (committed) spread += d.mode === 'next' ? 1 : -1;
    render(); animating = false;
  });
}
window.addEventListener('pointerup', e => endDrag(e)); window.addEventListener('pointercancel', e => endDrag(e, true));
book.addEventListener('pointerleave', () => { if (!drag) { book.style.setProperty('--corner', '0'); book.classList.remove('curl-next', 'curl-prev') } });

$('#openBook').addEventListener('click', () => { intro.classList.add('gone'); stage.classList.add('open'); stage.setAttribute('aria-hidden', 'false'); render() });
nextBtn.addEventListener('click', turnNext); prevBtn.addEventListener('click', turnPrev);
window.addEventListener('keydown', e => { if (e.key === 'ArrowRight') turnNext(); if (e.key === 'ArrowLeft') turnPrev() });
window.addEventListener('resize', () => { if (!animating) { spread = Math.min(spread, maxSpread()); render() } });

const quiz = [
  { q: 'Apaa yang buat akuu cepet kangen kamu?', a: ['Hilangg 5 menit', 'Kiriimm foto random', 'Balesannya singkat cuek', 'semuaa di atass'], good: 3, r: ['salahhh. 5 menitt aja udah kelamaan', 'INII PALING BIKIN KANGEN.', 'kena mental aku.', 'bener sih. mbencekno tapi bener.'] },
  { q: 'Menurut mu, date terbaikk ituu gimana?', a: ['Fancyyy dann di rencanainn', 'POKOK MAKANAN + ndakk cepett"', 'Hilang wes ga tau ke mana pokoknya jalan', 'apapunn itu pokoknya sama kamu'], good: 3, r: ['lucu sihh, tapii kekk terlaluu mainstream', 'hmmm ya ya boleh sih suka makan aku', 'Ini sih ga ada tujuan jelas pokoknya gas KWKWKW', 'ah pilih jawaban paling aman kamu.'] },
  { q: 'Kalo kita tengkarr siapa yang menang?', a: ['Aku(R)', 'Kamu(S)', 'Sapapun yang minta maaf duluann', 'Abang gopud wkwkwkkw'], good: 2, r: ['HMMMM KOK AKU WKKWKW.', 'WIH MULAII INI KAMU YA WKWKWKW.', 'yaa boleh lah buatt cari aman KWKWKW.', 'WKWKWKW gampang di sogok makanan emang.'] },
  { q: 'kalo aku tanya "kamu sayang aku ndak?" kamu jawab ...', a: ['YA IYA', 'Sayangnya masih', 'Lebih dari kemarinn', 'Tanyao lagi ta cium kamu'], good: 3, r: ['bolehh bolehh tapi hmm.', 'kurang ajar sih tapi kamu lucu, tapi kurang ajar', 'selalu carii aman WKKWKW.', 'YAUDAH AYOO SINII, OH YA SII LDR :( '] }
];
let qi = 0, score = 0;
function startQuiz(root) { const intro = root.querySelector('.quiz-intro'), shell = root.querySelector('.quiz-shell'); intro.hidden = true; shell.hidden = false; qi = 0; score = 0; renderQ(root) }
function renderQ(root) { const x = quiz[qi], ans = root.querySelector('.answers'), react = root.querySelector('.quizReaction'); root.querySelector('.quizCount').textContent = `${qi + 1} / ${quiz.length}`; root.querySelector('.quizQuestion').textContent = x.q; react.textContent = ''; react.classList.remove('show'); ans.innerHTML = ''; ans.dataset.locked = '0'; x.a.forEach((t, i) => { const b = document.createElement('button'); b.className = 'answer'; b.textContent = t; b.onclick = e => { e.stopPropagation(); answerQ(root, i, b) }; ans.appendChild(b) }) }
function answerQ(root, i, b) { const ans = root.querySelector('.answers'); if (ans.dataset.locked === '1') return; ans.dataset.locked = '1'; b.classList.add('is-picked'); const x = quiz[qi]; if (i === x.good) score++; const react = root.querySelector('.quizReaction'); react.textContent = x.r[i]; requestAnimationFrame(() => react.classList.add('show')); setTimeout(() => { qi++; if (qi < quiz.length) renderQ(root); else finishQuiz() }, 900) }
function finishQuiz() {
  quizFinished = true;

  const targetSpread = mobile() ? 5 : 3;
  spread = targetSpread;

  render();

  const root = rightSlot;
  const title = root.querySelector('.resultTitle');
  const txt = root.querySelector('.resultText');
  const st = root.querySelector('.result-sticker');
  const rw = root.querySelector('.secretReward');

  title.textContent = 'LULUS.';
  txt.textContent = 'Pasti lulus lah, soalnya aku yang buat peraturan.';
  st.textContent = 'CLASSIFIED';
  rw.textContent = '1 cium pipi & unlimited huggg';
}

const music = $('#bgMusic');
const musicPrev = $('#musicPrev'), musicPlay = $('#musicPlay'), musicNext = $('#musicNext');
const trackTitle = $('#trackTitle'), trackArtist = $('#trackArtist'), spotifyBar = $('#spotifyBar'), spotifySeek = $('#spotifySeek');

const playlist = [
  { title: 'Light', artist: 'wave to earth', src: 'music/song-1.mp3' },
  { title: 'The Way I Love You', artist: 'Michal Leah', src: 'music/song-2.mp3' },
  { title: 'Holiday', artist: 'Emi Choi', src: 'music/song-3.mp3' },
  { title: 'Conversations With The Moon', artist: 'grentperez', src: 'music/song-4.mp3' },
  { title: '👧Overflow', artist: 'Evan', src: 'music/song-5.mp3' },
  { title: '👧Joyride', artist: 'Cortis', src: 'music/song-6.mp3' },
  { title: '👧Hate that i made you love me', artist: 'Ariana Grande', src: 'music/song-7.mp3' },

];
let trackIndex = 0, playing = false;

function loadTrack(index, auto = false) {
  trackIndex = (index + playlist.length) % playlist.length;
  const t = playlist[trackIndex];
  music.src = t.src;
  trackTitle.textContent = t.title;
  trackArtist.textContent = t.artist;
  spotifyBar.style.width = '0%';
  if (auto) playTrack();
}
async function playTrack() {
  try {
    await music.play();
    playing = true;
    musicPlay.textContent = '❚❚';
  } catch (e) {
    musicPlay.textContent = '▶';
  }
}
function pauseTrack() { music.pause(); playing = false; musicPlay.textContent = '▶' }
musicPlay.addEventListener('click', () => playing ? pauseTrack() : playTrack());
musicPrev.addEventListener('click', () => loadTrack(trackIndex - 1, true));
musicNext.addEventListener('click', () => loadTrack(trackIndex + 1, true));
music.addEventListener('ended', () => loadTrack(trackIndex + 1, true));
music.addEventListener('timeupdate', () => {
  spotifyBar.style.width = (music.duration ? music.currentTime / music.duration * 100 : 0) + '%';
});
spotifySeek.addEventListener('click', e => {
  if (!music.duration) return;
  const r = spotifySeek.getBoundingClientRect();
  music.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * music.duration;
});
loadTrack(0, false);
render();


// Relationship timer — 26 June 2026, 10:00 PM South Australia (ACST, UTC+09:30)
const relationshipStartedAt = new Date('2026-06-26T23:00:00+07:00').getTime();
function updateLoveClock() {
  const daysEl = document.getElementById('loveDays');
  if (!daysEl) return;
  let diff = Math.max(0, Date.now() - relationshipStartedAt);
  const day = 86400000, hour = 3600000, minute = 60000, second = 1000;
  const days = Math.floor(diff / day); diff %= day;
  const hours = Math.floor(diff / hour); diff %= hour;
  const minutes = Math.floor(diff / minute); diff %= minute;
  const seconds = Math.floor(diff / second);
  daysEl.textContent = String(days).padStart(3, '0');
  document.getElementById('loveHours').textContent = String(hours).padStart(2, '0');
  document.getElementById('loveMinutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('loveSeconds').textContent = String(seconds).padStart(2, '0');
}
updateLoveClock();
setInterval(updateLoveClock, 1000);

// V6.12 — keep the book fitted to the visible mobile viewport
function setMobileViewport() {
  const h = (window.visualViewport?.height || window.innerHeight);
  document.documentElement.style.setProperty('--app-height', `${h}px`);
}
setMobileViewport();
window.visualViewport?.addEventListener('resize', setMobileViewport);
window.addEventListener('orientationchange', () => setTimeout(() => { setMobileViewport(); render() }, 120));


// V6.16.2 — sound permission gate.
// Browsers block true autoplay with sound until the visitor interacts once.
// This first click unlocks audio and starts the current track immediately.
const soundGate = document.getElementById('soundGate');
const soundTestBtn = document.getElementById('soundTestBtn');
const soundSkipBtn = document.getElementById('soundSkipBtn');
const soundGateNote = document.getElementById('soundGateNote');

function closeSoundGate() {
  if (!soundGate) return;
  soundGate.classList.add('is-hidden');
  window.setTimeout(() => { soundGate.style.display = 'none'; }, 520);
}

async function unlockMusicAndEnter() {
  if (!music) { closeSoundGate(); return; }

  soundTestBtn && (soundTestBtn.disabled = true);
  if (soundGateNote) soundGateNote.textContent = 'starting our song…';

  try {
    // If the source has not been loaded yet, make sure track 1 is ready.
    if (!music.src) loadTrack(trackIndex || 0, false);

    music.volume = 0.72;
    await music.play();

    playing = true;
    if (musicPlay) musicPlay.textContent = '❚❚';
    if (soundGateNote) soundGateNote.textContent = 'sound is on ♫';

    // Let the visitor actually hear a short confirmation before the gate disappears.
    window.setTimeout(closeSoundGate, 650);
  } catch (err) {
    if (soundGateNote) {
      soundGateNote.textContent = 'MP3 not found — add music/song-1.mp3, then try again.';
      soundGateNote.classList.add('is-error');
    }
    soundTestBtn && (soundTestBtn.disabled = false);
  }
}

soundTestBtn?.addEventListener('click', unlockMusicAndEnter);
soundSkipBtn?.addEventListener('click', () => {
  pauseTrack();
  closeSoundGate();
});


// V6.16.4 — lightweight procedural sakura petals.
// Decorative only: pointer-events:none, so it never blocks book dragging/buttons.
(function createSakura() {
  const field = document.getElementById('sakuraField');
  if (!field) return;
  const mobileView = window.matchMedia('(max-width:760px)').matches;
  const count = mobileView ? 16 : 27;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.className = 'sakura-petal';

    const x = (Math.random() * 104) - 2;
    const size = (mobileView ? 20 : 30) + Math.random() * (mobileView ? 15 : 20);
    const duration = 9 + Math.random() * 9;
    const delay = -(Math.random() * duration);
    const drift = (-75 + Math.random() * 150);
    const spin = (280 + Math.random() * 520) * (Math.random() > .5 ? 1 : -1);

    p.style.setProperty('--x', x + 'vw');
    p.style.setProperty('--size', size + 'px');
    p.style.setProperty('--fall', duration + 's');
    p.style.setProperty('--delay', delay + 's');
    p.style.setProperty('--drift', drift + 'px');
    p.style.setProperty('--spin', spin + 'deg');
    frag.appendChild(p);
  }
  field.appendChild(frag);
})();
