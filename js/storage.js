var KosmosDB = (function() {
  var db = null;
  var DB_NAME = 'KosmosDB';
  var DB_VERSION = 1;
  var STORE = 'messages';

  function init() {
    return new Promise(function(resolve, reject) {
      if (db) { resolve(db); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          var store = d.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('chatId', 'chatId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = function(e) {
        db = e.target.result;
        console.log('Клеточная память активна');
        resolve(db);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function saveMessage(msg) {
    return init().then(function(d) {
      return new Promise(function(resolve, reject) {
        var tx = d.transaction(STORE, 'readwrite');
        var req = tx.objectStore(STORE).put(msg);
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function getMessages(chatId) {
    return init().then(function(d) {
      return new Promise(function(resolve, reject) {
        var tx = d.transaction(STORE, 'readonly');
        var idx = tx.objectStore(STORE).index('chatId');
        var req = idx.getAll(IDBKeyRange.only(chatId));
        req.onsuccess = function() {
          var msgs = (req.result || []).sort(function(a, b) { return a.timestamp - b.timestamp; });
          resolve(msgs);
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function clearChat(chatId) {
    return init().then(function(d) {
      return new Promise(function(resolve, reject) {
        var tx = d.transaction(STORE, 'readwrite');
        var idx = tx.objectStore(STORE).index('chatId');
        var req = idx.openCursor(IDBKeyRange.only(chatId));
        req.onsuccess = function(e) {
          var cursor = e.target.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
          else resolve();
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  init();
  return { saveMessage: saveMessage, getMessages: getMessages, clearChat: clearChat };
})();

// Оффлайн-очередь сообщений (отдельная мини-БД)
KosmosDB.addToQueue = function(msg) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('KosmosQueueDB', 1);
        request.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('queue')) {
                db.createObjectStore('queue', { keyPath: 'id' });
            }
        };
        request.onsuccess = function(e) {
            var db = e.target.result;
            var tx = db.transaction('queue', 'readwrite');
            var store = tx.objectStore('queue');
            msg.id = msg.id || 'local_' + Date.now().toString();
            store.put(msg);
            tx.oncomplete = function() { resolve(msg); };
            tx.onerror = function() { reject(tx.error); };
        };
    });
};

KosmosDB.getQueue = function() {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('KosmosQueueDB', 1);
        request.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' });
        };
        request.onsuccess = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('queue')) return resolve([]);
            var tx = db.transaction('queue', 'readonly');
            var store = tx.objectStore('queue');
            var req = store.getAll();
            req.onsuccess = function() { resolve(req.result); };
            req.onerror = function() { reject(req.error); };
        };
    });
};

KosmosDB.removeFromQueue = function(msgId) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('KosmosQueueDB', 1);
        request.onsuccess = function(e) {
            var db = e.target.result;
            var tx = db.transaction('queue', 'readwrite');
            var store = tx.objectStore('queue');
            store.delete(msgId);
            tx.oncomplete = function() { resolve(); };
        };
    });
};
