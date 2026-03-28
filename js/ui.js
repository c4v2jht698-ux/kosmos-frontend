// ── UI: Render, chat open, message HTML, input helpers ──────────────────────

// ── Default Avatar Helper ───────────────────────────────────────────────────
function defaultAv(name, size) {
  size = size || 48;
  var g = GS[(name || '?').charCodeAt(0) % GS.length];
  return '<div class="av ' + g + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px">' +
    '<span style="color:#fff">\uD83D\uDC36</span></div>';
}

function defaultAvSq(name, size) {
  size = size || 48;
  var g = GS[(name || '?').charCodeAt(0) % GS.length];
  return '<div class="av ' + g + ' sq" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px">' +
    '<span style="color:#fff">' + (name || '?')[0].toUpperCase() + '</span></div>';
}

// ── Interests Data ──────────────────────────────────────────────────────────
var INTERESTS = [
  { id: 'технологии', emoji: '\uD83D\uDCBB', label: 'Технологии' },
  { id: 'спорт', emoji: '\u26BD', label: 'Спорт' },
  { id: 'музыка', emoji: '\uD83C\uDFB5', label: 'Музыка' },
  { id: 'кино', emoji: '\uD83C\uDFAC', label: 'Кино' },
  { id: 'игры', emoji: '\uD83C\uDFAE', label: 'Игры' },
  { id: 'наука', emoji: '\uD83D\uDD2C', label: 'Наука' },
  { id: 'путешествия', emoji: '\u2708\uFE0F', label: 'Путешествия' },
  { id: 'еда', emoji: '\uD83C\uDF54', label: 'Еда' },
  { id: 'мода', emoji: '\uD83D\uDC57', label: 'Мода' },
  { id: 'бизнес', emoji: '\uD83D\uDCBC', label: 'Бизнес' },
  { id: 'искусство', emoji: '\uD83C\uDFA8', label: 'Искусство' },
  { id: 'юмор', emoji: '\uD83D\uDE02', label: 'Юмор' },
];

