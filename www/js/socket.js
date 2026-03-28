// ── Socket.io: connection, message handling, typing, keepalive ──────────────
var keepaliveInterval = null;

// ── Toast Notification ──────────────────────────────────────────────────────
function showToast(name, text) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var g = GS[(name || '?').charCodeAt(0) % GS.length];
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<div class="toast-av ' + g + '"><span style="color:#fff;font-size:14px">\uD83D\uDC36</span></div>' +
    '<div class="toast-body"><div class="toast-name">' + (name || '') + '</div><div class="toast-text">' + (text || '').substring(0, 60) + '</div></div>';
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, 3000);
}

// ── Tab Badge ───────────────────────────────────────────────────────────────
function updateTabBadges() {
  var totalUnread = 0;
  channels.concat(dms).forEach(function(c) { totalUnread += (c.unread || 0); });
  var chatTab = document.getElementById('navChats');
  if (chatTab) {
    var badge = chatTab.querySelector('.tab-badge');
    if (totalUnread > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'tab-badge'; chatTab.appendChild(badge); }
      badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
    } else if (badge) { badge.remove(); }
  }
}

function initSocket() {
  if (socket) socket.disconnect();
  if (keepaliveInterval) clearInterval(keepaliveInterval);

  socket = io(API, {
    auth: { token: jwtToken },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
  });

  socket.on('connect', function() {
    console.log('[socket] connected as', currentUser ? currentUser.username : '?');
    if (currentUser) {
      var sub = document.getElementById('logoSub');
      if (sub) sub.textContent = currentUser.handle ? '@' + currentUser.handle : currentUser.username;
    }
    if (cur) socket.emit('join', cur);
    channels.forEach(function(c) { socket.emit('join', c.id); });
    dms.forEach(function(d) { socket.emit('join', d.id); });
  });

  socket.on('connect_error', function(e) {
    console.warn('[socket] error:', e.message);
  });

  socket.on('reconnect', function(attempt) {
    console.log('[socket] reconnected after', attempt, 'attempts');
    if (cur) socket.emit('join', cur);
    channels.forEach(function(c) { socket.emit('join', c.id); });
    dms.forEach(function(d) { socket.emit('join', d.id); });
  });

  keepaliveInterval = setInterval(function() {
    fetch(API + '/health').catch(function() {});
  }, 14 * 60 * 1000);

  socket.on('chat_msg', function(msg) {
    var ts = new Date(msg.created_at * 1000);
    var time = ts.getHours().toString().padStart(2, '0') + ':' + ts.getMinutes().toString().padStart(2, '0');
    var from = currentUser && msg.sender_id === currentUser.id ? 'me' : 'them';
    var m = { id: msg.id, from: from, text: msg.text, time: time, sender: msg.sender_username };

    var item = findItem(msg.chat_id);

    if (!item) {
      var chatId = msg.chat_id;
      if (chatId.startsWith('dm-')) {
        var senderName = msg.sender_username || 'Пользователь';
        item = {
          id: chatId, type: 'chat', name: senderName,
          g: GS[senderName.charCodeAt(0) % GS.length],
          em: senderName[0].toUpperCase(),
          online: true, prev: '', time: '', _ts: 0, unread: 0, msgs: [], _loaded: true,
        };
        dms.unshift(item);
        socket.emit('join', chatId);
      } else {
        return;
      }
    }

    item.msgs.push(m);
    item.prev = msg.text.substring(0, 36);
    item.time = time;
    item._ts = msg.created_at;

    if (cur === msg.chat_id) {
      var isCh = item.type === 'channel';
      appendMsg(m, isCh);
    } else {
      item.unread = (item.unread || 0) + 1;
      // Toast notification if message is from someone else
      if (from === 'them') {
        showToast(msg.sender_username || item.name, msg.text);
      }
    }

    render();
    updateTabBadges();
  });

  socket.on('typing', function(data) {
    if (cur === data.chatId && data.username !== (currentUser ? currentUser.username : '')) {
      showTypingIndicator();
    }
  });

  socket.on('error_msg', function(data) {
    console.error('[socket] error_msg:', data.error);
  });
}
