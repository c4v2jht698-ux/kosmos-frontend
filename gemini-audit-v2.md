Отличная задача! Как Senior Security Engineer с 15-летним опытом, я проведу детальный анализ предоставленного кода мессенджера. Учитывая объем и специфику кода (монолитный JS, много DOM-манипуляций), мой фокус будет на практических уязвимостях и лучших практиках.

---

### Аудит кода мессенджера "Космос"

**1. Безопасность (30 проверок)**

1.  **S01. XSS в `toast` function (inline style injection)**
    *   Файл и строка: `toast` function, (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: Вместо использования `type` напрямую в `style.cssText`, используйте предопределенные классы CSS или безопасную мапу для цветов.
        ```javascript
        function toast(msg, type) {
          var t = document.createElement('div');
          t.textContent = msg;
          var bgColor;
          if (type === 'error') bgColor = '#ff3b30';
          else if (type === 'success') bgColor = '#34c759';
          else bgColor = '#333';
          t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:' + bgColor + ';color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;font-weight:500;z-index:9999;opacity:0;transition:opacity .2s;white-space:nowrap;max-width:80vw;text-align:center';
          document.body.appendChild(t);
          setTimeout(function(){ t.style.opacity='1'; }, 10);
          setTimeout(function(){ t.style.opacity='0'; setTimeout(function(){ t.remove(); }, 200); }, 2500);
        }
        ```

2.  **S02. XSS в `defaultAv` и `defaultAvSq` (классы CSS)**
    *   Файл и строка: `defaultAv` (Single JS block), `defaultAvSq` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: Параметр `name` используется для генерации класса `g`. Если `name` содержит инъекцию, это может привести к XSS через CSS. Используйте `escAttr` для `g`.
        ```javascript
        function defaultAv(name, size) {
          size = size || 48;
          var g = GS[(name || '?').charCodeAt(0) % GS.length];
          return '<div class="av ' + escAttr(g) + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px">' +
            '<span style="color:#fff">\uD83D\uDC36</span></div>';
        }
        function defaultAvSq(name, size) {
          size = size || 48;
          var g = GS[(name || '?').charCodeAt(0) % GS.length];
          return '<div class="av ' + escAttr(g) + ' sq" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px">' +
            '<span style="color:#fff">' + escHtml((name || '?')[0].toUpperCase()) + '</span></div>';
        }
        ```

3.  **S03. XSS в `showOnboarding` (динамическая вставка HTML)**
    *   Файл и строка: `showOnboarding` function (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `el.innerHTML = ...` используется для вставки всего содержимого. `i.id` и `i.label` берутся из `INTERESTS` (хардкода), но если `INTERESTS` каким-то образом будет изменена (например, через DOM clobbering или извне), это может быть уязвимо. Хотя в данном случае массив статический, это плохой паттерн. Всегда используйте `textContent` или `createElement` + `appendChild` для динамических данных.
        ```javascript
        // Пример для одного элемента, расширить на все:
        var card = document.createElement('div');
        card.className = 'ob-card';
        card.dataset.id = i.id; // dataset.id безопасно
        card.onclick = function() { toggleInterest(this); };
        var emojiDiv = document.createElement('div');
        emojiDiv.className = 'ob-emoji';
        emojiDiv.textContent = i.emoji;
        var labelDiv = document.createElement('div');
        labelDiv.className = 'ob-label';
        labelDiv.textContent = i.label;
        card.appendChild(emojiDiv);
        card.appendChild(labelDiv);
        ```

4.  **S04. XSS в `render` (skeleton HTML)**
    *   Файл и строка: `render` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `chList.innerHTML = pinned + skelHtml;` и `chList.innerHTML = pinned + all.map(...)`. `pinned` и `skelHtml` — это статический HTML, но в случае, если эти переменные будут переопределены, это может быть проблемой. Лучше использовать шаблонизатор или createElement.
        ```javascript
        // Для skelHtml можно использовать createElement + appendChild, а не строку
        // То же самое для pinned
        ```

5.  **S05. XSS в `itm` (name/prev без escHtml, data-id/data-type без escAttr)**
    *   Файл и строка: `itm` function (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `escAttr` и `escHtml` используются корректно, что хорошо. Но `escSearch` для `c.id` в `onclick` не является стандартным. Вместо `escSearch` для `c.id` в `onclick` лучше использовать data-атрибут и делегировать обработку.
        ```javascript
        // В onclick лучше передавать ID в виде data-атрибута, а не строки JS
        // function openChat (id) { ... }
        // <div class="ci" data-id="${escAttr(c.id)}" onclick="openChatById(this)">
        // function openChatById(el) { openChat(el.dataset.id); }
        ```

6.  **S06. XSS в `openChat` (channel link URL)**
    *   Файл и строка: `openChat` function (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `channel=' + escHtml(item.slug)` в URL-адресе. `escHtml` здесь недостаточен, так как это часть URL. Необходимо использовать `encodeURIComponent`.
        ```javascript
        // Заменить:
        // 'https://c4v2jht698-ux.github.io/kosmos-frontend/?channel=' + escHtml(item.slug)
        // На:
        'https://c4v2jht698-ux.github.io/kosmos-frontend/?channel=' + encodeURIComponent(item.slug)
        ```

7.  **S07. XSS в `safePhotoUrl` (пропуск `javascript:` схеме)**
    *   Файл и строка: `safePhotoUrl` function (Single JS block)
    *   Серьезность: CRIT
    *   Конкретное исправление: Регулярное выражение `!/^https?:\/\//i.test(url)` не полностью безопасно. Оно пропускает схемы вроде `javascript:` или `data:`. Следует использовать более строгую проверку URL или использовать `URL` API для парсинга и проверки.
        ```javascript
        function safePhotoUrl(url) {
          if (!url) return '';
          url = String(url).trim();
          try {
            const u = new URL(url);
            if (u.protocol === 'http:' || u.protocol === 'https:') {
              return escHtml(u.toString()); // escHtml для предотвращения атрибутных инъекций
            }
          } catch (e) { /* Invalid URL */ }
          return '';
        }
        ```

8.  **S08. XSS в `inpHTML` (EMOJIS array)**
    *   Файл и строка: `inpHTML` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `EMOJIS.map(function(e){return '<span class="ep" onclick="insE(\'' + e + '\')">' + e + '</span>'})` — `e` берется из хардкода, но если массив `EMOJIS` будет изменен вредоносным образом, это может быть XSS. Аналогично S03, лучше использовать `textContent`.
        ```javascript
        // Создавать span элементы через createElement и добавлять emoji через textContent
        // var span = document.createElement('span'); span.textContent = e;
        ```

9.  **S09. XSS в `openProfileScreen` (u.handle, u.bio, u.city, u.mood, u.status)**
    *   Файл и строка: `openProfileScreen` function (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: Все эти поля вставляются с использованием `escHtml`, что хорошо. Однако, `interestTags` генерируется, и там `i` и `found ? found.emoji + ' ' : ''` также вставляются. Необходимо убедиться, что `i` и `found.emoji` тоже безопасны. `INTERESTS` статический, но хорошая практика — применять `escHtml` и к ним.
        ```javascript
        // Уже используется escHtml для interestTags. Убедиться, что emoji/id из INTERESTS также безопасны (они хардкодные, так что ок)
        ```

10. **S10. IDOR (Insecure Direct Object Reference) в `findItem` / `openChat`**
    *   Файл и строка: `findItem` (Single JS block), `openChat` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `findItem(id)` позволяет клиенту запросить любой `id`. Хотя `openChat` только отображает данные, связанные с этим `id`, сервер должен строго проверять права доступа пользователя к чату `id`, прежде чем отправлять сообщения/информацию.
        ```javascript
        // Исправление на бэкенде: Все API-вызовы, принимающие chat_id или user_id, должны проверять, принадлежит ли этот ресурс текущему аутентифицированному пользователю или доступен ли ему.
        ```

11. **S11. CSRF Token Отсутствует (зависимость от `X-Requested-With`)**
    *   Файл и строка: Начало файла (CSRF Protection block)
    *   Серьезность: HIGH
    *   Конкретное исправление: Использование `X-Requested-With` — это устаревший метод CSRF-защиты. Современные браузеры могут обходить эту защиту. Необходимо внедрить CSRF-токены (sync token pattern) для всех запросов, изменяющих состояние (POST, PUT, DELETE).
        ```javascript
        // 1. Бэкенд должен генерировать CSRF-токен и отдавать его клиенту (например, в мета-теге или Cookie).
        // 2. Клиент должен включать этот токен во все изменяющие запросы (POST, PUT, DELETE).
        // 3. Бэкенд должен проверять этот токен.
        ```

12. **S12. Отсутствие `SameSite=Strict` для куки с JWT**
    *   Файл и строка: N/A (настройка куки на бэкенде)
    *   Серьезность: HIGH
    *   Конкретное исправление: Если JWT (или сессионные куки) хранятся в куках, они должны быть помечены как `SameSite=Strict` (или `Lax` при необходимости) и `Secure`. Это помогает предотвратить CSRF и некоторые виды XSS-атак.
        ```javascript
        // Исправление на бэкенде: Убедиться, что куки `Authorization` или `session` имеют атрибуты `HttpOnly; Secure; SameSite=Strict;`.
        ```

13. **S13. XSS через `s.bg_color` в `viewStory` (inline style)**
    *   Файл и строка: `viewStory` function (Single JS block)
    *   Серьезность: CRIT
    *   Конкретное исправление: `s.bg_color` вставляется напрямую в `style="background:' + (s.bg_color || '#7C3AED') + '"`. Злоумышленник, контролирующий `s.bg_color`, может внедрить вредоносный CSS, включая `url('javascript:alert(1)')`.
        ```javascript
        // Вместо:
        // style="background:' + (s.bg_color || '#7C3AED') + '"
        // Использовать:
        var bgColor = s.bg_color || '#7C3AED';
        // Проверить, что bgColor это безопасный цвет (например, через regex)
        if (!/^#[0-9a-fA-F]{3,6}$|^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$|^[a-zA-Z]+$/.test(bgColor)) {
            bgColor = '#7C3AED'; // Fallback to safe color
        }
        viewer.innerHTML = '<div class="story-content" style="background:' + escAttr(bgColor) + '">' + ...; // Использовать escAttr для inline-стилей
        ```

14. **S14. XSS через `showConfirm` (msg)**
    *   Файл и строка: `showConfirm` function (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `escHtml(msg)` используется корректно, что хорошо.

15. **S15. XSS в `renderQRScreen` (username для QRCode.js)**
    *   Файл и строка: `renderQRScreen` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `username` в `new QRCode(div, { text: '...u=' + encodeURIComponent(username), ... })` уже `encodeURIComponent`, что хорошо.

16. **S16. XSS в `toggleSub` / `postReact` (UI update text)**
    *   Файл и строка: `toggleSub` function (Single JS block), `postReact` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `btn.textContent = ...` является безопасным способом обновления текста, предотвращая XSS.

17. **S17. XSS в `startDM` / `joinChannel` (data-атрибуты и inline onclick)**
    *   Файл и строка: `sidebarSearch` (Single JS block), `startDM` (Single JS block), `joinChannel` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `escSearch` используется для `data-uid`, `data-uname`, `data-uhandle`, `data-cid`, `data-cname`, `data-cslug`, что хорошо. Также в `sidebarSearch` `ci.onclick` через `startDM` / `joinChannel` - эти функции принимают аргументы, которые были `escSearch`, поэтому в данном случае безопасно. Однако, в общем случае, предпочтительнее не использовать `data-action="dm"` и `data-uid="..."` вместе с `data-action="join"` и `data-cid="..."` на одном элементе и тем более не полагаться на `escSearch` для `onclick`. Лучше вешать обработчик на `sr` и использовать `e.target.dataset`. Это уже сделано, хорошо.

18. **S18. Отсутствие Content Security Policy (CSP)**
    *   Файл и строка: `index.html` (meta tags)
    *   Серьезность: HIGH
    *   Конкретное исправление: Внедрить строгую CSP для защиты от XSS, clickjacking и других атак. Например: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' cdn.socket.io cdnjs.cloudflare.com appleid.cdn-apple.com; style-src 'self' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ws: wss: kosmos-backend-1.onrender.com; frame-ancestors 'none';">`.

19. **S19. Отсутствие HSTS (HTTP Strict Transport Security)**
    *   Файл и строка: N/A (настройка сервера)
    *   Серьезность: HIGH
    *   Конкретное исправление: Добавить HTTP заголовок `Strict-Transport-Security` для принудительного использования HTTPS.
        ```
        Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
        ```

20. **S20. Уязвимость к Clickjacking (для `auth` экрана)**
    *   Файл и строка: `index.html`
    *   Серьезность: HIGH
    *   Конкретное исправление: Добавить HTTP заголовок `X-Frame-Options: DENY` или `Content-Security-Policy: frame-ancestors 'none'` на стороне сервера для всех страниц, где не требуется встраивание.

21. **S21. Зависимость от незащищенных CDN (HTTPS только, но не целостность)**
    *   Файл и строка: `index.html` (script/link tags)
    *   Серьезность: MED
    *   Конкретное исправление: Для всех CDN скриптов/стилей добавить атрибуты `integrity` (Subresource Integrity - SRI).
        ```html
        <script src="..." integrity="..." crossorigin="anonymous"></script>
        ```

22. **S22. Отсутствие ограничения размера файла для загрузки аватара/фона**
    *   Файл и строка: `setChatBg` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: В `setChatBg` есть проверка `if (file.size > 5 * 1024 * 1024) { ... }`, что хорошо, но эта проверка только на клиенте. Сервер также должен проверять размер файла, чтобы предотвратить DoS-атаки.

23. **S23. Потенциальный DoS через `localStorage.setItem`**
    *   Файл и строка: `saveNote`, `setChatBg`, `saveInterests`, `submitAuth`, `loadFeed` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `localStorage` имеет ограниченный размер (обычно 5-10 МБ). Если пользователь сохраняет очень много заметок, большой фон или кэш ленты, это может привести к ошибке `QuotaExceededError` и отказу в работе приложения. Необходимо внедрить механизм очистки или ограничения количества сохраняемых элементов.

24. **S24. Раскрытие логики AI-агентов через `AI_SLUGS`**
    *   Файл и строка: `API: load chats...` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Список `AI_SLUGS` хардкоден в клиенте. Хотя это не является прямой уязвимостью, это раскрывает информацию о внутренних компонентах бэкенда. Этот список можно получать с сервера или вовсе не скрывать.

25. **S25. Использование `window.open` с динамическим `botUrl`**
    *   Файл и строка: `startTelegramBotAuth` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `window.open(data.botUrl, '_blank');` – если `data.botUrl` будет вредоносным URL (например, фишинговым), это может быть использовано для атак. Сервер должен строго контролировать и проверять `botUrl`.
        ```javascript
        // На бэкенде: Убедиться, что `botUrl` всегда указывает на официальный домен Telegram или доверенный бот.
        // На клиенте: Можно добавить дополнительную проверку домена `botUrl` перед открытием.
        const url = new URL(data.botUrl);
        if (url.hostname !== 't.me' && url.hostname !== 'telegram.me') {
            toast('Недопустимый URL бота Telegram', 'error');
            resetTgBtn();
            return;
        }
        window.open(data.botUrl, '_blank');
        ```

26. **S26. Отсутствие явной валидации `refreshToken` на клиенте**
    *   Файл и строка: `setInterval` для авто-обновления токена (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `if (!refreshToken) return;` – это хорошо, но если `refreshToken` каким-то образом будет подделан на клиенте, запрос все равно уйдет на сервер. Сервер должен быть единственной точкой валидации.

27. **S27. Уязвимость `Referer` заголовка**
    *   Файл и строка: `index.html` (meta tags)
    *   Серьезность: LOW
    *   Конкретное исправление: Добавить мета-тег для `Referrer-Policy`, чтобы контролировать, когда заголовок `Referer` отправляется. `no-referrer-when-downgrade` или `same-origin` — хорошие варианты по умолчанию.
        ```html
        <meta name="referrer" content="no-referrer-when-downgrade">
        ```

28. **S28. Недостаточная валидация `handle` при регистрации**
    *   Файл и строка: `submitAuth` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Регулярное выражение `!/^[a-z0-9_]{3,20}$/.test(handle)` это хорошо, но этого недостаточно для защиты от конфликтов или возможных атак через Unicode (например, похожие символы). Валидация уникальности и нормализация должны быть на бэкенде.

29. **S29. Отсутствие логирования безопасности на клиенте**
    *   Файл и строка: N/A (общая архитектура)
    *   Серьезность: LOW
    *   Конкретное исправление: При возникновении критических ошибок (например, ошибки авторизации, отказа сети, попытки XSS-инъекции) следует отправлять анонимные логи на сервер для мониторинга безопасности.

30. **S30. URL в реферальной ссылке с хардкодом домена**
    *   Файл и строка: `showReferral` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `https://c4v2jht698-ux.github.io/kosmos-frontend/?ref=` — домен захардкожен. В идеале он должен быть конфигурационной переменной.
        ```javascript
        // const APP_BASE_URL = window.location.origin; // Или из конфигурации
        // var link = APP_BASE_URL + '/?ref=' + d.code;
        ```

---

**2. Баги и логика (20 проверок)**

31. **B01. `dmList` элемент никогда не заполняется**
    *   Файл и строка: `render` function (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: В `render` `dmSec.style.display = 'none'` и `chList.innerHTML = ... all.map(itm) ...`. Все чаты (каналы и DM) идут в `chList`. `dmList` остается пустым и скрытым. Необходимо либо удалить `dmList`, либо переработать логику `render`, чтобы разделить DM и каналы.
        ```javascript
        // Вариант 1 (простой): Если DM всегда будут в chList, удалить dmSection и dmList из HTML и JS.
        // Вариант 2 (разделение):
        // var dmsHtml = dms.map(function(c){return itm(c)}).join('');
        // if (dmList) dmList.innerHTML = dmsHtml;
        // if (dmSec) dmSec.style.display = dms.length ? '' : 'none';
        // (И аналогично для chList только с каналами)
        ```

32. **B02. `_loaded` флаг чата не сбрасывается при ошибке загрузки сообщений**
    *   Файл и строка: `openChat` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Если `fetch` сообщений завершается ошибкой, `item._loaded` все равно остается `true`, что предотвращает повторную попытку загрузки.
        ```javascript
        // В блоке catch для fetch сообщений:
        .catch(function(e){
            console.error('Failed to load messages:', e);
            item._loaded = false; // Сбросить флаг, чтобы можно было попробовать снова
        });
        ```

33. **B03. `dmSec.style.display = 'none'` всегда после `render`**
    *   Файл и строка: `render` function (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `dmSec` скрывается после каждого рендера, что делает DM невидимыми. Это либо баг, либо ошибочная логика. Если DM должны отображаться, этот `display = 'none'` следует убрать или сделать условным (см. B01).
        ```javascript
        // Удалить строку:
        // var dmSec = document.getElementById('dmSection');
        // if (dmSec) dmSec.style.display = 'none';
        // Или переработать, чтобы dmList использовался.
        ```

34. **B04. `openChat` не работает для незагруженных DM (в `findItem`)**
    *   Файл и строка: `socket.on('chat_msg')` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Если сообщение приходит в DM, который еще не был загружен (нет в `dms`), создается новый `item`, но `_loaded` сразу устанавливается в `true`. Это означает, что `openChat` не будет пытаться загрузить историю сообщений с сервера для этого нового DM.
        ```javascript
        // В socket.on('chat_msg'):
        // ...
        item = {
          id: chatId, type: 'chat', name: senderName,
          g: GS[senderName.charCodeAt(0) % GS.length],
          em: (senderName || '?')[0].toUpperCase(),
          online: true, prev: '', time: '', _ts: 0, unread: 0, msgs: [],
          _loaded: false, // Изменить на false, чтобы openChat загрузил историю
        };
        dms.unshift(item);
        socket.emit('join', chatId);
        ```

35. **B05. Таймер активности `_lastActivity` не обновляется при скролле**
    *   Файл и строка: Inactivity logout block (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Текущая логика учитывает только `click` и `keydown`. Если пользователь просто читает/скроллит долгое время, его может "выкинуть" из сессии.
        ```javascript
        document.addEventListener('scroll', function() { _lastActivity = Date.now(); }, { passive: true });
        // Также можно добавить touchstart/touchmove для мобильных устройств
        document.addEventListener('touchstart', function() { _lastActivity = Date.now(); }, { passive: true });
        ```

36. **B06. Состояние `_feedRefresh` не сбрасывается при навигации**
    *   Файл и строка: `buildFeedView` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `window._feedRefresh` очищается и устанавливается в `buildFeedView`. Если `buildFeedView` вызывается быстро несколько раз, есть небольшой race condition, где старый интервал может еще работать до очистки нового.
        ```javascript
        // В начале buildFeedView:
        if (window._feedRefresh) { clearInterval(window._feedRefresh); window._feedRefresh = null; }
        // ...
        // В конце, после установки нового интервала:
        window._feedRefresh = setInterval(function() { ... }, 60000);
        ```

37. **B07. `postCard` не обновляет счетчик комментариев корректно**
    *   Файл и строка: `submitComment` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Обновление `ccBtn.innerHTML` с `textContent.replace(/\D/g,'')` может быть хрупким. Лучше получить текущее число, увеличить его и обновить `textContent` для числового span.
        ```javascript
        // Вместо: ccBtn.innerHTML = ccBtn.innerHTML.replace(/>(\d*)<\/button>/, '>' + (num+1) + '</button>');
        // Сделать:
        var countSpan = ccBtn.querySelector('span:last-child'); // Или другой селектор, если структура меняется
        if (countSpan) countSpan.textContent = num + 1;
        else ccBtn.insertAdjacentHTML('beforeend', '<span>' + (num + 1) + '</span>');
        ```

38. **B08. `goBack` не очищает историю браузера**
    *   Файл и строка: `goBack` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `history.pushState({ chat: true }, '');` добавляет состояние в историю. `goBack` просто убирает класс `chat-open`, но не возвращается назад в истории. Это приводит к тому, что при нажатии кнопки "назад" в браузере пользователь может увидеть пустые состояния.
        ```javascript
        function goBack() {
            if (history.state && history.state.chat) {
                history.back(); // Возврат на предыдущее состояние
            } else {
                // Если нет состояния чата, просто сбросить UI
                document.body.classList.remove('chat-open');
                document.body.classList.remove('dating-open');
                cur = null;
                render();
                var bn = document.getElementById('bottomNav');
                if (bn) bn.style.display = 'flex';
            }
        }
        // Дополнительно: добавить обработчик popstate для обработки нативного "назад"
        // window.addEventListener('popstate', function() {
        //     if (document.body.classList.contains('chat-open')) { /* ... */ }
        // });
        ```

39. **B09. `onChatTypeChange` не вызывается при открытии модального окна**
    *   Файл и строка: `openModal` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Функция `onChatTypeChange()` вызывается в `openModal`, что хорошо. Однако, она полагается на `checked` состояние радиокнопок. Если радиокнопка 'chat' не выбрана по умолчанию, это может привести к неправильному отображению. Убедиться, что `checked` проставлен в HTML.

40. **B10. `startDM` использует клиентскую генерацию `chatId`**
    *   Файл и строка: `startDM` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Если сервер недоступен, `chatId` генерируется на клиенте. Это может привести к некорректным `chatId`, если логика сервера отличается. Идеально, чтобы `chatId` всегда предоставлялся сервером.
        ```javascript
        // Вместо fallback:
        // if (!chatId) { /* ... fallback ... */ }
        // Лучше:
        if (!chatId) {
            toast('Не удалось создать чат. Попробуйте снова.', 'error');
            return;
        }
        // Или перенести всю логику создания DM на сервер.
        ```

41. **B11. Ошибки в `console.warn` и `console.error` без контекста**
    *   Файл и строка: Множество `catch` блоков (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Многие `catch` блоки просто `console.error(e)` или `console.warn(e.message)`. Это затрудняет отладку. Добавлять контекст к логам.
        ```javascript
        .catch(function(e) {
            console.error('[API] Failed to load feed:', e);
            // ...
        });
        ```

42. **B12. `_lastAuthAttempt` глобальная переменная для рейт-лимита**
    *   Файл и строка: `submitAuth` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Использование глобальной переменной `window._lastAuthAttempt` для клиентского рейт-лимита нормально, но если `window` переопределяется или очищается, рейт-лимит сбрасывается.
        ```javascript
        // Можно обернуть в замыкание или использовать более надежный механизм.
        const authRateLimiter = (function() {
            let lastAttempt = 0;
            const COOLDOWN = 2000;
            return {
                canAttempt: () => (Date.now() - lastAttempt > COOLDOWN),
                recordAttempt: () => { lastAttempt = Date.now(); }
            };
        })();
        // В submitAuth:
        // if (!authRateLimiter.canAttempt()) { showError('Подождите секунду...'); return; }
        // authRateLimiter.recordAttempt();
        ```

43. **B13. `relTime` не учитывает склонения и неполные переводы**
    *   Файл и строка: `relTime` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: "м" и "ч" могут быть непонятны без полного перевода. Также склонения (1 минута, 2 минуты, 5 минут) не учтены.
        ```javascript
        // Использовать более полный i18n подход или библиотеку для форматирования времени.
        // Пример:
        // if (sec < 60) return 'только что';
        // if (sec < 3600) return `${Math.floor(sec/60)} мин. назад`;
        // if (sec < 86400) return `${Math.floor(sec/3600)} час. назад`;
        // ...
        ```

44. **B14. `typingTimeout` может быть очищен другим индикатором**
    *   Файл и строка: `showTypingIndicator` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `typingTimeout` — это глобальная переменная. Если два разных пользователя начинают печатать почти одновременно, `typingTimeout` будет перезаписан, и индикатор может исчез слишком рано для одного из них.
        ```javascript
        // Использовать объект для отслеживания таймеров для каждого чата или пользователя.
        // var typingTimeouts = {};
        // typingTimeouts[data.chatId] = setTimeout(...);
        // clearTimeout(typingTimeouts[data.chatId]);
        ```

45. **B15. `startQRScan` без `video.onloadedmetadata`**
    *   Файл и строка: `startQRScan` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `qrScanInterval` запускается сразу после `video.play()`. Лучше дождаться, пока метаданные видео загрузятся (`video.onloadedmetadata`), прежде чем пытаться установить размер canvas.
        ```javascript
        video.srcObject = stream;
        video.onloadedmetadata = function() {
            video.play();
            // ... запустить qrScanInterval здесь
        };
        ```

46. **B16. `showConfetti` создает много элементов, не всегда удаляя старые**
    *   Файл и строка: `showConfetti` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Каждый вызов `showConfetti` создает новый `confetti-overlay`. Если функция вызывается часто, DOM может быстро засоряться.
        ```javascript
        // В начале showConfetti:
        var existingOverlays = document.querySelectorAll('.confetti-overlay');
        existingOverlays.forEach(o => o.remove());
        ```

47. **B17. `showToast` vs `toast` — две функции уведомлений**
    *   Файл и строка: `toast` (Single JS block), `showToast` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Есть две функции для отображения уведомлений (`toast` и `showToast`). `toast` — это простая строка, `showToast` — более сложная с аватаром и заголовком. Это сбивает с толку. Нужно либо унифицировать, либо четко разграничить их использование.
        ```javascript
        // Выбрать одну функцию и привести все вызовы к ней, или переименовать для ясности (например, `simpleToast` и `userToast`).
        ```

48. **B18. Отсутствие обработки ошибок в `openTelegramAuth` при `window.open`**
    *   Файл и строка: `startTelegramBotAuth` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `window.open(data.botUrl, '_blank')` может быть заблокирован браузером (всплывающие окна), если не вызван в результате прямого действия пользователя. В этом случае нет обратной связи.
        ```javascript
        try {
            var newWindow = window.open(data.botUrl, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.focus === 'function' && !newWindow.focus()) {
                toast('Блокировщик всплывающих окон не дал открыть Telegram. Разрешите всплывающие окна для Kosmos.', 'error');
                resetTgBtn();
            }
        } catch (e) {
            toast('Не удалось открыть Telegram. ' + e.message, 'error');
            resetTgBtn();
        }
        ```

49. **B19. Перезапуск `socket.io` на каждом `initSocket`**
    *   Файл и строка: `initSocket` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `if (socket) socket.disconnect();` и `if (keepaliveInterval) clearInterval(keepaliveInterval);` обеспечивают очистку, но если `initSocket` вызывается часто, это может привести к лишним дисконнектам/реконнектам.
        ```javascript
        // Убедиться, что initSocket вызывается только один раз при успешной авторизации, а не при каждом рендере или навигации.
        ```

50. **B20. Логика `goBack` для мобильных устройств**
    *   Файл и строка: `handleBack` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `handleBack` для Android/Capacitor вызывает `goBack()`. Однако `goBack()` для навигации по чатам использует `history.back()`. Если пользователь переходит от чатов к QR-экрану, затем нажимает "назад", он вернется в пустой чат, а не на предыдущий экран.
        ```javascript
        // Логика handleBack должна быть более контекстно-зависимой.
        // Возможно, лучше использовать стек состояний вместо полагания на историю браузера для внутриаппликационной навигации.
        // Пример:
        // function handleBack() {
        //   if (currentScreenStack.length > 1) {
        //     currentScreenStack.pop();
        //     renderScreen(currentScreenStack[currentScreenStack.length - 1]);
        //   } else {
        //     showExitConfirmation();
        //   }
        // }
        ```

---

**3. Производительность (20 проверок)**

51. **P01. Чрезмерное использование `innerHTML` для больших блоков**
    *   Файл и строка: `openChat`, `render`, `openProfileScreen`, `buildFeedView`, `buildDatingView`, `openGlobalSearch` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `innerHTML` приводит к полной перерисовке и перепарсингу DOM, что дорого. Использовать `document.createElement`, `appendChild`, `textContent` или библиотеку с Virtual DOM (React, Vue) для более эффективного обновления UI.

52. **P02. `render()` вызывается слишком часто**
    *   Файл и строка: `socket.on('chat_msg')`, `openChat`, `leaveChannel`, `deleteDM`, `updateOnbTrack`, `updateOnbDots` и т.д. (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `render()` перерисовывает весь список чатов. Это неэффективно. Оптимизировать `render` для точечного обновления только измененных элементов (например, обновление `unread` счетчика, `prev` текста или добавление нового сообщения).

53. **P03. Недостаточное кэширование элементов DOM**
    *   Файл и строка: `document.getElementById('chList')`, `document.getElementById('msgArea')`, `document.querySelectorAll('.ci-wrap')` и т.д. (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Частое обращение к DOM через `getElementById` или `querySelectorAll` внутри циклов или часто вызываемых функций. Элементы, которые используются многократно, следует кэшировать в переменных.
        ```javascript
        // В начале функции или глобально, если элемент статический
        // const chListEl = document.getElementById('chList');
        // chListEl.innerHTML = ...;
        ```

54. **P04. Синхронные операции `localStorage` блокируют основной поток**
    *   Файл и строка: `localStorage.getItem` и `localStorage.setItem` в `loadFeed`, `saveNote`, `sendAI`, `initSocket`, `submitAuth`, `setInterval` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `localStorage` - это синхронное API. Если в нем хранятся большие объемы данных, это может вызвать задержки в UI. Для больших или часто изменяемых данных рассмотреть использование `IndexedDB` (асинхронно).

55. **P05. Неоптимизированное обновление списка чатов в `loadMyChats`**
    *   Файл и строка: `loadMyChats` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `channels.length = 0; dms.length = 0;` затем `push` и `render()`. Это полная очистка и пересоздание всех DOM-элементов. Использовать алгоритм сравнения (diffing) для обновления только измененных элементов, чтобы избежать мерцания и повысить производительность.

56. **P06. Частое повторное вычисление `Math.random` в `initOnbStars`**
    *   Файл и строка: `initOnbStars` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `Math.random()` вызывается в цикле для создания звезд, это нормально. Однако, `Math.min(200, Math.floor(canvas.offsetWidth * canvas.offsetHeight / 3000))` может быть достаточно много звезд для слабых устройств. Можно снизить количество звезд или оптимизировать их отрисовку.

57. **P07. Анимации через `setTimeout` вместо CSS transitions**
    *   Файл и строка: `toast` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `setTimeout(function(){ t.style.opacity='1'; }, 10);` и `setTimeout(function(){ t.style.opacity='0'; ... }, 2500);` - это запуск CSS-перехода с задержкой. Сами `opacity` переходы должны быть в CSS, а `setTimeout` просто добавляет/удаляет класс.
        ```javascript
        // CSS: .toast.show { opacity: 1; }
        // JS: t.classList.add('show');
        ```

58. **P08. Неэффективный `document.querySelectorAll` в `initSwipeToLeave`**
    *   Файл и строка: `initSwipeToLeave` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `document.querySelectorAll('.ci-wrap')` вызывается на каждом `setTimeout(initSwipeToLeave, 50);`. Это может быть очень дорого, если элементов много.
        ```javascript
        // Если initSwipeToLeave должна быть вызвана для новых элементов, использовать MutationObserver
        // Если только для существующих, вызывать один раз или передавать список элементов.
        ```

59. **P09. Отсутствие виртуализации для длинных списков (чатов, сообщений, ленты)**
    *   Файл и строка: `chList`, `msgArea`, `feedList` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: При большом количестве чатов, сообщений или постов в ленте DOM может стать очень большим, что сильно замедляет работу. Необходимо реализовать виртуализацию списка (rendering only visible items) для оптимизации.

60. **P10. `DOMPurify.sanitize` вызывается на каждом `escHtml`**
    *   Файл и строка: `escHtml` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `DOMPurify` - это мощный, но относительно тяжелый инструмент. Если строка уже была "очищена" или не содержит HTML-специальных символов, вызов `DOMPurify.sanitize` может быть избыточным.
        ```javascript
        // Можно добавить кэширование результатов или использовать DOMPurify только для строк, где потенциально есть HTML.
        // Или, если DOMPurify всегда будет загружен, удалить typeof проверку.
        ```

61. **P11. Неоптимизированный `draw` в `initOnbStars`**
    *   Файл и строка: `initOnbStars` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);` очищает весь холст на каждом кадре. Для анимации такого типа это нормально, но если бы звезд было гораздо больше, можно было бы оптимизировать частичную очистку.

62. **P12. Излишние рефлоу/перерисовки при изменении `transform` через JS**
    *   Файл и строка: `initOnbSwipe` (Single JS block), `initSwipeToLeave` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Прямое изменение `element.style.transform` в `touchmove` может быть производительным, но если другие свойства CSS также меняются, это может вызвать рефлоу. Использование `requestAnimationFrame` для управления анимациями, инициированными в `touchmove`, может помочь.
        ```javascript
        // В touchmove:
        // requestAnimationFrame(function() {
        //   track.style.transform = 'translateX(' + offset + '%)';
        // });
        ```

63. **P13. `setInterval` для `ping` бэкенда**
    *   Файл и строка: `Backend ping` block (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `setInterval(function() { fetch(API + '/ping').catch(function(){}); }, 9 * 60 * 1000);` - это хорошо для поддержания сервера Render.com в активности. Но `fetch().catch()` без обработки ошибок может засорять консоль.

64. **P14. `requestAnimationFrame` в `_splashType`**
    *   Файл и строка: Splash Typewriter block (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Анимация печати использует `setTimeout(..., 28)`. Для более плавной анимации лучше использовать `requestAnimationFrame` для каждой буквы, чтобы гарантировать синхронизацию с рефрешем браузера.

65. **P15. Повторный `fetch` для `me` в `openProfileScreen` и `openEditProfile`**
    *   Файл и строка: `openProfileScreen`, `openEditProfile` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Если `currentUser` уже загружен и актуален, нет необходимости повторно его загружать при открытии профиля или экрана редактирования. Можно использовать кэшированные данные.
        ```javascript
        // В openProfileScreen / openEditProfile:
        // if (currentUser) {
        //   // Использовать currentUser, возможно, с небольшим delay для обновления, если фон изменился
        // } else {
        //   // fetch /me
        // }
        ```

66. **P16. `qrScanInterval` слишком частый**
    *   Файл и строка: `startQRScan` function (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `setInterval(..., 300)` для `jsQR` - это достаточно часто. Обработка изображения каждые 300 мс может быть ресурсоемкой, особенно на мобильных устройствах. Можно увеличить интервал до 500-1000 мс или использовать `requestAnimationFrame` для сканирования, чтобы не блокировать UI.

67. **P17. Отсутствие Lazy Loading для изображений (аватаров, фото)**
    *   Файл и строка: `itm`, `postCard`, `datingCard` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Изображения аватаров или фото в ленте/знакомствах загружаются сразу. Для производительности и экономии трафика стоит использовать `loading="lazy"` для `<img>` тегов или Intersection Observer API.
        ```html
        <img src="..." loading="lazy">
        ```

68. **P18. `Hammer.js` для свайпов может быть тяжелым**
    *   Файл и строка: `initOnbSwipe`, `initSwipeToLeave`, `showDatingCard`, `Swipe back` block (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `Hammer.js` - это полноценная библиотека. Для простых свайпов можно реализовать логику самостоятельно, чтобы избежать загрузки целой библиотеки. Или убедиться, что она загружается асинхронно и только когда нужна.

69. **P19. Многочисленные `document.createElement('div')` для временных целей**
    *   Файл и строка: `toast`, `appendMsg`, `showTypingIndicator`, `sendAI`, `showContextMenu`, `showConfetti` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Хотя `createElement` лучше, чем `innerHTML` для небольших кусков, частое создание и удаление элементов может быть неэффективным. Для повторяющихся паттернов (например, сообщение) можно использовать шаблоны HTML или клонирование существующих скрытых элементов.

70. **P20. `setInterval` для `_tgPoll` с высоким количеством попыток**
    *   Файл и строка: `startTelegramBotAuth` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: `attempts > 150` с интервалом 2 секунды - это 5 минут polling. Это довольно долго и может быть расточительно. Возможно, увеличить интервал polling или реализовать на бэкенде механизм вебхуков/long polling.

---

**4. Мёртвый код (15 проверок)**

71. **D01. `dmList` элемент в HTML не используется**
    *   Файл и строка: HTML `<div class="chat-list grow" id="dmList"></div>` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Согласно анализу B01 и B03, DM чаты отображаются в `chList`, а `dmList` скрыт и никогда не заполняется. Его можно удалить из HTML и всех ссылок в JS.

72. **D02. `buildFeedView` logic for `ptrIndicator`**
    *   Файл и строка: `buildFeedView` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `document.getElementById('ptrIndicator')` - этот элемент не существует в предоставленном HTML. Соответствующий код для pull-to-refresh (`_ptrStart`, `_ptrActive`, `ptr`) является мертвым, если индикатор не добавлен в HTML.
        ```javascript
        // Удалить этот блок или добавить <div id="ptrIndicator"></div> в HTML
        // var ptr = document.getElementById('ptrIndicator');
        // if (ptr) ptr.classList.add('active');
        ```

73. **D03. `_swipeDocListenerAdded` - флаг, но его значение не критично**
    *   Файл и строка: `initSwipeToLeave` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Флаг `_swipeDocListenerAdded` используется, чтобы `document.addEventListener` был вызван только один раз. Это не совсем мертвый код, но избыточно для глобального listener, который должен быть инициализирован один раз при загрузке.
        ```javascript
        // Вынести addEventListener за пределы initSwipeToLeave и вызывать его один раз.
        // document.addEventListener('touchstart', function(e) { ... }, { passive: true });
        // (уже так, но _swipeDocListenerAdded все еще есть)
        ```

74. **D04. `openTelegramAuth` не вызывается в JS (только из HTML)**
    *   Файл и строка: `openTelegramAuth` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Функция `openTelegramAuth` определена, но в JS коде не вызывается. Она вызывается из HTML `<button id="telegramApkBtn" onclick="openTelegramAuth()">`. Это не мертвый код, но функция находится в JS, в то время как ее вызов только в HTML. Можно перенести вызов через `addEventListener` в JS.

75. **D05. `chatCancelWrap` элемент в модальном окне `createChat`**
    *   Файл и строка: HTML `<div id="chatCancelWrap">` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `chatCancelWrap` отображается только, если выбрана опция "Личный чат", но при этом на модальном окне уже есть кнопка "Отмена" для каналов. Может быть удалена или унифицирована.

76. **D06. `_splashDone` флаг для `closeSplash`**
    *   Файл и строка: `closeSplash` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Флаг `_splashDone` предотвращает повторный вызов `closeSplash`, но в текущей логике `closeSplash` вызывается один раз. Это немного избыточно.

77. **D07. `window.Capacitor.Plugins.App.exitApp()` в `handleBack`**
    *   Файл и строка: `handleBack` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Этот вызов завершает приложение Capacitor. Однако, в `handleBack` есть проверка `e.canGoBack`. Логика выхода из приложения должна быть более явной. `this.closest(\'[data-exit]\').remove()` также странный способ.

78. **D08. `onbAnimId` глобальная переменная, используемая только в `initOnbStars` и `finishOnbTour`**
    *   Файл и строка: `_onbAnimId` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Переменная `_onbAnimId` имеет глобальную область видимости, но используется только в двух функциях, связанных с онбордингом. Ее можно инкапсулировать внутри модуля онбординга.

79. **D09. Переменная `_selectedMood` в `openStatusEditor` и `saveStatus`**
    *   Файл и строка: `_selectedMood` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Переменная `_selectedMood` имеет глобальную область видимости, но используется только для выбора настроения. Ее можно инкапсулировать в функции, чтобы избежать загрязнения глобального пространства имен.

80. **D10. `toggleTheme();openProfileScreen()` в `openProfileScreen`**
    *   Файл и строка: `openProfileScreen` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: В строке `onclick="toggleTheme();openProfileScreen()"` вызов `openProfileScreen()` после `toggleTheme()` приводит к повторному рендерингу. Это не совсем мертвый код, но может быть неэффективным.

81. **D11. `setTimeout(startTour, 500)` в `saveInterests`**
    *   Файл и строка: `saveInterests` function (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: `startTour` вызывается с задержкой 500 мс. Если пользователь быстро переходит или `localStorage.getItem('kosmos_tour_done')` уже true, `startTour` ничего не сделает.

82. **D12. `_refCode` из URL параметров**
    *   Файл и строка: `_refCode` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Переменная `_refCode` используется при регистрации, но не очищается после использования. Может быть частью состояния формы регистрации.

83. **D13. `if (window._tgPoll) { clearInterval(window._tgPoll); window._tgPoll = null; }`**
    *   Файл и строка: `startTelegramBotAuth` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Этот паттерн для очистки глобального интервала корректен, но указывает на то, что `_tgPoll` может быть запущен несколько раз без очистки. Если `_tgPoll` всегда запускается в одном месте, такая проверка может быть избыточной.

84. **D14. `API` переменная, захардкоженная на домен Render.com**
    *   Файл и строка: `var API = 'https://kosmos-backend-1.onrender.com';` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Хардкодить URL API в продакшн-коде не лучшая практика. Он должен быть конфигурационной переменной, которую можно легко изменить для разных окружений (dev, staging, prod).

85. **D15. `onAppleAuth` в `window.onAppleAuth`**
    *   Файл и строка: `window.onAppleAuth = onAppleAuth;` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Присвоение функции `onAppleAuth` свойству `window.onAppleAuth` избыточно, если `onAppleAuth` вызывается напрямую из HTML (`onclick="onAppleAuth()"`). Если AppleID ожидает коллбэк именно в `window.onAppleAuth`, то это не мертвый код.

---

**5. Чего не хватает для топ мессенджера (15 проверок)**

86. **M01. Отсутствие End-to-End шифрования сообщений**
    *   Файл и строка: N/A (архитектурное решение)
    *   Серьезность: CRIT
    *   Конкретное исправление: Реализовать E2EE с использованием криптографических библиотек (например, Signal Protocol) для защиты приватности переписки. Seed-фраза используется только для аутентификации, не для E2EE.

87. **M02. Отсутствие полноценного списка контактов/друзей**
    *   Файл и строка: N/A (архитектурное решение)
    *   Серьезность: HIGH
    *   Конкретное исправление: Добавить функциональность "Друзья" с возможностью добавлять, удалять контакты, просматривать их профили без поиска.

88. **M03. Отсутствие медиафайлов (фото/видео) в сообщениях**
    *   Файл и строка: `mHTML`, `inpHTML` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: Внедрить возможность отправки и отображения изображений, видео, файлов в чатах и постах.

89. **M04. Отсутствие групповых чатов (помимо каналов)**
    *   Файл и строка: N/A (архитектурное решение)
    *   Серьезность: HIGH
    *   Конкретное исправление: Реализовать функцию создания закрытых групповых чатов с приглашением пользователей, правами администраторов и т.д.

90. **M05. Отсутствие push-уведомлений на сервере**
    *   Файл и строка: `requestNotifPermission`, `socket.on('chat_msg')` (Single JS block)
    *   Серьезность: HIGH
    *   Конкретное исправление: `requestNotifPermission` запрашивает разрешение, а `showToast` отображает локальные уведомления. Для работы "топ мессенджера" нужны полноценные push-уведомления (через FCM/APNS) с бэкенда, когда приложение неактивно.

91. **M06. Отсутствие редактирования/удаления сообщений и постов**
    *   Файл и строка: N/A (отсутствие функций в `mHTML`, `postCard`)
    *   Серьезность: MED
    *   Конкретное исправление: Добавить возможность редактировать отправленные сообщения/посты и удалять их.

92. **M07. Ограниченные возможности профиля знакомств (без поиска по параметрам)**
    *   Файл и строка: `buildDatingView`, `loadDatingCards` (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: В текущей реализации профили знакомств просто перебираются. Добавить фильтры и поиск по возрасту, городу, интересам, полу и т.д.

93. **M08. Отсутствие голосовых/видеозвонков**
    *   Файл и строка: N/A (отсутствие функций)
    *   Серьезность: HIGH
    *   Конкретное исправление: Внедрить WebRTC для осуществления голосовых и видеозвонков.

94. **M09. Отсутствие многоязычной поддержки (i18n)**
    *   Файл и строка: Весь код на русском (Single JS block)
    *   Серьезность: MED
    *   Конкретное исправление: Использовать библиотеку для интернационализации (например, `i18next` или `formatjs`) для поддержки нескольких языков.

95. **M10. Базовая аналитика и логирование ошибок**
    *   Файл и строка: Множество `try/catch` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Внедрить систему аналитики (например, Google Analytics, Amplitude) и агрегирования ошибок (Sentry, Bugsnag) для отслеживания использования, производительности и ошибок.

96. **M11. Отсутствие поддержки Mentions (@username) и Hashtags (#tag)**
    *   Файл и строка: `mHTML`, `postCard` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Добавить парсинг сообщений и постов для выделения @упоминаний и #хештегов с возможностью перехода по ним.

97. **M12. Отсутствие "Закрепленных" сообщений в чатах/каналах**
    *   Файл и строка: `openChat` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Реализовать функцию закрепления важных сообщений, которые всегда видны вверху чата.

98. **M13. Отсутствие подробных профилей каналов (с правилами, фото)**
    *   Файл и строка: `itm`, `openChat` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Расширить функциональность профилей каналов: описание, правила, аватар, история постов, список администраторов.

99. **M14. Отсутствие "избранного" или "сохраненных" постов в ленте**
    *   Файл и строка: `postCard` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Добавить кнопку "Сохранить" для постов в ленте, чтобы пользователи могли легко возвращаться к интересному контенту.

100. **M15. Отсутствие поддержки Dark/Light Mode**
    *   Файл и строка: `applyTheme`, `toggleTheme` (Single JS block)
    *   Серьезность: LOW
    *   Конкретное исправление: Хотя есть `toggleTheme` и `data-theme`, это скорее "смена цветовой схемы" между "голубой" и "розовой". Нет классического Dark/Light Mode, который бы адаптировался к системным настройкам.
        ```javascript
        // const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        // document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        ```