// ── UI: Render, chat open, message HTML, input helpers ──────────────────────

function findItem(id) { return channels.find(x => x.id === id) || dms.find(x => x.id === id); }

function render() {
  // Объединяем каналы и DM в один список, сортируем по времени последнего сообщения
  const all = [...channels, ...dms].sort((a, b) => {
    if (!a._ts && !b._ts) return 0;
    if (!a._ts) return 1;
    if (!b._ts) return -1;
    return b._ts - a._ts;
  });

  const chList = document.getElementById('chList');
  if (chList) chList.innerHTML = all.map(c => itm(c)).join('');

  // Скрываем секцию DM — всё в одном списке
  const dmSec = document.getElementById('dmSection');
  if (dmSec) dmSec.style.display = 'none';

  const chSec = document.getElementById('chSection');
  if (chSec) {
    chSec.style.display = all.length ? '' : 'none';
    const lbl = chSec.querySelector('.sec-label');
    if (lbl) lbl.textContent = 'Чаты';
  }
}

function itm(c) {
  const isCh = c.type === 'channel';
  return `<div class="ci${cur === c.id ? ' active' : ''}" onclick="openChat('${c.id}')">
    <div class="av ${c.g}${isCh ? ' sq' : ''}" style="position:relative">
      <span style="color:#fff">${c.em}</span>
      ${!isCh && c.online ? '<div class="odot"></div>' : ''}
    </div>
    <div class="ci-info">
      <div class="ci-name">${c.name}</div>
      <div class="ci-prev">${c.prev || ''}</div>
    </div>
    <div class="ci-meta">
      <div class="ci-time">${c.time || ''}</div>
      ${c.unread ? `<div class="badge">${c.unread}</div>` : ''}
    </div>
  </div>`;
}

