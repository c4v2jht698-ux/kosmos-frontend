// ── Config & State ──────────────────────────────────────────────────────────
var API = 'https://kosmos-backend.onrender.com';
var EMOJIS = ['\u2764\uFE0F','\uD83D\uDE02','\uD83D\uDC4D','\uD83D\uDD25','\uD83D\uDE2E','\uD83D\uDC4F','\uD83C\uDF89','\uD83D\uDE4F'];
var GS = ['g1','g2','g3','g4','g5','g6','g7'];

var jwtToken = localStorage.getItem('kosmos_token');
var refreshToken = localStorage.getItem('kosmos_refresh');
var currentUser = JSON.parse(localStorage.getItem('kosmos_user') || 'null');
var socket = null;
var typingTimeout = null;
var cur = null;

var channels = [];
var dms = [];

// Auto-refresh token every 12 min
setInterval(async function() {
  if (!refreshToken) return;
  try {
    var r = await fetch(API + '/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken })
    });
    if (r.ok) {
      var d = await r.json();
      jwtToken = d.token;
      localStorage.setItem('kosmos_token', jwtToken);
    }
  } catch(e) {}
}, 12 * 60 * 1000);

// Inactivity logout — 30 min
var _lastActivity = Date.now();
document.addEventListener('click', function() { _lastActivity = Date.now(); });
document.addEventListener('keydown', function() { _lastActivity = Date.now(); });
setInterval(function() {
  if (jwtToken && Date.now() - _lastActivity > 30 * 60 * 1000) {
    console.log('[security] Inactivity logout');
    logout();
  }
}, 60000);

// ── Auth ────────────────────────────────────────────────────────────────────
var authMode = 'login';
var pendingToken = null;
var pendingUser = null;
var pendingRefresh = null;

function switchTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(function(t, i) {
    t.classList.toggle('active', (mode === 'login' && i === 0) || (mode === 'register' && i === 1));
  });
  document.getElementById('regFields').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('loginFields').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('seedResult').style.display = 'none';
  document.getElementById('authBtn').style.display = '';
  document.getElementById('authBtn').textContent = mode === 'register' ? 'Создать аккаунт' : 'Войти в Космос';
  document.getElementById('authToggleBtn').textContent = mode === 'register' ? 'Уже есть аккаунт' : 'Создать новый аккаунт';
  document.getElementById('authToggleBtn').onclick = function() { switchTab(mode === 'register' ? 'login' : 'register'); };
  document.getElementById('authToggleBtn').style.display = '';
  clearAuthMessages();
}

function buildSeedGrid() {
  var grid = document.getElementById('seedGrid');
  grid.innerHTML = '';
  for (var i = 0; i < 12; i++) {
    var cell = document.createElement('div');
    cell.className = 'seed-cell';
    cell.innerHTML = '<span class="seed-num">' + String(i+1).padStart(2,'0') + '</span><input type="text" data-idx="' + i + '" placeholder="..." autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">';
    grid.appendChild(cell);
  }
  grid.addEventListener('paste', function(e) {
    var text = (e.clipboardData || window.clipboardData).getData('text').trim();
    var words = text.split(/\s+/);
    if (words.length >= 2) {
      e.preventDefault();
      e.stopPropagation();
      var inputs = grid.querySelectorAll('input');
      words.slice(0, 12).forEach(function(w, i) { if (inputs[i]) inputs[i].value = w; });
    }
  });
  grid.addEventListener('input', function(e) {
    if (e.target.tagName !== 'INPUT') return;
    var val = e.target.value;
    // Strip spaces and auto-advance
    if (val.indexOf(' ') !== -1) {
      var parts = val.split(/\s+/);
      e.target.value = parts[0];
      var inputs = grid.querySelectorAll('input');
      var idx = parseInt(e.target.dataset.idx) || 0;
      // Fill remaining words into next fields
      for (var j = 1; j < parts.length; j++) {
        if (inputs[idx + j] && parts[j]) inputs[idx + j].value = parts[j];
      }
      // Focus next empty field
      var next = inputs[idx + 1];
      if (next) next.focus();
      return;
    }
  });
  grid.addEventListener('keydown', function(e) {
    if (e.target.tagName !== 'INPUT') return;
    if (e.key === 'Enter') {
      e.preventDefault();
      var inputs = grid.querySelectorAll('input');
      var idx = parseInt(e.target.dataset.idx) || 0;
      var next = inputs[idx + 1];
      if (next) next.focus();
    }
  });
}

