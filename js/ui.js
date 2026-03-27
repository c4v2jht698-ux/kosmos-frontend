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
    // Реальные YouTube Shorts IDs (youtube.com/shorts/ID)
    const shorts = [
      'gQlMMD0e5Q0','ZESNz1Gz-s4','cAEYrgaF06A','K4TOrB7at0Y','s1_FZCbmFQM',
      'HCjNJDNzw8Y','MhQKe-aERsU','oHg5SJYRHA0','GtL1huin9EE','_T8cn2J13C4',
      '0e3GPea1Tyg','djV11Xbc914','grd-K33tOSM','lp-EO5I60KA','kJQP7kiw5Fk',
      'CwA1ogrCMC0','PnGJPqr1054','pKO9UjSeLew','jXS5KIhNpGo','a3ICNMQW7Ok',
      'TNhaISOUy6Q','vTIIMJ9tUc8','Kn9Xle2jGpk','uelHwf8o7_U','rUWxSEwctFU',
      'p0bGHP-PXD4','E7wJTI-1dvQ','5qap5aO4i9A','zTvJJnoWIPk','Z-48u_uWMHY',
      'c0-hvjV2A5Y','z8ZqFlw6hYg','RiDiIWNMC_o','J---aiyznGQ','ih9zBLDr_ro',
      '9XaS93WMRQQ','Lrj2Hq7xqQ8','QTT5iHCHSn0','N9qYF9DZPdw','0VXc2k7mXFw',
      'WcIcVapfqXw','9YffrCViTVk','uYPbbksJxIg','t3otBjVZzT0','PQMbj0G1ZaQ',
      'JGwWNGJdvx8','I1188GO4p1E','gtOCjkxwLIQ','BI_sPGpCSqA','fHI8X4OXluQ',
    ];
    main.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;z-index:10;display:flex;align-items:center;padding:8px 12px;background:linear-gradient(rgba(0,0,0,0.6),transparent)">
        <button onclick="goBack()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;padding:4px 8px">‹</button>
        <span style="color:#fff;font-size:15px;font-weight:600;margin-left:8px">Shorts</span>
      </div>
      <div id="shortsContainer" style="width:100%;height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch;background:#000">
        ${shorts.map(function(id, i) {
          return '<div class="shorts-slide" data-vid="' + id + '" data-idx="' + i + '" style="scroll-snap-align:start;scroll-snap-stop:always;width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center;background:#000;flex-shrink:0">' +
            (i <= 1 ? '<iframe src="https://www.youtube.com/embed/' + id + '?autoplay=' + (i===0?1:0) + '&mute=1&loop=1&controls=0&playsinline=1&rel=0&modestbranding=1" style="position:absolute;inset:0;width:100%;height:100%;border:none" allow="autoplay;encrypted-media" allowfullscreen></iframe>' : '<div style="color:#333;font-size:14px">⏳</div>') +
            '<div style="position:absolute;right:12px;bottom:80px;display:flex;flex-direction:column;gap:18px;align-items:center">' +
              '<button onclick="toggleShortsLike(this)" style="background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px"><span style="font-size:28px">🤍</span><span style="color:#fff;font-size:11px">Лайк</span></button>' +
              '<button onclick="shareShortsLink(\'' + id + '\')" style="background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px"><span style="font-size:24px">↗</span><span style="color:#fff;font-size:11px">Поделиться</span></button>' +
            '</div>' +
            '<div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.15)"><div class="shorts-progress" style="height:100%;background:#fff;width:' + ((i+1)/shorts.length*100).toFixed(1) + '%;transition:width .3s"></div></div>' +
          '</div>';
        }).join('')}
      </div>`;
    showChatView();
    initShortsScroll(shorts);
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

// ── Shorts scroll & helpers ───────────────────────────────────────────────────
function initShortsScroll(shorts) {
  var container = document.getElementById('shortsContainer');
  if (!container) return;
  var currentIdx = 0;
  var slides = container.querySelectorAll('.shorts-slide');

  function makeIframe(vid, autoplay) {
    return '<iframe src="https://www.youtube.com/embed/' + vid + '?autoplay=' + (autoplay?1:0) + '&mute=1&loop=1&controls=0&playsinline=1&rel=0&modestbranding=1" style="position:absolute;inset:0;width:100%;height:100%;border:none" allow="autoplay;encrypted-media" allowfullscreen></iframe>';
  }

  function ensureLoaded(idx, autoplay) {
    if (idx < 0 || idx >= slides.length) return;
    var sl = slides[idx];
    if (!sl.querySelector('iframe')) {
      // Сохраняем боковые кнопки и прогресс
      var btns = sl.querySelector('div[style*="right:12px"]');
      var prog = sl.querySelector('div[style*="bottom:0"]');
      var btnsHtml = btns ? btns.outerHTML : '';
      var progHtml = prog ? prog.outerHTML : '';
      sl.innerHTML = makeIframe(shorts[idx], autoplay) + btnsHtml + progHtml;
    }
  }

  function unloadFar(idx) {
    slides.forEach(function(sl, i) {
      if (Math.abs(i - idx) > 2 && sl.querySelector('iframe')) {
        var fr = sl.querySelector('iframe');
        if (fr) fr.remove();
      }
    });
  }

  function onSnap() {
    var idx = Math.round(container.scrollTop / container.clientHeight);
    if (idx === currentIdx) return;
    currentIdx = idx;
    // Загрузить текущий + соседние
    ensureLoaded(idx, true);
    ensureLoaded(idx - 1, false);
    ensureLoaded(idx + 1, false);
    unloadFar(idx);
  }

  var timer = null;
  container.addEventListener('scroll', function() {
    clearTimeout(timer);
    timer = setTimeout(onSnap, 120);
  });
}

function toggleShortsLike(btn) {
  var span = btn.querySelector('span');
  if (span.textContent === '🤍') { span.textContent = '❤️'; }
  else { span.textContent = '🤍'; }
}

function shareShortsLink(vid) {
  var url = 'https://youtube.com/shorts/' + vid;
  if (navigator.share) {
    navigator.share({ url: url }).catch(function(){});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    alert('Ссылка скопирована');
  }
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