function openChat(id) {
  if (cur && socket) socket.emit('leave', cur);
  cur = id;
  if (socket) socket.emit('join', id);

  const item = findItem(id);
  if (!item) { console.warn('Chat not found:', id); return; }
  item.unread = 0;
  render();

  if (!item._loaded && jwtToken) {
    item._loaded = true;
    fetch(`${API}/messages/${encodeURIComponent(id)}`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(msgs => {
        const isCh2 = item.type === 'channel';
        item.msgs = msgs.map(m => {
          const ts = new Date(m.created_at * 1000);
          const time = ts.getHours().toString().padStart(2,'0') + ':' + ts.getMinutes().toString().padStart(2,'0');
          const from = currentUser && m.sender_id === currentUser.id ? 'me' : 'them';
          return { id: m.id, from, text: m.text, time, sender: m.sender_username };
        });
        if (cur === id) {
          const area = document.getElementById('msgArea');
          if (area) {
            area.innerHTML = '<div class="datediv"><span>Сегодня</span></div>' +
              item.msgs.map(m => mHTML(m, isCh2)).join('');
            scrollBot();
          }
        }
        if (item.msgs.length) {
          item.prev = item.msgs[item.msgs.length-1].text.substring(0, 36);
          render();
        }
      }).catch(() => {});
  }

  const isCh = item.type === 'channel';
  const sub = isCh
    ? `${item.slug ? '#'+item.slug+' · ' : ''}${item.members || 0} подписчиков`
    : (item.online ? '<span style="color:var(--online);font-weight:600">● в сети</span>' : 'был(а) недавно');

  document.getElementById('mainArea').innerHTML = `
    <div class="chat-hdr">
      <button class="back-btn" onclick="goBack()">‹</button>
      <div class="hav ${item.g}${isCh ? ' sq' : ''}"><span>${item.em}</span></div>
      <div class="hinfo"><div class="hname">${item.name}</div><div class="hsub">${sub}</div></div>
      <div class="hacts">
        <button class="hb">🔍</button>
        <button class="hb">📞</button>
        <button class="hb">···</button>
      </div>
    </div>
    <div class="msg-area" id="msgArea">
      <div class="datediv"><span>Сегодня</span></div>
      ${item.msgs.map(m => mHTML(m, isCh)).join('')}
    </div>
    ${inpHTML()}
  `;
  scrollBot();
  showChatView();
}

function mHTML(m, isCh) {
  if (isCh) {
    return `<div class="msg ch">
      <div class="bbl">${escHtml(m.text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
        <div class="bf"><span class="mt">${m.time}</span></div>
      </div>
    </div>`;
  }
  const me = m.from === 'me';
  return `<div class="msg ${me ? 'me' : 'them'}">
    ${!me && m.sender ? `<div class="sender-name">${escHtml(m.sender)}</div>` : ''}
    <div class="bbl">${escHtml(m.text)}
      <div class="bf">
        <span class="mt">${m.time}</span>
        ${me ? '<span class="ms">✓✓</span>' : ''}
      </div>
    </div>
  </div>`;
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function inpHTML() {
  return `<div class="inp-zone">
    <div class="epanel" id="ep">${EMOJIS.map(e => `<span class="ep" onclick="insE('${e}')">${e}</span>`).join('')}</div>
    <div class="inp-box">
      <button class="ib">📎</button>
      <textarea class="minput" id="mi" placeholder="Написать сообщение..." rows="1" onkeydown="hKey(event)" oninput="onInput(this)"></textarea>
      <button class="ib" onclick="togE()">😊</button>
    </div>
    <button class="sbtn" onclick="send()">➤</button>
  </div>`;
}

function hKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
function aRes(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 130) + 'px'; }
function onInput(el) {
  aRes(el);
  if (socket && socket.connected && cur) socket.emit('typing', { chatId: cur });
}

function send() {
  const inp = document.getElementById('mi');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = 'auto';

  if (socket && socket.connected && cur) {
    socket.emit('chat_msg', { chatId: cur, text });
  }
}

function appendMsg(msg, isCh) {
  const area = document.getElementById('msgArea');
  if (!area) return;
  const ty = area.querySelector('.typing');
  const d = document.createElement('div');
  d.innerHTML = mHTML(msg, isCh);
  if (ty) area.insertBefore(d.firstChild, ty);
  else area.appendChild(d.firstChild);
  scrollBot();
}

function showTypingIndicator() {
  const area = document.getElementById('msgArea');
  if (!area) return;
  let ty = area.querySelector('.typing');
  if (!ty) {
    ty = document.createElement('div');
    ty.className = 'typing';
    ty.innerHTML = '<div class="tdots"><span></span><span></span><span></span></div>';
    area.appendChild(ty);
    scrollBot();
  }
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => ty && ty.remove(), 3000);
}

