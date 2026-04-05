// ── UI: Render, chat open, message HTML, input helpers ──────────────────────

function toast(msg, type) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:' + (type==='error'?'#ff3b30':type==='success'?'#34c759':'#333') + ';color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;font-weight:500;z-index:9999;opacity:0;transition:opacity .2s;white-space:nowrap;max-width:80vw;text-align:center';
  document.body.appendChild(t);
  setTimeout(function(){ t.style.opacity='1'; }, 10);
  setTimeout(function(){ t.style.opacity='0'; setTimeout(function(){ t.remove(); }, 200); }, 2500);
}

var _searchTimer = null;
var _swipeDocListenerAdded = false;
function debouncedSearch(val) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(function(){ sidebarSearch(val); }, 350);
}

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
    '<span style="color:#fff">' + escHtml((name || '?')[0].toUpperCase()) + '</span></div>';
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

// ── Onboarding Tour (4-screen intro) ────────────────────────────────────────
var _onbSlide = 0;
var _onbStars = [];
var _onbAnimId = null;

function showOnbTour() {
  if (localStorage.getItem('kosmos_onb_tour_done')) return;
  var el = document.getElementById('onbTour');
  el.classList.remove('gone');
  // Force reflow before removing hidden
  void el.offsetWidth;
  el.classList.remove('hidden');
  _onbSlide = 0;
  updateOnbDots();
  updateOnbTrack();
  initOnbStars();
  initOnbSwipe();
}

function initOnbStars() {
  var canvas = document.getElementById('onbCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  function resize() {
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  _onbStars = [];
  var count = Math.min(200, Math.floor(canvas.offsetWidth * canvas.offsetHeight / 3000));
  for (var i = 0; i < count; i++) {
    _onbStars.push({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      r: Math.random() * 1.8 + 0.3,
      a: Math.random(),
      speed: Math.random() * 0.008 + 0.003,
      phase: Math.random() * Math.PI * 2
    });
  }

  var t = 0;
  function draw() {
    t++;
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    for (var i = 0; i < _onbStars.length; i++) {
      var s = _onbStars[i];
      var alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.fill();
    }
    _onbAnimId = requestAnimationFrame(draw);
  }
  draw();
}

function initOnbSwipe() {
  var track = document.getElementById('onbTrack');
  var startX = 0, dx = 0, swiping = false;

  track.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    dx = 0;
    swiping = true;
    track.style.transition = 'none';
  }, { passive: true });

  track.addEventListener('touchmove', function(e) {
    if (!swiping) return;
    dx = e.touches[0].clientX - startX;
    var offset = -_onbSlide * 25 + (dx / window.innerWidth) * 25;
    track.style.transform = 'translateX(' + offset + '%)';
  }, { passive: true });

  track.addEventListener('touchend', function() {
    if (!swiping) return;
    swiping = false;
    track.style.transition = '';
    if (dx < -50 && _onbSlide < 3) {
      _onbSlide++;
    } else if (dx > 50 && _onbSlide > 0) {
      _onbSlide--;
    }
    updateOnbTrack();
    updateOnbDots();
  });
}

function updateOnbTrack() {
  var track = document.getElementById('onbTrack');
  if (track) track.style.transform = 'translateX(' + (-_onbSlide * 25) + '%)';
  var btn = document.getElementById('onbNext');
  if (btn) btn.textContent = _onbSlide === 3 ? 'Начать' : 'Далее';
}

function updateOnbDots() {
  var dots = document.querySelectorAll('#onbDots .onb-dot');
  for (var i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('active', i === _onbSlide);
  }
}

function nextOnbSlide() {
  if (_onbSlide < 3) {
    _onbSlide++;
    updateOnbTrack();
    updateOnbDots();
  } else {
    finishOnbTour();
  }
}

function finishOnbTour() {
  localStorage.setItem('kosmos_onb_tour_done', '1');
  var el = document.getElementById('onbTour');
  el.classList.add('hidden');
  if (_onbAnimId) cancelAnimationFrame(_onbAnimId);
  setTimeout(function() {
    el.classList.add('gone');
  }, 700);
}

function requestNotifPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(function(p) {
      var btn = document.querySelector('.onb-allow-btn');
      if (btn) {
        if (p === 'granted') {
          btn.textContent = '✅ Уведомления включены';
          btn.style.borderColor = '#34d399';
          btn.style.color = '#34d399';
        } else {
          btn.textContent = 'Уведомления отклонены';
          btn.style.borderColor = '#f87171';
          btn.style.color = '#f87171';
        }
        btn.disabled = true;
      }
    });
  }
}

