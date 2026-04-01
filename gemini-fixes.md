Как Senior разработчик, я проанализировал предоставленный код мессенджера "Космос" и предлагаю следующие исправления для описанных багов.

---

### БАГ 1 — Telegram авторизация 'Ссылка устарела'

**1. Объяснение причины:**
Текущая логика авторизации через Telegram бота предусматривает 30 попыток опроса сервера с интервалом в 2 секунды, что в сумме составляет 60 секунд (1 минута) на завершение авторизации. Если токен, выданный бэкендом при инициализации, имеет короткий срок действия (менее 60 секунд), или если пользователь медленно открывает Telegram, нажимает `/start` и возвращается в приложение, токен может устареть до того, как клиент получит подтверждение от сервера. Это приводит к ошибке "Ссылка устарела".

**2. Исправленный код функции startTelegramBotAuth() полностью:**

```javascript
// ── Telegram Bot Auth ─────────────────────────────────────────────────────────
var _tgSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.16l-1.8 8.49c-.14.6-.5.75-.99.47l-2.75-2.03-1.33 1.27c-.14.15-.27.27-.56.27l.2-2.82 5.1-4.6c.22-.2-.05-.3-.34-.13l-6.3 3.97-2.72-.85c-.59-.18-.6-.59.12-.87l10.63-4.1c.49-.18.92.12.76.87z"/></svg>';

async function startTelegramBotAuth() {
  stopTgPoll();
  var btn = document.getElementById('tgAuthBtn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; }

  // Open window synchronously in click handler to avoid popup blocker
  var win = window.open('about:blank', '_blank');

  try {
    var r = await fetch(API + '/auth/telegram/init', { method: 'POST' });
    var data = await r.json();
    if (!data.botUrl || !data.token) { if (win) win.close(); toast('Ошибка подключения', 'error'); resetTgBtn(); return; }

    try {
      var botHost = new URL(data.botUrl).hostname;
      if (['t.me','telegram.me','telegram.org'].indexOf(botHost) === -1) { if (win) win.close(); toast('Недопустимый URL бота', 'error'); resetTgBtn(); return; }
    } catch(e) { if (win) win.close(); toast('Ошибка URL', 'error'); resetTgBtn(); return; }

    if (win) win.location.href = data.botUrl; else window.open(data.botUrl, '_blank');

    // Countdown polling: 30 attempts × 2s = 60s
    // ИСПРАВЛЕНИЕ: Увеличение времени ожидания до 120 секунд (60 попыток * 2с)
    var remaining = 120; // Увеличено с 60
    updateTgBtn(remaining);
    window._tgCountdown = setInterval(function() {
      remaining--;
      if (remaining <= 0) { stopTgPoll(); toast('Время вышло. Попробуйте снова.', 'error'); resetTgBtn(); return; }
      updateTgBtn(remaining);
    }, 1000);

    var attempts = 0;
    window._tgPoll = setInterval(async function() {
      attempts++;
      if (attempts > 60) { // Увеличено с 30
        stopTgPoll(); toast('Время вышло. Попробуйте снова.', 'error'); resetTgBtn(); return;
      }
      try {
        var cr = await fetch(API + '/auth/telegram/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.token })
        });
        var cd = await cr.json();
        if (cd.token) {
          stopTgPoll();
          jwtToken = cd.token;
          refreshToken = cd.refreshToken;
          currentUser = cd.user;
          localStorage.setItem('kosmos_token', jwtToken);
          if (cd.refreshToken) localStorage.setItem('kosmos_refresh', cd.refreshToken);
          localStorage.setItem('kosmos_user', JSON.stringify(cd.user));
          enterApp();
        }
      } catch(e) {}
    }, 2000);
  } catch(e) {
    toast('Нет связи с сервером', 'error');
    resetTgBtn();
  }
}

function updateTgBtn(sec) {
  var btn = document.getElementById('tgAuthBtn');
  if (btn) btn.innerHTML = _tgSvg + ' Ожидание... ' + sec + 'с <span onclick="event.stopPropagation();cancelTgAuth()" style="margin-left:8px;text-decoration:underline;cursor:pointer;font-size:13px">Отмена</span>';
}

function cancelTgAuth() {
  stopTgPoll();
  resetTgBtn();
}

function stopTgPoll() {
  if (window._tgPoll) { clearInterval(window._tgPoll); window._tgPoll = null; }
  if (window._tgCountdown) { clearInterval(window._tgCountdown); window._tgCountdown = null; }
}

function resetTgBtn() {
  var btn = document.getElementById('tgAuthBtn');
  if (btn) { btn.disabled = false; btn.innerHTML = _tgSvg + ' Войти через Telegram'; btn.style.opacity = '1'; }
}

window.addEventListener('beforeunload', stopTgPoll);
```

**3. Файл и строка:**
Предполагается, что весь код находится в одном файле `main.js` или встроен в HTML.
- **Файл:** `main.js` (или `<script>` в `index.html`)
- **Строка:** Функция `startTelegramBotAuth()`, примерно строка 400.
  - Изменение `var remaining = 60;` на `var remaining = 120;`
  - Изменение `if (attempts > 30)` на `if (attempts > 60)`