// ── Onboarding ──────────────────────────────────────────────────────────────
function showOnboarding() {
  var el = document.getElementById('onboarding');
  el.classList.remove('hidden');
  var selected = [];
  el.innerHTML =
    '<div style="max-width:440px;width:100%">' +
      '<div class="ob-title">Что тебе интересно?</div>' +
      '<div class="ob-sub">Выбери минимум 3 темы — мы персонализируем ленту</div>' +
      '<div class="ob-counter" id="obCount">Выбрано: 0 из 3+</div>' +
      '<div class="ob-grid" id="obGrid">' +
        INTERESTS.map(function(i) {
          return '<div class="ob-card" data-id="' + i.id + '" onclick="toggleInterest(this)">' +
            '<div class="ob-emoji">' + i.emoji + '</div>' +
            '<div class="ob-label">' + i.label + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<button class="ob-btn" id="obBtn" disabled onclick="saveInterests()">Продолжить</button>' +
    '</div>';
}

function toggleInterest(card) {
  card.classList.toggle('selected');
  var sel = document.querySelectorAll('.ob-card.selected');
  var cnt = document.getElementById('obCount');
  var btn = document.getElementById('obBtn');
  cnt.textContent = 'Выбрано: ' + sel.length + ' из 3+';
  btn.disabled = sel.length < 3;
}

async function saveInterests() {
  var sel = Array.from(document.querySelectorAll('.ob-card.selected')).map(function(c) { return c.dataset.id; });
  if (sel.length < 3) return;
  try {
    await fetch(API + '/me/interests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ interests: sel })
    });
    if (currentUser) currentUser.interests = sel;
    localStorage.setItem('kosmos_user', JSON.stringify(currentUser));
  } catch(e) {}
  document.getElementById('onboarding').classList.add('hidden');
  localStorage.setItem('kosmos_onboarded', '1');
  // Start onboarding tour for new users
  setTimeout(startTour, 500);
}

// ── Core ────────────────────────────────────────────────────────────────────
function findItem(id) { return channels.find(function(x){return x.id===id}) || dms.find(function(x){return x.id===id}); }

function render() {
  var all = channels.concat(dms).sort(function(a, b) {
    if (!a._ts && !b._ts) return 0;
    if (!a._ts) return 1;
    if (!b._ts) return -1;
    return b._ts - a._ts;
  });

  var chList = document.getElementById('chList');
  if (chList) {
    var pinned =
      '<div class="ci" onclick="openPinned(\'important\')">' +
        '<div class="av g4 sq" style="width:48px;height:48px;font-size:20px"><span style="color:#fff">\u2B50</span></div>' +
        '<div class="ci-info"><div class="ci-name">Важное</div><div class="ci-prev">Заметки для себя</div></div></div>' +
      '<div class="ci" onclick="openPinned(\'ai\')">' +
        '<div class="av g1 sq" style="width:48px;height:48px;font-size:20px"><span style="color:#fff">\uD83E\uDD16</span></div>' +
        '<div class="ci-info"><div class="ci-name">ГигаЧАТ AI</div><div class="ci-prev">Умный ассистент</div></div></div>' +
      '<div class="ci" onclick="navTo(\'feed\')">' +
        '<div class="av g3 sq" style="width:48px;height:48px;font-size:20px"><span style="color:#fff">\uD83D\uDCF0</span></div>' +
        '<div class="ci-info"><div class="ci-name">Стена</div><div class="ci-prev">Посты и новости</div></div></div>' +
      '<div class="ci" onclick="navTo(\'dating\')">' +
        '<div class="av g5 sq" style="width:48px;height:48px;font-size:20px"><span style="color:#fff">\uD83D\uDC95</span></div>' +
        '<div class="ci-info"><div class="ci-name">Знакомства</div><div class="ci-prev">Свайпай и общайся</div></div></div>';
    chList.innerHTML = pinned + all.map(function(c){return itm(c)}).join('');
  }

  var dmSec = document.getElementById('dmSection');
  if (dmSec) dmSec.style.display = 'none';

  var chSec = document.getElementById('chSection');
  if (chSec) {
    chSec.style.display = '';
    var lbl = chSec.querySelector('.sec-label');
    if (lbl) lbl.textContent = all.length ? 'Чаты' : '';
  }
  setTimeout(initSwipeToLeave, 50);
  if (typeof updateTabBadges === 'function') updateTabBadges();
}

function itm(c) {
  var isCh = c.type === 'channel';
  var avHtml = isCh ? defaultAvSq(c.name) : defaultAv(c.name);
  return '<div class="ci-wrap" data-id="' + c.id + '" data-type="' + c.type + '">' +
    '<div class="ci-leave-bg">Покинуть</div>' +
    '<div class="ci' + (cur === c.id ? ' active' : '') + '" onclick="openChat(\'' + c.id + '\')">' +
      avHtml +
      '<div class="ci-info">' +
        '<div class="ci-name">' + c.name + '</div>' +
        '<div class="ci-prev">' + (c.prev || '') + '</div>' +
      '</div>' +
      '<div class="ci-meta">' +
        '<div class="ci-time">' + (c.time || '') + '</div>' +
        (c.unread ? '<div class="badge">' + c.unread + '</div>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

function initSwipeToLeave() {
  document.querySelectorAll('.ci-wrap[data-type="channel"]').forEach(function(wrap) {
    if (wrap._swipeInit) return; // don't double-bind
    wrap._swipeInit = true;
    var ci = wrap.querySelector('.ci');
    var startX = 0, startY = 0, deltaX = 0, swiping = false;

    ci.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      deltaX = 0; swiping = false;
      ci.style.transition = 'none';
    }, { passive: true });

    ci.addEventListener('touchmove', function(e) {
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      // Only swipe horizontally
      if (!swiping && Math.abs(dy) > Math.abs(dx)) return;
      swiping = true;
      deltaX = Math.min(0, Math.max(-90, dx));
      if (deltaX < 0) {
        wrap.classList.add('swiping');
        ci.style.transform = 'translateX(' + deltaX + 'px)';
      }
    }, { passive: true });

    ci.addEventListener('touchend', function() {
      ci.style.transition = 'transform .25s ease';
      if (deltaX < -60) {
        // Close others first
        document.querySelectorAll('.ci-wrap.swiped').forEach(function(el) {
          if (el !== wrap) { el.classList.remove('swiped','swiping'); el.querySelector('.ci').style.transform = ''; }
        });
        wrap.classList.add('swiped');
        ci.style.transform = 'translateX(-90px)';
      } else {
        wrap.classList.remove('swiped','swiping');
        ci.style.transform = '';
      }
    });
  });

  // Close all swipes when tapping elsewhere
  document.addEventListener('touchstart', function(e) {
    if (!e.target.closest('.ci-wrap.swiped') && !e.target.closest('.ci-leave-bg')) {
      document.querySelectorAll('.ci-wrap.swiped').forEach(function(el) {
        el.classList.remove('swiped','swiping');
        el.querySelector('.ci').style.transform = '';
      });
    }
  }, { passive: true });

  document.querySelectorAll('.ci-leave-bg').forEach(function(btn) {
    btn.onclick = function(e) {
      e.stopPropagation();
      var wrap = btn.closest('.ci-wrap');
      var id = wrap.dataset.id;
      if (!confirm('Покинуть канал?')) {
        wrap.classList.remove('swiped','swiping');
        wrap.querySelector('.ci').style.transform = '';
        return;
      }
      leaveChannel(id);
    };
  });
}

async function leaveChannel(id) {
  try { await apiFetch(API + '/channels/' + id + '/leave', { method: 'POST' }); } catch(e) {}
  var idx = channels.findIndex(function(c){return c.id===id});
  if (idx !== -1) channels.splice(idx, 1);
  if (cur === id) { cur = null; goBack(); }
  render();
}

// ── Chat View ───────────────────────────────────────────────────────────────
function openChat(id) {
  if (cur && socket) socket.emit('leave', cur);
  cur = id;
  if (socket) socket.emit('join', id);

  var item = findItem(id);
  if (!item) { console.warn('Chat not found:', id); return; }
  item.unread = 0;
  render();

  if (!item._loaded && jwtToken) {
    item._loaded = true;
    fetch(API + '/messages/' + encodeURIComponent(id), {
      headers: { 'Authorization': 'Bearer ' + jwtToken }
    })
      .then(function(r) { return r.ok ? r.json() : []; })
      .then(function(msgs) {
        var isCh2 = item.type === 'channel';
        item.msgs = msgs.map(function(m) {
          var ts = new Date(m.created_at * 1000);
          var time = ts.getHours().toString().padStart(2,'0') + ':' + ts.getMinutes().toString().padStart(2,'0');
          var from = currentUser && m.sender_id === currentUser.id ? 'me' : 'them';
          return { id: m.id, from: from, text: m.text, time: time, sender: m.sender_username };
        });
        if (cur === id) {
          var area = document.getElementById('msgArea');
          if (area) {
            area.innerHTML = '<div class="datediv"><span>Сегодня</span></div>' +
              item.msgs.map(function(m){return mHTML(m, isCh2)}).join('');
            scrollBot();
          }
        }
        if (item.msgs.length) {
          item.prev = item.msgs[item.msgs.length-1].text.substring(0, 36);
          render();
        }
      }).catch(function(){});
  }

  var isCh = item.type === 'channel';
  var sub = isCh
    ? (item.slug ? '#'+item.slug+' · ' : '') + (item.members || 0) + ' подписчиков'
    : (item.online ? '<span style="color:var(--online);font-weight:600">● в сети</span>' : 'был(а) недавно');

  var avHtml = isCh ? defaultAvSq(item.name, 36) : defaultAv(item.name, 36);

  document.getElementById('mainArea').innerHTML =
    '<div class="chat-hdr">' +
      '<button class="back-btn" onclick="goBack()">\u2039</button>' +
      avHtml +
      '<div class="hinfo"><div class="hname">' + item.name + '</div><div class="hsub">' + sub + '</div></div>' +
      '<div class="hacts"><button class="hb">\uD83D\uDD0D</button></div>' +
    '</div>' +
    '<div class="msg-area" id="msgArea">' +
      '<div class="datediv"><span>Сегодня</span></div>' +
      item.msgs.map(function(m){return mHTML(m, isCh)}).join('') +
    '</div>' +
    (isCh ? '<div class="ro-bar">Канал только для чтения</div>' : inpHTML());
  scrollBot();
  showChatView();
}

function mHTML(m, isCh) {
  if (isCh) {
    return '<div class="msg ch"><div class="bbl">' + escHtml(m.text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') +
      '<div class="bf"><span class="mt">' + m.time + '</span></div></div></div>';
  }
  var me = m.from === 'me';
  return '<div class="msg ' + (me ? 'me' : 'them') + '">' +
    (!me && m.sender ? '<div class="sender-name">' + escHtml(m.sender) + '</div>' : '') +
    '<div class="bbl">' + escHtml(m.text) +
      '<div class="bf"><span class="mt">' + m.time + '</span>' +
        (me ? '<span class="ms">\u2713\u2713</span>' : '') +
      '</div></div></div>';
}

function escHtml(s) {
  s = String(s || '');
  if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(s, { ALLOWED_TAGS: [] });
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function inpHTML() {
  return '<div class="inp-zone" style="position:relative">' +
    '<div class="epanel" id="ep">' + EMOJIS.map(function(e){return '<span class="ep" onclick="insE(\'' + e + '\')">' + e + '</span>'}).join('') + '</div>' +
    '<div class="inp-box">' +
      '<textarea class="minput" id="mi" placeholder="Написать сообщение..." rows="1" maxlength="500" onkeydown="hKey(event)" oninput="onInput(this)"></textarea>' +
      '<button class="ib" onclick="togE()">\uD83D\uDE0A</button>' +
    '</div>' +
    '<span class="char-counter" id="charCount"></span>' +
    '<button class="sbtn" onclick="send()">\u27A4</button>' +
  '</div>';
}

function hKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
function aRes(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 130) + 'px'; }
function onInput(el) {
  aRes(el);
  if (socket && socket.connected && cur) socket.emit('typing', { chatId: cur });
  // Update char counter
  var cc = document.getElementById('charCount');
  if (cc) {
    var len = el.value.length;
    if (len > 400) {
      cc.textContent = len + '/500';
      cc.className = 'char-counter' + (len > 480 ? ' over' : ' warn');
    } else {
      cc.textContent = '';
      cc.className = 'char-counter';
    }
  }
}

function appendMsg(msg, isCh) {
  var area = document.getElementById('msgArea');
  if (!area) return;
  var ty = area.querySelector('.typing');
  var d = document.createElement('div');
  d.innerHTML = mHTML(msg, isCh);
  if (ty) area.insertBefore(d.firstChild, ty);
  else area.appendChild(d.firstChild);
  scrollBot();
}

function showTypingIndicator() {
  var area = document.getElementById('msgArea');
  if (!area) return;
  var ty = area.querySelector('.typing');
  if (!ty) {
    ty = document.createElement('div');
    ty.className = 'typing';
    ty.innerHTML = '<div class="tdots"><span></span><span></span><span></span></div>';
    area.appendChild(ty);
    scrollBot();
  }
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(function() { if (ty) ty.remove(); }, 3000);
}

// ── Bottom Navigation ───────────────────────────────────────────────────────
var currentNav = 'chats';
function navTo(tab) {
  currentNav = tab;
  document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
  var navEl = document.getElementById('nav' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (navEl) navEl.classList.add('active');

  // Clean state
  cur = null;

  if (tab === 'chats') {
    document.body.classList.remove('chat-open');
    document.getElementById('mainArea').innerHTML = '<div class="empty"><div class="empty-card"><div class="empty-icon">\uD83D\uDE80</div><h2>Добро пожаловать в Космос</h2><p>Выбери чат слева или создай новый</p></div></div>';
    render();
  } else {
    // For feed/dating/profile — show main area directly, hide sidebar
    document.body.classList.add('chat-open');

    if (tab === 'feed') {
      openPinnedContent('video');
    } else if (tab === 'dating') {
      openPinnedContent('social');
    } else if (tab === 'profile') {
      openProfileScreen();
    }
  }
}

// Version of openPinned that doesn't call showChatView/render (used by navTo)
function openPinnedContent(type) {
  cur = null;
  var main = document.getElementById('mainArea');
  if (type === 'video') { buildFeedView(main); }
  else if (type === 'social') { buildDatingView(main); }
}

// ── Profile Screen ──────────────────────────────────────────────────────────
async function openProfileScreen() {
  showChatView();
  var main = document.getElementById('mainArea');
  main.innerHTML = '<div class="profile-wrap" style="display:flex;align-items:center;justify-content:center"><div style="color:var(--text3)">Загрузка...</div></div>';
  try {
    var r = await fetch(API + '/me', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var u = await r.json();
    var interests = (u.interests || []);
    var interestTags = interests.map(function(i) {
      var found = INTERESTS.find(function(x){return x.id === i});
      return '<span class="interest-tag">' + (found ? found.emoji + ' ' : '') + i + '</span>';
    }).join('');

    var chCount = channels.length;
    main.innerHTML =
      '<div class="chat-hdr">' +
        '<button class="back-btn" onclick="goBack()">\u2039</button>' +
        '<div class="hinfo"><div class="hname">Профиль</div></div>' +
        '<div class="hacts"><button class="hb" onclick="toggleTheme()">\u263E</button></div>' +
      '</div>' +
      '<div class="profile-wrap">' +
        '<div class="profile-header">' +
          '<div class="profile-av ' + GS[(u.username||'?').charCodeAt(0)%GS.length] + '">\uD83D\uDC36</div>' +
          '<div class="profile-name">' + escHtml(u.username || '') + '</div>' +
          '<div class="profile-handle">@' + escHtml(u.handle || '') + '</div>' +
          (u.bio ? '<div class="profile-bio">' + escHtml(u.bio) + '</div>' : '') +
          (interestTags ? '<div class="profile-interests">' + interestTags + '</div>' : '') +
          '<div class="profile-stats">' +
            '<div class="pstat"><div class="pstat-num">' + chCount + '</div><div class="pstat-label">Каналов</div></div>' +
            '<div class="pstat"><div class="pstat-num">' + dms.length + '</div><div class="pstat-label">Чатов</div></div>' +
          '</div>' +
        '</div>' +
        (u.status ? '<div style="font-size:14px;color:var(--text2);margin-top:6px">' + (u.mood||'') + ' ' + escHtml(u.status) + '</div>' : '') +
        '<div class="profile-section" id="badgeSection"><div class="profile-section-title">Достижения</div><div style="text-align:center;color:var(--text3);padding:8px">Загрузка...</div></div>' +
        '<div class="profile-section">' +
          '<div class="profile-section-title">Настройки</div>' +
          '<div class="profile-row" onclick="openEditProfile()"><div class="profile-row-label">Редактировать профиль</div><div class="profile-row-val">\u203A</div></div>' +
          '<div class="profile-row" onclick="openStatusEditor()"><div class="profile-row-label">Статус и настроение</div><div class="profile-row-val">' + (u.mood||'') + ' \u203A</div></div>' +
          '<div class="profile-row" onclick="showOnboarding()"><div class="profile-row-label">Изменить интересы</div><div class="profile-row-val">' + interests.length + ' выбрано \u203A</div></div>' +
          '<div class="profile-row" onclick="toggleTheme();openProfileScreen()"><div class="profile-row-label">Тема оформления</div><div class="profile-row-val">' + ({dark:'Тёмная',light:'Светлая',pink:'Розовая'}[document.documentElement.getAttribute('data-theme')]||'Тёмная') + ' \u203A</div></div>' +
          '<div class="profile-row" onclick="showReferral()"><div class="profile-row-label">Пригласить друга</div><div class="profile-row-val">\uD83D\uDD17 \u203A</div></div>' +
        '</div>' +
        '<div class="profile-section">' +
          '<div class="profile-row" onclick="logout()" style="justify-content:center"><div class="profile-row-label" style="color:#FF3B30">Выйти</div></div>' +
        '</div>' +
      '</div>';
    // Load badges async
    loadBadges().then(function(bd) {
      var sec = document.getElementById('badgeSection');
      if (sec) sec.innerHTML = '<div class="profile-section-title">Достижения</div>' + renderBadgeGrid(bd.earned, bd.all);
    });
  } catch(e) {
    main.innerHTML = '<div class="profile-wrap" style="text-align:center;padding:40px"><div style="color:var(--text3)">Ошибка загрузки профиля</div></div>';
  }
}

function openEditProfile() {
  var main = document.getElementById('mainArea');
  fetch(API + '/me', { headers: { 'Authorization': 'Bearer ' + jwtToken } })
    .then(function(r) { return r.json(); })
    .then(function(u) {
      main.innerHTML =
        '<div class="chat-hdr"><button class="back-btn" onclick="openProfileScreen()">\u2039</button><div class="hinfo"><div class="hname">Редактировать</div></div></div>' +
        '<div style="padding:20px;max-width:400px;margin:0 auto;overflow-y:auto;flex:1">' +
          '<div style="text-align:center;margin-bottom:20px">' + defaultAv(u.username, 80) + '</div>' +
          '<div class="auth-label">Имя</div>' +
          '<input class="minp" id="epName" value="' + escHtml(u.username || '') + '">' +
          '<div class="auth-label">О себе</div>' +
          '<textarea class="minp" id="epBio" rows="3" placeholder="Расскажи о себе...">' + escHtml(u.bio || '') + '</textarea>' +
          '<div class="auth-label">Возраст</div>' +
          '<input class="minp" id="epAge" type="number" value="' + (u.age || '') + '" placeholder="25">' +
          '<div class="auth-label">Город</div>' +
          '<input class="minp" id="epCity" value="' + escHtml(u.city || '') + '" placeholder="Москва">' +
          '<button class="bcrte" style="width:100%;margin-top:12px" onclick="saveEditProfile()">Сохранить</button>' +
        '</div>';
    });
}

async function saveEditProfile() {
  await fetch(API + '/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
    body: JSON.stringify({
      username: document.getElementById('epName').value.trim(),
      bio: document.getElementById('epBio').value.trim(),
      age: parseInt(document.getElementById('epAge').value) || null,
      city: document.getElementById('epCity').value.trim(),
    })
  });
  openProfileScreen();
}

// ── Pinned sections ──────────────────────────────────────────────────────────
function openPinned(type) {
  cur = null; render();
  var main = document.getElementById('mainArea');

  if (type === 'important') {
    var saved = JSON.parse(localStorage.getItem('kosmos_notes') || '[]');
    main.innerHTML =
      '<div class="chat-hdr">' +
        '<button class="back-btn" onclick="goBack()">\u2039</button>' +
        '<div class="av g4 sq" style="width:36px;height:36px;font-size:16px"><span style="color:#fff">\u2605</span></div>' +
        '<div class="hinfo"><div class="hname">Важное</div><div class="hsub">Заметки для себя</div></div>' +
      '</div>' +
      '<div class="msg-area" id="msgArea">' +
        '<div class="datediv"><span>Заметки</span></div>' +
        saved.map(function(n){return '<div class="msg me"><div class="bbl">' + escHtml(n.text) + '<div class="bf"><span class="mt">' + n.time + '</span></div></div></div>'}).join('') +
      '</div>' +
      '<div class="inp-zone"><div class="inp-box">' +
        '<textarea class="minput" id="mi" placeholder="Записать заметку..." rows="1" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();saveNote()}" oninput="aRes(this)"></textarea>' +
      '</div><button class="sbtn" onclick="saveNote()">\u27A4</button></div>';
    scrollBot(); showChatView();
  } else if (type === 'ai') {
    aiMessages = JSON.parse(localStorage.getItem('kosmos_ai_history') || '[]');
    main.innerHTML =
      '<div class="chat-hdr">' +
        '<button class="back-btn" onclick="goBack()">\u2039</button>' +
        '<div class="av g1 sq" style="width:36px;height:36px;font-size:16px"><span style="color:#fff">\uD83E\uDD16</span></div>' +
        '<div class="hinfo"><div class="hname">ГигаЧАТ AI</div><div class="hsub">Llama 3.3 \u00B7 Groq</div></div>' +
      '</div>' +
      '<div class="msg-area" id="msgArea">' +
        '<div class="datediv"><span>AI Ассистент</span></div>' +
        (aiMessages.length ? aiMessages.map(function(m){return '<div class="msg '+(m.role==='user'?'me':'them')+'"><div class="bbl">'+escHtml(m.content)+'<div class="bf"><span class="mt">'+(m.time||'')+'</span></div></div></div>'}).join('') :
          '<div class="msg them"><div class="bbl">Привет! Я AI-ассистент Космоса. Спрашивай что угодно \uD83D\uDE80<div class="bf"><span class="mt">\u2014</span></div></div></div>') +
      '</div>' +
      '<div class="inp-zone"><div class="inp-box">' +
        '<textarea class="minput" id="mi" placeholder="Спросить AI..." rows="1" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendAI()}" oninput="aRes(this)"></textarea>' +
      '</div><button class="sbtn" onclick="sendAI()">\u27A4</button></div>';
    scrollBot(); showChatView();
  } else if (type === 'video') {
    buildFeedView(main);
    showChatView();
  } else if (type === 'social') {
    buildDatingView(main);
    showChatView();
  }
}

// ── Build Feed View ──────────────────────────────────────────────────────────
function buildFeedView(main) {
  feedOffset = 0; feedLoading = false; myFeedChannel = null; feedFilter = 'all';
  var backBtn = currentNav === 'feed' ? '' : '<button class="back-btn" onclick="goBack()">\u2039</button>';
  main.innerHTML =
    '<div class="chat-hdr" style="justify-content:space-between">' +
      backBtn +
      '<div style="font-weight:700;font-size:18px;color:var(--text)">Стена</div>' +
      '<button class="hb" onclick="openGlobalSearch()">\uD83D\uDD0D</button>' +
    '</div>' +
    '<div style="display:flex;gap:6px;padding:8px 12px;background:var(--card);border-bottom:0.5px solid var(--sep);overflow-x:auto">' +
      '<button class="feed-filter active" data-f="all" onclick="setFeedFilter(\'all\',this)">Все</button>' +
      '<button class="feed-filter" data-f="interests" onclick="setFeedFilter(\'interests\',this)">По интересам</button>' +
      '<button class="feed-filter" data-f="new" onclick="setFeedFilter(\'new\',this)">Новое</button>' +
    '</div>' +
    '<div id="feedArea" style="flex:1;overflow-y:auto;padding:0">' +
      '<div class="stories-row" id="storiesRow"></div>' +
      '<div id="feedList">' + skeletonCards(3) + '</div>' +
      '<div id="feedLoader" style="text-align:center;padding:16px;color:var(--text3)"></div>' +
    '</div>' +
    '<div style="position:absolute;bottom:80px;right:20px;z-index:10">' +
      '<button onclick="openCreatePost()" style="width:56px;height:56px;border-radius:50%;background:var(--accent);border:none;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(124,58,237,0.4);display:flex;align-items:center;justify-content:center">\u270F\uFE0F</button>' +
    '</div>';
  loadFeed();
  var sr = document.getElementById('storiesRow');
  if (sr) loadStories(sr);
  var feedArea = document.getElementById('feedArea');
  feedArea.addEventListener('scroll', function() {
    if (this.scrollTop + this.clientHeight >= this.scrollHeight - 200 && !feedLoading) loadFeed();
  });
  // Pull-to-refresh
  var _ptrStart = 0, _ptrActive = false;
  feedArea.addEventListener('touchstart', function(e) { if (feedArea.scrollTop <= 0) _ptrStart = e.touches[0].clientY; else _ptrStart = 0; }, { passive: true });
  feedArea.addEventListener('touchmove', function(e) {
    if (!_ptrStart) return;
    var diff = e.touches[0].clientY - _ptrStart;
    if (diff > 60 && !_ptrActive) {
      _ptrActive = true;
      var ptr = document.getElementById('ptrIndicator');
      if (ptr) ptr.classList.add('active');
    }
  }, { passive: true });
  feedArea.addEventListener('touchend', function() {
    if (_ptrActive) {
      _ptrActive = false;
      feedOffset = 0; feedLoading = false;
      var list = document.getElementById('feedList');
      if (list) list.innerHTML = skeletonCards(3);
      loadFeed();
      setTimeout(function() { var ptr = document.getElementById('ptrIndicator'); if (ptr) ptr.classList.remove('active'); }, 1000);
    }
    _ptrStart = 0;
  });
  if (window._feedRefresh) clearInterval(window._feedRefresh);
  window._feedRefresh = setInterval(function() {
    var list = document.getElementById('feedList');
    if (!list) { clearInterval(window._feedRefresh); return; }
    fetch(API + '/feed?offset=0', { headers: { 'Authorization': 'Bearer ' + jwtToken } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var posts = data.posts || [];
        if (posts.length && list.children.length) {
          var firstId = list.children[0] ? list.children[0].getAttribute('data-pid') : null;
          if (posts[0].id !== firstId) {
            var newHtml = '';
            for (var i = 0; i < posts.length; i++) {
              if (posts[i].id === firstId) break;
              newHtml += postCard(posts[i]);
            }
            if (newHtml) list.insertAdjacentHTML('afterbegin', newHtml);
          }
        }
      }).catch(function() {});
  }, 60000);
}

// ── Build Dating View ────────────────────────────────────────────────────────
function buildDatingView(main) {
  var backBtn = currentNav === 'dating' ? '' : '<button class="back-btn" onclick="goBack()">\u2039</button>';
  main.innerHTML =
    '<div class="chat-hdr">' +
      backBtn +
      '<div class="av g5 sq" style="width:36px;height:36px;font-size:16px"><span style="color:#fff">\u2665</span></div>' +
      '<div class="hinfo"><div class="hname">Встречи</div><div class="hsub">Знакомства</div></div>' +
      '<div class="hacts"><button class="hb" onclick="openDatingProfile()">\u2699</button></div>' +
    '</div>' +
    '<div id="datingArea" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden">' +
      '<div style="color:var(--text3)">Загрузка...</div>' +
    '</div>';
  loadDatingCards();
}

function saveNote() {
  var inp = document.getElementById('mi');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = 'auto';
  var now = new Date();
  var time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  var saved = JSON.parse(localStorage.getItem('kosmos_notes') || '[]');
  saved.push({ text: text, time: time });
  localStorage.setItem('kosmos_notes', JSON.stringify(saved));
  var area = document.getElementById('msgArea');
  var d = document.createElement('div');
  d.innerHTML = '<div class="msg me"><div class="bbl">' + escHtml(text) + '<div class="bf"><span class="mt">' + time + '</span></div></div></div>';
  area.appendChild(d.firstChild);
  scrollBot();
}

// ── AI Chat ──────────────────────────────────────────────────────────────────
var aiMessages = [];

async function sendAI() {
  var inp = document.getElementById('mi');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = 'auto';
  var now = new Date();
  var time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  aiMessages.push({ role: 'user', content: text, time: time });
  var area = document.getElementById('msgArea');
  var d = document.createElement('div');
  d.innerHTML = '<div class="msg me"><div class="bbl">' + escHtml(text) + '<div class="bf"><span class="mt">' + time + '</span></div></div></div>';
  area.appendChild(d.firstChild);
  var loading = document.createElement('div');
  loading.className = 'typing';
  loading.innerHTML = '<div class="tdots"><span></span><span></span><span></span></div>';
  area.appendChild(loading);
  scrollBot();
  try {
    var res = await fetch(API + '/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ messages: aiMessages.filter(function(m){return m.role==='user'||m.role==='assistant'}).map(function(m){return {role:m.role,content:m.content}}) }),
    });
    var data = await res.json();
    loading.remove();
    var aiText = data.text || data.error || 'Нет ответа';
    var aiTime = new Date().getHours().toString().padStart(2,'0') + ':' + new Date().getMinutes().toString().padStart(2,'0');
    aiMessages.push({ role: 'assistant', content: aiText, time: aiTime });
    d = document.createElement('div');
    d.innerHTML = '<div class="msg them"><div class="bbl">' + escHtml(aiText) + '<div class="bf"><span class="mt">' + aiTime + '</span></div></div></div>';
    area.appendChild(d.firstChild);
    scrollBot();
    localStorage.setItem('kosmos_ai_history', JSON.stringify(aiMessages.slice(-50)));
  } catch(e) {
    loading.remove();
    d = document.createElement('div');
    d.innerHTML = '<div class="msg them"><div class="bbl">Ошибка: нет связи с сервером<div class="bf"><span class="mt">\u2014</span></div></div></div>';
    area.appendChild(d.firstChild);
    scrollBot();
  }
}

// ── Feed / Лента ─────────────────────────────────────────────────────────────
function skeletonCards(n) {
  var s = '';
  for (var i = 0; i < n; i++) {
    s += '<div style="background:var(--card);border-bottom:0.5px solid var(--sep);padding:14px 16px;animation:pulse 1.2s infinite">' +
      '<div style="display:flex;gap:10px;margin-bottom:12px"><div style="width:40px;height:40px;border-radius:50%;background:rgba(124,58,237,0.08)"></div><div style="flex:1"><div style="width:40%;height:14px;background:rgba(124,58,237,0.06);border-radius:4px;margin-bottom:6px"></div><div style="width:25%;height:10px;background:rgba(124,58,237,0.04);border-radius:4px"></div></div></div>' +
      '<div style="height:14px;background:rgba(124,58,237,0.05);border-radius:4px;margin-bottom:6px;width:90%"></div>' +
      '<div style="height:14px;background:rgba(124,58,237,0.04);border-radius:4px;width:60%"></div></div>';
  }
  return s;
}
var feedOffset = 0;
var feedLoading = false;
var myFeedChannel = null;

async function loadFeed() {
  if (feedLoading) return;
  feedLoading = true;
  var list = document.getElementById('feedList');
  var loader = document.getElementById('feedLoader');
  if (loader) loader.textContent = '';
  if (feedOffset === 0 && list) {
    try {
      var cached = JSON.parse(localStorage.getItem('feed_cache') || '[]');
      if (cached.length) list.innerHTML = cached.map(function(p){return postCard(p)}).join('');
    } catch(e) {}
  }
  try {
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, 8000);
    var res = await fetch(API + '/feed?offset=' + feedOffset + '&filter=' + (feedFilter || 'all'), {
      headers: { 'Authorization': 'Bearer ' + jwtToken }, signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!res.ok) { feedLoading = false; return; }
    var data = await res.json();
    var posts = data.posts || [];
    myFeedChannel = data.myFeedChannel || null;
    if (feedOffset === 0 && list) {
      list.innerHTML = '';
      try { localStorage.setItem('feed_cache', JSON.stringify(posts.slice(0, 10))); } catch(e) {}
    }
    if (!posts.length) {
      var msg = feedOffset === 0 ? 'Нет постов. Напиши первый!' : 'Вы всё прочитали \u2713';
      if (!list.querySelector('[data-pid]') || feedOffset > 0) list.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:30px;color:var(--text3);font-size:14px">' + msg + '</div>');
      feedLoading = false; return;
    }
    posts.forEach(function(p) { list.insertAdjacentHTML('beforeend', postCard(p)); });
    feedOffset += posts.length;
    feedLoading = false;
  } catch(e) {
    feedLoading = false;
    if (feedOffset === 0 && list && !list.querySelector('[data-pid]')) {
      list.innerHTML = '<div style="text-align:center;padding:40px">' +
        '<div style="font-size:32px;margin-bottom:12px">\uD83D\uDCE1</div>' +
        '<div style="color:var(--text3);margin-bottom:16px">' + (e.name === 'AbortError' ? 'Сервер не отвечает' : 'Нет соединения') + '</div>' +
        '<button onclick="feedOffset=0;feedLoading=false;document.getElementById(\'feedList\').innerHTML=skeletonCards(3);loadFeed()" style="background:var(--accent);border:none;border-radius:10px;color:#fff;padding:10px 24px;font-family:inherit;font-size:15px;cursor:pointer">Попробовать снова</button></div>';
    }
  }
}

function relTime(ts) {
  if (!ts) return '';
  var sec = Math.floor(Date.now()/1000) - parseInt(ts);
  if (sec < 60) return 'только что';
  if (sec < 3600) return Math.floor(sec/60) + 'м';
  if (sec < 86400) return Math.floor(sec/3600) + 'ч';
  if (sec < 172800) return 'вчера';
  return Math.floor(sec/86400) + 'д';
}

var REACTION_MAP = {fire:'\uD83D\uDD25',heart:'\u2764\uFE0F',laugh:'\uD83D\uDE02',wow:'\uD83D\uDE2E'};

function postCard(p) {
  var name = p.channel_name || '?';
  var slug = p.channel_slug || '';
  var time = relTime(p.created_at);
  var subBtn = p.channel_id && !p.subscribed
    ? '<button onclick="toggleSub(\'' + p.channel_id + '\',this);event.stopPropagation()" style="background:var(--accent);border:none;border-radius:20px;color:#fff;font-size:12px;font-weight:600;padding:4px 14px;cursor:pointer;margin-left:auto">Подписаться</button>'
    : '';

  // Reactions display
  var reactHtml = '';
  var reacts = p.reactions || [];
  if (reacts.length) {
    reactHtml = reacts.slice(0,2).map(function(r) {
      return '<span style="font-size:12px">' + (REACTION_MAP[r.reaction]||'') + ' ' + r.cnt + '</span>';
    }).join(' ');
  }

  var authorId = p.author_id || '';
  var nameClick = authorId ? ' onclick="openPublicProfile(\'' + authorId + '\')"' : '';

  return '<div data-pid="' + p.id + '" style="display:flex;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--sep);background:var(--card)">' +
    '<div style="cursor:pointer"' + nameClick + '>' + defaultAvSq(name, 44) + '</div>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">' +
        '<span style="font-weight:700;font-size:15px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer"' + nameClick + '>' + escHtml(name) + '</span>' +
        (slug ? '<span style="color:var(--text3);font-size:13px">@' + escHtml(slug) + '</span>' : '') +
        '<span style="color:var(--text3);font-size:13px">\u00B7 ' + time + '</span>' +
        subBtn +
      '</div>' +
      '<div style="font-size:15px;line-height:1.45;color:var(--text);white-space:pre-wrap;margin-bottom:8px">' + escHtml(p.text) + '</div>' +
      // Reaction buttons
      '<div style="display:flex;gap:2px;margin-bottom:8px">' +
        ['fire','heart','laugh','wow'].map(function(r) {
          var active = p.myReaction === r;
          return '<button onclick="postReact(this,\'' + p.id + '\',\'' + r + '\')" style="background:' + (active?'rgba(124,58,237,0.15)':'var(--bg)') + ';border:1px solid ' + (active?'var(--accent)':'var(--sep)') + ';border-radius:20px;padding:3px 8px;cursor:pointer;font-size:14px;transition:all .15s">' + REACTION_MAP[r] + '</button>';
        }).join('') +
        (reactHtml ? '<span style="margin-left:6px;color:var(--text3);font-size:12px;display:flex;align-items:center;gap:4px">' + reactHtml + '</span>' : '') +
      '</div>' +
      // Action bar
      '<div style="display:flex;gap:16px">' +
        '<button onclick="openComments(\'' + p.id + '\')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;display:flex;align-items:center;gap:4px;padding:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' + (p.commentCount||'') + '</button>' +
        '<button onclick="feedShare(\'' + p.id + '\')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;display:flex;align-items:center;gap:4px;padding:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>' +
      '</div>' +
    '</div></div>';
}

async function feedShare(postId) {
  var choice = prompt('Куда отправить?\n1 \u2014 Другу (@username)\n2 \u2014 В Важное (заметки)\n\nВведите 1 или 2:');
  if (choice === '2') {
    var post = document.querySelector('[data-pid="' + postId + '"]');
    var text = post ? (post.querySelector('div[style*="pre-wrap"]') || {}).textContent || '' : '';
    var saved = JSON.parse(localStorage.getItem('kosmos_notes') || '[]');
    var time = new Date().getHours().toString().padStart(2,'0') + ':' + new Date().getMinutes().toString().padStart(2,'0');
    saved.push({ text: '\uD83D\uDCCC ' + text, time: time });
    localStorage.setItem('kosmos_notes', JSON.stringify(saved));
    alert('Сохранено в Важное!');
  } else if (choice === '1') {
    var handle = prompt('Введите @username друга:');
    if (!handle) return;
    try {
      var users = await (await fetch(API+'/users?search='+encodeURIComponent(handle),{headers:{'Authorization':'Bearer '+jwtToken}})).json();
      if (!users.length) { alert('Пользователь не найден'); return; }
      await fetch(API+'/feed/'+postId+'/share',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwtToken},body:JSON.stringify({targetUserId:users[0].id})});
      alert('Отправлено!');
    } catch(e) { alert('Ошибка'); }
  }
}