// ── Onboarding Interests ────────────────────────────────────────────────────
function showOnboarding() {
  var el = document.getElementById('onboarding');
  el.classList.remove('hidden');
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
  } catch(e) { console.error('[Error]:', e.message || e); }
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
    if (!all.length && jwtToken) {
      var skelHtml = '';
      for (var sk = 0; sk < 6; sk++) {
        skelHtml += '<div class="ci" style="pointer-events:none"><div class="skel" style="width:52px;height:52px;border-radius:50%;background:#e5e7eb;flex-shrink:0"></div><div style="flex:1;min-width:0"><div class="skel" style="height:14px;width:60%;background:#e5e7eb;border-radius:6px;margin-bottom:8px"></div><div class="skel" style="height:11px;width:40%;background:#f3f4f6;border-radius:6px"></div></div></div>';
      }
      chList.innerHTML = pinned + skelHtml;
    } else {
      // DOM patching — reuse existing nodes
      var existingNodes = {};
      chList.querySelectorAll('.ci-wrap[data-id]').forEach(function(node) { existingNodes[node.dataset.id] = node; });
      chList.innerHTML = pinned;
      all.forEach(function(c) {
        var existing = existingNodes[String(c.id)];
        if (existing) {
          var prev = existing.querySelector('.ci-prev');
          var time = existing.querySelector('.ci-time');
          var meta = existing.querySelector('.ci-meta');
          var ci = existing.querySelector('.ci');
          if (prev) prev.textContent = c.prev || '';
          if (time) time.textContent = c.time || '';
          var badge = existing.querySelector('.badge');
          if (c.unread > 0) {
            if (!badge) { badge = document.createElement('div'); badge.className = 'badge'; if (meta) meta.appendChild(badge); }
            badge.textContent = c.unread;
          } else { if (badge) badge.remove(); }
          if (ci) ci.classList.toggle('active', cur === c.id);
          chList.appendChild(existing);
        } else {
          var temp = document.createElement('div');
          temp.innerHTML = itm(c);
          if (temp.firstElementChild) chList.appendChild(temp.firstElementChild);
        }
      });
    }
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
  return '<div class="ci-wrap" data-id="' + escAttr(c.id) + '" data-type="' + escAttr(c.type) + '">' +
    '<div class="ci-leave-bg">' + (isCh ? 'Покинуть' : 'Удалить') + '</div>' +
    '<div class="ci' + (cur === c.id ? ' active' : '') + '" onclick="openChat(\'' + escSearch(c.id) + '\')">' +
      avHtml +
      '<div class="ci-info">' +
        '<div class="ci-name">' + escHtml(c.name || '') + '</div>' +
        '<div class="ci-prev">' + escHtml(c.prev || '') + '</div>' +
      '</div>' +
      '<div class="ci-meta">' +
        '<div class="ci-time">' + escHtml(c.time || '') + '</div>' +
        (c.unread ? '<div class="badge">' + parseInt(c.unread||0) + '</div>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

function initSwipeToLeave() {
  document.querySelectorAll('.ci-wrap').forEach(function(wrap) {
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
  if (!_swipeDocListenerAdded) {
    _swipeDocListenerAdded = true;
    document.addEventListener('touchstart', function(e) {
      if (!e.target.closest('.ci-wrap.swiped') && !e.target.closest('.ci-leave-bg')) {
        document.querySelectorAll('.ci-wrap.swiped').forEach(function(el) {
          el.classList.remove('swiped','swiping');
          el.querySelector('.ci').style.transform = '';
        });
      }
    }, { passive: true });
  }

  document.querySelectorAll('.ci-leave-bg').forEach(function(btn) {
    btn.onclick = function(e) {
      e.stopPropagation();
      var wrap = btn.closest('.ci-wrap');
      var id = wrap.dataset.id;
      var type = wrap.dataset.type;
      if (type === 'chat') {
        var dm = dms.find(function(d){return d.id===id});
        showConfirm('Удалить чат с ' + (dm ? dm.name : '?') + '?', function() {
          deleteDM(id);
        }, function() {
          wrap.classList.remove('swiped','swiping');
          wrap.querySelector('.ci').style.transform = '';
        });
      } else {
        showConfirm('Покинуть канал?', function() {
          leaveChannel(id);
        }, function() {
          wrap.classList.remove('swiped','swiping');
          wrap.querySelector('.ci').style.transform = '';
        });
      }
    };
  });
}

async function leaveChannel(id) {
  try {
    var r = await apiFetch(API + '/channels/' + id + '/leave', { method: 'POST' });
    if (!r || !r.ok) { toast('Ошибка выхода из канала', 'error'); return; }
  } catch(e) { toast('Нет связи с сервером', 'error'); return; }
  var idx = channels.findIndex(function(c){return c.id===id});
  if (idx !== -1) channels.splice(idx, 1);
  if (cur === id) { cur = null; goBack(); }
  render();
}

async function deleteDM(id) {
  try { await apiFetch(API + '/chats/' + encodeURIComponent(id), { method: 'DELETE' }); } catch(e) { console.error('[Error]:', e.message || e); }
  var idx = dms.findIndex(function(d){return d.id===id});
  if (idx !== -1) dms.splice(idx, 1);
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

  if (jwtToken) {
    // Determine if we need full load or incremental
    var lastMsgId = (item.msgs.length > 0) ? item.msgs[item.msgs.length - 1].id : null;
    var endpoint = API + '/messages/' + encodeURIComponent(id) + (lastMsgId && item._loaded ? '?after=' + encodeURIComponent(lastMsgId) : '?limit=30');
    item._loaded = true;
    if (typeof item.hasMore === 'undefined') item.hasMore = true;
    fetch(endpoint, { headers: { 'Authorization': 'Bearer ' + jwtToken } })
      .then(function(r) { return r.ok ? r.json() : []; })
      .then(function(msgs) {
        if (!msgs.length) return;
        var newMsgs = msgs.map(function(m) {
          var ts = new Date(m.created_at * 1000);
          var time = ts.getHours().toString().padStart(2,'0') + ':' + ts.getMinutes().toString().padStart(2,'0');
          var from = currentUser && m.sender_id === currentUser.id ? 'me' : 'them';
          return { id: m.id, from: from, text: m.text, time: time, sender: m.sender_username, image: m.image || null, audio: m.audio || null, is_read: !!m.is_read };
        });
        if (lastMsgId) {
          // Incremental: append only new messages (dedup by id)
          var existingIds = {};
          item.msgs.forEach(function(m) { existingIds[m.id] = true; });
          newMsgs.forEach(function(m) { if (!existingIds[m.id]) item.msgs.push(m); });
        } else {
          // Full load
          item.msgs = newMsgs;
          if (newMsgs.length < 30) item.hasMore = false;
          if (newMsgs.length > 0) item.firstMsgId = newMsgs[0].id;
        }
        if (cur === id) {
          var area = document.getElementById('msgArea');
          if (area) {
            var loader = item.hasMore !== false ? '<div id="loadMoreBtn" style="text-align:center;padding:10px"><button onclick="loadOlderMsgs()" style="background:var(--bg2);border:1px solid var(--sep);border-radius:20px;padding:6px 16px;color:var(--text3);font-size:13px;cursor:pointer">Загрузить старые</button></div>' : '';
            area.innerHTML = loader + '<div class="datediv"><span>Сегодня</span></div>' +
              item.msgs.map(function(m){return mHTML(m)}).join('');
            scrollBot();
            initScrollListener(id);
          }
        }
        if (item.msgs.length) {
          var last = item.msgs[item.msgs.length-1];
          item.prev = last.text ? last.text.substring(0, 36) : (last.image ? '\uD83D\uDCF7 Фото' : '\uD83C\uDFA4 Голосовое');
          render();
        }
      }).catch(function(){});
  }

  var isCh = item.type === 'channel';
  var sub = isCh
    ? (item.slug ? '#'+escHtml(item.slug)+' · ' : '') + (item.members || 0) + ' подписчиков'
    : (item.online ? '<span style="color:var(--online);font-weight:600">● в сети</span>' : 'был(а) недавно');

  var avHtml = isCh ? defaultAvSq(item.name, 36) : defaultAv(item.name, 36);

  document.getElementById('mainArea').innerHTML =
    '<div class="chat-hdr">' +
      '<button class="back-btn" onclick="goBack()">\u2039</button>' +
      avHtml +
      '<div class="hinfo"><div class="hname">' + escHtml(item.name) + '</div><div class="hsub">' + sub + '</div></div>' +
      '<div class="hacts"><button onclick="startVideoCall()" style="background:none;border:none;color:var(--accent);font-size:24px;cursor:pointer">\uD83D\uDCDE</button><button onclick="toggleSearch()" class="hb" title="Поиск">\uD83D\uDD0D</button></div>' +
    '</div>' +
    '<div id="search-bar" style="display:none;padding:8px 12px;background:var(--bg2);border-bottom:1px solid var(--sep)"><input id="search-input" placeholder="\uD83D\uDD0D Поиск по сообщениям..." oninput="searchMessages(this.value)" style="width:100%;padding:8px 12px;border-radius:20px;border:none;background:rgba(0,0,0,0.3);color:var(--text);font-size:14px;outline:none"></div>' +
    (isCh && item.slug ? '<div style="display:flex;align-items:center;gap:8px;padding:6px 16px;background:var(--bg2);font-size:13px;border-bottom:0.5px solid var(--sep)">' +
      '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--accent)">https://c4v2jht698-ux.github.io/kosmos-frontend/?channel=' + encodeURIComponent(item.slug) + '</span>' +
      '<button onclick="copyChannelLink(\'' + escSearch(item.slug) + '\')" style="background:var(--accent);border:none;border-radius:8px;color:#fff;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">Скопировать</button>' +
    '</div>' : '') +
    '<div class="msg-area" id="msgArea">' +
      '<div class="datediv"><span>Сегодня</span></div>' +
      item.msgs.map(function(m){return mHTML(m)}).join('') +
    '</div>' +
    (isCh && String(item.created_by) !== String(currentUser && currentUser.id) ? '<div class="ro-bar">Канал только для чтения</div>' : inpHTML());
  scrollBot();
  applyChatBg();
  showChatView();
  // Mark messages as read
  if (item.msgs.some(function(m) { return m.from !== 'me' && !m.is_read; })) {
    fetch(API + '/api/messages/read', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken }, body: JSON.stringify({ chatId: id }) }).catch(function() {});
  }
}

function mHTML(m) {
  // photo debug removed — production ready
  var isMy = m.from === 'me';
  var hasPhoto = !!m.image;
  var photoHtml = hasPhoto ? '<img class="chat-photo" src="' + m.image + '" style="max-width:100%;border-radius:12px;margin-top:6px;cursor:pointer;display:block" loading="lazy" decode="async" onload="scrollBot()" onclick="openImgFull(this.src)">' : '';
  var audioHtml = '';
  if (m.audio) {
    audioHtml =
      '<div class="voice-player" onclick="togglePlay(this,\'' + escAttr(m.audio) + '\')">' +
        '<button class="voice-play-btn">\u25B6</button>' +
        '<div class="voice-waveform"></div>' +
      '</div>';
  }
  var nameHtml = '';
  if (!isMy && m.sender) {
    nameHtml = '<div style="font-size:12px;color:var(--accent);margin-bottom:4px;font-weight:bold">' + escHtml(m.sender) + '</div>';
  }
  var timeStr = m.time || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  var tickMark = m.is_read ? '\u2713\u2713' : '\u2713';
  var tickClass = m.is_read ? 'msg-status read' : 'msg-status';
  var metaHtml = '<span class="msg-meta">' + timeStr + (isMy ? ' <span class="' + tickClass + '" data-msg-id="' + escAttr(m.id) + '">' + tickMark + '</span>' : '') + '</span>';
  var bblClass = (isMy ? 'bbl my' : 'bbl') + (hasPhoto ? ' bbl-photo' : '');
  var textBlock = (m.text || '').trim();
  var textHtml = textBlock ? (hasPhoto ? '<div class="bbl-text-under-photo">' + escHtml(textBlock) + '</div>' : '<span style="white-space:pre-wrap">' + escHtml(textBlock) + '</span> ') : '';
  return '<div class="msg-row" style="display:flex;margin-bottom:12px;width:100%;justify-content:' + (isMy ? 'flex-end' : 'flex-start') + '">' +
    '<div class="' + bblClass + '" id="msg-' + escAttr(m.id || Date.now()) + '" ondblclick="sendReaction(this,\'\u2764\uFE0F\')">' +
      nameHtml + photoHtml + audioHtml + textHtml + '<span class="msg-reaction" id="react-' + escAttr(m.id || '') + '" style="font-size:16px;display:block;margin-top:2px"></span>' + metaHtml +
    '</div></div>';
}

function openImgFull(src) {
  var ov = document.createElement('div');
  ov.className = 'img-fullscreen';
  ov.onclick = function() { var img = ov.querySelector('img'); if (img) img.src = ''; ov.remove(); };
  ov.innerHTML = '<img src="' + escAttr(src) + '">';
  document.body.appendChild(ov);
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escAttr(s) {
  return escHtml(s);
}
function escSearch(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function safePhotoUrl(url) {
  if (!url) return '';
  url = String(url).trim();
  if (!/^https?:\/\//i.test(url)) return '';
  return escAttr(url);
}

function inpHTML() {
  return '<div class="inp-wrap">' +
    '<div id="attachZone" style="display:flex;flex-direction:column;gap:8px;padding:0 4px"></div>' +
    '<div class="epanel glass-panel" id="ep" style="bottom:70px;border-radius:16px">' + EMOJIS.map(function(e){return '<span class="ep" onclick="insE(\'' + e + '\')">' + e + '</span>'}).join('') + '</div>' +
    '<div style="display:flex;align-items:flex-end;gap:8px">' +
      '<button class="action-btn" onclick="openPhotoGallery()">\uD83D\uDCCE</button>' +
      '<div class="inp-box">' +
        '<textarea class="minput" id="mi" placeholder="Сообщение..." rows="1" maxlength="500" onkeydown="hKey(event)" oninput="onInput(this)" style="flex:1;border:none;background:transparent;resize:none;font-family:inherit;outline:none"></textarea>' +
        '<button class="action-btn" onclick="togE()" style="padding:4px;font-size:20px">\uD83D\uDE42</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:flex-end;padding-bottom:4px">' +
        '<button id="micBtn" class="action-btn" onmousedown="startVoice()" onmouseup="stopVoice()" ontouchstart="startVoice()" ontouchend="stopVoice()" style="background:rgba(255,255,255,0.1);border-radius:50%;width:40px;height:40px">\uD83C\uDFA4</button>' +
        '<button class="sbtn" onclick="send()">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<input type="file" id="photoInput" accept="image/*" style="display:none" onchange="handlePhotoSelect(this)">' +
    '<span class="char-counter" id="charCount"></span>' +
  '</div>';
}

function hKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
function aRes(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 130) + 'px'; }
function onInput(el) {
  aRes(el);
  if (socket && socket.connected && cur) socket.emit('typing', { chatId: cur, isTyping: true });
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
  d.innerHTML = mHTML(msg);
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
        (u.status ? '<div style="font-size:14px;color:var(--text2);margin-top:6px">' + escHtml(u.mood||'') + ' ' + escHtml(u.status) + '</div>' : '') +
        '<div class="profile-section" id="badgeSection"><div class="profile-section-title">Достижения</div><div style="text-align:center;color:var(--text3);padding:8px">Загрузка...</div></div>' +
        '<div class="profile-section">' +
          '<div class="profile-section-title">Настройки</div>' +
          '<div class="profile-row" onclick="openEditProfile()"><div class="profile-row-label">Редактировать профиль</div><div class="profile-row-val">\u203A</div></div>' +
          '<div class="profile-row" onclick="openStatusEditor()"><div class="profile-row-label">Статус и настроение</div><div class="profile-row-val">' + escHtml(u.mood||'') + ' \u203A</div></div>' +
          '<div class="profile-row" onclick="showOnboarding()"><div class="profile-row-label">Изменить интересы</div><div class="profile-row-val">' + interests.length + ' выбрано \u203A</div></div>' +
          '<div class="profile-row" onclick="toggleTheme();openProfileScreen()"><div class="profile-row-label">Тема оформления</div><div class="profile-row-val">' + ({blue:'Голубая',pink:'Розовая'}[document.documentElement.getAttribute('data-theme')]||'Голубая') + ' \u203A</div></div>' +
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
          '<input class="minp" id="epName" value="' + escAttr(u.username || '') + '">' +
          '<div class="auth-label">О себе</div>' +
          '<textarea class="minp" id="epBio" rows="3" placeholder="Расскажи о себе...">' + escHtml(u.bio || '') + '</textarea>' +
          '<div class="auth-label">Возраст</div>' +
          '<input class="minp" id="epAge" type="number" value="' + escAttr(u.age || '') + '" placeholder="25">' +
          '<div class="auth-label">Город</div>' +
          '<input class="minp" id="epCity" value="' + escAttr(u.city || '') + '" placeholder="Москва">' +
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
async function openPinned(type) {
  cur = null; render();
  var main = document.getElementById('mainArea');

  if (type === 'important') {
    var saved = await localforage.getItem('kosmos_notes') || [];
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
      '</div><button class="sbtn" onclick="saveNote()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L9 9H4l4 4-2 7 6-4 6 4-2-7 4-4h-5z"/></svg></button></div>';
    scrollBot(); showChatView();
  } else if (type === 'ai') {
    aiMessages = await localforage.getItem('kosmos_ai_history') || [];
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
      '</div><button class="sbtn" onclick="sendAI()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L9 9H4l4 4-2 7 6-4 6 4-2-7 4-4h-5z"/></svg></button></div>';
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
  }, 30000);
}

// ── Build Dating View ────────────────────────────────────────────────────────
var datingTheme = localStorage.getItem('dating_theme') || 'pink';

var DT = {
  pink: {
    bg: 'linear-gradient(160deg,#fce4f3,#e8d5f5,#dbeafe)',
    title: '\u0417\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u0430 \uD83D\uDC95',
    titleColor: '#1a1a2e', subColor: '#9b6ab5',
    cardShadow: '0 4px 24px rgba(180,100,200,0.15)',
    photoBg: 'linear-gradient(135deg,#fce4f3,#e8d5f5,#dbeafe)',
    likeBg: 'linear-gradient(135deg,#f472b6,#ec4899)', likeShadow: '0 6px 20px rgba(236,72,153,0.45)',
    skipBorder: '#fecdd3', superBorder: '#bfdbfe',
    tagBg: '#fce7f3', tagColor: '#be185d',
    commonColor: '#be185d', statNum: '#9b6ab5',
  },
  sky: {
    bg: 'linear-gradient(160deg,#e0f2fe,#dbeafe,#ede9fe)',
    title: '\u0417\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u0430 \uD83C\uDF24',
    titleColor: '#0c4a6e', subColor: '#0369a1',
    cardShadow: '0 4px 24px rgba(3,105,161,0.12)',
    photoBg: 'linear-gradient(135deg,#e0f2fe,#dbeafe,#ede9fe)',
    likeBg: 'linear-gradient(135deg,#0ea5e9,#6366f1)', likeShadow: '0 6px 20px rgba(14,165,233,0.4)',
    skipBorder: '#fecdd3', superBorder: '#7dd3fc',
    tagBg: '#e0f2fe', tagColor: '#0369a1',
    commonColor: '#0369a1', statNum: '#0369a1',
  }
};

function setDatingTheme(theme) {
  datingTheme = theme;
  localStorage.setItem('dating_theme', theme);
  var main = document.getElementById('mainArea');
  if (main) buildDatingView(main);
}

function goBackFromDating() {
  document.body.classList.remove('dating-open');
  navTo('chats');
}

function buildDatingView(main) {
  document.body.classList.add('dating-open');
  var t = DT[datingTheme] || DT.pink;
  main.innerHTML =
    '<div class="dating-wrap" style="background:' + t.bg + '">' +
      '<div class="dating-hdr">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<button onclick="goBackFromDating()" style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.6);border:none;font-size:20px;cursor:pointer">\u2039</button>' +
          '<div>' +
            '<div class="dating-title" style="color:' + t.titleColor + '">' + t.title + '</div>' +
            '<div class="dating-sub" style="color:' + t.subColor + '">\u041D\u0430\u0439\u0434\u0438 \u0441\u0432\u043E\u0435\u0433\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div class="dt-toggle">' +
            '<div class="dt-toggle-item' + (datingTheme === 'pink' ? ' active' : '') + '" onclick="setDatingTheme(\'pink\')">\uD83C\uDF38</div>' +
            '<div class="dt-toggle-item' + (datingTheme === 'sky' ? ' active' : '') + '" onclick="setDatingTheme(\'sky\')">\uD83C\uDF24</div>' +
          '</div>' +
          '<div class="dt-toggle-item" style="width:32px;height:32px;background:rgba(255,255,255,0.6);border-radius:50%;border:1px solid rgba(255,255,255,0.9);cursor:pointer" onclick="openDatingProfile()">\u2699\uFE0F</div>' +
        '</div>' +
      '</div>' +
      '<div class="dating-stats" id="datingStats">' +
        '<div class="dating-stat"><div class="dating-stat-num" style="color:' + t.statNum + '">0</div><div class="dating-stat-lbl">\u041C\u044D\u0442\u0447\u0438</div></div>' +
        '<div class="dating-stat"><div class="dating-stat-num" style="color:' + t.statNum + '">0</div><div class="dating-stat-lbl">\u041B\u0430\u0439\u043A\u0438</div></div>' +
        '<div class="dating-stat"><div class="dating-stat-num" style="color:' + t.statNum + '">0</div><div class="dating-stat-lbl">\u041E\u043D\u043B\u0430\u0439\u043D</div></div>' +
      '</div>' +
      '<div id="datingArea" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden">' +
        '<div style="color:' + t.subColor + '">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</div>' +
      '</div>' +
    '</div>';
  loadDatingCards();
  loadDatingStats();
}

async function loadDatingStats() {
  try {
    var res = await fetch(API + '/dating/stats', { headers: { 'Authorization': 'Bearer ' + jwtToken } });
    if (!res.ok) return;
    var s = await res.json();
    var t = DT[datingTheme] || DT.pink;
    var el = document.getElementById('datingStats');
    if (el) el.innerHTML =
      '<div class="dating-stat"><div class="dating-stat-num" style="color:' + t.statNum + '">' + (s.matches || 0) + '</div><div class="dating-stat-lbl">\u041C\u044D\u0442\u0447\u0438</div></div>' +
      '<div class="dating-stat"><div class="dating-stat-num" style="color:' + t.statNum + '">' + (s.likes || 0) + '</div><div class="dating-stat-lbl">\u041B\u0430\u0439\u043A\u0438</div></div>' +
      '<div class="dating-stat"><div class="dating-stat-num" style="color:' + t.statNum + '">' + (s.online || 0) + '</div><div class="dating-stat-lbl">\u041E\u043D\u043B\u0430\u0439\u043D</div></div>';
  } catch(e) { console.error('[Error]:', e.message || e); }
}

async function saveNote() {
  var inp = document.getElementById('mi');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = 'auto';
  var now = new Date();
  var time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  var saved = await localforage.getItem('kosmos_notes') || [];
  saved.push({ text: text, time: time });
  localforage.setItem('kosmos_notes', saved);
  var area = document.getElementById('msgArea');
  var d = document.createElement('div');
  d.innerHTML = '<div class="msg me"><div class="bbl">' + escHtml(text) + '<div class="bf"><span class="mt">' + time + '</span></div></div></div>';
  area.appendChild(d.firstChild);
  scrollBot();
}

// ── AI Chat ──────────────────────────────────────────────────────────────────
var aiMessages = [];

function stripMd(t) {
  if (!t) return t;
  return t
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]{3,}$/gm, '')
    .trim();
}

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
    var history = aiMessages.slice(-4).map(function(m) {
      return { role: m.role, content: m.content };
    });
    console.log('Отправлено контекста:', history.length);
    var res = await fetch(API + '/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ prompt: text, history: history, chatId: 'gigachat-local' }),
    });
    var data = await res.json();
    loading.remove();

    data.gemini = stripMd(data.gemini);
    data.claude = stripMd(data.claude);

    var aiTime = new Date().getHours().toString().padStart(2,'0') + ':' + new Date().getMinutes().toString().padStart(2,'0');

    if (data.gemini) {
      aiMessages.push({ role: 'assistant', content: 'Gemini: ' + data.gemini, time: aiTime });
      var dG = document.createElement('div');
      dG.innerHTML = '<div class="msg them"><div class="bbl" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd"><b>\u2728 Gemini:</b><br>' + escHtml(data.gemini) + '<div class="bf"><span class="mt">' + aiTime + '</span></div></div></div>';
      area.appendChild(dG.firstChild);
    }

    if (data.claude) {
      aiMessages.push({ role: 'assistant', content: 'Claude: ' + data.claude, time: aiTime });
      var dC = document.createElement('div');
      dC.innerHTML = '<div class="msg them"><div class="bbl" style="background:#fce7f3;color:#be185d;border:1px solid #fbcfe8"><b>\uD83E\uDDE0 Claude:</b><br>' + escHtml(data.claude) + '<div class="bf"><span class="mt">' + aiTime + '</span></div></div></div>';
      area.appendChild(dC.firstChild);
    }

    scrollBot();
    localforage.setItem('kosmos_ai_history', aiMessages.slice(-50));

  } catch(e) {
    loading.remove();
    var err = document.createElement('div');
    err.innerHTML = '<div class="msg them"><div class="bbl">Ошибка: ИИ-сотрудники не отвечают<div class="bf"><span class="mt">\u2014</span></div></div></div>';
    area.appendChild(err.firstChild);
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
  console.log('[feed] loading...');
  if (feedLoading) return;
  feedLoading = true;
  var list = document.getElementById('feedList');
  var loader = document.getElementById('feedLoader');
  if (loader) loader.textContent = '';
  if (feedOffset === 0 && list) {
    try {
      var cached = await localforage.getItem('feed_cache') || [];
      if (cached.length) list.innerHTML = cached.map(function(p){return postCard(p)}).join('');
    } catch(e) { console.error('[Error]:', e.message || e); }
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
      try { await localforage.setItem('feed_cache', posts.slice(0, 10)); } catch(e) { console.error('[Error]:', e.message || e); }
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
    ? '<button onclick="toggleSub(\'' + escSearch(p.channel_id) + '\',this);event.stopPropagation()" style="background:var(--accent);border:none;border-radius:20px;color:#fff;font-size:12px;font-weight:600;padding:4px 14px;cursor:pointer;margin-left:auto">Подписаться</button>'
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
  var nameClick = authorId ? ' onclick="openPublicProfile(\'' + escSearch(authorId) + '\')"' : '';

  return '<div data-pid="' + escAttr(p.id) + '" style="display:flex;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--sep);background:var(--card)">' +
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
          return '<button onclick="postReact(this,\'' + escSearch(p.id) + '\',\'' + r + '\')" style="background:' + (active?'rgba(124,58,237,0.15)':'var(--bg)') + ';border:1px solid ' + (active?'var(--accent)':'var(--sep)') + ';border-radius:20px;padding:3px 8px;cursor:pointer;font-size:14px;transition:all .15s">' + REACTION_MAP[r] + '</button>';
        }).join('') +
        (reactHtml ? '<span style="margin-left:6px;color:var(--text3);font-size:12px;display:flex;align-items:center;gap:4px">' + reactHtml + '</span>' : '') +
      '</div>' +
      // Action bar
      '<div style="display:flex;gap:16px">' +
        '<button onclick="openComments(\'' + escSearch(p.id) + '\')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;display:flex;align-items:center;gap:4px;padding:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' + (p.commentCount||'') + '</button>' +
        '<button onclick="feedShare(\'' + escSearch(p.id) + '\')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;display:flex;align-items:center;gap:4px;padding:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>' +
      '</div>' +
    '</div></div>';
}