// ── Pinned sections ──────────────────────────────────────────────────────────
function openPinned(type) {
  cur = null; render();
  const main = document.getElementById('mainArea');

  if (type === 'important') {
    const saved = JSON.parse(localStorage.getItem('kosmos_notes') || '[]');
    main.innerHTML = `
      <div class="chat-hdr">
        <button class="back-btn" onclick="goBack()">‹</button>
        <div class="hav g4 sq"><span>★</span></div>
        <div class="hinfo"><div class="hname">Важное</div><div class="hsub">Заметки для себя</div></div>
      </div>
      <div class="msg-area" id="msgArea">
        <div class="datediv"><span>Заметки</span></div>
        ${saved.map(n => `<div class="msg me"><div class="bbl">${escHtml(n.text)}<div class="bf"><span class="mt">${n.time}</span></div></div></div>`).join('')}
      </div>
      <div class="inp-zone">
        <div class="inp-box">
          <textarea class="minput" id="mi" placeholder="Записать заметку..." rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();saveNote()}"
            oninput="aRes(this)"></textarea>
        </div>
        <button class="sbtn" onclick="saveNote()">➤</button>
      </div>`;
    scrollBot(); showChatView();
  } else if (type === 'ai') {
    aiMessages = JSON.parse(localStorage.getItem('kosmos_ai_history') || '[]');
    main.innerHTML = `
      <div class="chat-hdr">
        <button class="back-btn" onclick="goBack()">‹</button>
        <div class="hav g1 sq"><span>🤖</span></div>
        <div class="hinfo"><div class="hname">ГигаЧАТ AI</div><div class="hsub">Llama 3.3 · Groq</div></div>
      </div>
      <div class="msg-area" id="msgArea">
        <div class="datediv"><span>AI Ассистент</span></div>
        ${aiMessages.length ? aiMessages.map(m => `<div class="msg ${m.role==='user'?'me':'them'}"><div class="bbl">${escHtml(m.content)}<div class="bf"><span class="mt">${m.time||''}</span></div></div></div>`).join('') : '<div class="msg them"><div class="bbl">Привет! Я AI-ассистент Космоса. Спрашивай что угодно 🚀<div class="bf"><span class="mt">—</span></div></div></div>'}
      </div>
      <div class="inp-zone">
        <div class="inp-box">
          <textarea class="minput" id="mi" placeholder="Спросить AI..." rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAI()}"
            oninput="aRes(this)"></textarea>
        </div>
        <button class="sbtn" onclick="sendAI()">➤</button>
      </div>`;
    scrollBot(); showChatView();
  } else if (type === 'video') {
    feedOffset = 0; feedLoading = false; myFeedChannel = null;
    main.innerHTML = `
      <div class="chat-hdr">
        <button class="back-btn" onclick="goBack()">‹</button>
        <div class="hav" style="background:#007AFF;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-size:16px">📰</span></div>
        <div class="hinfo"><div class="hname">Лента</div><div class="hsub">Алгоритмическая</div></div>
      </div>
      <div id="feedArea" style="flex:1;overflow-y:auto;padding:0">
        <div id="feedList"></div>
        <div id="feedLoader" style="text-align:center;padding:20px;color:#556677">Загрузка...</div>
      </div>
      <div id="feedFab" style="display:none;position:absolute;bottom:20px;right:20px;z-index:10">
        <button onclick="openCreatePost()" style="width:52px;height:52px;border-radius:50%;background:#007AFF;border:none;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 16px rgba(0,122,255,0.35)">+</button>
      </div>`;
    showChatView();
    loadFeed();
    document.getElementById('feedArea').addEventListener('scroll', function() {
      if (this.scrollTop + this.clientHeight >= this.scrollHeight - 200 && !feedLoading) loadFeed();
    });
  } else if (type === 'social') {
    main.innerHTML = `
      <div class="chat-hdr">
        <button class="back-btn" onclick="goBack()">‹</button>
        <div class="hav g5 sq"><span>♥</span></div>
        <div class="hinfo"><div class="hname">Общение</div><div class="hsub">Знакомства</div></div>
        <div class="hacts"><button class="hb" onclick="openDatingProfile()">⚙</button></div>
      </div>
      <div id="datingArea" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden">
        <div style="color:var(--muted)">Загрузка...</div>
      </div>`;
    showChatView();
    loadDatingCards();
  } else {
    main.innerHTML = `
      <div class="chat-hdr">
        <button class="back-btn" onclick="goBack()">‹</button>
        <div class="hav g1 sq"><span>?</span></div>
        <div class="hinfo"><div class="hname">Раздел</div><div class="hsub">в разработке</div></div>
      </div>
      <div class="msg-area"><div class="msg them"><div class="bbl">Скоро! 🚀</div></div></div>`;
    showChatView();
  }
}

function saveNote() {
  const inp = document.getElementById('mi');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = 'auto';
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const saved = JSON.parse(localStorage.getItem('kosmos_notes') || '[]');
  saved.push({ text, time });
  localStorage.setItem('kosmos_notes', JSON.stringify(saved));
  const area = document.getElementById('msgArea');
  const d = document.createElement('div');
  d.innerHTML = `<div class="msg me"><div class="bbl">${escHtml(text)}<div class="bf"><span class="mt">${time}</span></div></div></div>`;
  area.appendChild(d.firstChild);
  scrollBot();
}