// ── Feed Filter ──────────────────────────────────────────────────────────────
var feedFilter = 'all';
function setFeedFilter(f, btn) {
  feedFilter = f;
  document.querySelectorAll('.feed-filter').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  feedOffset = 0; feedLoading = false;
  var list = document.getElementById('feedList');
  if (list) list.innerHTML = skeletonCards(3);
  loadFeed();
}

// ── Post Reactions ──────────────────────────────────────────────────────────
async function postReact(btn, postId, reaction) {
  btn.style.animation = 'likeBounce .4s ease';
  setTimeout(function() { btn.style.animation = ''; }, 400);
  try {
    var r = await fetch(API + '/feed/' + postId + '/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ reaction: reaction })
    });
    var d = await r.json();
    // Update button state
    var card = btn.closest('[data-pid]');
    if (card) {
      card.querySelectorAll('button[onclick*="postReact"]').forEach(function(b) {
        b.style.background = 'var(--bg)';
        b.style.borderColor = 'var(--sep)';
      });
      if (d.added) {
        btn.style.background = 'rgba(124,58,237,0.15)';
        btn.style.borderColor = 'var(--accent)';
      }
    }
  } catch(e) {}
}

// ── Comments Bottom Sheet ───────────────────────────────────────────────────
async function openComments(postId) {
  var sheet = document.createElement('div');
  sheet.className = 'comment-sheet';
  sheet.id = 'commentSheet';
  sheet.innerHTML =
    '<div class="comment-sheet-inner">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:0.5px solid var(--sep)">' +
        '<span style="font-weight:700;font-size:16px;color:var(--text)">Комментарии</span>' +
        '<button onclick="document.getElementById(\'commentSheet\').remove()" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer">\u2716</button>' +
      '</div>' +
      '<div id="commentsList" style="flex:1;overflow-y:auto;padding:12px 16px"><div style="text-align:center;color:var(--text3);padding:20px">Загрузка...</div></div>' +
      '<div style="display:flex;gap:8px;padding:10px 12px;border-top:0.5px solid var(--sep);background:var(--card)">' +
        '<input class="minp" id="commentInput" placeholder="Написать комментарий..." style="margin:0;flex:1">' +
        '<button class="sbtn" onclick="submitComment(\'' + postId + '\')">\u27A4</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(sheet);
  setTimeout(function() { sheet.classList.add('open'); }, 10);

  try {
    var r = await fetch(API + '/feed/' + postId + '/comments', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var comments = await r.json();
    var list = document.getElementById('commentsList');
    if (!comments.length) {
      list.innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px">Пока нет комментариев</div>';
    } else {
      list.innerHTML = comments.map(function(c) {
        return '<div style="display:flex;gap:10px;margin-bottom:12px">' +
          defaultAv(c.username, 32) +
          '<div>' +
            '<div style="font-size:13px"><span style="font-weight:600;color:var(--text)">' + escHtml(c.username) + '</span> <span style="color:var(--text3)">@' + escHtml(c.handle||'') + '</span></div>' +
            '<div style="font-size:14px;color:var(--text);margin-top:2px">' + escHtml(c.text) + '</div>' +
            '<div style="font-size:11px;color:var(--text3);margin-top:2px">' + relTime(c.created_at) + '</div>' +
          '</div></div>';
      }).join('');
    }
  } catch(e) {}
}

async function submitComment(postId) {
  var inp = document.getElementById('commentInput');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  try {
    var r = await fetch(API + '/feed/' + postId + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ text: text })
    });
    var c = await r.json();
    var list = document.getElementById('commentsList');
    if (list) {
      var empty = list.querySelector('div[style*="text-align:center"]');
      if (empty) empty.remove();
      list.insertAdjacentHTML('beforeend',
        '<div style="display:flex;gap:10px;margin-bottom:12px">' +
          defaultAv(c.username || currentUser.username, 32) +
          '<div><div style="font-size:13px"><span style="font-weight:600;color:var(--text)">' + escHtml(c.username || currentUser.username) + '</span></div>' +
            '<div style="font-size:14px;color:var(--text);margin-top:2px">' + escHtml(c.text) + '</div>' +
            '<div style="font-size:11px;color:var(--text3);margin-top:2px">только что</div></div></div>'
      );
      list.scrollTop = list.scrollHeight;
    }
    // Update comment count on card
    var card = document.querySelector('[data-pid="' + postId + '"]');
    if (card) {
      var ccBtn = card.querySelector('button[onclick*="openComments"]');
      if (ccBtn) {
        var spans = ccBtn.querySelectorAll('span,text');
        // Just update the text node
        var num = parseInt(ccBtn.textContent.replace(/\D/g,'')) || 0;
        ccBtn.innerHTML = ccBtn.innerHTML.replace(/>(\d*)<\/button>/, '>' + (num+1) + '</button>');
      }
    }
  } catch(e) {}
}

