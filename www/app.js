// ── Config & State ──────────────────────────────────────────────────────────
const API = 'https://kosmos-backend.onrender.com';
const EMOJIS = ['❤️','😂','👍','🔥','😮','👏','🎉','🙏'];
const GS = ['g1','g2','g3','g4','g5','g6','g7'];

let jwtToken = localStorage.getItem('kosmos_token');
let currentUser = JSON.parse(localStorage.getItem('kosmos_user') || 'null');
let socket = null;
let typingTimeout = null;
let cur = null;

const channels = [];
const dms = [];

// ── Auth ────────────────────────────────────────────────────────────────────
let authMode = 'login';
let pendingToken = null;
let pendingUser = null;

function switchTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (mode === 'login' && i === 0) || (mode === 'register' && i === 1));
  });
  document.getElementById('regFields').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('loginFields').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('seedResult').style.display = 'none';
  document.getElementById('authBtn').style.display = '';
  document.getElementById('authBtn').textContent = mode === 'register' ? 'Создать аккаунт →' : 'Войти в Космос →';
  document.getElementById('authToggleBtn').textContent = mode === 'register' ? 'Уже есть аккаунт' : 'Создать новый аккаунт';
  document.getElementById('authToggleBtn').onclick = () => switchTab(mode === 'register' ? 'login' : 'register');
  document.getElementById('authToggleBtn').style.display = '';
  clearAuthMessages();
}

function buildSeedGrid() {
  const grid = document.getElementById('seedGrid');
  grid.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const cell = document.createElement('div');
    cell.className = 'seed-cell';
    cell.innerHTML = `<span class="seed-num">${String(i+1).padStart(2,'0')}</span><input type="text" data-idx="${i}" placeholder="..." autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">`;
    grid.appendChild(cell);
  }
  // Paste: вставка 12 слов распределяет по ячейкам
  grid.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text').trim();
    const words = text.split(/\s+/);
    if (words.length >= 2) {
      e.preventDefault();
      e.stopPropagation();
      const inputs = grid.querySelectorAll('input');
      words.slice(0, 12).forEach((w, i) => { if (inputs[i]) inputs[i].value = w; });
    }
  });
  // Fallback: если paste попал в одну ячейку — перераспределить при отпускании
  grid.addEventListener('input', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    const val = e.target.value.trim();
    const words = val.split(/\s+/);
    if (words.length >= 2) {
      const inputs = grid.querySelectorAll('input');
      const startIdx = parseInt(e.target.dataset.idx) || 0;
      words.forEach((w, i) => { if (inputs[startIdx + i]) inputs[startIdx + i].value = w; });
      e.target.value = words[0];
    }
  });
}

function getSeedFromGrid() {
  const inputs = document.querySelectorAll('#seedGrid input');
  return Array.from(inputs).map(i => i.value.trim().toLowerCase()).join(' ');
}

function showSeedInGrid(phrase) {
  const grid = document.getElementById('seedShowGrid');
  const words = phrase.split(/\s+/);
  grid.innerHTML = words.map((w, i) =>
    `<div class="seed-cell" style="cursor:default"><span class="seed-num">${String(i+1).padStart(2,'0')}</span><span style="font-family:'Space Mono',monospace;font-size:13px;color:#e0e6f0;user-select:all">${w}</span></div>`
  ).join('');
}

function clearAuthMessages() {
  document.getElementById('authError').classList.remove('show');
  document.getElementById('authSuccess').classList.remove('show');
}
function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('authSuccess').classList.remove('show');
}
function showSuccess(msg) {
  const el = document.getElementById('authSuccess');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('authError').classList.remove('show');
}

function copySeed() {
  const text = document.getElementById('seedPhrase').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const el = document.getElementById('seedCopied');
    el.style.display = 'block'; el.textContent = 'Скопировано!'; setTimeout(() => el.style.display = 'none', 2000);
  });
}

function enterAfterReg() {
  if (pendingToken && pendingUser) {
    jwtToken = pendingToken;
    currentUser = pendingUser;
    localStorage.setItem('kosmos_token', jwtToken);
    localStorage.setItem('kosmos_user', JSON.stringify(currentUser));
    enterApp();
  }
}

async function submitAuth() {
  clearAuthMessages();
  const btn = document.getElementById('authBtn');
  btn.disabled = true; btn.textContent = '...';

  try {
    let url, body;
    if (authMode === 'register') {
      const name = document.getElementById('authName').value.trim();
      const handle = document.getElementById('authHandle').value.trim().toLowerCase();
      if (!name) { showError('Введи своё имя'); btn.disabled = false; btn.textContent = 'Создать аккаунт →'; return; }
      if (!handle) { showError('Введи @username'); btn.disabled = false; btn.textContent = 'Создать аккаунт →'; return; }
      if (!/^[a-z0-9_]{3,20}$/.test(handle)) { showError('@username: только a-z, 0-9 и _ (3–20 символов)'); btn.disabled = false; btn.textContent = 'Создать аккаунт →'; return; }
      url = `${API}/register`;
      body = { username: name, handle };
    } else {
      const seed = getSeedFromGrid();
      if (!seed.replace(/\s/g,'')) { showError('Введите все 12 слов'); btn.disabled = false; btn.textContent = 'Войти в Космос →'; return; }
      if (seed.split(/\s+/).filter(Boolean).length < 12) { showError('Нужно 12 слов'); btn.disabled = false; btn.textContent = 'Войти в Космос →'; return; }
      url = `${API}/login`;
      body = { seed };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Ошибка сервера');
      btn.disabled = false;
      btn.textContent = authMode === 'register' ? 'Создать аккаунт →' : 'Войти в Космос →';
      return;
    }

    if (authMode === 'register' && data.seed) {
      pendingToken = data.token;
      pendingUser = data.user;
      document.getElementById('seedPhrase').textContent = data.seed;
      showSeedInGrid(data.seed);
      document.getElementById('seedResult').style.display = 'block';
      document.getElementById('authBtn').style.display = 'none';
      document.getElementById('authToggleBtn').style.display = 'none';
      document.getElementById('regFields').style.display = 'none';
      btn.disabled = false; btn.textContent = 'Создать аккаунт →';
      return;
    }

    jwtToken = data.token;
    currentUser = data.user;
    localStorage.setItem('kosmos_token', jwtToken);
    localStorage.setItem('kosmos_user', JSON.stringify(currentUser));
    showSuccess(`Добро пожаловать, ${data.user.username}!`);
    setTimeout(enterApp, 700);
  } catch (e) {
    showError('Нет связи с сервером');
    btn.disabled = false;
    btn.textContent = authMode === 'register' ? 'Создать аккаунт →' : 'Войти в Космос →';
  }
}

