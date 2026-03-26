// ── Socket.io: connection, message handling, typing, keepalive ──────────────

let keepaliveInterval = null;

function initSocket() {
  if (socket) socket.disconnect();
  if (keepaliveInterval) clearInterval(keepaliveInterval);

  socket = io(API, { auth: { token: jwtToken } });

  socket.on('connect', () => {
    console.log('[socket] connected as', currentUser?.username);
    if (currentUser) {
      document.getElementById('logoSub').textContent = currentUser.handle ? '@' + currentUser.handle : currentUser.username;
    }
    // Переподписаться на все открытые комнаты
    if (cur) socket.emit('join', cur);
    channels.forEach(c => socket.emit('join', c.id));
    dms.forEach(d => socket.emit('join', d.id));
  });

  socket.on('connect_error', (e) => {
    console.warn('[socket] error:', e.message);
  });

  // Ping каждые 14 мин чтобы Render не засыпал
  keepaliveInterval = setInterval(() => {
    fetch(`${API}/health`).catch(() => {});
  }, 14 * 60 * 1000);

  socket.on('chat_msg', (msg) => {
    const ts = new Date(msg.created_at * 1000);
    const time = ts.getHours().toString().padStart(2, '0') + ':' + ts.getMinutes().toString().padStart(2, '0');
    const from = currentUser && msg.sender_id === currentUser.id ? 'me' : 'them';
    const m = { id: msg.id, from, text: msg.text, time, sender: msg.sender_username };

    let item = findItem(msg.chat_id);

    if (!item) {
      const chatId = msg.chat_id;
      if (chatId.startsWith('dm-')) {
        const senderName = msg.sender_username || 'Пользователь';
        item = {
          id: chatId, type: 'chat', name: senderName,
          g: GS[senderName.charCodeAt(0) % GS.length],
          em: senderName[0].toUpperCase(),
          online: true, prev: '', time: '', unread: 0, msgs: [], _loaded: true,
        };
        dms.unshift(item);
      } else {
        item = {
          id: chatId, type: 'channel', name: chatId,
          g: GS[0], em: '📢',
          members: '?', prev: '', time: '', unread: 0, msgs: [], _loaded: true,
        };
        channels.unshift(item);
      }
    }

    item.msgs.push(m);
    item.prev = msg.text.substring(0, 36);
    item.time = time;

    // Поднять чат/канал вверх списка
    if (item.type === 'channel') {
      const idx = channels.indexOf(item);
      if (idx > 0) { channels.splice(idx, 1); channels.unshift(item); }
    } else {
      const idx = dms.indexOf(item);
      if (idx > 0) { dms.splice(idx, 1); dms.unshift(item); }
    }

    if (cur === msg.chat_id) {
      const isCh = item.type === 'channel';
      appendMsg(m, isCh);
    } else {
      item.unread = (item.unread || 0) + 1;
    }
    render();
  });

  socket.on('typing', ({ chatId, username }) => {
    if (cur === chatId && username !== currentUser?.username) {
      showTypingIndicator();
    }
  });
}