// ── Public Profile ──────────────────────────────────────────────────────────
async function openPublicProfile(userId) {
  showChatView();
  var main = document.getElementById('mainArea');
  main.innerHTML = '<div class="profile-wrap" style="display:flex;align-items:center;justify-content:center"><div style="color:var(--text3)">Загрузка...</div></div>';
  try {
    var r = await fetch(API + '/users/' + userId + '/profile', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var u = await r.json();
    var interests = (u.interests || []);
    var interestTags = interests.map(function(i) {
      var found = INTERESTS.find(function(x){return x.id===i});
      return '<span class="interest-tag">' + (found ? found.emoji + ' ' : '') + i + '</span>';
    }).join('');
    var onlineHtml = u.online ? '<span style="color:var(--green);font-weight:600">\u25CF в сети</span>' : '<span style="color:var(--text3)">был(а) недавно</span>';

    main.innerHTML =
      '<div class="chat-hdr"><button class="back-btn" onclick="goBack()">\u2039</button><div class="hinfo"><div class="hname">Профиль</div></div></div>' +
      '<div class="profile-wrap">' +
        '<div class="profile-header">' +
          '<div class="profile-av ' + GS[(u.username||'?').charCodeAt(0)%GS.length] + '">\uD83D\uDC36</div>' +
          '<div class="profile-name">' + escHtml(u.username || '') + '</div>' +
          '<div class="profile-handle">@' + escHtml(u.handle || '') + '</div>' +
          '<div style="margin-top:6px">' + onlineHtml + '</div>' +
          (u.bio ? '<div class="profile-bio">' + escHtml(u.bio) + '</div>' : '') +
          (u.city ? '<div style="font-size:14px;color:var(--text2);margin-top:6px">\uD83D\uDCCD ' + escHtml(u.city) + '</div>' : '') +
          (interestTags ? '<div class="profile-interests">' + interestTags + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:10px;max-width:300px;margin:0 auto">' +
          '<button onclick="startDMFromProfile(\'' + userId + '\',\'' + escHtml(u.username||'') + '\',\'' + escHtml(u.handle||'') + '\')" style="flex:1;background:var(--accent);border:none;border-radius:12px;color:#fff;padding:12px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer">Написать</button>' +
        '</div>' +
      '</div>';
  } catch(e) {
    main.innerHTML = '<div class="profile-wrap" style="text-align:center;padding:40px"><div style="color:var(--text3)">Профиль не найден</div></div>';
  }
}

function startDMFromProfile(userId, username, handle) {
  goBack();
  startDM(userId, username, handle);
}

// ── Global Search ───────────────────────────────────────────────────────────
function openGlobalSearch() {
  showChatView();
  var main = document.getElementById('mainArea');
  main.innerHTML =
    '<div class="chat-hdr"><button class="back-btn" onclick="goBack()">\u2039</button><div class="hinfo"><div class="hname">Поиск</div></div></div>' +
    '<div style="padding:12px 16px">' +
      '<input class="minp" id="globalSearchInput" placeholder="Поиск людей и каналов..." oninput="doGlobalSearch(this.value)" style="margin:0">' +
    '</div>' +
    '<div style="display:flex;gap:0;border-bottom:0.5px solid var(--sep)">' +
      '<button class="feed-filter active" id="gsTabPeople" onclick="gsTab(\'people\')" style="flex:1;border-radius:0">Люди</button>' +
      '<button class="feed-filter" id="gsTabChannels" onclick="gsTab(\'channels\')" style="flex:1;border-radius:0">Каналы</button>' +
    '</div>' +
    '<div id="globalSearchResults" style="flex:1;overflow-y:auto;padding:8px"></div>';
  setTimeout(function() { var inp = document.getElementById('globalSearchInput'); if (inp) inp.focus(); }, 100);
}

var _gsTab = 'people', _gsTimer = null;
function gsTab(tab) {
  _gsTab = tab;
  document.getElementById('gsTabPeople').classList.toggle('active', tab==='people');
  document.getElementById('gsTabChannels').classList.toggle('active', tab==='channels');
  var inp = document.getElementById('globalSearchInput');
  if (inp && inp.value.trim()) doGlobalSearch(inp.value);
}

function doGlobalSearch(q) {
  clearTimeout(_gsTimer);
  if (!q.trim()) { document.getElementById('globalSearchResults').innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)">Введите запрос</div>'; return; }
  _gsTimer = setTimeout(async function() {
    var res = document.getElementById('globalSearchResults');
    try {
      if (_gsTab === 'people') {
        var r = await fetch(API + '/users?search=' + encodeURIComponent(q), { headers: { 'Authorization': 'Bearer ' + jwtToken } });
        var users = await r.json();
        if (!users.length) { res.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)">Никого не найдено</div>'; return; }
        res.innerHTML = users.map(function(u) {
          return '<div class="ci" onclick="openPublicProfile(\'' + u.id + '\')">' +
            defaultAv(u.username) +
            '<div class="ci-info"><div class="ci-name">' + escHtml(u.username) + '</div><div class="ci-prev">@' + escHtml(u.handle||'') + '</div></div>' +
            '<button onclick="event.stopPropagation();startDM(\'' + u.id + '\',\'' + escSearch(u.username) + '\',\'' + escSearch(u.handle||'') + '\')" style="background:var(--accent);border:none;border-radius:20px;color:#fff;font-size:12px;padding:5px 14px;cursor:pointer;font-weight:600">Написать</button>' +
          '</div>';
        }).join('');
      } else {
        var r = await fetch(API + '/channels?search=' + encodeURIComponent(q), { headers: { 'Authorization': 'Bearer ' + jwtToken } });
        var chs = await r.json();
        if (!chs.length) { res.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)">Каналов не найдено</div>'; return; }
        res.innerHTML = chs.map(function(c) {
          return '<div class="ci" onclick="joinChannel(\'' + c.id + '\',\'' + escSearch(c.name) + '\',\'' + escSearch(c.slug||'') + '\')">' +
            defaultAvSq(c.name) +
            '<div class="ci-info"><div class="ci-name">' + escHtml(c.name) + '</div><div class="ci-prev">' + (c.members||0) + ' участников</div></div>' +
            '<button onclick="event.stopPropagation();joinChannel(\'' + c.id + '\',\'' + escSearch(c.name) + '\',\'' + escSearch(c.slug||'') + '\')" style="background:var(--accent);border:none;border-radius:20px;color:#fff;font-size:12px;padding:5px 14px;cursor:pointer;font-weight:600">Подписаться</button>' +
          '</div>';
        }).join('');
      }
    } catch(e) { res.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)">Ошибка поиска</div>'; }
  }, 300);
}

// ── Referral ────────────────────────────────────────────────────────────────
async function showReferral() {
  try {
    var r = await fetch(API + '/me/referral', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var d = await r.json();
    var link = 'https://c4v2jht698-ux.github.io/kosmos-frontend/?ref=' + d.code;
    var msg = 'Твоя реферальная ссылка:\n\n' + link + '\n\nПриглашено друзей: ' + (d.invited || 0);
    if (navigator.share) {
      navigator.share({ title: 'Космос', text: 'Присоединяйся к Космосу!', url: link }).catch(function(){});
    } else {
      navigator.clipboard.writeText(link).then(function() { alert(msg + '\n\nСсылка скопирована!'); }).catch(function() { prompt('Скопируйте ссылку:', link); });
    }
  } catch(e) { alert('Ошибка'); }
}

async function toggleSub(channelId, btn) {
  var r = await fetch(API+'/channels/'+channelId+'/subscribe',{method:'POST',headers:{'Authorization':'Bearer '+jwtToken}});
  var d = await r.json();
  if (d.subscribed) { btn.textContent='Отписаться'; btn.style.background='none'; btn.style.border='1px solid var(--sep)'; btn.style.color='var(--text3)'; }
  else { btn.textContent='Подписаться'; btn.style.background='var(--accent)'; btn.style.border='none'; btn.style.color='#fff'; }
  loadMyChats();
}

function openCreatePost() {
  var main = document.getElementById('feedArea') || document.getElementById('mainArea');
  main.innerHTML =
    '<div style="padding:16px;max-width:500px;margin:0 auto">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
        '<button onclick="openPinned(\'video\')" style="background:none;border:none;color:var(--text3);font-size:15px;cursor:pointer">Отмена</button>' +
        '<button onclick="submitFeedPost()" style="background:var(--accent);border:none;border-radius:20px;padding:8px 20px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;color:#fff">Опубликовать</button>' +
      '</div>' +
      '<div style="display:flex;gap:12px">' +
        defaultAv(currentUser ? currentUser.username : '?') +
        '<textarea id="postText" maxlength="280" oninput="var c=this.value.length;document.getElementById(\'cc\').textContent=c+\'/280\';document.getElementById(\'cc\').style.color=c>250?\'#FF3B30\':\'var(--text3)\'" style="flex:1;min-height:120px;background:transparent;border:none;padding:8px 0;font-family:inherit;font-size:18px;resize:none;outline:none;color:var(--text);line-height:1.4" placeholder="Что происходит?"></textarea>' +
      '</div>' +
      '<div style="border-top:0.5px solid var(--sep);padding-top:8px;display:flex;justify-content:space-between;align-items:center">' +
        '<div style="color:var(--text3);font-size:13px">От вашего имени</div>' +
        '<div id="cc" style="font-size:13px;color:var(--text3)">0/280</div>' +
      '</div>' +
    '</div>';
}

async function submitFeedPost() {
  var text = document.getElementById('postText').value.trim();
  if (!text) return;
  await fetch(API+'/feed/post',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwtToken},body:JSON.stringify({channelId:myFeedChannel||null,text:text})});
  openPinned('video');
}

// ── Dating / Встречи ────────────────────────────────────────────────────────
var datingCards = [];
var datingIdx = 0;
var myInterests = [];

async function loadDatingCards() {
  var area = document.getElementById('datingArea');
  if (!area) return;
  // Load my interests
  try {
    var me = await (await fetch(API + '/me', { headers: { 'Authorization': 'Bearer ' + jwtToken } })).json();
    myInterests = me.interests || [];
  } catch(e) { myInterests = []; }
  try {
    var res = await fetch(API + '/dating/profiles', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    if (!res.ok) { area.innerHTML = '<div style="color:var(--text3)">Не удалось загрузить</div>'; return; }
    datingCards = await res.json();
    datingIdx = 0;
    if (!datingCards.length) {
      area.innerHTML = '<div class="empty-card" style="text-align:center"><div style="font-size:48px;margin-bottom:12px">\uD83D\uDC9C</div><h2>Свайпай больше!</h2><p>Новые люди появляются каждый день.<br>Заполните профиль (\u2699) чтобы вас находили</p></div>';
      return;
    }
    showDatingCard();
  } catch(e) {
    area.innerHTML = '<div style="color:var(--text3)">Ошибка загрузки</div>';
  }
}

function showDatingCard() {
  var area = document.getElementById('datingArea');
  if (!area || datingIdx >= datingCards.length) {
    if (area) area.innerHTML = '<div class="empty-card" style="text-align:center"><div style="font-size:48px;margin-bottom:12px">\u2728</div><h2>Анкеты закончились</h2><p>Загляните позже</p></div>';
    return;
  }
  var u = datingCards[datingIdx];
  var theirInterests = u.interests || [];
  var common = myInterests.filter(function(i) { return theirInterests.indexOf(i) !== -1; });
  var interestTags = theirInterests.map(function(i) {
    var found = INTERESTS.find(function(x){return x.id === i});
    var isCommon = common.indexOf(i) !== -1;
    return '<span class="interest-tag" style="' + (isCommon ? 'background:rgba(124,58,237,0.25);border-color:var(--accent)' : '') + '">' +
      (found ? found.emoji + ' ' : '') + i + '</span>';
  }).join('');

  area.innerHTML =
    '<div class="dating-card" id="datingCardEl">' +
      '<div class="dating-card-inner">' +
        '<div class="dating-photo ' + GS[(u.username || '?').charCodeAt(0) % GS.length] + '">' +
          (u.photo ? '<img src="' + escHtml(u.photo) + '">' : '<span style="font-size:80px">\uD83D\uDC36</span>') +
        '</div>' +
        '<div class="dating-info">' +
          '<div class="dating-name">' + escHtml(u.username) + (u.age ? ', ' + u.age : '') + '</div>' +
          (u.handle ? '<div class="dating-handle">@' + escHtml(u.handle) + '</div>' : '') +
          (u.city ? '<div class="dating-city">\uD83D\uDCCD ' + escHtml(u.city) + '</div>' : '') +
          (u.bio ? '<div class="dating-bio">' + escHtml(u.bio) + '</div>' : '') +
          (interestTags ? '<div class="dating-interests">' + interestTags + '</div>' : '') +
          (common.length ? '<div class="dating-common">\u2728 Общих интересов: ' + common.length + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="dating-actions">' +
        '<button class="dating-btn dating-skip" onclick="datingAction(\'' + u.id + '\',\'skip\')">&#10005;</button>' +
        '<button class="dating-btn dating-like" onclick="datingAction(\'' + u.id + '\',\'like\')">\u2764\uFE0F</button>' +
      '</div>' +
    '</div>';
}

async function datingAction(targetId, action) {
  // Animate swipe
  var card = document.getElementById('datingCardEl');
  if (card) card.classList.add(action === 'like' ? 'swipe-right' : 'swipe-left');

  try {
    var res = await fetch(API + '/dating/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ targetId: targetId, action: action }),
    });
    var data = await res.json();

    setTimeout(function() {
      if (data.match) {
        var area = document.getElementById('datingArea');
        if (area) {
          area.innerHTML =
            '<div class="match-screen">' +
              '<div style="font-size:72px;margin-bottom:16px">\uD83C\uDF89</div>' +
              '<div style="font-size:26px;font-weight:700;color:var(--text);margin-bottom:8px">Это мэтч!</div>' +
              '<div style="font-size:14px;color:var(--text3);margin-bottom:24px">Вы понравились друг другу</div>' +
              '<button onclick="openMatchChat(\'' + targetId + '\')" style="background:var(--accent);border:none;border-radius:14px;color:#fff;padding:14px 32px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(124,58,237,0.3)">Написать \u2192</button>' +
              '<br><button onclick="datingIdx++;showDatingCard()" style="background:none;border:none;color:var(--text3);margin-top:12px;cursor:pointer;font-size:13px">Продолжить просмотр</button>' +
            '</div>';
        }
      } else {
        datingIdx++;
        showDatingCard();
      }
    }, 350);
  } catch(e) {
    setTimeout(function() { datingIdx++; showDatingCard(); }, 350);
  }
}

function openMatchChat(targetId) {
  var ids = [currentUser.id, targetId].sort();
  var chatId = 'dm-' + ids.join('-');
  goBack();
  loadMyChats().then(function() { openChat(chatId); });
}

function openDatingProfile() {
  var main = document.getElementById('datingArea') || document.getElementById('mainArea');
  fetch(API + '/dating/profile', { headers: { 'Authorization': 'Bearer ' + jwtToken } })
    .then(function(r) { return r.json(); })
    .then(function(p) {
      main.innerHTML =
        '<div style="padding:24px;max-width:400px;margin:0 auto">' +
          '<div style="font-size:20px;font-weight:600;margin-bottom:16px;color:var(--text)">Мой профиль</div>' +
          '<div class="auth-label">Возраст</div>' +
          '<input class="minp" id="dpAge" type="number" placeholder="25" value="' + (p.age || '') + '">' +
          '<div class="auth-label">Город</div>' +
          '<input class="minp" id="dpCity" placeholder="Москва" value="' + escHtml(p.city || '') + '">' +
          '<div class="auth-label">Фото (URL)</div>' +
          '<input class="minp" id="dpPhoto" placeholder="https://..." value="' + escHtml(p.photo || '') + '">' +
          '<div class="auth-label">О себе</div>' +
          '<textarea class="minp" id="dpBio" rows="3" placeholder="Расскажи о себе...">' + escHtml(p.bio || '') + '</textarea>' +
          '<div style="display:flex;gap:10px;margin-top:8px">' +
            '<button class="bcnl" style="flex:1" onclick="openPinned(\'social\')">Назад</button>' +
            '<button class="bcrte" style="flex:1" onclick="saveDatingProfile()">Сохранить</button>' +
          '</div>' +
        '</div>';
    });
}

async function saveDatingProfile() {
  await fetch(API + '/dating/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
    body: JSON.stringify({
      age: parseInt(document.getElementById('dpAge').value) || null,
      city: document.getElementById('dpCity').value.trim() || null,
      photo: document.getElementById('dpPhoto').value.trim() || null,
      bio: document.getElementById('dpBio').value.trim() || null,
    }),
  });
  openPinned('social');
}

// ── Channel Creation ────────────────────────────────────────────────────────
function openCreateChannel() {
  var main = document.getElementById('mainArea');
  main.innerHTML =
    '<div class="chat-hdr"><button class="back-btn" onclick="goBack()">\u2039</button><div class="hinfo"><div class="hname">Создать канал</div></div></div>' +
    '<div style="padding:20px;max-width:400px;margin:0 auto">' +
      '<div class="auth-label">Название</div>' +
      '<input class="minp" id="chName" placeholder="Мой канал">' +
      '<div class="auth-label">@username (латиница, цифры, _)</div>' +
      '<div style="position:relative"><input class="minp" id="chSlug" placeholder="my_channel" oninput="checkSlug(this.value)" autocapitalize="none"><span id="slugStatus" style="position:absolute;right:12px;top:12px;font-size:14px"></span></div>' +
      '<div class="auth-label">Описание</div>' +
      '<textarea class="minp" id="chDesc" rows="2" placeholder="О чём этот канал" style="resize:none"></textarea>' +
      '<button onclick="submitChannel()" style="width:100%;background:var(--accent);border:none;border-radius:12px;color:#fff;padding:14px;font-family:inherit;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px">Создать</button>' +
    '</div>';
  showChatView();
}

var slugTimer = null;
function checkSlug(val) {
  clearTimeout(slugTimer);
  var st = document.getElementById('slugStatus');
  val = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
  document.getElementById('chSlug').value = val;
  if (val.length < 3) { st.textContent = ''; return; }
  slugTimer = setTimeout(async function() {
    var r = await fetch(API + '/channels/check-slug/' + val, { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var d = await r.json();
    st.textContent = d.available ? '\u2713' : '\u2717';
    st.style.color = d.available ? '#34C759' : '#FF3B30';
  }, 400);
}

async function submitChannel() {
  var name = document.getElementById('chName').value.trim();
  var slug = document.getElementById('chSlug').value.trim();
  var desc = document.getElementById('chDesc').value.trim();
  if (!name || !slug) return;
  var r = await fetch(API + '/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
    body: JSON.stringify({ name: name, description: desc, slug: slug })
  });
  if (r.ok) { goBack(); loadMyChats(); }
  else { var d = await r.json(); alert(d.error || 'Ошибка'); }
}

// ── Utilities ───────────────────────────────────────────────────────────────
function insE(e) { var i = document.getElementById('mi'); if (i) { i.value += e; i.focus(); } var ep = document.getElementById('ep'); if (ep) ep.classList.remove('open'); }
function scrollBot() { var a = document.getElementById('msgArea'); if (a) a.scrollTop = a.scrollHeight; }
function showChatView() { document.body.classList.add('chat-open'); history.pushState({ chat: true }, ''); }
function goBack() { document.body.classList.remove('chat-open'); cur = null; render(); }

// ── Context Menu (long press on message) ────────────────────────────────────
var _longPressTimer = null;
document.addEventListener('touchstart', function(e) {
  var bbl = e.target.closest('.bbl');
  if (!bbl) return;
  _longPressTimer = setTimeout(function() {
    _longPressTimer = null;
    showContextMenu(bbl, e.touches[0].clientX, e.touches[0].clientY);
  }, 500);
}, { passive: true });
document.addEventListener('touchend', function() { if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; } });
document.addEventListener('touchmove', function() { if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; } });
document.addEventListener('click', function() { var m = document.querySelector('.ctx-menu'); if (m) m.remove(); });

