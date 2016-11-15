var remoteVideo;
var peerConnection;
var uuid;

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function pageReady() {
    uuid = uuid();
    remoteVideo = document.getElementById('remoteVideo');
    serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    serverConnection.onmessage = gotMessageFromServer;
    setTimeout(function(){start(true);}, 2500);
}

function start(isCaller) {
    if(!peerConnection){
      peerConnection = new RTCPeerConnection(peerConnectionConfig);
      peerConnection.onicecandidate = gotIceCandidate;
      peerConnection.onaddstream = gotRemoteStream;
    }
    if(isCaller) {
      console.log("sending msg to pi");
      serverConnection.send(JSON.stringify({'client': 'run', 'uuid': uuid}));
    }
}

function gotMessageFromServer(message) {

    var signal = JSON.parse(message.data);
    if(signal.uuid == uuid) return;
    if(!peerConnection) start(false);

    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    }
}

function gotIceCandidate(event) {
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
}

function createdDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description).then(function() {
        serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
    document.querySelector("img").remove();
    document.querySelector("h3").remove();
}

function errorHandler(error) {
    console.log(error);
}

function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