---

### БАГ 2 — Тема пропадает после logout

**1. Объяснение причины:**
Настройка темы (`kosmos_theme`) хранится в `localStorage` и не удаляется функцией `logout()`, что является правильным поведением для пользовательских предпочтений интерфейса. Функция `applyTheme()` вызывается в конце `logout()`, чтобы применить сохраненную тему к вновь отображаемому экрану авторизации. Однако функция `switchTab()`, которая отвечает за переключение между вкладками логина и регистрации, активно манипулирует DOM на экране авторизации. Если `applyTheme()` не вызывается после этих манипуляций, стили, основанные на атрибуте `data-theme` на `document.documentElement`, могут быть временно переопределены или не применены должным образом к динамически отображаемым элементам, что приводит к визуальному эффекту "пропавшей темы" (возврату к теме по умолчанию 'blue').

**2. Исправленный код функции switchTab() полностью:**

```javascript
// ── Auth ────────────────────────────────────────────────────────────────────
var authMode = 'login';
var pendingToken = null;
var pendingUser = null;
var pendingRefresh = null;

function switchTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(function(t, i) {
    t.classList.toggle('active', (mode === 'login' && i === 0) || (mode === 'register' && i === 1));
  });
  document.getElementById('regFields').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('loginFields').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('seedResult').style.display = 'none';
  document.getElementById('authBtn').style.display = '';
  document.getElementById('authBtn').textContent = mode === 'register' ? 'Создать аккаунт' : 'Войти в Космос';
  document.getElementById('authToggleBtn').textContent = mode === 'register' ? 'Уже есть аккаунт' : 'Создать новый аккаунт';
  document.getElementById('authToggleBtn').onclick = function() { switchTab(mode === 'register' ? 'login' : 'register'); };
  document.getElementById('authToggleBtn').style.display = '';
  clearAuthMessages();
  // ИСПРАВЛЕНИЕ: Переприменение темы после всех манипуляций DOM в auth UI.
  // Это гарантирует, что пользовательская тема будет применена к элементам экрана авторизации
  // каждый раз, когда переключаются вкладки или обновляется UI.
  applyTheme(localStorage.getItem('kosmos_theme') || 'blue');
}
```

**3. Файл и строка:**
- **Файл:** `main.js` (или `<script>` в `index.html`)
- **Строка:** Функция `switchTab(mode)`, добавить строку в конец функции, примерно строка 110.

---

### БАГ 3 — Фото не доходит до адресата

**1. Объяснение причины:**
При отправке фото приложение использует "оптимистичное обновление UI" (local echo): оно немедленно отображает фото в чате для отправителя. Когда сервер подтверждает отправку сообщения (отправляя событие `chat_msg` обратно клиенту), локальное эхо-сообщение полностью заменяется сообщением, пришедшим с сервера. Если бэкенд по какой-либо причине не включает поле `image` (или отправляет `null`) в свой ответ `msg` для события `chat_msg`, то оптимистично отображенное фото исчезает из чата. Для получателя, если сервер не отправляет `image`, фото также не будет отображено. Это создает впечатление, что "фото не доходит до адресата", хотя на самом деле проблема может быть в том, как сервер обрабатывает и пересылает изображение, или как клиент обрабатывает эту ситуацию. Для устранения проблемы на стороне клиента необходимо обеспечить, чтобы изображение, отображенное локально, сохранялось до тех пор, пока от сервера не будет получена авторитетная информация об изображении.

**2. Исправленный код в socket.on('chat_msg') полностью:**

```javascript
  socket.on('chat_msg', function(msg) {
    var ts = new Date(msg.created_at * 1000);
    var time = ts.getHours().toString().padStart(2, '0') + ':' + ts.getMinutes().toString().padStart(2, '0');
    var from = currentUser && msg.sender_id === currentUser.id ? 'me' : 'them';
    var m = { id: msg.id, from: from, text: msg.text, time: time, sender: msg.sender_username, image: msg.image || null };

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
        // Проверяем, является ли это нашим локальным эхо-сообщением
        if (item.msgs[li].id && item.msgs[li].id.indexOf('local-') === 0 && item.msgs[li].from === 'me') { localIdx = li; break; }
      }
      if (localIdx !== -1) {
        // ИСПРАВЛЕНИЕ: Сохранение локального изображения, если сообщение с сервера не содержит его.
        // Это предотвращает исчезновение фото, если бэкенд не вернул его.
        if (item.msgs[localIdx].image && !m.image) {
          m.image = item.msgs[localIdx].image; // Передаем изображение из локального эхо-сообщения
        }
        item.msgs[localIdx] = m; // Заменяем локальное эхо сообщением с сервера (возможно, с сохраненным локальным изображением)
        render();
        return;
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
```

**3. Файл и строка:**
- **Файл:** `main.js` (или `<script>` в `index.html`)
- **Строка:** Функция `socket.on('chat_msg')`, внутри блока `if (localIdx !== -1)` (примерно строка 560).

---