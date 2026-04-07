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
