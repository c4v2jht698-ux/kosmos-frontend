// ── API: all fetch requests to the server ───────────────────────────────────

async function loadMyChats() {
  if (!jwtToken) return;
  try {
    const res = await fetch(`${API}/my-chats`, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
    if (!res.ok) return;
    const data = await res.json();
    channels.length = 0; dms.length = 0;
    for (const ch of data.channels) {
      channels.push({ id: ch.id, type: 'channel', name: ch.name, slug: ch.slug || '', g: GS[ch.name.charCodeAt(0) % GS.length], em: '📢', members: String(ch.members || 1), prev: ch.last_text || '', time: ch.last_time || '', unread: 0, msgs: [], created_by: ch.created_by });
    }
    for (const dm of data.dms) {
      dms.push({ id: dm.chat_id, type: 'chat', name: dm.name, g: GS[dm.name.charCodeAt(0) % GS.length], em: dm.name[0].toUpperCase(), online: false, prev: dm.last_text || '', time: dm.last_time || '', unread: 0, msgs: [] });
    }
    render();
  } catch(e) { console.warn('[loadMyChats]', e); }
}

// Modal search (users only)
let searchDebounce = null;
async function searchUsers(q) {
  const results = document.getElementById('userResults');
  clearTimeout(searchDebounce);
  if (!q.trim()) { results.innerHTML = ''; return; }
  searchDebounce = setTimeout(async () => {
    try {
      const res = await fetch(`${API}/users?search=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) { results.innerHTML = `<div class="user-results-empty">Сессия истекла</div>`; setTimeout(logout, 2000); }
        return;
      }
      const users = await res.json();
      if (!users.length) {
        results.innerHTML = `<div class="user-results-empty">Пользователи не найдены</div>`;
        return;
      }
      results.innerHTML = users.map(u => `
        <div class="user-result" onclick="selectUser('${u.id}','${u.username.replace(/'/g,"\\'")}','${(u.handle||'').replace(/'/g,"\\'")}')">
          <div class="ur-av ${GS[u.username.charCodeAt(0) % GS.length]}">${u.username[0].toUpperCase()}</div>
          <div><div class="ur-name">${u.username}</div><div class="ur-email">${u.handle ? '@'+u.handle : u.email}</div></div>
        </div>`).join('');
    } catch (e) {
      results.innerHTML = `<div class="user-results-empty">Ошибка запроса</div>`;
    }
  }, 280);
}

function selectUser(userId, username, handle) {
  const chatId = `dm-${[currentUser.id, userId].sort().join('-')}`;
  let item = findItem(chatId);
  if (!item) {
    const displayName = handle ? username + ' @' + handle : username;
    item = { id: chatId, type: 'chat', name: displayName, g: GS[username.charCodeAt(0) % GS.length], em: username[0].toUpperCase(), online: false, prev: 'Начните общение', time: '', unread: 0, msgs: [] };
    dms.unshift(item);
    render();
  }
  closeModal();
  openChat(chatId);
}

// Sidebar search (users + channels)
let sidebarDebounce = null;
function sidebarSearch(q) {
  filterChats(q);
  clearTimeout(sidebarDebounce);
  const box = document.getElementById('sidebarResults');
  if (!q.trim()) { box.innerHTML = ''; box.style.display = 'none'; return; }
  sidebarDebounce = setTimeout(async () => {
    if (!jwtToken) { box.innerHTML = '<div class="ci-prev" style="padding:12px;text-align:center">Войдите чтобы искать</div>'; box.style.display = 'block'; return; }
    try {
      const enc = encodeURIComponent(q);
      const hdrs = { 'Authorization': `Bearer ${jwtToken}` };
      const [usersRes, chRes] = await Promise.all([
        fetch(`${API}/users?search=${enc}`, { headers: hdrs }),
        fetch(`${API}/channels?search=${enc}`, { headers: hdrs }),
      ]);
      if (usersRes.status === 401 || chRes.status === 401) {
        box.innerHTML = '<div class="ci-prev" style="padding:12px;text-align:center">Сессия истекла</div>'; box.style.display = 'block'; setTimeout(logout, 2000); return;
      }
      const users = usersRes.ok ? await usersRes.json() : [];
      const chs = chRes.ok ? await chRes.json() : [];
      if (!users.length && !chs.length) { box.innerHTML = '<div class="ci-prev" style="padding:12px;text-align:center">Ничего не найдено</div>'; box.style.display = 'block'; return; }
      let html = '';
      if (chs.length) {
        html += `<div class="sec-label" style="padding:8px 10px 4px">Каналы</div>` + chs.map(c => `
          <div class="ci" onclick="joinChannel('${c.id}','${c.name.replace(/'/g,"\\'")}','${c.created_by||''}','${(c.slug||'').replace(/'/g,"\\'")}')">
            <div class="av ${GS[c.name.charCodeAt(0) % GS.length]} sq"><span style="color:#fff">📢</span></div>
            <div class="ci-info"><div class="ci-name">${c.name}</div><div class="ci-prev">${c.slug ? '@'+c.slug+' · ' : ''}${c.members} уч.</div></div>
          </div>`).join('');
      }
      if (users.length) {
        html += `<div class="sec-label" style="padding:8px 10px 4px">Пользователи</div>` + users.map(u => `
          <div class="ci" onclick="startDM('${u.id}','${u.username.replace(/'/g,"\\'")}','${(u.handle||'').replace(/'/g,"\\'")}')">
            <div class="av ${GS[u.username.charCodeAt(0) % GS.length]}"><span style="color:#fff">${u.username[0].toUpperCase()}</span></div>
            <div class="ci-info"><div class="ci-name">${u.username}</div><div class="ci-prev">${u.handle ? '@'+u.handle : ''}</div></div>
          </div>`).join('');
      }
      box.style.display = 'block';
      box.innerHTML = html;
    } catch(e) { box.innerHTML = '<div class="ci-prev" style="padding:12px;text-align:center">Нет связи с сервером</div>'; box.style.display = 'block'; }
  }, 300);
}

function startDM(userId, username, handle) {
  const chatId = 'dm-' + [currentUser.id, userId].sort().join('-');
  let item = findItem(chatId);
  if (!item) {
    const displayName = handle ? username + ' @' + handle : username;
    item = { id: chatId, type: 'chat', name: displayName, g: GS[username.charCodeAt(0) % GS.length], em: username[0].toUpperCase(), online: false, prev: 'Начните общение', time: '', unread: 0, msgs: [] };
    dms.unshift(item);
  }
  document.getElementById('sidebarResults').innerHTML = '';
  document.getElementById('sidebarResults').style.display = 'none';
  document.querySelector('.search input').value = '';
  filterChats('');
  openChat(chatId);
}

async function joinChannel(channelId, name, createdBy, slug) {
  document.getElementById('sidebarResults').innerHTML = '';
  document.getElementById('sidebarResults').style.display = 'none';
  document.querySelector('.search input').value = '';
  filterChats('');
  if (jwtToken) {
    try { await fetch(`${API}/channels/${channelId}/join`, { method: 'POST', headers: { 'Authorization': `Bearer ${jwtToken}` } }); } catch(e) {}
  }
  let item = findItem(channelId);
  if (!item) {
    item = { id: channelId, type: 'channel', name, slug: slug || '', g: GS[name.charCodeAt(0) % GS.length], em: '📢', members: '?', prev: '', time: '', unread: 0, msgs: [], created_by: createdBy };
    channels.unshift(item);
    render();
  }
  openChat(channelId);
}

async function createChat() {
  const name = document.getElementById('ncName').value.trim();
  if (!name) return;
  try {
    const res = await fetch(`${API}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Ошибка создания канала'); return; }
    const ni = { id: data.id, type: 'channel', name, slug: data.slug || '', g: GS[Math.floor(Math.random() * GS.length)], em: '📢', members: '1', prev: '@' + (data.slug || ''), time: 'сейчас', unread: 0, msgs: [], created_by: currentUser?.id };
    channels.unshift(ni);
    closeModal(); render(); openChat(ni.id);
  } catch (e) {
    const ni = {
      id: 'local-' + Date.now(), type: 'channel', name,
      g: GS[Math.floor(Math.random() * GS.length)], em: '📢',
      members: '1', prev: 'Только что создан', time: 'сейчас', unread: 0,
      msgs: [{ id: 1, text: `Канал «${name}» создан!`, time: 'сейчас', views: 1, reacts: [], from: 'them' }],
    };
    channels.unshift(ni);
    closeModal(); render(); openChat(ni.id);
  }
}