function showContextMenu(bbl, x, y) {
  var old = document.querySelector('.ctx-menu');
  if (old) old.remove();
  var text = bbl.textContent || '';
  // Strip time from text
  var timeEl = bbl.querySelector('.mt');
  if (timeEl) text = text.replace(timeEl.textContent, '').trim();
  var checkEl = bbl.querySelector('.ms');
  if (checkEl) text = text.replace(checkEl.textContent, '').trim();

  var menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 120) + 'px';
  menu.innerHTML =
    '<div class="ctx-item" onclick="setReply(this)">\u21A9 Ответить</div>' +
    '<div class="ctx-item" onclick="copyMsgText(this)">\uD83D\uDCCB Копировать</div>' +
    '<div class="ctx-item danger" onclick="this.parentElement.remove()">\u2716 Закрыть</div>';
  menu.dataset.text = text;
  document.body.appendChild(menu);
  // Prevent it going off screen
  var rect = menu.getBoundingClientRect();
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
}

function copyMsgText(el) {
  var menu = el.closest('.ctx-menu');
  var text = menu ? menu.dataset.text : '';
  navigator.clipboard.writeText(text).then(function() {
    showToast('', 'Скопировано');
  }).catch(function() {});
  if (menu) menu.remove();
}

// ── Reply to Message ────────────────────────────────────────────────────────
var _replyTo = null;
function setReply(el) {
  var menu = el.closest('.ctx-menu');
  var text = menu ? menu.dataset.text : '';
  if (menu) menu.remove();
  _replyTo = { text: text.substring(0, 80) };
  // Show reply quote above input
  var zone = document.querySelector('.inp-zone');
  if (!zone) return;
  var existing = zone.querySelector('.reply-quote');
  if (existing) existing.remove();
  var q = document.createElement('div');
  q.className = 'reply-quote';
  q.innerHTML = '<span>\u21A9 ' + escHtml(_replyTo.text) + '</span><button class="reply-quote-close" onclick="cancelReply()">\u2716</button>';
  zone.insertBefore(q, zone.firstChild);
  var inp = document.getElementById('mi');
  if (inp) inp.focus();
}