async function feedShare(postId) {
  var choice = prompt('Куда отправить?\n1 \u2014 Другу (@username)\n2 \u2014 В Важное (заметки)\n\nВведите 1 или 2:');
  if (choice === '2') {
    var post = document.querySelector('[data-pid="' + postId + '"]');
    var text = post ? (post.querySelector('div[style*="pre-wrap"]') || {}).textContent || '' : '';
    var saved = await localforage.getItem('kosmos_notes') || [];
    var time = new Date().getHours().toString().padStart(2,'0') + ':' + new Date().getMinutes().toString().padStart(2,'0');
    saved.push({ text: '\uD83D\uDCCC ' + text, time: time });
    localforage.setItem('kosmos_notes', saved);
    toast('Сохранено в Важное!', 'success');
  } else if (choice === '1') {
    var handle = prompt('Введите @username друга:');
    if (!handle) return;
    try {
      var users = await (await fetch(API+'/users?search='+encodeURIComponent(handle),{headers:{'Authorization':'Bearer '+jwtToken}})).json();
      if (!users.length) { toast('Пользователь не найден', 'error'); return; }
      await fetch(API+'/feed/'+postId+'/share',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwtToken},body:JSON.stringify({targetUserId:users[0].id})});
      toast('Отправлено!', 'success');
    } catch(e) { toast('Ошибка', 'error'); }
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
  } catch(e) { console.error('[Error]:', e.message || e); }
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
        '<button class="sbtn" onclick="submitComment(\'' + escSearch(postId) + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L9 9H4l4 4-2 7 6-4 6 4-2-7 4-4h-5z"/></svg></button>' +
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
  } catch(e) { console.error('[Error]:', e.message || e); }
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
  } catch(e) { console.error('[Error]:', e.message || e); }
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
          return '<div class="ci" onclick="openPublicProfile(\'' + escSearch(u.id) + '\')">' +
            defaultAv(u.username) +
            '<div class="ci-info"><div class="ci-name">' + escHtml(u.username) + '</div><div class="ci-prev">@' + escHtml(u.handle||'') + '</div></div>' +
            '<button onclick="event.stopPropagation();startDM(\'' + escSearch(u.id) + '\',\'' + escSearch(u.username) + '\',\'' + escSearch(u.handle||'') + '\')" style="background:var(--accent);border:none;border-radius:20px;color:#fff;font-size:12px;padding:5px 14px;cursor:pointer;font-weight:600">Написать</button>' +
          '</div>';
        }).join('');
      } else {
        var r = await fetch(API + '/channels?search=' + encodeURIComponent(q), { headers: { 'Authorization': 'Bearer ' + jwtToken } });
        var chs = await r.json();
        if (!chs.length) { res.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)">Каналов не найдено</div>'; return; }
        res.innerHTML = chs.map(function(c) {
          return '<div class="ci" onclick="joinChannel(\'' + escSearch(c.id) + '\',\'' + escSearch(c.name) + '\',\'' + escSearch(c.slug||'') + '\')">' +
            defaultAvSq(c.name) +
            '<div class="ci-info"><div class="ci-name">' + escHtml(c.name) + '</div><div class="ci-prev">' + (c.members||0) + ' участников</div></div>' +
            '<button onclick="event.stopPropagation();joinChannel(\'' + escSearch(c.id) + '\',\'' + escSearch(c.name) + '\',\'' + escSearch(c.slug||'') + '\')" style="background:var(--accent);border:none;border-radius:20px;color:#fff;font-size:12px;padding:5px 14px;cursor:pointer;font-weight:600">Подписаться</button>' +
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
      navigator.clipboard.writeText(link).then(function() { toast('Ссылка скопирована!', 'success'); }).catch(function() { toast('Не удалось скопировать', 'error'); });
    }
  } catch(e) { toast('Ошибка', 'error'); }
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
      var t = DT[datingTheme] || DT.pink;
      area.innerHTML = '<div style="text-align:center"><div style="font-size:48px;margin-bottom:12px">\uD83D\uDC9C</div><div style="font-size:18px;font-weight:700;color:' + t.titleColor + '">\u0421\u0432\u0430\u0439\u043F\u0430\u0439 \u0431\u043E\u043B\u044C\u0448\u0435!</div><div style="font-size:14px;color:' + t.subColor + ';margin-top:6px">\u041D\u043E\u0432\u044B\u0435 \u043B\u044E\u0434\u0438 \u043F\u043E\u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C.<br>\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044C (\u2699) \u0447\u0442\u043E\u0431\u044B \u0432\u0430\u0441 \u043D\u0430\u0445\u043E\u0434\u0438\u043B\u0438</div></div>';
      return;
    }
    showDatingCard();
  } catch(e) {
    area.innerHTML = '<div style="color:var(--text3)">Ошибка загрузки</div>';
  }
}

