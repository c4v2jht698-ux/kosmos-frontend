var P2PManager = (function() {
  var RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  };

  var peers = {};

  function createPeer(peerId, onSignal, onMessage) {
    var pc = new RTCPeerConnection(RTC_CONFIG);
    var dc = null;

    pc.onicecandidate = function(e) {
      if (e.candidate && typeof onSignal === 'function') {
        onSignal({ type: 'ice', candidate: e.candidate, peerId: peerId });
      }
    };

    pc.ondatachannel = function(e) {
      bindChannel(e.channel, peerId, onMessage);
    };

    peers[peerId] = { pc: pc, dc: dc };
    return pc;
  }

  function bindChannel(channel, peerId, onMessage) {
    channel.onopen = function() {
      console.log('%c[P2P] Прямой мост установлен', 'color:#00ff00;font-weight:600');
      peers[peerId].dc = channel;
      if (typeof haptic === 'function') haptic('light');
    };
    channel.onclose = function() {
      console.warn('[P2P] Канал закрыт:', peerId);
    };
    channel.onmessage = function(e) {
      var parsed;
      try { parsed = JSON.parse(e.data); } catch(err) { parsed = e.data; }
      if (typeof onMessage === 'function') onMessage(peerId, parsed);
      document.dispatchEvent(new CustomEvent('p2p_msg', { detail: { peerId: peerId, payload: parsed } }));
    };
  }

  function createOffer(peerId, onSignal, onMessage) {
    var pc = createPeer(peerId, onSignal, onMessage);
    var dc = pc.createDataChannel('kosmos_mesh', { ordered: true });
    bindChannel(dc, peerId, onMessage);
    peers[peerId].dc = dc;
    return pc.createOffer()
      .then(function(offer) { return pc.setLocalDescription(offer).then(function() { return offer; }); })
      .then(function(offer) {
        if (typeof onSignal === 'function') onSignal({ type: 'offer', sdp: offer, peerId: peerId });
        return offer;
      });
  }

  function handleOffer(peerId, sdp, onSignal, onMessage) {
    var pc = createPeer(peerId, onSignal, onMessage);
    return pc.setRemoteDescription(new RTCSessionDescription(sdp))
      .then(function() { return pc.createAnswer(); })
      .then(function(answer) { return pc.setLocalDescription(answer).then(function() { return answer; }); })
      .then(function(answer) {
        if (typeof onSignal === 'function') onSignal({ type: 'answer', sdp: answer, peerId: peerId });
        return answer;
      });
  }

  function handleAnswer(peerId, sdp) {
    var peer = peers[peerId];
    if (!peer) return Promise.reject('Peer not found');
    return peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  function handleIce(peerId, candidate) {
    var peer = peers[peerId];
    if (!peer) return;
    peer.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(function() {});
  }

  function send(peerId, data) {
    var peer = peers[peerId];
    if (!peer || !peer.dc || peer.dc.readyState !== 'open') return false;
    peer.dc.send(typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  }

  function close(peerId) {
    var peer = peers[peerId];
    if (!peer) return;
    if (peer.dc) peer.dc.close();
    peer.pc.close();
    delete peers[peerId];
  }

  function closeAll() {
    Object.keys(peers).forEach(close);
  }

  return {
    createOffer: createOffer,
    handleOffer: handleOffer,
    handleAnswer: handleAnswer,
    handleIce: handleIce,
    send: send,
    close: close,
    closeAll: closeAll,
    getPeers: function() { return Object.keys(peers); }
  };
})();
