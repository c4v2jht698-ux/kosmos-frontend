// ── UI: Render, chat open, message HTML, input helpers ──────────────────────

function findItem(id) { return channels.find(x => x.id === id) || dms.find(x => x.id === id); }

function render() {
  const all = [...channels, ...dms].sort((a, b) => {
    const ta = a.time || ''; const tb = b.time || '';
    return tb.localeCompare(ta);
  });
  const chEl = document.getElementById('chList');
  const dmEl = document.getElementById('dmList');
  if (chEl) chEl.innerHTML = all.map(c => itm(c)).join('');
  if (dmEl) dmEl.innerHTML = '';
  const chSec = document.getElementById('chSection');
  const dmSec = document.getElementById('dmSection');
  if (chSec) chSec.style.display = '';
  if (dmSec) dmSec.style.display = 'none';
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
      <div class="ci-prev">${c.prev}</div>
    </div>
    <div class="ci-meta">
      <div class="ci-time">${c.time}</div>
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
    fetch(`${API}/messages/${encodeURIComponent(id)}`, { headers: { 'Authorization': `Bearer ${jwtToken}` } })
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
            area.innerHTML = '<div class="datediv"><span>Сегодня</span></div>' + item.msgs.map(m => mHTML(m, isCh2)).join('');
            scrollBot();
          }
        }
        if (item.msgs.length) { item.prev = item.msgs[item.msgs.length-1].text.substring(0,36); render(); }
      }).catch(() => {});
  }

  const isCh = item.type === 'channel';
  const sub = isCh
    ? `${item.slug ? '@'+item.slug+' · ' : ''}${item.members} подписчиков`
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
    ${!isCh ? inpHTML() : (item.created_by === currentUser?.id ? chInpHTML() : `<div class="ro-bar">📢 Канал — только для чтения</div>`)}
  `;
  scrollBot();
  showChatView();
}

function mHTML(m, isCh) {
  if (isCh) {
    return `<div class="msg ch">
      <div class="bbl">${m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
        <div class="bf"><span class="mt">${m.time}</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="reacts">${(m.reacts || []).map(r => `<div class="react${r.mine ? ' mine' : ''}" onclick="toggleR(this)">${r.e}<span class="rc">${r.n}</span></div>`).join('')}</div>
        <div class="cv">👁 ${(m.views || 0).toLocaleString('ru')}</div>
      </div>
    </div>`;
  }
  const me = m.from === 'me';
  return `<div class="msg ${me ? 'me' : 'them'}">
    ${!me && m.sender ? `<div class="sender-name">${m.sender}</div>` : ''}
    <div class="bbl">${m.text}
      <div class="bf">
        <span class="mt">${m.time}</span>
        ${me ? '<span class="ms">✓✓</span>' : ''}
      </div>
    </div>
  </div>`;
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

function chInpHTML() {
  return `<div class="inp-zone">
    <div class="inp-box">
      <textarea class="minput" id="mi" placeholder="Опубликовать в канале..." rows="1" onkeydown="hKey(event)" oninput="aRes(this)"></textarea>
    </div>
    <button class="sbtn" onclick="send()">📢</button>
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
  } else {
    const item = findItem(cur);
    if (!item) return;
    const now = new Date();
    const t = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const msg = { id: Date.now(), from: 'me', text, time: t };
    item.msgs.push(msg); item.prev = text.substring(0, 36); item.time = t;
    appendMsg(msg, false);
    render();
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
  typingTimeout = setTimeout(() => ty.remove(), 3000);
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
        ${saved.map(n => `<div class="msg me"><div class="bbl">${n.text}<div class="bf"><span class="mt">${n.time}</span></div></div></div>`).join('')}
      </div>
      <div class="inp-zone">
        <div class="inp-box">
          <textarea class="minput" id="mi" placeholder="Записать заметку..." rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();saveNote()}" oninput="aRes(this)"></textarea>
        </div>
        <button class="sbtn" onclick="saveNote()">➤</button>
      </div>`;
    scrollBot(); showChatView();
  }
  else if (type === 'ai' || type === 'social') {
    const name = type === 'ai' ? 'ГигаЧАТ AI' : 'Общение';
    const em = type === 'ai' ? '🤖' : '♥';
    const g = type === 'ai' ? 'g1' : 'g5';
    main.innerHTML = `
      <div class="chat-hdr">
        <button class="back-btn" onclick="goBack()">‹</button>
        <div class="hav ${g} sq"><span>${em}</span></div>
        <div class="hinfo"><div class="hname">${name}</div><div class="hsub">в разработке</div></div>
      </div>
      <div class="msg-area" id="msgArea">
        <div class="datediv"><span>Сегодня</span></div>
        <div class="msg them"><div class="bbl">Скоро буду доступен! Следите за обновлениями 🚀<div class="bf"><span class="mt">—</span></div></div></div>
      </div>
      <div class="ro-bar">Функция в разработке</div>`;
    showChatView();
  }
  else if (type === 'video') {
    main.innerHTML = `
      <div class="chat-hdr">
        <button class="back-btn" onclick="goBack()">‹</button>
        <div class="hav g7 sq"><span>🎬</span></div>
        <div class="hinfo"><div class="hname">Видео</div><div class="hsub">YouTube Shorts</div></div>
      </div>
      <div class="msg-area" id="msgArea" style="align-items:center;justify-content:center">
        <div class="empty-card" style="text-align:center">
          <div style="font-size:64px;margin-bottom:16px">🎬</div>
          <h2 style="margin-bottom:8px">YouTube Shorts</h2>
          <p style="margin-bottom:20px">Встроенный плеер будет доступен после деплоя на HTTPS</p>
          <a href="https://www.youtube.com/shorts" target="_blank" rel="noopener" style="display:inline-block;background:linear-gradient(135deg,#ff0000,#cc0000);color:#fff;padding:14px 32px;border-radius:14px;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:600;text-decoration:none;box-shadow:0 6px 20px rgba(255,0,0,0.3)">Смотреть Shorts →</a>
        </div>
      </div>`;
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
  d.innerHTML = `<div class="msg me"><div class="bbl">${text}<div class="bf"><span class="mt">${time}</span></div></div></div>`;
  area.appendChild(d.firstChild);
  scrollBot();
}

function togE() { document.getElementById('ep')?.classList.toggle('open'); }
function insE(e) { const i = document.getElementById('mi'); if (i) { i.value += e; i.focus(); } document.getElementById('ep')?.classList.remove('open'); }
function toggleR(el) { el.classList.toggle('mine'); const c = el.querySelector('.rc'); c.textContent = parseInt(c.textContent) + (el.classList.contains('mine') ? 1 : -1); }
function scrollBot() { const a = document.getElementById('msgArea'); if (a) a.scrollTop = a.scrollHeight; }
function showChatView() { document.body.classList.add('chat-open'); }
function goBack() { document.body.classList.remove('chat-open'); cur = null; render(); }
function filterChats(q) { const ql = q.toLowerCase(); document.querySelectorAll('.ci').forEach(el => { el.style.display = el.querySelector('.ci-name').textContent.toLowerCase().includes(ql) ? '' : 'none'; }); }