function showDatingCard() {
  var area = document.getElementById('datingArea');
  var t = DT[datingTheme] || DT.pink;
  if (!area || datingIdx >= datingCards.length) {
    if (area) area.innerHTML = '<div style="text-align:center"><div style="font-size:48px;margin-bottom:12px">\u2728</div><div style="font-size:18px;font-weight:700;color:' + t.titleColor + '">\u0410\u043D\u043A\u0435\u0442\u044B \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C</div><div style="font-size:14px;color:' + t.subColor + ';margin-top:6px">\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435</div></div>';
    return;
  }
  var u = datingCards[datingIdx];
  var theirInterests = u.interests || [];
  var common = myInterests.filter(function(i) { return theirInterests.indexOf(i) !== -1; });
  var interestTags = theirInterests.map(function(i) {
    var found = INTERESTS.find(function(x){return x.id === i});
    var isCommon = common.indexOf(i) !== -1;
    return '<span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;background:' + (isCommon ? 'rgba(124,58,237,0.2)' : t.tagBg) + ';color:' + t.tagColor + '">' +
      (found ? found.emoji + ' ' : '') + i + '</span>';
  }).join('');

  // Dots for card index
  var total = Math.min(datingCards.length, 6);
  var dots = '<div class="dating-dots">';
  for (var d = 0; d < total; d++) {
    dots += '<div class="dating-dot' + (d === datingIdx % total ? ' active' : '') + '"></div>';
  }
  dots += '</div>';

  area.innerHTML =
    '<div class="dating-card" id="datingCardEl">' +
      '<div class="dating-card-inner" style="box-shadow:' + t.cardShadow + '">' +
        '<div class="dating-photo" style="background:' + t.photoBg + '">' +
          dots +
          (safePhotoUrl(u.photo) ? '<img src="' + safePhotoUrl(u.photo) + '">' : '<span style="font-size:80px">\uD83D\uDC36</span>') +
        '</div>' +
        '<div class="dating-info">' +
          '<div class="dating-name">' + escHtml(u.username) + (u.age ? ', ' + u.age : '') + '</div>' +
          (u.handle ? '<div class="dating-handle">@' + escHtml(u.handle) + '</div>' : '') +
          (u.city ? '<div class="dating-city">\uD83D\uDCCD ' + escHtml(u.city) + '</div>' : '') +
          (u.bio ? '<div class="dating-bio">' + escHtml(u.bio) + '</div>' : '') +
          (interestTags ? '<div class="dating-interests">' + interestTags + '</div>' : '') +
          (common.length ? '<div class="dating-common" style="color:' + t.commonColor + '">\u2728 \u041E\u0431\u0449\u0438\u0445 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043E\u0432: ' + common.length + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="dating-actions">' +
        '<div style="text-align:center">' +
          '<button class="dating-btn dating-btn-sm" style="border:2px solid ' + t.skipBorder + '" onclick="datingAction(\'' + escSearch(u.id) + '\',\'skip\')">&#10005;</button>' +
          '<div class="dating-btn-label">\u041F\u0440\u043E\u043F\u0443\u0441\u043A</div>' +
        '</div>' +
        '<div style="text-align:center">' +
          '<button class="dating-btn dating-btn-lg" style="background:' + t.likeBg + ';box-shadow:' + t.likeShadow + '" onclick="datingAction(\'' + escSearch(u.id) + '\',\'like\')">\u2764\uFE0F</button>' +
          '<div class="dating-btn-label">\u041D\u0440\u0430\u0432\u0438\u0442\u0441\u044F</div>' +
        '</div>' +
        '<div style="text-align:center">' +
          '<button class="dating-btn dating-btn-sm" style="border:2px solid ' + t.superBorder + '" onclick="datingAction(\'' + escSearch(u.id) + '\',\'super\')">\u2B50</button>' +
          '<div class="dating-btn-label">\u0421\u0443\u043F\u0435\u0440</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  // Hammer.js swipe on card
  setTimeout(function() {
    var cardEl = document.querySelector('.dating-card-inner');
    if (cardEl && typeof Hammer !== 'undefined') {
      var hm = new Hammer(cardEl, { recognizers: [[Hammer.Pan, { direction: Hammer.DIRECTION_HORIZONTAL, threshold: 10 }]] });
      var uid = datingCards[datingIdx] ? datingCards[datingIdx].id : null;
      hm.on('pan', function(ev) {
        var r = Math.min(Math.max(ev.deltaX / 12, -15), 15);
        cardEl.style.transform = 'translateX(' + ev.deltaX + 'px) rotate(' + r + 'deg)';
        cardEl.style.transition = 'none';
      });
      hm.on('panend', function(ev) {
        if (Math.abs(ev.deltaX) > 100 && uid) {
          var act = ev.deltaX > 0 ? 'like' : 'skip';
          cardEl.style.transition = 'transform .3s ease';
          cardEl.style.transform = 'translateX(' + (ev.deltaX > 0 ? 500 : -500) + 'px) rotate(' + (ev.deltaX > 0 ? 30 : -30) + 'deg)';
          setTimeout(function() { datingAction(uid, act); }, 250);
        } else {
          cardEl.style.transition = 'transform .25s ease';
          cardEl.style.transform = '';
        }
      });
    }
  }, 50);
}

async function datingAction(targetId, action) {
  var card = document.getElementById('datingCardEl');
  if (card) card.classList.add(action === 'like' || action === 'super' ? 'swipe-right' : 'swipe-left');
  var t = DT[datingTheme] || DT.pink;

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
            '<div style="text-align:center">' +
              '<div style="font-size:72px;margin-bottom:16px">\uD83C\uDF89</div>' +
              '<div style="font-size:26px;font-weight:700;color:' + t.titleColor + ';margin-bottom:8px">\u042D\u0442\u043E \u043C\u044D\u0442\u0447!</div>' +
              '<div style="font-size:14px;color:' + t.subColor + ';margin-bottom:24px">\u0412\u044B \u043F\u043E\u043D\u0440\u0430\u0432\u0438\u043B\u0438\u0441\u044C \u0434\u0440\u0443\u0433 \u0434\u0440\u0443\u0433\u0443</div>' +
              '<button onclick="openMatchChat(\'' + escSearch(targetId) + '\')" style="background:' + t.likeBg + ';border:none;border-radius:14px;color:#fff;padding:14px 32px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;box-shadow:' + t.likeShadow + '">\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u2192</button>' +
              '<br><button onclick="datingIdx++;showDatingCard()" style="background:none;border:none;color:' + t.subColor + ';margin-top:12px;cursor:pointer;font-size:13px">\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440</button>' +
            '</div>';
        }
        // Auto-open chat after 2s
        setTimeout(function() { openMatchChat(targetId); }, 2000);
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
          '<input class="minp" id="dpAge" type="number" placeholder="25" value="' + escAttr(p.age || '') + '">' +
          '<div class="auth-label">Город</div>' +
          '<input class="minp" id="dpCity" placeholder="Москва" value="' + escAttr(p.city || '') + '">' +
          '<div class="auth-label">Фото (URL)</div>' +
          '<input class="minp" id="dpPhoto" placeholder="https://..." value="' + escAttr(p.photo || '') + '">' +
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
  else { var d = await r.json(); toast(d.error || 'Ошибка', 'error'); }
}