function getSeedFromGrid() {
  var inputs = document.querySelectorAll('#seedGrid input');
  return Array.from(inputs).map(function(i) { return i.value.trim().toLowerCase(); }).join(' ');
}

function showSeedInGrid(phrase) {
  var grid = document.getElementById('seedShowGrid');
  var words = phrase.split(/\s+/);
  grid.innerHTML = words.map(function(w, i) {
    return '<div class="seed-cell" style="cursor:default"><span class="seed-num">' + String(i+1).padStart(2,'0') + '</span><span style="font-family:\'Space Mono\',monospace;font-size:13px;color:var(--text);user-select:all">' + w + '</span></div>';
  }).join('');
}

function clearAuthMessages() {
  document.getElementById('authError').classList.remove('show');
  document.getElementById('authSuccess').classList.remove('show');
}
function showError(msg) {
  var el = document.getElementById('authError');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('authSuccess').classList.remove('show');
}
function showSuccess(msg) {
  var el = document.getElementById('authSuccess');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('authError').classList.remove('show');
}

function copySeed() {
  var text = document.getElementById('seedPhrase').textContent;
  navigator.clipboard.writeText(text).then(function() {
    var el = document.getElementById('seedCopied');
    el.style.display = 'block'; el.textContent = 'Скопировано!';
    setTimeout(function() { el.style.display = 'none'; }, 2000);
  });
}

function enterAfterReg() {
  if (pendingToken && pendingUser) {
    jwtToken = pendingToken;
    refreshToken = pendingRefresh;
    currentUser = pendingUser;
    localStorage.setItem('kosmos_token', jwtToken);
    if (pendingRefresh) localStorage.setItem('kosmos_refresh', pendingRefresh);
    localStorage.setItem('kosmos_user', JSON.stringify(currentUser));
    // Show onboarding for new users
    document.getElementById('auth').classList.add('hidden');
    showOnboarding();
    initSocket();
    loadMyChats();
  }
}

async function submitAuth() {
  clearAuthMessages();
  var btn = document.getElementById('authBtn');
  btn.disabled = true; btn.textContent = '...';

  try {
    var url, body;
    if (authMode === 'register') {
      var name = document.getElementById('authName').value.trim();
      var handle = document.getElementById('authHandle').value.trim().toLowerCase();
      if (!name) { showError('Введи своё имя'); btn.disabled = false; btn.textContent = 'Создать аккаунт'; return; }
      if (!handle) { showError('Введи @username'); btn.disabled = false; btn.textContent = 'Создать аккаунт'; return; }
      if (!/^[a-z0-9_]{3,20}$/.test(handle)) { showError('@username: только a-z, 0-9 и _ (3\u201320 символов)'); btn.disabled = false; btn.textContent = 'Создать аккаунт'; return; }
      url = API + '/register';
      body = { username: name, handle: handle, ref: _refCode || undefined };
    } else {
      var seed = getSeedFromGrid();
      if (!seed.replace(/\s/g,'')) { showError('Введите все 12 слов'); btn.disabled = false; btn.textContent = 'Войти в Космос'; return; }
      if (seed.split(/\s+/).filter(Boolean).length < 12) { showError('Нужно 12 слов'); btn.disabled = false; btn.textContent = 'Войти в Космос'; return; }
      url = API + '/login';
      body = { seed: seed };
    }

    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    var data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Ошибка сервера');
      btn.disabled = false;
      btn.textContent = authMode === 'register' ? 'Создать аккаунт' : 'Войти в Космос';
      return;
    }

    if (authMode === 'register' && data.seed) {
      pendingToken = data.token;
      pendingUser = data.user;
      pendingRefresh = data.refreshToken;
      document.getElementById('seedPhrase').textContent = data.seed;
      showSeedInGrid(data.seed);
      document.getElementById('seedResult').style.display = 'block';
      document.getElementById('authBtn').style.display = 'none';
      document.getElementById('authToggleBtn').style.display = 'none';
      document.getElementById('regFields').style.display = 'none';
      btn.disabled = false; btn.textContent = 'Создать аккаунт';
      return;
    }

    jwtToken = data.token;
    refreshToken = data.refreshToken;
    currentUser = data.user;
    localStorage.setItem('kosmos_token', jwtToken);
    if (data.refreshToken) localStorage.setItem('kosmos_refresh', data.refreshToken);
    localStorage.setItem('kosmos_user', JSON.stringify(currentUser));
    showSuccess('Добро пожаловать, ' + data.user.username + '!');
    setTimeout(enterApp, 700);
  } catch (e) {
    showError('Нет связи с сервером');
    btn.disabled = false;
    btn.textContent = authMode === 'register' ? 'Создать аккаунт' : 'Войти в Космос';
  }
}

