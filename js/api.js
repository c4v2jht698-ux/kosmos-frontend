// ── API: load chats, search, create chat ────────────────────────────────────

function apiFetch(url, opts, timeoutMs) {
  timeoutMs = timeoutMs || 15000;
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, timeoutMs);
  opts = opts || {};
  opts.signal = controller.signal;
  if (!opts.headers) opts.headers = {};
  if (jwtToken) opts.headers['Authorization'] = 'Bearer ' + jwtToken;
  return fetch(url, opts).finally(function() { clearTimeout(timer); });
}

async function loadMyChats(retries) {
  if (!jwtToken) return;
  retries = retries || 0;
  try {
    const r = await fetch(`${API}/my-chats`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    if (!r.ok) {
      if (r.status === 401) logout();
      return;
    }
    const data = await r.json();

    channels.length = 0;
    dms.length = 0;

    var AI_SLUGS = ['crypto_pulse','cinema_club','music_wave','fitness_cosmos','tech_cosmos','gaming_zone','auto_drive','food_lab','travel_vibes','fashion_now','science_daily','health_tips','business_hub','humor_daily','nature_world','art_space','book_shelf','mindset_pro','ai_future','history_facts'];
    (data.channels || []).forEach(ch => {
      if (AI_SLUGS.indexOf(ch.slug) !== -1) return; // hide AI agent channels
      channels.push({
        id: ch.id, type: 'channel', name: ch.name, slug: ch.slug,
        g: GS[ch.name.charCodeAt(0) % GS.length],
        em: ch.name[0].toUpperCase(),
        members: ch.members || 0,
        prev: ch.last_text || '',
        time: ch.last_time || '',
        _ts: parseInt(ch.last_ts) || 0,
        unread: 0, msgs: [], _loaded: false,
        created_by: ch.created_by,
      });
    });

    (data.dms || []).forEach(dm => {
      const name = dm.name || 'Пользователь';
      dms.push({
        id: dm.chat_id, type: 'chat', name,
        g: GS[name.charCodeAt(0) % GS.length],
        em: name[0].toUpperCase(),
        online: false,
        prev: dm.last_text || '',
        time: dm.last_time || '',
        _ts: parseInt(dm.last_ts) || 0,
        unread: 0, msgs: [], _loaded: false,
      });
    });

    render();

    // Переподписаться на все каналы после загрузки
    if (socket && socket.connected) {
      channels.forEach(c => socket.emit('join', c.id));
      dms.forEach(d => socket.emit('join', d.id));
    }
  } catch(e) {
    console.warn('[api] loadMyChats failed:', e.message);
    if (retries < 3) {
      console.log('[api] retry in 5s... (' + (retries+1) + '/3)');
      setTimeout(() => loadMyChats(retries + 1), 5000);
    }
  }
}

let searchTimeout;
async function sidebarSearch(q) {
  clearTimeout(searchTimeout);
  const sr = document.getElementById('sidebarResults');
  if (!q.trim()) {
    sr.style.display = 'none';
    document.getElementById('chSection').style.display = '';
    const dmSec = document.getElementById('dmSection');
    if (dmSec) dmSec.style.display = 'none';
    return;
  }

  sr.style.display = 'block';
  document.getElementById('chSection').style.display = 'none';
  const dmSec = document.getElementById('dmSection');
  if (dmSec) dmSec.style.display = 'none';

  searchTimeout = setTimeout(async () => {
    try {
      const [ur, cr] = await Promise.all([
        fetch(`${API}/users?search=${encodeURIComponent(q)}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/channels?search=${encodeURIComponent(q)}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }).then(r => r.ok ? r.json() : []),
      ]);

      let html = '';

      if (ur.length) {
        html += '<div class="sec-label" style="padding:10px 11px 4px">Пользователи</div>';
        html += ur.map(u => {
          var safe = { id: escSearch(u.id), name: escHtml(u.username || ''), handle: escHtml(u.handle || '') };
          return '<div class="ci" data-action="dm" data-uid="' + safe.id + '" data-uname="' + escSearch(u.username) + '" data-uhandle="' + escSearch(u.handle || '') + '">' +
            '<div class="av ' + GS[(u.username||'?').charCodeAt(0) % GS.length] + '">' + safe.name[0].toUpperCase() + '</div>' +
            '<div class="ci-info"><div class="ci-name">' + safe.name + '</div><div class="ci-prev">@' + safe.handle + '</div></div></div>';
        }).join('');
      }

      if (cr.length) {
        html += '<div class="sec-label" style="padding:10px 11px 4px">Каналы</div>';
        html += cr.map(c => {
          var safe = { id: escSearch(c.id), name: escHtml(c.name || ''), slug: escHtml(c.slug || '') };
          return '<div class="ci" data-action="join" data-cid="' + safe.id + '" data-cname="' + escSearch(c.name) + '" data-cslug="' + escSearch(c.slug || '') + '">' +
            '<div class="av ' + GS[(c.name||'?').charCodeAt(0) % GS.length] + ' sq">' + safe.name[0].toUpperCase() + '</div>' +
            '<div class="ci-info"><div class="ci-name">' + safe.name + '</div><div class="ci-prev">' + (c.members || 0) + ' участников</div></div></div>';
        }).join('');
      }

      if (!html) html = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:13px">Ничего не найдено</div>';
      sr.innerHTML = html;
      // Delegated click handler — no inline onclick
      sr.onclick = function(e) {
        var ci = e.target.closest('.ci[data-action]');
        if (!ci) return;
        if (ci.dataset.action === 'dm') startDM(ci.dataset.uid, ci.dataset.uname, ci.dataset.uhandle);
        else if (ci.dataset.action === 'join') joinChannel(ci.dataset.cid, ci.dataset.cname, ci.dataset.cslug);
      };
    } catch(e) {
      console.error('[api] search:', e);
    }
  }, 300);
}

function escSearch(s) {
  return String(s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function startDM(userId, username, handle) {
  // Закрываем поиск
  document.querySelector('.search input').value = '';
  document.getElementById('sidebarResults').style.display = 'none';
  document.getElementById('chSection').style.display = '';

  const myId = currentUser.id;
  const ids = [myId, userId].sort();
  const chatId = 'dm-' + ids[0] + '-' + ids[1];

  let item = dms.find(d => d.id === chatId);
  if (!item) {
    const name = username + (handle ? ' @' + handle : '');
    item = {
      id: chatId, type: 'chat', name,
      g: GS[username.charCodeAt(0) % GS.length],
      em: username[0].toUpperCase(),
      online: false, prev: '', time: '', _ts: 0,
      unread: 0, msgs: [], _loaded: false,
    };
    dms.unshift(item);
    render();
  }

  openChat(chatId);
  closeModal();
}

async function joinChannel(id, name, slug) {
  document.querySelector('.search input').value = '';
  document.getElementById('sidebarResults').style.display = 'none';
  document.getElementById('chSection').style.display = '';

  await fetch(`${API}/channels/${id}/join`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });

  let item = channels.find(c => c.id === id);
  if (!item) {
    item = {
      id, type: 'channel', name, slug,
      g: GS[name.charCodeAt(0) % GS.length],
      em: name[0].toUpperCase(),
      members: '?', prev: '', time: '', _ts: 0,
      unread: 0, msgs: [], _loaded: false,
    };
    channels.unshift(item);
    render();
  }
  openChat(id);
}

async function searchUsers(q) {
  if (!q.trim()) { document.getElementById('userResults').innerHTML = ''; return; }
  try {
    const r = await fetch(`${API}/users?search=${encodeURIComponent(q)}`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    const users = r.ok ? await r.json() : [];
    document.getElementById('userResults').innerHTML = users.length
      ? users.map(u => `
        <div class="user-result" onclick="startDM('${u.id}','${escSearch(u.username)}','${escSearch(u.handle || '')}')">
          <div class="ur-av ${GS[u.username.charCodeAt(0) % GS.length]}">${u.username[0].toUpperCase()}</div>
          <div><div class="ur-name">${u.username}</div><div class="ur-email">@${u.handle || ''}</div></div>
        </div>`).join('')
      : '<div class="user-results-empty">Не найдено</div>';
  } catch(e) {
    console.error('[api] searchUsers:', e);
  }
}

async function createChat() {
  const isCh = document.querySelector('input[name="ct"]:checked').value === 'channel';
  if (isCh) {
    const name = document.getElementById('ncName').value.trim();
    if (!name) return;
    try {
      const r = await fetch(`${API}/channels`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!r.ok) return;
      const ch = await r.json();
      const item = {
        id: ch.id, type: 'channel', name: ch.name, slug: ch.slug,
        g: GS[ch.name.charCodeAt(0) % GS.length],
        em: ch.name[0].toUpperCase(),
        members: 1, prev: '', time: '', _ts: Date.now() / 1000,
        unread: 0, msgs: [], _loaded: true,
        created_by: currentUser.id,
      };
      channels.unshift(item);
      render();
      closeModal();
      openChat(ch.id);
    } catch(e) {
      console.error('[api] createChannel:', e);
    }
  }
}