function copyChannelLink(slug) {
  var url = 'https://c4v2jht698-ux.github.io/kosmos-frontend/?channel=' + encodeURIComponent(slug);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() { toast('Ссылка скопирована'); }).catch(function() { fallbackCopy(url); });
  } else { fallbackCopy(url); }
}
function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Ссылка скопирована'); } catch(e) { toast('Не удалось скопировать', 'error'); }
  document.body.removeChild(ta);
}

// ── Utilities ───────────────────────────────────────────────────────────────
function insE(e) { var i = document.getElementById('mi'); if (i) { i.value += e; i.focus(); } var ep = document.getElementById('ep'); if (ep) ep.classList.remove('open'); }
function scrollBot() { var a = document.getElementById('msgArea'); if (a) a.scrollTop = a.scrollHeight; }

function initScrollListener(chatId) {
  var area = document.getElementById('msgArea');
  if (!area || area._scrollListenerSet) return;
  area._scrollListenerSet = true;
  area.addEventListener('scroll', function() {
    if (area.scrollTop < 80) loadOlderMsgs();
  });
}

async function loadOlderMsgs() {
  var item = findItem(cur);
  if (!item || item.hasMore === false || item._loadingOlder || !item.firstMsgId) return;
  item._loadingOlder = true;
  var btn = document.getElementById('loadMoreBtn');
  if (btn) btn.innerHTML = '<span style="color:var(--text3);font-size:13px">Загрузка...</span>';
  try {
    var r = await fetch(API + '/messages/' + encodeURIComponent(cur) + '?before=' + encodeURIComponent(item.firstMsgId) + '&limit=30', {
      headers: { 'Authorization': 'Bearer ' + jwtToken }
    });
    var msgs = r.ok ? await r.json() : [];
    if (!msgs.length) { item.hasMore = false; if (btn) btn.remove(); item._loadingOlder = false; return; }
    var olderMsgs = msgs.map(function(m) {
      var ts = new Date(m.created_at * 1000);
      var time = ts.getHours().toString().padStart(2,'0') + ':' + ts.getMinutes().toString().padStart(2,'0');
      var from = currentUser && m.sender_id === currentUser.id ? 'me' : 'them';
      return { id: m.id, from: from, text: m.text, time: time, sender: m.sender_username, image: m.image || null, audio: m.audio || null, is_read: !!m.is_read };
    });
    if (olderMsgs.length < 30) item.hasMore = false;
    item.firstMsgId = olderMsgs[0].id;
    item.msgs = olderMsgs.concat(item.msgs);
    // Re-render preserving scroll position
    var area = document.getElementById('msgArea');
    if (area) {
      var oldHeight = area.scrollHeight;
      var loader = item.hasMore !== false ? '<div id="loadMoreBtn" style="text-align:center;padding:10px"><button onclick="loadOlderMsgs()" style="background:var(--bg2);border:1px solid var(--sep);border-radius:20px;padding:6px 16px;color:var(--text3);font-size:13px;cursor:pointer">Загрузить старые</button></div>' : '';
      area.innerHTML = loader + '<div class="datediv"><span>Сегодня</span></div>' +
        item.msgs.map(function(m){return mHTML(m)}).join('');
      area.scrollTop = area.scrollHeight - oldHeight;
    }
  } catch(e) { console.error('[Error]:', e.message || e); }
  item._loadingOlder = false;
}
function showChatView() {
  document.body.classList.add('chat-open');
  history.pushState({ chat: true }, '');
  if (window.innerWidth < 769) {
    var bn = document.getElementById('bottomNav');
    if (bn) bn.style.display = 'none';
  }
}
function goBack() {
  document.body.classList.remove('chat-open');
  document.body.classList.remove('dating-open');
  cur = null;
  render();
  var bn = document.getElementById('bottomNav');
  if (bn) bn.style.display = 'flex';
}

// ── Context Menu (long press on message) ────────────────────────────────────
var _longPressTimer = null;
var _mainAreaNode = document.getElementById('mainArea');
if (_mainAreaNode) {
  _mainAreaNode.addEventListener('touchstart', startPress, { passive: true });
  _mainAreaNode.addEventListener('touchend', cancelPress);
  _mainAreaNode.addEventListener('touchmove', cancelPress);
  _mainAreaNode.addEventListener('mousedown', startPress);
  _mainAreaNode.addEventListener('mouseup', cancelPress);
  _mainAreaNode.addEventListener('mousemove', cancelPress);
  _mainAreaNode.addEventListener('contextmenu', function(e) {
    var bbl = e.target.closest('.bbl');
    if (bbl) {
      e.preventDefault();
      var x = e.clientX, y = e.clientY;
      showContextMenu(bbl, x, y);
    }
  });
}
function startPress(e) {
  var bbl = e.target.closest('.bbl');
  if (!bbl) return;
  var x = e.touches ? e.touches[0].clientX : e.clientX;
  var y = e.touches ? e.touches[0].clientY : e.clientY;
  _longPressTimer = setTimeout(function() {
    _longPressTimer = null;
    showContextMenu(bbl, x, y);
  }, 500);
}
function cancelPress() {
  if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
}
document.addEventListener('click', function() { var m = document.querySelector('.ctx-menu'); if (m) m.remove(); });

function showContextMenu(bbl, x, y) {
  console.log('Меню должно открыться в:', x, y);
  var old = document.querySelector('.ctx-menu');
  if (old) old.remove();

  // Find msg ID — bbl itself has id="msg-..." in new layout, or check parent
  var msgId = bbl.id ? bbl.id.replace('msg-', '') : null;
  if (!msgId) { var msgEl = bbl.closest('[id^="msg-"]'); if (msgEl) msgId = msgEl.id.replace('msg-', ''); }
  var isMine = bbl.classList.contains('my');
  if (!isMine) { var p = bbl.closest('.msg-row,.msg'); if (p) isMine = p.style.justifyContent === 'flex-end' || p.classList.contains('me'); }
  console.log('Контекстное меню вызвано для сообщения:', msgId, 'isMine:', isMine);

  // Extract clean text (try text, then content, then innerText)
  var clone = bbl.cloneNode(true);
  var meta = clone.querySelector('.msg-meta');
  if (meta) meta.remove();
  var txt = clone.innerText.trim();
  if (!txt && bbl.dataset && bbl.dataset.content) txt = bbl.dataset.content;

  var menu = document.createElement('div');
  menu.className = 'ctx-menu glass-panel';
  var menuX = x > window.innerWidth - 180 ? window.innerWidth - 180 : x;
  menu.style.cssText = 'position:fixed;top:' + y + 'px;left:' + menuX + 'px;z-index:9999;display:flex;flex-direction:column;min-width:170px';
  menu.dataset.text = txt;
  menu.dataset.msgId = msgId || '';

  var html = '<button class="ctx-btn" onclick="setReply(this)"><span>\u21A9</span> Ответить</button>';
  html += '<button class="ctx-btn" onclick="copyMsgText(this)"><span>\uD83D\uDCCB</span> Копировать</button>';
  html += '<button class="ctx-btn" onclick="copyFullMsg(\'' + escSearch(msgId || '') + '\')"><span>\uD83D\uDCCB</span> Копировать всё</button>';
  if (isMine && msgId) {
    html += '<hr style="margin:0;border:none;border-top:1px solid var(--glass-border)">';
    html += '<button class="ctx-btn" onclick="editMessage(\'' + escSearch(msgId) + '\',this)"><span>\u270F\uFE0F</span> Изменить</button>';
    html += '<button class="ctx-btn danger" onclick="deleteMessage(\'' + escSearch(msgId) + '\',this)"><span>\uD83D\uDDD1</span> Удалить</button>';
  }
  menu.innerHTML = html;
  document.body.appendChild(menu);
  var rect = menu.getBoundingClientRect();
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
}

