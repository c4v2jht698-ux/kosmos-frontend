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
  if (chList) chList.innerHTML = all.map(function(c){return itm(c)}).join('');

  var dmSec = document.getElementById('dmSection');
  if (dmSec) dmSec.style.display = 'none';

  var chSec = document.getElementById('chSection');
  if (chSec) {
    chSec.style.display = all.length ? '' : 'none';
    var lbl = chSec.querySelector('.sec-label');
    if (lbl) lbl.textContent = 'Чаты';
  }
  setTimeout(initSwipeToLeave, 50);
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
    var ci = wrap.querySelector('.ci');
    var mc = new Hammer(ci);
    mc.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });
    mc.on('swipeleft', function() {
      document.querySelectorAll('.ci-wrap.swiped').forEach(function(el) { if (el !== wrap) el.classList.remove('swiped'); });
      wrap.classList.add('swiped');
    });
    mc.on('swiperight', function() { wrap.classList.remove('swiped'); });
  });
  document.querySelectorAll('.ci-leave-bg').forEach(function(btn) {
    btn.onclick = function(e) {
      e.stopPropagation();
      var wrap = btn.closest('.ci-wrap');
      var id = wrap.dataset.id;
      if (!confirm('Покинуть канал?')) { wrap.classList.remove('swiped'); return; }
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
  return '<div class="inp-zone">' +
    '<div class="epanel" id="ep">' + EMOJIS.map(function(e){return '<span class="ep" onclick="insE(\'' + e + '\')">' + e + '</span>'}).join('') + '</div>' +
    '<div class="inp-box">' +
      '<textarea class="minput" id="mi" placeholder="Написать сообщение..." rows="1" onkeydown="hKey(event)" oninput="onInput(this)"></textarea>' +
      '<button class="ib" onclick="togE()">\uD83D\uDE0A</button>' +
    '</div>' +
    '<button class="sbtn" onclick="send()">\u27A4</button>' +
  '</div>';
}

function hKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
function aRes(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 130) + 'px'; }
function onInput(el) {
  aRes(el);
  if (socket && socket.connected && cur) socket.emit('typing', { chatId: cur });
}

function send() {
  var inp = document.getElementById('mi');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = 'auto';
  if (socket && socket.connected && cur) socket.emit('chat_msg', { chatId: cur, text: text });
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

  if (tab === 'chats') {
    if (document.body.classList.contains('chat-open')) goBack();
    document.getElementById('sidebar').style.display = '';
  } else if (tab === 'feed') {
    openPinned('video');
  } else if (tab === 'dating') {
    openPinned('social');
  } else if (tab === 'profile') {
    openProfileScreen();
  }
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
        '<div class="profile-section">' +
          '<div class="profile-section-title">Настройки</div>' +
          '<div class="profile-row" onclick="openEditProfile()"><div class="profile-row-label">Редактировать профиль</div><div class="profile-row-val">\u203A</div></div>' +
          '<div class="profile-row" onclick="showOnboarding()"><div class="profile-row-label">Изменить интересы</div><div class="profile-row-val">' + interests.length + ' выбрано \u203A</div></div>' +
          '<div class="profile-row" onclick="toggleTheme()"><div class="profile-row-label">Тема оформления</div><div class="profile-row-val">' + (document.documentElement.getAttribute('data-theme')==='light'?'Светлая':'Тёмная') + ' \u203A</div></div>' +
        '</div>' +
        '<div class="profile-section">' +
          '<div class="profile-row" onclick="logout()" style="justify-content:center"><div class="profile-row-label" style="color:#FF3B30">Выйти</div></div>' +
        '</div>' +
      '</div>';
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
    feedOffset = 0; feedLoading = false; myFeedChannel = null;
    main.innerHTML =
      '<div class="chat-hdr" style="justify-content:space-between">' +
        '<button class="back-btn" onclick="goBack()">\u2039</button>' +
        '<div style="font-weight:700;font-size:18px;color:var(--text)">Стена</div>' +
        '<div style="width:36px"></div>' +
      '</div>' +
      '<div id="feedArea" style="flex:1;overflow-y:auto;padding:0">' +
        '<div id="feedList">' + skeletonCards(3) + '</div>' +
        '<div id="feedLoader" style="text-align:center;padding:16px;color:var(--text3)"></div>' +
      '</div>' +
      '<div style="position:absolute;bottom:80px;right:20px;z-index:10">' +
        '<button onclick="openCreatePost()" style="width:56px;height:56px;border-radius:50%;background:var(--accent);border:none;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(124,58,237,0.4);display:flex;align-items:center;justify-content:center">\u270F\uFE0F</button>' +
      '</div>';
    showChatView();
    loadFeed();
    document.getElementById('feedArea').addEventListener('scroll', function() {
      if (this.scrollTop + this.clientHeight >= this.scrollHeight - 200 && !feedLoading) loadFeed();
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
  } else if (type === 'social') {
    main.innerHTML =
      '<div class="chat-hdr">' +
        '<button class="back-btn" onclick="goBack()">\u2039</button>' +
        '<div class="av g5 sq" style="width:36px;height:36px;font-size:16px"><span style="color:#fff">\u2665</span></div>' +
        '<div class="hinfo"><div class="hname">Встречи</div><div class="hsub">Знакомства</div></div>' +
        '<div class="hacts"><button class="hb" onclick="openDatingProfile()">\u2699</button></div>' +
      '</div>' +
      '<div id="datingArea" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden">' +
        '<div style="color:var(--text3)">Загрузка...</div>' +
      '</div>';
    showChatView();
    loadDatingCards();
  }
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
    var res = await fetch(API + '/feed?offset=' + feedOffset, {
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

function postCard(p) {
  var name = p.channel_name || '?';
  var slug = p.channel_slug || '';
  var time = relTime(p.created_at);
  var views = Math.floor(Math.random()*500 + (parseInt(p.likes)||0)*12 + 10);
  var subBtn = p.channel_id && !p.subscribed
    ? '<button onclick="toggleSub(\'' + p.channel_id + '\',this);event.stopPropagation()" style="background:var(--accent);border:none;border-radius:20px;color:#fff;font-size:12px;font-weight:600;padding:4px 14px;cursor:pointer;margin-left:auto">Подписаться</button>'
    : '';

  return '<div data-pid="' + p.id + '" style="display:flex;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--sep);background:var(--card)">' +
    defaultAvSq(name, 44) +
    '<div style="flex:1;min-width:0">' +
      '<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">' +
        '<span style="font-weight:700;font-size:15px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(name) + '</span>' +
        (slug ? '<span style="color:var(--text3);font-size:13px">@' + escHtml(slug) + '</span>' : '') +
        '<span style="color:var(--text3);font-size:13px">\u00B7 ' + time + '</span>' +
        subBtn +
      '</div>' +
      '<div style="font-size:15px;line-height:1.45;color:var(--text);white-space:pre-wrap;margin-bottom:10px">' + escHtml(p.text) + '</div>' +
      '<div style="display:flex;justify-content:space-between;max-width:360px">' +
        '<button onclick="feedLike(this,\'' + p.id + '\')" style="background:none;border:none;cursor:pointer;color:' + (p.liked?'#F43F5E':'var(--text3)') + ';font-size:13px;display:flex;align-items:center;gap:5px;padding:4px 0;transition:all .15s"><svg width="16" height="16" viewBox="0 0 24 24" fill="' + (p.liked?'#F43F5E':'none') + '" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span class="lc">' + (p.likes||'') + '</span></button>' +
        '<button onclick="feedShare(\'' + p.id + '\')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;display:flex;align-items:center;gap:5px;padding:4px 0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></button>' +
        '<span style="color:var(--text3);font-size:13px;display:flex;align-items:center;gap:4px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' + views + '</span>' +
      '</div>' +
    '</div></div>';
}

async function feedLike(btn, id) {
  var svg = btn.querySelector('svg');
  var lc = btn.querySelector('.lc');
  var cur = parseInt(lc.textContent) || 0;
  var isLiked = btn.style.color === 'rgb(244, 63, 94)';
  if (isLiked) {
    btn.style.color = 'var(--text3)'; if(svg) svg.setAttribute('fill','none'); lc.textContent = Math.max(0,cur-1) || '';
  } else {
    btn.style.color = '#F43F5E'; if(svg) svg.setAttribute('fill','#F43F5E'); lc.textContent = cur+1;
    btn.style.transform = 'scale(1.3)'; setTimeout(function(){btn.style.transform='';}, 200);
  }
  fetch(API+'/feed/'+id+'/like',{method:'POST',headers:{'Authorization':'Bearer '+jwtToken}});
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
      area.innerHTML = '<div class="empty-card" style="text-align:center"><div style="font-size:48px;margin-bottom:12px">\uD83D\uDD0D</div><h2>Пока нет анкет</h2><p>Заполните свой профиль (\u2699) и ждите новых пользователей</p></div>';
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
function togE() { var ep = document.getElementById('ep'); if (ep) ep.classList.toggle('open'); }
function insE(e) { var i = document.getElementById('mi'); if (i) { i.value += e; i.focus(); } var ep = document.getElementById('ep'); if (ep) ep.classList.remove('open'); }
function scrollBot() { var a = document.getElementById('msgArea'); if (a) a.scrollTop = a.scrollHeight; }
function showChatView() { document.body.classList.add('chat-open'); history.pushState({ chat: true }, ''); }
function goBack() { document.body.classList.remove('chat-open'); cur = null; render(); }
function openPostComments() {}
