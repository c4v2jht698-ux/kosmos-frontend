// ── Socket.io: connection, message handling, typing, keepalive ──────────────
var keepaliveInterval = null;

// ── Toast Notification ──────────────────────────────────────────────────────
function showToast(name, text) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var g = GS[(name || '?').charCodeAt(0) % GS.length];
  var toast = document.createElement('div');
  toast.className = 'toast';
  var av = document.createElement('div');
  av.className = 'toast-av ' + g;
  av.innerHTML = '<span style="color:#fff;font-size:14px">\uD83D\uDC36</span>';
  var body = document.createElement('div');
  body.className = 'toast-body';
  var nameEl = document.createElement('div');
  nameEl.className = 'toast-name';
  nameEl.textContent = name || '';
  var textEl = document.createElement('div');
  textEl.className = 'toast-text';
  textEl.textContent = (text || '').substring(0, 60);
  body.appendChild(nameEl);
  body.appendChild(textEl);
  toast.appendChild(av);
  toast.appendChild(body);
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, 3000);
}

// ── Tab Badge ───────────────────────────────────────────────────────────────
function updateTabBadges() {
  var totalUnread = 0;
  channels.concat(dms).forEach(function(c) { totalUnread += (c.unread || 0); });
  var chatTab = document.getElementById('bnChats');
  if (chatTab) {
    var badge = chatTab.querySelector('.tab-badge');
    if (totalUnread > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'tab-badge'; chatTab.appendChild(badge); }
      badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
    } else if (badge) { badge.remove(); }
  }
}

function initSocket() {
  if (socket && socket.connected) return;
  if (socket) socket.disconnect();
  if (keepaliveInterval) clearInterval(keepaliveInterval);

  socket = io(API, {
    auth: { token: jwtToken },
    transports: ['websocket'], upgrade: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
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
    // Flush outbox
    flushOutbox();
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
  }, 4 * 60 * 1000);

  socket.on('chat_msg', function(msg) {
    var ts = new Date(msg.created_at * 1000);
    var time = ts.getHours().toString().padStart(2, '0') + ':' + ts.getMinutes().toString().padStart(2, '0');
    var from = currentUser && msg.sender_id === currentUser.id ? 'me' : 'them';
    var m = { id: msg.id, from: from, text: msg.text, time: time, sender: msg.sender_username, image: msg.image || null, audio: msg.audio || null };

    var item = findItem(msg.chat_id);

    if (!item) {
      var chatId = msg.chat_id;
      if (chatId.startsWith('dm-')) {
        var senderName = msg.sender_username || 'Пользователь';
        item = {
          id: chatId, type: 'chat', name: senderName,
          g: GS[senderName.charCodeAt(0) % GS.length],
          em: (senderName || '?')[0].toUpperCase(),
          online: true, prev: '', time: '', _ts: 0, unread: 0, msgs: [], _loaded: true,
        };
        dms.unshift(item);
        socket.emit('join', chatId);
      } else {
        return;
      }
    }

    if (item.msgs.find(function(x){ return x.id === msg.id; })) return;
    // Replace local echo with server message (avoid duplicate)
    if (from === 'me') {
      var localIdx = -1;
      for (var li = item.msgs.length - 1; li >= 0; li--) {
        if (item.msgs[li].id && item.msgs[li].id.indexOf('local-') === 0 && item.msgs[li].from === 'me') { localIdx = li; break; }
      }
      if (localIdx !== -1) {
        if (item.msgs[localIdx].image && !m.image) m.image = item.msgs[localIdx].image;
        item.msgs[localIdx] = m; render(); return;
      }
    }
    item.msgs.push(m);
    item.prev = msg.image ? '\uD83D\uDCF7 Фото' + (msg.text ? ' · ' + msg.text.substring(0, 24) : '') : msg.text.substring(0, 36);
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
    if (data.chatId !== cur) return;
    if (data.senderId === (currentUser ? currentUser.id : '')) return;
    var ind = document.getElementById('typingIndicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.id = 'typingIndicator';
      ind.className = 'typing-wrap';
      ind.innerHTML = '<span id="typingName"></span><div class="typing-dots"><span></span><span></span><span></span></div>';
      var az = document.getElementById('attachZone');
      if (az && az.parentElement) az.parentElement.insertBefore(ind, az);
    }
    if (data.isTyping) {
      var name = (data.senderName || data.username || '').split(' ')[0];
      document.getElementById('typingName').innerText = name + ' печатает';
      ind.classList.add('active');
    } else { ind.classList.remove('active'); }
    clearTimeout(window._typingClearTimer);
    if (data.isTyping) window._typingClearTimer = setTimeout(function() { if (ind) ind.classList.remove('active'); }, 3500);
  });

  socket.on('msg_deleted', function(data) {
    var item = findItem(data.chatId);
    if (!item) return;
    item.msgs = item.msgs.filter(function(m) { return m.id !== data.msgId; });
    var el = document.getElementById('msg-' + data.msgId);
    if (el) { el.style.transition = 'opacity .2s'; el.style.opacity = '0'; setTimeout(function() { el.remove(); }, 200); }
    // Update sidebar preview
    var last = item.msgs[item.msgs.length - 1];
    if (last) { item.prev = last.text ? last.text.substring(0, 36) : '\uD83D\uDCF7 Фото'; item.time = last.time; }
    else { item.prev = ''; item.time = ''; }
    render();
  });

  socket.on('msg_edited', function(data) {
    var item = findItem(data.chatId);
    if (!item) return;
    var m = item.msgs.find(function(m) { return m.id === data.msgId; });
    if (m) { m.text = data.text; m.edited = true; }
    var el = document.getElementById('msg-' + data.msgId);
    if (el) {
      var span = el.querySelector('span[style*="white-space"]');
      if (span) span.textContent = data.text;
      var meta = el.querySelector('.msg-meta') || el.querySelector('.bf');
      if (meta && !meta.querySelector('.edited')) {
        var ed = document.createElement('span');
        ed.className = 'edited';
        ed.textContent = ' (ред.)';
        ed.style.cssText = 'font-size:10px;color:var(--text3);font-style:italic';
        meta.insertBefore(ed, meta.firstChild);
      }
    }
    // Update sidebar if last message was edited
    var last = item.msgs[item.msgs.length - 1];
    if (last && last.id === data.msgId) { item.prev = data.text.substring(0, 36); }
    render();
  });

  socket.on('error_msg', function(data) {
    console.error('[socket] error_msg:', data.error);
  });

  socket.on('webrtc_signal', async function(data) {
    if (currentUser && data.senderId === currentUser.id) return;
    if (data.type === 'offer') {
      _callChatId = data.chatId;
      _pendingOffer = data.payload;
      buildCallUI(data.callerName, true);
    } else if (data.type === 'answer' && _peerConn) {
      await _peerConn.setRemoteDescription(new RTCSessionDescription(data.payload));
    } else if (data.type === 'ice' && _peerConn) {
      try { await _peerConn.addIceCandidate(new RTCIceCandidate(data.payload)); } catch(e) {}
    } else if (data.type === 'end') {
      endCall(false);
    }
  });

  socket.on('msg_reaction', function(data) {
    showReaction(data.msgId, data.emoji);
  });

  socket.on('msgs_read', function(data) {
    if (data.chatId !== cur) return;
    document.querySelectorAll('.msg-status').forEach(function(el) {
      el.textContent = '\u2713\u2713';
      el.classList.add('read');
    });
    // Update local state
    var item = findItem(cur);
    if (item) item.msgs.forEach(function(m) { if (m.from === 'me') m.is_read = true; });
  });
}