function deleteMessage(msgId, el) {
  var menu = el.closest('.ctx-menu');
  if (menu) menu.remove();
  if (!msgId || !socket || !socket.connected || !cur) return;
  socket.emit('delete_msg', { chatId: cur, msgId: msgId });
  // Optimistic: remove from DOM immediately
  var msgEl = document.getElementById('msg-' + msgId);
  if (msgEl) { msgEl.style.transition = 'opacity .2s'; msgEl.style.opacity = '0'; setTimeout(function() { msgEl.remove(); }, 200); }
  // Remove from local msgs array
  var item = findItem(cur);
  if (item) item.msgs = item.msgs.filter(function(m) { return m.id !== msgId; });
}

function editMessage(msgId, el) {
  var menu = el.closest('.ctx-menu');
  var oldText = menu ? menu.dataset.text : '';
  if (menu) menu.remove();
  if (!msgId || !socket || !socket.connected || !cur) return;
  var newText = prompt('Редактировать сообщение:', oldText);
  if (newText === null || newText.trim() === oldText) return;
  newText = newText.trim();
  if (!newText) return;
  socket.emit('edit_msg', { chatId: cur, msgId: msgId, newText: newText });
  // Optimistic: update DOM immediately
  var msgEl = document.getElementById('msg-' + msgId);
  if (msgEl) {
    var span = msgEl.querySelector('span[style*="white-space"]');
    if (span) span.textContent = newText;
    // Add edited indicator
    var bf = msgEl.querySelector('.bf');
    if (bf && !bf.querySelector('.edited')) {
      var ed = document.createElement('span');
      ed.className = 'edited';
      ed.textContent = ' (ред.)';
      ed.style.cssText = 'font-size:10px;color:var(--text3);font-style:italic';
      bf.insertBefore(ed, bf.firstChild);
    }
  }
  // Update local msgs
  var item = findItem(cur);
  if (item) {
    var m = item.msgs.find(function(m) { return m.id === msgId; });
    if (m) { m.text = newText; m.edited = true; }
  }
}

function copyMsgText(el) {
  var menu = el.closest('.ctx-menu');
  var text = menu ? menu.dataset.text : '';
  navigator.clipboard.writeText(text).then(function() {
    toast('Скопировано', 'success');
  }).catch(function() {});
  if (menu) menu.remove();
}

function copyFullMsg(msgId) {
  var menu = document.querySelector('.ctx-menu');
  if (menu) menu.remove();
  var msgEl = msgId ? document.getElementById('msg-' + msgId) : null;
  var fullText = '';
  if (msgEl) {
    var clone = msgEl.cloneNode(true);
    var meta = clone.querySelector('.msg-meta');
    if (meta) meta.remove();
    fullText = clone.innerText.trim();
  }
  if (!fullText) return;
  navigator.clipboard.writeText(fullText).then(function() {
    toast('Текст скопирован', 'success');
  }).catch(function() {});
}

// ── Reply to Message ────────────────────────────────────────────────────────
var _replyTo = null;
function setReply(el) {
  var menu = el.closest('.ctx-menu');
  var text = menu ? menu.dataset.text : '';
  if (menu) menu.remove();
  _replyTo = { text: text.substring(0, 80) };

  var zone = document.getElementById('attachZone');
  if (!zone) return;

  var existing = zone.querySelector('.reply-quote');
  if (existing) existing.remove();

  var q = document.createElement('div');
  q.className = 'reply-quote';
  q.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:var(--bg2);padding:8px 12px;border-left:3px solid var(--accent);border-radius:6px;margin-top:8px;font-size:14px;color:var(--text)';
  q.innerHTML = '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:12px">\u21A9 ' + escHtml(_replyTo.text) + '</span><button class="reply-quote-close" onclick="cancelReply()" style="background:none;border:none;color:var(--text3);font-size:16px;padding:0;cursor:pointer">\u2716</button>';

  zone.appendChild(q);

  var inp = document.getElementById('mi');
  if (inp) inp.focus();
}

function cancelReply() {
  _replyTo = null;
  renderAttachZone();
}

// ── Photo Sharing (Cloudinary) ──────────────────────────────────────────────
var _pendingImage = null;
var _pendingPhotoFile = null;

async function uploadPhoto(file) {
  var formData = new FormData();
  formData.append('photo', file);
  var r = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + jwtToken }, body: formData });
  var data = await r.json();
  if (!data.url) throw new Error(data.error || 'Upload failed');
  return data.url;
}

function openPhotoGallery() {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    console.log('фото выбрано', file.size);
    if (file.size > 10 * 1024 * 1024) { toast('Файл слишком большой (макс 10МБ)', 'error'); return; }
    _pendingPhotoFile = file;
    // Preview from blob URL (no base64 needed)
    _pendingImage = URL.createObjectURL(file);
    _attachedPhoto = _pendingImage;
    renderAttachZone();
  };
  input.click();
}
// Backward compat aliases
function handlePhotoSelect(input) {
  var file = input.files && input.files[0];
  if (input.value) input.value = '';
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast('Максимум 10 МБ', 'error'); return; }
  var img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = function() {
    var canvas = document.createElement('canvas');
    var w = img.width, h = img.height, max = 1200;
    if (w > h && w > max) { h *= max / w; w = max; }
    else if (h > max) { w *= max / h; h = max; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    _pendingImage = canvas.toDataURL('image/jpeg', 0.5);
    _attachedPhoto = _pendingImage;
    URL.revokeObjectURL(img.src);
    renderAttachZone();
  };
}

function cancelImgPreview() {
  _pendingImage = null; _attachedPhoto = null;
  renderAttachZone();
}