// ── AI Chat ──────────────────────────────────────────────────────────────────
let aiMessages = [];

async function sendAI() {
  const inp = document.getElementById('mi');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = 'auto';

  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  // Показать сообщение пользователя
  aiMessages.push({ role: 'user', content: text, time });
  const area = document.getElementById('msgArea');
  let d = document.createElement('div');
  d.innerHTML = `<div class="msg me"><div class="bbl">${escHtml(text)}<div class="bf"><span class="mt">${time}</span></div></div></div>`;
  area.appendChild(d.firstChild);

  // Показать индикатор загрузки
  const loading = document.createElement('div');
  loading.className = 'typing';
  loading.innerHTML = '<div class="tdots"><span></span><span></span><span></span></div>';
  area.appendChild(loading);
  scrollBot();

  try {
    const res = await fetch(`${API}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
      body: JSON.stringify({ messages: aiMessages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })) }),
    });
    const data = await res.json();
    loading.remove();

    const aiText = data.text || data.error || 'Нет ответа';
    const aiTime = new Date().getHours().toString().padStart(2,'0') + ':' + new Date().getMinutes().toString().padStart(2,'0');
    aiMessages.push({ role: 'assistant', content: aiText, time: aiTime });

    d = document.createElement('div');
    d.innerHTML = `<div class="msg them"><div class="bbl">${escHtml(aiText)}<div class="bf"><span class="mt">${aiTime}</span></div></div></div>`;
    area.appendChild(d.firstChild);
    scrollBot();

    // Сохранить историю (последние 50 сообщений)
    localStorage.setItem('kosmos_ai_history', JSON.stringify(aiMessages.slice(-50)));
  } catch(e) {
    loading.remove();
    d = document.createElement('div');
    d.innerHTML = `<div class="msg them"><div class="bbl">Ошибка: нет связи с сервером<div class="bf"><span class="mt">—</span></div></div></div>`;
    area.appendChild(d.firstChild);
    scrollBot();
  }
}

// ── Feed / Лента ─────────────────────────────────────────────────────────────
var feedOffset = 0;
var feedLoading = false;
var myFeedChannel = null;

async function loadFeed() {
  if (feedLoading) return;
  feedLoading = true;
  var loader = document.getElementById('feedLoader');
  try {
    var res = await fetch(API + '/feed?offset=' + feedOffset, { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    if (!res.ok) { feedLoading = false; return; }
    var data = await res.json();
    var posts = data.posts || [];
    myFeedChannel = data.myFeedChannel || null;
    // Show/hide FAB
    var fab = document.getElementById('feedFab');
    if (fab) fab.style.display = myFeedChannel ? '' : 'none';
    var list = document.getElementById('feedList');
    if (!posts.length) {
      if (loader) loader.textContent = feedOffset === 0 ? 'Нет постов. Создайте канал и подключите к ленте!' : '';
      feedLoading = false; return;
    }
    posts.forEach(function(p) { list.insertAdjacentHTML('beforeend', postCard(p)); });
    feedOffset += posts.length;
    feedLoading = false;
    if (loader) loader.textContent = '';
  } catch(e) { feedLoading = false; if (document.getElementById('feedLoader')) document.getElementById('feedLoader').textContent = 'Ошибка'; }
}

function postCard(p) {
  var name = p.channel_name || '?';
  var slug = p.channel_slug || '';
  var initial = name[0].toUpperCase();
  var g = GS[name.charCodeAt(0) % GS.length];
  var time = p.created_at ? new Date(p.created_at * 1000).toLocaleString('ru',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
  var subBtn = p.channel_id ? (p.subscribed
    ? '<button onclick="toggleSub(\'' + p.channel_id + '\',this)" style="background:none;border:1px solid var(--sep);border-radius:8px;color:#8899aa;font-size:12px;padding:5px 10px;cursor:pointer">Отписаться</button>'
    : '<button onclick="toggleSub(\'' + p.channel_id + '\',this)" style="background:#007AFF;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;padding:6px 12px;cursor:pointer">Подписаться</button>'
  ) : '';
  return '<div style="background:var(--card);border-bottom:0.5px solid var(--sep);padding:14px 16px">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<div class="' + g + '" style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;flex-shrink:0">' + initial + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px;color:var(--text)">' + escHtml(name) + '</div><div style="font-size:12px;color:#556677">' + (slug?'@'+escHtml(slug)+' · ':'') + time + '</div></div>' +
      subBtn +
    '</div>' +
    '<div style="font-size:15px;line-height:1.4;margin-bottom:8px;white-space:pre-wrap;color:var(--text)">' + escHtml(p.text) + '</div>' +
    '<div style="display:flex;gap:20px;padding-top:4px">' +
      '<button onclick="feedLike(this,\'' + p.id + '\')" style="background:none;border:none;cursor:pointer;font-size:14px;color:' + (p.liked?'#FF3B30':'#8899aa') + ';display:flex;align-items:center;gap:4px"><span>' + (p.liked?'❤️':'🤍') + '</span><span class="lc">' + (p.likes||0) + '</span></button>' +
      '<button onclick="feedShare(\'' + p.id + '\')" style="background:none;border:none;cursor:pointer;font-size:14px;color:#8899aa;display:flex;align-items:center;gap:4px">📤 Отправить</button>' +
    '</div></div>';
}

async function feedLike(btn, id) {
  var r = await fetch(API+'/feed/'+id+'/like',{method:'POST',headers:{'Authorization':'Bearer '+jwtToken}});
  var d = await r.json(); var s = btn.querySelector('span'); var lc = btn.querySelector('.lc');
  if(d.liked){s.textContent='❤️';btn.style.color='#FF3B30';lc.textContent=parseInt(lc.textContent)+1;}
  else{s.textContent='🤍';btn.style.color='#8899aa';lc.textContent=Math.max(0,parseInt(lc.textContent)-1);}
}

async function feedShare(postId) {
  var handle = prompt('Введите @username друга:');
  if (!handle) return;
  var users = await (await fetch(API+'/users?search='+encodeURIComponent(handle),{headers:{'Authorization':'Bearer '+jwtToken}})).json();
  if (!users.length) { alert('Пользователь не найден'); return; }
  await fetch(API+'/feed/'+postId+'/share',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwtToken},body:JSON.stringify({targetUserId:users[0].id})});
  alert('Отправлено!');
}

async function toggleSub(channelId, btn) {
  var r = await fetch(API+'/channels/'+channelId+'/subscribe',{method:'POST',headers:{'Authorization':'Bearer '+jwtToken}});
  var d = await r.json();
  if (d.subscribed) { btn.textContent='Отписаться'; btn.style.background='none'; btn.style.border='1px solid var(--sep)'; btn.style.color='#8899aa'; }
  else { btn.textContent='Подписаться'; btn.style.background='#007AFF'; btn.style.border='none'; btn.style.color='#fff'; }
  loadMyChats();
}

function openCreatePost() {
  var main = document.getElementById('feedArea') || document.getElementById('mainArea');
  main.innerHTML =
    '<div style="padding:20px;max-width:500px;margin:0 auto">' +
      '<div style="font-size:20px;font-weight:600;margin-bottom:16px;color:var(--text)">Новый пост</div>' +
      '<textarea id="postText" maxlength="140" oninput="var c=this.value.length;document.getElementById(\'cc\').textContent=c+\'/140\';document.getElementById(\'cc\').style.color=c>130?\'#FF3B30\':\'#556677\'" style="width:100%;min-height:100px;background:var(--bg);border:0.5px solid var(--sep);border-radius:12px;padding:14px;font-family:inherit;font-size:15px;resize:none;outline:none;color:var(--text)" placeholder="Что нового?"></textarea>' +
      '<div id="cc" style="text-align:right;font-size:12px;color:#556677;margin:4px 4px 8px">0/140</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="openPinned(\'video\')" style="flex:1;background:var(--card);border:none;border-radius:12px;padding:12px;font-family:inherit;font-size:15px;cursor:pointer;color:var(--text2)">Отмена</button>' +
        '<button onclick="submitFeedPost()" style="flex:1;background:#007AFF;border:none;border-radius:12px;padding:12px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;color:#fff">Опубликовать</button>' +
      '</div></div>';
}

async function submitFeedPost() {
  var text = document.getElementById('postText').value.trim();
  if (!text || !myFeedChannel) return;
  await fetch(API+'/feed/post',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwtToken},body:JSON.stringify({channelId:myFeedChannel,text:text})});
  openPinned('video');
}

// ── Dating / Общение ─────────────────────────────────────────────────────────
let datingCards = [];
let datingIdx = 0;

async function loadDatingCards() {
  var area = document.getElementById('datingArea');
  if (!area) return;
  try {
    var res = await fetch(API + '/dating/profiles', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    if (!res.ok) { area.innerHTML = '<div style="color:var(--muted)">Не удалось загрузить</div>'; return; }
    datingCards = await res.json();
    datingIdx = 0;
    if (!datingCards.length) {
      area.innerHTML = '<div class="empty-card" style="text-align:center"><div style="font-size:48px;margin-bottom:12px">🔍</div><h2>Пока нет анкет</h2><p>Заполните свой профиль (⚙) и ждите новых пользователей</p></div>';
      return;
    }
    showDatingCard();
  } catch(e) {
    area.innerHTML = '<div style="color:var(--muted)">Ошибка загрузки</div>';
  }
}

function showDatingCard() {
  var area = document.getElementById('datingArea');
  if (!area || datingIdx >= datingCards.length) {
    if (area) area.innerHTML = '<div class="empty-card" style="text-align:center"><div style="font-size:48px;margin-bottom:12px">✨</div><h2>Анкеты закончились</h2><p>Загляните позже</p></div>';
    return;
  }
  var u = datingCards[datingIdx];
  var initial = (u.username || '?')[0].toUpperCase();
  var grad = GS[(u.username || '').charCodeAt(0) % GS.length];
  area.innerHTML =
    '<div style="width:100%;max-width:340px;animation:mIn .3s ease">' +
      '<div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:var(--shadow2);border:1.5px solid rgba(0,0,0,0.05)">' +
        '<div class="' + grad + '" style="height:200px;display:flex;align-items:center;justify-content:center;font-size:72px;color:rgba(255,255,255,0.9)">' +
          (u.photo ? '<img src="' + escHtml(u.photo) + '" style="width:100%;height:100%;object-fit:cover">' : initial) +
        '</div>' +
        '<div style="padding:20px">' +
          '<div style="font-size:22px;font-weight:600;color:var(--text)">' + escHtml(u.username) +
            (u.age ? ', ' + u.age : '') +
          '</div>' +
          (u.handle ? '<div style="font-size:13px;color:var(--muted);margin-top:2px">@' + escHtml(u.handle) + '</div>' : '') +
          (u.city ? '<div style="font-size:14px;color:var(--text2);margin-top:8px">📍 ' + escHtml(u.city) + '</div>' : '') +
          (u.bio ? '<div style="font-size:14px;color:var(--text);margin-top:8px;line-height:1.5">' + escHtml(u.bio) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:16px;justify-content:center;margin-top:20px">' +
        '<button onclick="datingAction(\'' + u.id + '\',\'skip\')" style="width:64px;height:64px;border-radius:50%;border:2px solid #e5e7eb;background:#fff;font-size:28px;cursor:pointer;box-shadow:var(--shadow);transition:all .15s">✕</button>' +
        '<button onclick="datingAction(\'' + u.id + '\',\'like\')" style="width:64px;height:64px;border-radius:50%;border:none;background:linear-gradient(135deg,#ec4899,#f43f5e);color:#fff;font-size:28px;cursor:pointer;box-shadow:0 6px 20px rgba(244,63,94,0.35);transition:all .15s">❤️</button>' +
      '</div>' +
    '</div>';
}

async function datingAction(targetId, action) {
  try {
    var res = await fetch(API + '/dating/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ targetId: targetId, action: action }),
    });
    var data = await res.json();
    if (data.match) {
      // Мэтч!
      var area = document.getElementById('datingArea');
      if (area) {
        area.innerHTML =
          '<div style="text-align:center;animation:mIn .4s ease">' +
            '<div style="font-size:72px;margin-bottom:16px">🎉</div>' +
            '<div style="font-size:26px;font-weight:700;color:var(--text);margin-bottom:8px">Это мэтч!</div>' +
            '<div style="font-size:14px;color:var(--muted);margin-bottom:24px">Вы понравились друг другу</div>' +
            '<button onclick="openMatchChat(\'' + targetId + '\')" style="background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:14px;color:#fff;padding:14px 32px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(26,86,219,0.3)">Написать →</button>' +
            '<br><button onclick="datingIdx++;showDatingCard()" style="background:none;border:none;color:var(--muted);margin-top:12px;cursor:pointer;font-size:13px">Продолжить просмотр</button>' +
          '</div>';
      }
    } else {
      datingIdx++;
      showDatingCard();
    }
  } catch(e) {
    datingIdx++;
    showDatingCard();
  }
}

function openMatchChat(targetId) {
  var ids = [currentUser.id, targetId].sort();
  var chatId = 'dm-' + ids.join('-');
  goBack();
  // Если чата нет в списке — loadMyChats добавит
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

async function subscribeChannel(channelId, btn) {
  await fetch(API + '/channels/' + channelId + '/subscribe', {
    method: 'POST', headers: { 'Authorization': 'Bearer ' + jwtToken }
  });
  if (btn) { btn.textContent = '✓'; btn.style.background = '#34C759'; }
  loadMyChats();
}

function openCreateChannel() {
  var main = document.getElementById('mainArea');
  main.innerHTML =
    '<div class="chat-hdr"><button class="back-btn" onclick="goBack()">‹</button><div class="hinfo"><div class="hname">Создать канал</div></div></div>' +
    '<div style="padding:20px;max-width:400px;margin:0 auto">' +
      '<div class="auth-label">Название</div>' +
      '<input class="minp" id="chName" placeholder="Мой канал" style="background:var(--card);color:var(--text);border-color:var(--sep)">' +
      '<div class="auth-label">@username (латиница, цифры, _)</div>' +
      '<div style="position:relative"><input class="minp" id="chSlug" placeholder="my_channel" oninput="checkSlug(this.value)" autocapitalize="none" style="background:var(--card);color:var(--text);border-color:var(--sep)"><span id="slugStatus" style="position:absolute;right:12px;top:12px;font-size:14px"></span></div>' +
      '<div class="auth-label">Описание</div>' +
      '<textarea class="minp" id="chDesc" rows="2" placeholder="О чём этот канал" style="background:var(--card);color:var(--text);border-color:var(--sep);resize:none"></textarea>' +
      '<button onclick="submitChannel()" style="width:100%;background:#007AFF;border:none;border-radius:12px;color:#fff;padding:14px;font-family:inherit;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px">Создать</button>' +
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
    st.textContent = d.available ? '✓' : '✕';
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

function togE() { document.getElementById('ep')?.classList.toggle('open'); }
function insE(e) { const i = document.getElementById('mi'); if (i) { i.value += e; i.focus(); } document.getElementById('ep')?.classList.remove('open'); }
function scrollBot() { const a = document.getElementById('msgArea'); if (a) a.scrollTop = a.scrollHeight; }
function showChatView() { document.body.classList.add('chat-open'); }
function goBack() { document.body.classList.remove('chat-open'); cur = null; render(); }
function filterChats(q) {
  const ql = q.toLowerCase();
  document.querySelectorAll('.ci').forEach(el => {
    el.style.display = el.querySelector('.ci-name').textContent.toLowerCase().includes(ql) ? '' : 'none';
  });
}