// ── App lifecycle ───────────────────────────────────────────────────────────
function enterApp() {
  document.getElementById('auth').classList.add('hidden');
  initSocket();
  loadMyChats();
}

function logout() {
  localStorage.removeItem('kosmos_token');
  localStorage.removeItem('kosmos_user');
  jwtToken = null; currentUser = null;
  if (socket) { socket.disconnect(); socket = null; }
  cur = null; channels.length = 0; dms.length = 0; render();
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('seedResult').style.display = 'none';
  document.getElementById('authBtn').style.display = '';
  switchTab('login');
  document.getElementById('mainArea').innerHTML = `<div class="empty"><div class="empty-card"><div class="empty-icon">🚀</div><h2>Добро пожаловать в Космос</h2><p>Выбери чат слева или создай новый</p></div></div>`;
}

var _splashDone = false;
function closeSplash() {
  if (_splashDone) return;
  _splashDone = true;
  var sp = document.getElementById('splash');
  if (sp) { sp.style.transform = 'scale(1.1)'; sp.style.opacity = '0'; setTimeout(function(){ sp.remove(); }, 800); }
  if (jwtToken && currentUser) enterApp();
}

// ── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  document.getElementById('themeBtn').textContent = dark ? '🌙' : '☀️';
}
function toggleTheme() {
  const dark = !document.body.classList.contains('dark');
  localStorage.setItem('kosmos_theme', dark ? 'dark' : 'light');
  applyTheme(dark);
}

// ── Modal ────────────────────────────────────────────────────────────────────
function openModal() {
  document.getElementById('overlay').classList.add('open');
  onChatTypeChange();
  setTimeout(() => {
    const isCh = document.querySelector('input[name="ct"]:checked').value === 'channel';
    (isCh ? document.getElementById('ncName') : document.getElementById('userSearch'))?.focus();
  }, 120);
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('ncName').value = '';
  document.getElementById('userSearch').value = '';
  document.getElementById('userResults').innerHTML = '';
}

function onChatTypeChange() {
  const isCh = document.querySelector('input[name="ct"]:checked').value === 'channel';
  document.getElementById('userSearchWrap').style.display = isCh ? 'none' : 'block';
  document.getElementById('channelNameWrap').style.display = isCh ? 'block' : 'none';
  document.getElementById('chatCancelWrap').style.display = isCh ? 'none' : 'block';
}

// ── Init on load ─────────────────────────────────────────────────────────────
applyTheme(localStorage.getItem('kosmos_theme') === 'dark');
buildSeedGrid();

document.getElementById('overlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

// Splash: canvas stars + typewriter
(function(){
  var c = document.getElementById('starsCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  c.width = window.innerWidth; c.height = window.innerHeight;
  var stars = [], t = 0;
  for (var i = 0; i < 120; i++) stars.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.4+0.3,sp:Math.random()*0.015+0.005,ph:Math.random()*Math.PI*2});
  function draw(){ctx.clearRect(0,0,c.width,c.height);for(var i=0;i<stars.length;i++){var s=stars[i],a=0.3+0.7*Math.abs(Math.sin(t*s.sp+s.ph));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.fill();}t++;requestAnimationFrame(draw);}
  draw();
  // Typewriter
  var text='Powered by Jesus Christ', el=document.getElementById('typewriter');
  if(!el)return;
  var ts=document.createElement('span'), cr=document.createElement('span');
  cr.textContent='|'; cr.style.cssText='animation:kblink .6s infinite;font-weight:300;color:rgba(255,255,255,0.4)';
  el.appendChild(ts); el.appendChild(cr);
  var st=document.createElement('style'); st.textContent='@keyframes kblink{0%,100%{opacity:1}50%{opacity:0}}'; document.head.appendChild(st);
  var idx=0;
  function tp(){if(idx<text.length){ts.textContent+=text[idx];idx++;setTimeout(tp,65+Math.random()*35);}else{setTimeout(function(){var ln=document.getElementById('splashLine');if(ln)ln.style.width='60px';},300);setTimeout(function(){cr.remove();},1500);setTimeout(closeSplash,2800);}}
  setTimeout(tp,700);
})();

// Auto-login
if (jwtToken) {
  fetch(`${API}/me`, { headers: { 'Authorization': `Bearer ${jwtToken}` } })
    .then(r => r.ok ? r.json() : null)
    .then(user => {
      if (user) {
        currentUser = user;
        localStorage.setItem('kosmos_user', JSON.stringify(user));
        // enterApp вызовется из closeSplash после анимации
      } else {
        localStorage.removeItem('kosmos_token');
        localStorage.removeItem('kosmos_user');
        jwtToken = null;
      }
    })
    .catch(() => {});
}

render();