// ── App lifecycle ───────────────────────────────────────────────────────────
function enterApp() {
  document.getElementById('auth').classList.add('hidden');
  // Check if needs onboarding
  if (!localStorage.getItem('kosmos_onboarded') && currentUser) {
    // Check if user has interests
    fetch(API + '/me', { headers: { 'Authorization': 'Bearer ' + jwtToken } })
      .then(function(r) { return r.json(); })
      .then(function(u) {
        if (!u.interests || !u.interests.length) {
          showOnboarding();
        }
      }).catch(function() {});
  }
  initSocket();
  loadMyChats();
}

function logout() {
  localStorage.removeItem('kosmos_token');
  localStorage.removeItem('kosmos_refresh');
  localStorage.removeItem('kosmos_user');
  localStorage.removeItem('kosmos_onboarded');
  jwtToken = null; refreshToken = null; currentUser = null;
  if (socket) { socket.disconnect(); socket = null; }
  cur = null; channels.length = 0; dms.length = 0; render();
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('seedResult').style.display = 'none';
  document.getElementById('authBtn').style.display = '';
  switchTab('login');
  document.getElementById('mainArea').innerHTML = '<div class="empty"><div class="empty-card"><div class="empty-icon">\uD83D\uDE80</div><h2>Добро пожаловать в Космос</h2><p>Выбери чат слева или создай новый</p></div></div>';
}

var _splashDone = false;
var _splashStart = Date.now();
function closeSplash() {
  if (_splashDone) return;
  // Ensure minimum 1.5s display
  var elapsed = Date.now() - _splashStart;
  if (elapsed < 1500) {
    setTimeout(closeSplash, 1500 - elapsed);
    return;
  }
  _splashDone = true;
  var sp = document.getElementById('splash');
  if (sp) { sp.style.transform = 'scale(1.1)'; sp.style.opacity = '0'; setTimeout(function(){ sp.remove(); }, 800); }
  if (jwtToken && currentUser) enterApp();
}

// ── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  if (theme !== 'blue' && theme !== 'pink') theme = 'blue';
  document.documentElement.setAttribute('data-theme', theme);
}
function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme') || 'blue';
  var next = cur === 'blue' ? 'pink' : 'blue';
  localStorage.setItem('kosmos_theme', next);
  applyTheme(next);
}

// ── Modal ────────────────────────────────────────────────────────────────────
function openModal() {
  document.getElementById('overlay').classList.add('open');
  onChatTypeChange();
  setTimeout(function() {
    var isCh = document.querySelector('input[name="ct"]:checked').value === 'channel';
    var el = isCh ? document.getElementById('ncName') : document.getElementById('userSearch');
    if (el) el.focus();
  }, 120);
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('ncName').value = '';
  document.getElementById('userSearch').value = '';
  document.getElementById('userResults').innerHTML = '';
}

function onChatTypeChange() {
  var isCh = document.querySelector('input[name="ct"]:checked').value === 'channel';
  document.getElementById('userSearchWrap').style.display = isCh ? 'none' : 'block';
  document.getElementById('channelNameWrap').style.display = isCh ? 'block' : 'none';
  document.getElementById('chatCancelWrap').style.display = isCh ? 'none' : 'block';
}

// ── WebView / Capacitor detection ────────────────────────────────────────────
var isWebView = /wv|WebView/i.test(navigator.userAgent) || !!window.Capacitor;
// In APK: keep seed-phrase login + Telegram visible (no hiding)