async function send() {
  var inp = document.getElementById('mi');
  if (!inp) return;
  var text = inp.value.trim();
  var image = _pendingImage;
  if (!text && !image) return;
  inp.value = ''; inp.style.height = 'auto';

  // Local echo — show message immediately without waiting for server
  var now = new Date();
  var time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  var localMsg = {
    id: 'local-' + Date.now(),
    from: 'me',
    text: text || '',
    time: time,
    sender: currentUser ? currentUser.username : '',
    image: image || null
  };
  var item = findItem(cur);
  if (item) {
    var isCh = item.type === 'channel';
    item.msgs.push(localMsg);
    item.prev = image ? '\uD83D\uDCF7 Фото' + (text ? ' \u00B7 ' + text.substring(0, 24) : '') : text.substring(0, 36);
    item.time = time;
    item._ts = Math.floor(now.getTime() / 1000);
    appendMsg(localMsg, isCh);
    render();
  }

  // Check if this is an AI bot chat
  var isAiChat = cur && (cur.indexOf('gemini-bot') !== -1 || cur.indexOf('claude-bot') !== -1);
  if (isAiChat && text) {
    fetch(API + '/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
      body: JSON.stringify({ prompt: text, chatId: cur })
    }).catch(function(){});
  } else if (cur) {
    var payload = { chatId: cur, text: text || '', replyTo: _replyTo ? _replyTo.text : undefined };
    // Upload photo to Cloudinary if file exists, else use base64 fallback
    if (_pendingPhotoFile) {
      try {
        var imageUrl = await uploadPhoto(_pendingPhotoFile);
        payload.image = imageUrl;
        console.log('[photo] uploaded to cloudinary:', imageUrl);
      } catch(e) {
        console.error('[photo] upload failed, using base64:', e.message);
        if (image) payload.image = image;
      }
      _pendingPhotoFile = null;
    } else if (image && image.startsWith('data:')) {
      payload.image = image;
    }
    if (socket && socket.connected) {
      socket.emit('chat_msg', payload, function() { _pendingImage = null; });
    } else {
      addToOutbox(payload).then(function() { _pendingImage = null; });
    }
  }
  _pendingImage = null;
  _pendingPhotoFile = null;
  _attachedPhoto = null;
  renderAttachZone();
  cancelReply();
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
      html += '<div class="story-item" onclick="viewStory(\'' + escSearch(g.user_id) + '\')">' +
        '<div class="story-ring"><div class="story-ring-inner ' + GS[(g.username||'?').charCodeAt(0)%GS.length] + '">\uD83D\uDC36</div></div>' +
        '<div class="story-name">' + escHtml(g.username || '') + '</div></div>';
    });
    if (container) container.innerHTML = html;
  } catch(e) { console.error('[Error]:', e.message || e); }
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
      '<div class="story-content" style="background:' + (/^#[0-9a-fA-F]{3,8}$/.test(s.bg_color) ? s.bg_color : '#7C3AED') + '">' +
        '<div class="story-progress"><div class="story-progress-fill"></div></div>' +
        '<div class="story-meta"><span style="color:#fff;font-size:14px;font-weight:600">' + escHtml(group.username) + '</span></div>' +
        '<button class="story-close" onclick="this.closest(\'.story-viewer\').remove()">\u2716</button>' +
        '<div class="story-text">' + escHtml(s.content) + '</div>' +
        '<div style="position:absolute;bottom:16px;color:rgba(255,255,255,0.5);font-size:12px">' + (s.views || 0) + ' просмотров</div>' +
      '</div>';
    document.body.appendChild(viewer);
    setTimeout(function() { viewer.remove(); }, 5000);
  } catch(e) { console.error('[Error]:', e.message || e); }
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
      '<input class="minp" id="statusInput" maxlength="60" placeholder="Что делаешь?" value="' + escAttr((currentUser && currentUser.status) || '') + '">' +
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
var togE = function() {
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

// ── QR Code ─────────────────────────────────────────────────────────────────
function openQRModal() {
  document.getElementById('qrOverlay').style.display = 'flex';
  switchQRTab('my');
}

function closeQRModal() {
  document.getElementById('qrOverlay').style.display = 'none';
  stopQRScan();
}

function switchQRTab(tab) {
  var myPanel = document.getElementById('qrMyPanel');
  var scanPanel = document.getElementById('qrScanPanel');
  var tabMy = document.getElementById('qrTabMy');
  var tabScan = document.getElementById('qrTabScan');
  if (tab === 'my') {
    myPanel.style.display = 'block';
    scanPanel.style.display = 'none';
    tabMy.style.background = 'var(--accent)';
    tabMy.style.color = '#fff';
    tabScan.style.background = 'none';
    tabScan.style.color = 'var(--text2)';
    stopQRScan();
    generateMyQR();
  } else {
    myPanel.style.display = 'none';
    scanPanel.style.display = 'block';
    tabScan.style.background = 'var(--accent)';
    tabScan.style.color = '#fff';
    tabMy.style.background = 'none';
    tabMy.style.color = 'var(--text2)';
    startQRScan();
  }
}

function generateMyQR() {
  var el = document.getElementById('qrcode');
  el.innerHTML = '';
  var me = currentUser || {};
  var username = me.username || me.handle || 'unknown';
  var url = 'https://c4v2jht698-ux.github.io/kosmos-frontend/?u=' + encodeURIComponent(username);
  document.getElementById('qrUsername').textContent = '@' + username;
  new QRCode(el, {
    text: url,
    width: 220,
    height: 220,
    colorDark: '#000',
    colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

var qrStream = null;
var qrScanInterval = null;

function startQRScan() {
  var video = document.getElementById('qrVideo');
  var result = document.getElementById('qrScanResult');
  result.textContent = 'Наведите камеру на QR-код...';
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function(stream) {
      qrStream = stream;
      video.srcObject = stream;
      video.play();
      qrScanInterval = setInterval(function() {
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
        var canvas = document.getElementById('qrCanvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        var imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        var code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          result.textContent = 'Найден: ' + code.data;
          stopQRScan();
          var match = code.data.match(/[?&]u=([^&]+)/);
          if (match) searchUsers(match[1]);
        }
      }, 300);
    })
    .catch(function() { result.textContent = 'Нет доступа к камере'; });
}

function stopQRScan() {
  if (qrStream) { qrStream.getTracks().forEach(function(t) { t.stop(); }); qrStream = null; }
  if (qrScanInterval) { clearInterval(qrScanInterval); qrScanInterval = null; }
}

// ── Bottom Nav Tabs ─────────────────────────────────────────────────────────
function showTab(tab) {
  var qrScreen = document.getElementById('qrScreen');
  var settingsScreen = document.getElementById('settingsScreen');

  document.querySelectorAll('.bn-item').forEach(function(i){ i.classList.remove('active'); });

  if (tab === 'qr') {
    settingsScreen.style.display = 'none';
    document.getElementById('bnQR').classList.add('active');
    qrScreen.style.display = 'flex';
    qrScreen.style.animation = 'none';
    qrScreen.offsetHeight;
    qrScreen.style.animation = 'slideInRight .28s cubic-bezier(.4,0,.2,1)';
    renderQRScreen();
  } else if (tab === 'chats') {
    document.getElementById('bnChats').classList.add('active');
    if (qrScreen.style.display !== 'none') {
      qrScreen.style.animation = 'slideOutRight .22s cubic-bezier(.4,0,.2,1)';
      setTimeout(function(){ qrScreen.style.display = 'none'; }, 220);
    }
    if (settingsScreen.style.display !== 'none') {
      settingsScreen.style.animation = 'slideOutRight .22s cubic-bezier(.4,0,.2,1)';
      setTimeout(function(){ settingsScreen.style.display = 'none'; }, 220);
    }
  } else if (tab === 'settings') {
    qrScreen.style.display = 'none';
    document.getElementById('bnSettings').classList.add('active');
    settingsScreen.style.display = 'block';
    settingsScreen.style.animation = 'none';
    settingsScreen.offsetHeight;
    settingsScreen.style.animation = 'slideInRight .28s cubic-bezier(.4,0,.2,1)';
    renderSettingsScreen();
  }
}

function renderQRScreen() {
  var u = currentUser || {};
  var username = u.username || u.handle || 'unknown';
  var name = u.name || username;
  document.getElementById('qrScreenUsername').textContent = '@' + username;
  document.getElementById('qrScanLabel').textContent = 'Scan to chat with @' + username;
  document.getElementById('qrAvatarCenter').textContent = (name || '?')[0].toUpperCase();
  var div = document.getElementById('qrCodeDiv');
  div.innerHTML = '<div style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:13px">Генерация...</div>';
  new QRCode(div, { text: 'https://c4v2jht698-ux.github.io/kosmos-frontend/?u=' + encodeURIComponent(username), width: 200, height: 200, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });
}

function renderSettingsScreen() {
  var u = currentUser || {};
  var name = u.name || u.username || 'Пользователь';
  var username = u.username || u.handle || '';
  document.getElementById('settingsName').textContent = name;
  document.getElementById('settingsHandle').textContent = '@' + username;
  document.getElementById('settingsAvatar').textContent = (name || '?')[0].toUpperCase();
}

function shareQR() {
  var u = currentUser || {};
  var username = u.username || u.handle || 'unknown';
  var url = 'https://c4v2jht698-ux.github.io/kosmos-frontend/?u=' + encodeURIComponent(username);
  if (navigator.share) { navigator.share({ title: 'Космос', text: 'Напиши мне в Космос!', url: url }); }
  else { navigator.clipboard.writeText(url); toast('Ссылка скопирована!', 'success'); }
}

// ── Chat Background ─────────────────────────────────────────────────────────
function setChatBg(input) {
  // Support both file input element and direct base64 string
  if (typeof input === 'string') {
    try {
      localforage.setItem('chatBg', input);
      applyChatBg(input);
      toast('Фон сохранен', 'success');
    } catch(e) { toast('Ошибка: недостаточно памяти', 'error'); }
    return;
  }
  var file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Максимум 5MB', 'error'); input.value=''; return; }
  var img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = function() {
    var canvas = document.createElement('canvas');
    var w = img.width, h = img.height, max = 1200;
    if (w > h && w > max) { h *= max / w; w = max; }
    else if (h > max) { w *= max / h; h = max; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    var compressed = canvas.toDataURL('image/jpeg', 0.5);
    URL.revokeObjectURL(img.src);
    try {
      localforage.setItem('chatBg', compressed);
      applyChatBg(compressed);
      toast('Фон установлен!', 'success');
    } catch(e) { toast('Ошибка: недостаточно памяти', 'error'); }
  };
}

async function applyChatBg(base64) {
  var bg = base64 || await localforage.getItem('chatBg');
  var areas = document.querySelectorAll('.msg-area');
  areas.forEach(function(area) {
    if (bg) {
      area.style.backgroundImage = 'url(' + bg + ')';
      area.style.backgroundSize = 'cover';
      area.style.backgroundPosition = 'center';
      area.style.backgroundAttachment = 'fixed';
    } else {
      area.style.backgroundImage = '';
    }
  });
}

function showConfirm(msg, onOk, onCancel) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:var(--bg,#1e1e2e);border-radius:16px;padding:24px;max-width:280px;width:90%;text-align:center">'
    + '<p style="margin:0 0 20px;font-size:16px;color:var(--text,#fff)">' + escHtml(msg) + '</p>'
    + '<div style="display:flex;gap:12px;justify-content:center">'
    + '<button id="sc-cancel" style="flex:1;padding:10px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:var(--text,#fff);font-size:15px;cursor:pointer">Отмена</button>'
    + '<button id="sc-ok" style="flex:1;padding:10px;border:none;border-radius:10px;background:#e53935;color:#fff;font-size:15px;font-weight:500;cursor:pointer">Покинуть</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#sc-ok').onclick = function() { document.body.removeChild(overlay); if(onOk) onOk(); };
  overlay.querySelector('#sc-cancel').onclick = function() { document.body.removeChild(overlay); if(onCancel) onCancel(); };
  overlay.onclick = function(e) { if(e.target===overlay) { document.body.removeChild(overlay); if(onCancel) onCancel(); } };
}

// ── Attach Zone (unified photo preview + reply quote) ────────────────────────
var _attachedPhoto = null;

// triggerAttach is now an alias for openPhotoGallery
function triggerAttach() { openPhotoGallery(); }

function renderAttachZone() {
  var z = document.getElementById('attachZone');
  if (!z) return;
  var html = '';
  if (typeof _replyTo !== 'undefined' && _replyTo && _replyTo.text) {
    html += '<div class="reply-quote glass-panel" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-left:3px solid var(--accent);border-radius:6px;margin-top:8px;font-size:14px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:12px">\u21A9 ' + escHtml(_replyTo.text) + '</span><button onclick="cancelReply()" class="action-btn" style="padding:0;font-size:16px">\u2716</button></div>';
  }
  if (_attachedPhoto) {
    html += '<div style="position:relative;display:inline-block;margin-top:8px"><img src="' + _attachedPhoto + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px"><button onclick="cancelAttach()" style="position:absolute;top:-6px;right:-6px;background:#ff4444;border:none;border-radius:50%;width:18px;height:18px;color:white;font-size:11px;cursor:pointer;padding:0">\u2715</button></div>';
  }
  z.innerHTML = html;
}

function cancelAttach() {
  _attachedPhoto = null;
  _pendingImage = null;
  renderAttachZone();
}

// ── Voice Recording (Microphone) ─────────────────────────────────────────────
var _mediaRecorder = null, _audioChunks = [], _isRecording = false, _voiceStream = null;

async function startVoice() {
  if (_isRecording) return;
  if (!cur) { toast('Откройте чат для записи', 'error'); return; }
  try {
    _voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    var options = { mimeType: 'audio/webm', audioBitsPerSecond: 64000 };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) { options.mimeType = 'audio/mp4'; }
    _mediaRecorder = new MediaRecorder(_voiceStream, options);
    _audioChunks = [];
    _mediaRecorder.ondataavailable = function(e) { _audioChunks.push(e.data); };
    _mediaRecorder.onstop = function() {
      var blob = new Blob(_audioChunks, { type: _mediaRecorder.mimeType });
      var reader = new FileReader();
      reader.onloadend = function() {
        if (reader.result.length > 10 * 1024 * 1024) {
          toast('Голосовое слишком большое', 'error');
        } else if (socket && socket.connected && cur) {
          socket.emit('chat_msg', { chatId: cur, type: 'audio', audio: reader.result, text: 'Голосовое сообщение' });
        }
        if (_voiceStream) { _voiceStream.getTracks().forEach(function(t) { t.stop(); }); _voiceStream = null; }
      };
      reader.readAsDataURL(blob);
    };
    _mediaRecorder.start();
    _isRecording = true;
    var btn = document.getElementById('micBtn');
    if (btn) { btn.classList.add('recording'); btn.innerHTML = '\u23F9'; }
    // Auto-stop after 60 seconds
    setTimeout(function() { if (_isRecording) stopVoice(); }, 60000);
  } catch(e) {
    toast('Нет доступа к микрофону', 'error');
  }
}

function stopVoice() {
  if (!_isRecording || !_mediaRecorder) return;
  _mediaRecorder.stop();
  _isRecording = false;
  var btn = document.getElementById('micBtn');
  if (btn) { btn.classList.remove('recording'); btn.innerHTML = '\uD83C\uDFA4'; }
}

// ── Custom Audio Player ──────────────────────────────────────────────────────
var _currentAudio = null, _currentPlayBtn = null;

function togglePlay(el, src) {
  var btn = el.querySelector('.voice-play-btn');
  if (_currentAudio && _currentPlayBtn === btn) {
    _currentAudio.pause();
    btn.innerHTML = '\u25B6';
    _currentAudio = null; _currentPlayBtn = null;
    return;
  }
  if (_currentAudio) {
    _currentAudio.pause();
    if (_currentPlayBtn) _currentPlayBtn.innerHTML = '\u25B6';
  }
  _currentAudio = new Audio(src);
  _currentPlayBtn = btn;
  btn.innerHTML = '\u23F8';
  _currentAudio.play();
  _currentAudio.onended = function() {
    btn.innerHTML = '\u25B6';
    _currentAudio = null; _currentPlayBtn = null;
  };
}

// ── WebRTC Video Calls ───────────────────────────────────────────────────────
var _peerConn = null, _localStream = null, _callChatId = null, _pendingOffer = null;
var rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function buildCallUI(callerName, isIncoming) {
  if (document.getElementById('callOverlay')) return;
  var div = document.createElement('div');
  div.id = 'callOverlay';
  div.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--glass-bg);backdrop-filter:blur(25px)';
  var buttonsHtml = isIncoming
    ? '<div style="display:flex;gap:40px;position:absolute;bottom:60px"><button class="sbtn" style="width:64px;height:64px;background:#ff3b30" onclick="endCall(true)">\u260E</button><button class="sbtn" style="width:64px;height:64px;background:#34c759" onclick="answerCall()">\uD83D\uDCDE</button></div>'
    : '<button class="sbtn" style="width:64px;height:64px;background:#ff3b30;position:absolute;bottom:60px" onclick="endCall(true)">\u260E</button>';
  div.innerHTML =
    '<video id="remoteVideo" autoplay playsinline style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1"></video>' +
    '<video id="localVideo" autoplay playsinline muted style="width:110px;height:160px;object-fit:cover;position:absolute;top:60px;right:20px;border-radius:16px;border:2px solid rgba(255,255,255,0.2);z-index:3"></video>' +
    '<div style="position:absolute;top:60px;left:20px;z-index:3;color:#fff">' +
      '<div style="font-size:28px;font-weight:700">' + escHtml(callerName || 'Собеседник') + '</div>' +
      '<div id="callStatus" style="font-size:16px;opacity:0.8;margin-top:4px">Подключение...</div>' +
    '</div>' + buttonsHtml;
  document.body.appendChild(div);
}

async function startVideoCall() {
  if (!cur) { toast('Откройте чат для звонка', 'error'); return; }
  _callChatId = cur;
  buildCallUI('Вызов...', false);
  try {
    _localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = _localStream;
    _peerConn = new RTCPeerConnection(rtcConfig);
    _localStream.getTracks().forEach(function(track) { _peerConn.addTrack(track, _localStream); });
    _peerConn.ontrack = function(e) { document.getElementById('remoteVideo').srcObject = e.streams[0]; var s = document.getElementById('callStatus'); if (s) s.innerText = 'На связи'; };
    _peerConn.onicecandidate = function(e) { if (e.candidate) socket.emit('webrtc_signal', { chatId: _callChatId, type: 'ice', payload: e.candidate }); };
    var offer = await _peerConn.createOffer();
    await _peerConn.setLocalDescription(offer);
    var cName = currentUser ? currentUser.username : 'Пользователь';
    socket.emit('webrtc_signal', { chatId: _callChatId, type: 'offer', payload: offer, callerName: cName });
  } catch(e) { toast('Ошибка камеры/микрофона', 'error'); endCall(true); }
}

async function answerCall() {
  if (!_pendingOffer) return;
  var s = document.getElementById('callStatus'); if (s) s.innerText = 'Соединение...';
  try {
    _localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = _localStream;
    _peerConn = new RTCPeerConnection(rtcConfig);
    _localStream.getTracks().forEach(function(track) { _peerConn.addTrack(track, _localStream); });
    _peerConn.ontrack = function(e) { document.getElementById('remoteVideo').srcObject = e.streams[0]; var st = document.getElementById('callStatus'); if (st) st.innerText = 'На связи'; };
    _peerConn.onicecandidate = function(e) { if (e.candidate) socket.emit('webrtc_signal', { chatId: _callChatId, type: 'ice', payload: e.candidate }); };
    await _peerConn.setRemoteDescription(new RTCSessionDescription(_pendingOffer));
    var answer = await _peerConn.createAnswer();
    await _peerConn.setLocalDescription(answer);
    socket.emit('webrtc_signal', { chatId: _callChatId, type: 'answer', payload: answer });
    _pendingOffer = null;
  } catch(e) { toast('Ошибка ответа', 'error'); endCall(true); }
}

function endCall(emitSignal) {
  if (emitSignal && _callChatId) socket.emit('webrtc_signal', { chatId: _callChatId, type: 'end' });
  if (_peerConn) { _peerConn.close(); _peerConn = null; }
  if (_localStream) { _localStream.getTracks().forEach(function(t) { t.stop(); }); _localStream = null; }
  var overlay = document.getElementById('callOverlay');
  if (overlay) overlay.remove();
  _callChatId = null; _pendingOffer = null;
}

// ── Reactions ────────────────────────────────────────────────────────────────
function sendReaction(el, emoji) {
  var msgId = el.id.replace('msg-', '');
  if (socket && socket.connected) socket.emit('msg_reaction', { msgId: msgId, chatId: cur, emoji: emoji });
  showReaction(msgId, emoji);
}

function showReaction(msgId, emoji) {
  var el = document.getElementById('react-' + msgId);
  if (el) el.textContent = el.textContent === emoji ? '' : emoji;
}

// ── In-Chat Search ───────────────────────────────────────────────────────────
function toggleSearch() {
  var bar = document.getElementById('search-bar');
  if (!bar) return;
  var isHidden = bar.style.display === 'none';
  bar.style.display = isHidden ? 'block' : 'none';
  if (isHidden) { var inp = document.getElementById('search-input'); if (inp) inp.focus(); }
  else { var inp = document.getElementById('search-input'); if (inp) inp.value = ''; }
}

var _searchMsgTimer = null;
function searchMessages(q) {
  clearTimeout(_searchMsgTimer);
  if (!q || q.length < 2 || !cur) return;
  _searchMsgTimer = setTimeout(function() {
    fetch(API + '/api/messages/search?q=' + encodeURIComponent(q) + '&chat_id=' + encodeURIComponent(cur), {
      headers: { 'Authorization': 'Bearer ' + jwtToken }
    }).then(function(r) { return r.ok ? r.json() : []; })
      .then(function(msgs) {
        if (!msgs.length) return;
        var el = document.getElementById('msg-' + msgs[0].id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'background 0.3s';
          el.style.background = 'rgba(255,215,0,0.25)';
          setTimeout(function() { el.style.background = ''; }, 2000);
        }
      }).catch(function() {});
  }, 400);
}

// ── Outbox (offline message queue — IndexedDB via localforage) ────────────────
async function flushOutbox() {
  var outbox = await localforage.getItem('_outbox') || [];
  if (!outbox.length || !socket || !socket.connected) return;
  console.log('[outbox] flushing', outbox.length, 'messages');
  outbox.forEach(function(msg) {
    var outId = msg._outId;
    delete msg._outId;
    socket.emit('chat_msg', msg, function(ack) {
      if (ack && ack.ok) {
        removeMsgFromOutbox(outId);
        console.log('[outbox] delivered:', outId);
      }
    });
  });
}

async function removeMsgFromOutbox(outId) {
  var outbox = await localforage.getItem('_outbox') || [];
  outbox = outbox.filter(function(m) { return m._outId !== outId; });
  await localforage.setItem('_outbox', outbox);
}

async function addToOutbox(payload) {
  payload._outId = 'out-' + Date.now();
  var outbox = await localforage.getItem('_outbox') || [];
  outbox.push(payload);
  await localforage.setItem('_outbox', outbox);
  toast('Сохранено в очередь отправки', 'success');
  console.log('[outbox] saved, queue:', outbox.length);
}

// ── Typing Indicator ─────────────────────────────────────────────────────────
var _typingTimer = null, _isTypingNow = false, _typingClearTimer = null;

document.addEventListener('input', function(e) {
  if (e.target.id !== 'mi') return;
  if (!cur || typeof socket === 'undefined') return;
  if (!_isTypingNow) { _isTypingNow = true; socket.emit('typing', { chatId: cur, isTyping: true }); }
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(function() { _isTypingNow = false; socket.emit('typing', { chatId: cur, isTyping: false }); }, 2000);
});