function cancelReply() {
  _replyTo = null;
  var q = document.querySelector('.reply-quote');
  if (q) q.remove();
}

function send() {
  var inp = document.getElementById('mi');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = 'auto';
  if (socket && socket.connected && cur) {
    socket.emit('chat_msg', { chatId: cur, text: text, replyTo: _replyTo ? _replyTo.text : undefined });
  }
  cancelReply();
  // Update char counter
  var cc = document.getElementById('charCount');
  if (cc) { cc.textContent = ''; cc.className = 'char-counter'; }
};

// ── Stories ──────────────────────────────────────────────────────────────────
var STORY_GRADIENTS = ['#7C3AED','#F43F5E','#3B82F6','#10B981','#F59E0B','#EC4899'];

async function loadStories(container) {
  try {
    var r = await fetch(API + '/stories', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var groups = await r.json();
    var html = '';
    groups.forEach(function(g) {
      html += '<div class="story-item" onclick="viewStory(\'' + g.user_id + '\')">' +
        '<div class="story-ring"><div class="story-ring-inner ' + GS[(g.username||'?').charCodeAt(0)%GS.length] + '">\uD83D\uDC36</div></div>' +
        '<div class="story-name">' + escHtml(g.username || '') + '</div></div>';
    });
    if (container) container.innerHTML = html;
  } catch(e) {}
}

function createStory() {
  showChatView();
  var main = document.getElementById('mainArea');
  main.innerHTML =
    '<div class="chat-hdr"><button class="back-btn" onclick="goBack()">\u2039</button><div class="hinfo"><div class="hname">Новая история</div></div></div>' +
    '<div style="flex:1;display:flex;flex-direction:column;padding:20px;gap:12px">' +
      '<textarea class="minp" id="storyText" maxlength="200" rows="4" placeholder="Что у тебя нового?" style="font-size:18px;resize:none"></textarea>' +
      '<div class="auth-label">Цвет фона</div>' +
      '<div style="display:flex;gap:8px" id="storyColors">' +
        STORY_GRADIENTS.map(function(c) {
          return '<div onclick="pickStoryColor(this,\'' + c + '\')" style="width:40px;height:40px;border-radius:12px;background:' + c + ';cursor:pointer;border:2px solid transparent"></div>';
        }).join('') +
      '</div>' +
      '<button class="bcrte" style="margin-top:auto" onclick="submitStory()">Опубликовать</button>' +
    '</div>';
}

var _storyColor = '#7C3AED';
function pickStoryColor(el, color) {
  _storyColor = color;
  document.querySelectorAll('#storyColors div').forEach(function(d) { d.style.borderColor = 'transparent'; });
  el.style.borderColor = '#fff';
}

async function submitStory() {
  var text = document.getElementById('storyText').value.trim();
  if (!text) return;
  await fetch(API + '/stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
    body: JSON.stringify({ content: text, bgColor: _storyColor })
  });
  goBack(); openPinned('video');
}