// ── Referral code from URL ────────────────────────────────────────────────────
var _refCode = new URLSearchParams(window.location.search).get('ref') || '';

// ── Init on load ─────────────────────────────────────────────────────────────
applyTheme(localStorage.getItem('kosmos_theme') || 'blue');
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
  var text='Powered by Jesus Christ.', el=document.getElementById('typewriter');
  if(!el)return;
  var ts=document.createElement('span'), cr=document.createElement('span');
  cr.textContent='|'; cr.style.cssText='animation:kblink .6s infinite;font-weight:300;color:rgba(255,255,255,0.4)';
  el.appendChild(ts); el.appendChild(cr);
  var st=document.createElement('style'); st.textContent='@keyframes kblink{0%,100%{opacity:1}50%{opacity:0}}'; document.head.appendChild(st);
  var idx=0;
  function tp(){if(idx<text.length){ts.textContent+=text[idx];idx++;setTimeout(tp,25);}else{setTimeout(function(){var ln=document.getElementById('splashLine');if(ln)ln.style.width='60px';},300);setTimeout(function(){cr.remove();},1500);setTimeout(closeSplash,2800);}}
  setTimeout(tp,300);
})();

// Auto-login
if (jwtToken) {
  fetch(API + '/me', { headers: { 'Authorization': 'Bearer ' + jwtToken } })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(user) {
      if (user) {
        currentUser = user;
        localStorage.setItem('kosmos_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('kosmos_token');
        localStorage.removeItem('kosmos_user');
        jwtToken = null;
      }
    })
    .catch(function() {});
}

// ── Telegram Auth ────────────────────────────────────────────────────────────
function onTelegramAuth(user) {
  fetch(API + '/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.token) {
        jwtToken = data.token;
        refreshToken = data.refreshToken;
        currentUser = data.user;
        localStorage.setItem('kosmos_token', jwtToken);
        if (data.refreshToken) localStorage.setItem('kosmos_refresh', data.refreshToken);
        localStorage.setItem('kosmos_user', JSON.stringify(data.user));
        enterApp();
      } else {
        alert(data.error || 'Ошибка авторизации');
      }
    })
    .catch(function() { alert('Нет связи с сервером'); });
}
window.onTelegramAuth = onTelegramAuth;

render();

// ── Offline detection ────────────────────────────────────────────────────────
var offlineBanner = null;
window.addEventListener('offline', function() {
  if (offlineBanner) return;
  offlineBanner = document.createElement('div');
  offlineBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#FF3B30;color:#fff;text-align:center;padding:6px;font-size:13px;font-weight:600';
  offlineBanner.textContent = 'Нет соединения';
  document.body.appendChild(offlineBanner);
});
window.addEventListener('online', function() {
  if (offlineBanner) { offlineBanner.remove(); offlineBanner = null; }
  if (socket && !socket.connected) socket.connect();
  loadMyChats();
});

// ── Swipe back (Hammer.js) + Android back button ─────────────────────────────
(function() {
  if (typeof Hammer !== 'undefined') {
    var mc = new Hammer(document.body, { recognizers: [[Hammer.Swipe, { direction: Hammer.DIRECTION_RIGHT, threshold: 50, velocity: 0.3 }]] });
    mc.on('swiperight', function() {
      if (document.body.classList.contains('chat-open')) goBack();
    });
  }

  function handleBack() {
    // If in a chat/sub-screen, go back
    if (document.body.classList.contains('chat-open')) { goBack(); return; }
    // If onboarding is visible, ignore
    var ob = document.getElementById('onboarding');
    if (ob && !ob.classList.contains('hidden')) return;
    // Otherwise show exit dialog (APK only)
    if (isWebView && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      if (confirm('Выйти из приложения?')) {
        window.Capacitor.Plugins.App.exitApp();
      }
    }
  }

  document.addEventListener('backbutton', handleBack);
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', function(e) {
        // e.canGoBack is true if webview has history
        handleBack();
      });
    }
  } catch(e) {}
  window.addEventListener('popstate', function() {
    if (document.body.classList.contains('chat-open')) goBack();
  });
})();