async function viewStory(userId) {
  try {
    var r = await fetch(API + '/stories', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var groups = await r.json();
    var group = groups.find(function(g) { return g.user_id === userId; });
    if (!group || !group.stories.length) return;
    var s = group.stories[0];
    // Mark as viewed
    fetch(API + '/stories/' + s.id + '/view', { method: 'POST', headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var viewer = document.createElement('div');
    viewer.className = 'story-viewer';
    viewer.onclick = function(e) { if (e.target === viewer) viewer.remove(); };
    viewer.innerHTML =
      '<div class="story-content" style="background:' + (s.bg_color || '#7C3AED') + '">' +
        '<div class="story-progress"><div class="story-progress-fill"></div></div>' +
        '<div class="story-meta"><span style="color:#fff;font-size:14px;font-weight:600">' + escHtml(group.username) + '</span></div>' +
        '<button class="story-close" onclick="this.closest(\'.story-viewer\').remove()">\u2716</button>' +
        '<div class="story-text">' + escHtml(s.content) + '</div>' +
        '<div style="position:absolute;bottom:16px;color:rgba(255,255,255,0.5);font-size:12px">' + (s.views || 0) + ' просмотров</div>' +
      '</div>';
    document.body.appendChild(viewer);
    setTimeout(function() { viewer.remove(); }, 5000);
  } catch(e) {}
}

// ── Badges ──────────────────────────────────────────────────────────────────
async function loadBadges() {
  try {
    var r = await fetch(API + '/me/badges', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    var d = await r.json();
    var earned = new Set((d.badges || []).map(function(b) { return b.badge_id; }));
    // Show confetti for new badges
    if (d.newBadges && d.newBadges.length) {
      d.newBadges.forEach(function(id) {
        var badge = (d.all || []).find(function(b) { return b.id === id; });
        if (badge) showBadgeNotification(badge);
      });
    }
    return { earned: earned, all: d.all || [] };
  } catch(e) { return { earned: new Set(), all: [] }; }
}

function showBadgeNotification(badge) {
  showConfetti();
  showToast(badge.emoji + ' ' + badge.name, badge.desc);
}

function showConfetti() {
  var overlay = document.createElement('div');
  overlay.className = 'confetti-overlay';
  var colors = ['#7C3AED','#F43F5E','#3B82F6','#10B981','#F59E0B','#EC4899'];
  for (var i = 0; i < 30; i++) {
    var p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = (1.5 + Math.random()) + 's';
    overlay.appendChild(p);
  }
  document.body.appendChild(overlay);
  setTimeout(function() { overlay.remove(); }, 2500);
}

function renderBadgeGrid(earned, all) {
  return '<div class="badge-grid">' + all.map(function(b) {
    var has = earned.has(b.id);
    return '<div class="badge-item' + (has ? ' earned' : '') + '">' +
      '<div class="badge-emoji" style="' + (has ? '' : 'opacity:0.3') + '">' + b.emoji + '</div>' +
      '<div class="badge-label">' + b.name + '</div></div>';
  }).join('') + '</div>';
}

// ── Status Editor ───────────────────────────────────────────────────────────
var STATUS_PRESETS = [
  '\uD83D\uDE80 Исследую Космос','\uD83D\uDCAD Думаю о важном','\uD83C\uDFB5 Слушаю музыку',
  '\uD83D\uDE34 Не беспокоить','\uD83D\uDD25 В работе','\uD83C\uDFAE Играю'
];
var MOOD_EMOJIS = ['\uD83D\uDE0A','\uD83D\uDE0E','\uD83E\uDD14','\uD83D\uDE34','\uD83D\uDD25','\uD83D\uDC9C'];

function openStatusEditor() {
  showChatView();
  var main = document.getElementById('mainArea');
  main.innerHTML =
    '<div class="chat-hdr"><button class="back-btn" onclick="openProfileScreen()">\u2039</button><div class="hinfo"><div class="hname">Статус</div></div></div>' +
    '<div style="padding:20px;max-width:400px;margin:0 auto">' +
      '<div class="auth-label">Настроение</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px">' +
        MOOD_EMOJIS.map(function(e) {
          return '<button onclick="pickMood(this,\'' + e + '\')" class="mood-btn" style="font-size:28px;background:none;border:2px solid var(--sep);border-radius:12px;padding:8px;cursor:pointer;transition:all .15s">' + e + '</button>';
        }).join('') +
      '</div>' +
      '<div class="auth-label">Статус</div>' +
      '<input class="minp" id="statusInput" maxlength="60" placeholder="Что делаешь?" value="' + escHtml((currentUser && currentUser.status) || '') + '">' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">' +
        STATUS_PRESETS.map(function(s) {
          return '<button onclick="document.getElementById(\'statusInput\').value=\'' + s + '\'" style="padding:6px 12px;border-radius:20px;border:1px solid var(--sep);background:none;color:var(--text2);font-size:12px;cursor:pointer">' + s + '</button>';
        }).join('') +
      '</div>' +
      '<button class="bcrte" style="width:100%" onclick="saveStatus()">Сохранить</button>' +
    '</div>';
}

var _selectedMood = '';
function pickMood(btn, emoji) {
  _selectedMood = emoji;
  document.querySelectorAll('.mood-btn').forEach(function(b) { b.style.borderColor = 'var(--sep)'; });
  btn.style.borderColor = 'var(--accent)';
}

async function saveStatus() {
  var status = document.getElementById('statusInput').value.trim();
  await fetch(API + '/me/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
    body: JSON.stringify({ status: status, mood: _selectedMood })
  });
  if (currentUser) { currentUser.status = status; currentUser.mood = _selectedMood; }
  openProfileScreen();
}

// ── Daily Challenge ─────────────────────────────────────────────────────────
async function loadDailyChallenge() {
  try {
    var r = await fetch(API + '/daily-challenge', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    return await r.json();
  } catch(e) { return null; }
}

function challengeCardHtml(ch) {
  if (!ch) return '';
  var pct = Math.min(100, Math.round((ch.progress / ch.target) * 100));
  return '<div class="challenge-card">' +
    '<div class="challenge-title">\uD83C\uDFAF Ежедневный челлендж</div>' +
    '<div class="challenge-desc">' + escHtml(ch.description || '') + '</div>' +
    '<div class="challenge-bar"><div class="challenge-bar-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="challenge-status">' + (ch.completed ? '\u2705 Выполнено!' : ch.progress + '/' + ch.target) + '</div>' +
  '</div>';
}

// ── Expanded Emoji Grid ─────────────────────────────────────────────────────
var EMOJI_FULL = ['\uD83D\uDE00','\uD83D\uDE02','\uD83D\uDE0D','\uD83E\uDD70','\uD83D\uDE0E','\uD83E\uDD29','\uD83D\uDE09','\uD83D\uDE0A',
  '\uD83D\uDE22','\uD83D\uDE2D','\uD83D\uDE31','\uD83D\uDE33','\uD83E\uDD14','\uD83D\uDE34','\uD83D\uDE44','\uD83D\uDE21',
  '\uD83D\uDC4D','\uD83D\uDC4E','\uD83D\uDC4F','\uD83D\uDE4F','\u2764\uFE0F','\uD83D\uDD25','\u2B50','\uD83C\uDF89',
  '\uD83D\uDE80','\uD83C\uDF1F','\uD83C\uDF08','\uD83D\uDCAF','\uD83D\uDC36','\uD83C\uDF55','\u2615','\uD83C\uDFB5',
  '\uD83D\uDCAA','\uD83C\uDFC6','\uD83C\uDFAE','\uD83D\uDCF7','\uD83D\uDE4C','\uD83E\uDD1D','\uD83D\uDC99','\uD83D\uDC9C'];

// Override togE to show full grid
togE = function() {
  var ep = document.getElementById('ep');
  if (!ep) return;
  if (ep.classList.contains('open')) { ep.classList.remove('open'); return; }
  ep.innerHTML = '<div class="emoji-grid">' + EMOJI_FULL.map(function(e) {
    return '<span onclick="insE(\'' + e + '\')">' + e + '</span>';
  }).join('') + '</div>';
  ep.classList.add('open');
};

// ── Onboarding Tour ─────────────────────────────────────────────────────────
var TOUR_STEPS = [
  {emoji:'\uD83D\uDCF0',text:'Это твоя лента — посты по интересам от AI-ботов и друзей'},
  {emoji:'\uD83D\uDCE2',text:'Здесь каналы — подпишись на любимые темы'},
  {emoji:'\u2764\uFE0F',text:'Встречи — знакомься со свайпом, находи друзей'},
  {emoji:'\uD83D\uDC64',text:'Твой профиль — настрой аватар, статус и интересы'},
];
var _tourStep = 0;

function startTour() {
  if (localStorage.getItem('kosmos_tour_done')) return;
  _tourStep = 0;
  showTourStep();
}

function showTourStep() {
  if (_tourStep >= TOUR_STEPS.length) {
    localStorage.setItem('kosmos_tour_done', '1');
    var overlay = document.querySelector('.tour-overlay');
    if (overlay) overlay.remove();
    return;
  }
  var s = TOUR_STEPS[_tourStep];
  var existing = document.querySelector('.tour-overlay');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.innerHTML =
    '<div class="tour-card">' +
      '<div class="tour-step">Шаг ' + (_tourStep + 1) + ' из ' + TOUR_STEPS.length + '</div>' +
      '<div style="font-size:48px;margin-bottom:12px">' + s.emoji + '</div>' +
      '<div class="tour-text">' + s.text + '</div>' +
      '<div class="tour-btns">' +
        '<button class="tour-skip" onclick="endTour()">Пропустить</button>' +
        '<button class="tour-next" onclick="nextTourStep()">' + (_tourStep === TOUR_STEPS.length - 1 ? 'Готово!' : 'Далее') + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
}

function nextTourStep() { _tourStep++; showTourStep(); }
function endTour() { localStorage.setItem('kosmos_tour_done', '1'); var o = document.querySelector('.tour-overlay'); if (o) o.remove(); }
