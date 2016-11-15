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
    serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    serverConnection.onmessage = gotMessageFromServer;
    var constraints = { 
      video: {
	mandatory: {
	  minWidth: 1280,
	  minHeight: 720
	  //minWidth: 1024,
	  //minHeight: 576
	}
      } 
    };
    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
            localStream = stream;
          }
        ).catch(errorHandler);
    } else {
      alert('Your browser does not support getUserMedia API');
    }
}

function gotMessageFromServer(message) {

    var signal = JSON.parse(message.data);
    if(signal.uuid == uuid) return;
    if(!peerConnection){
      peerConnection = new RTCPeerConnection(peerConnectionConfig);
      peerConnection.onremovestream = function(event) { console.log('stream removed'); };
      peerConnection.onclose = function(event) { console.log('closed'); };
      peerConnection.oniceconnectionstatechange = function() {
        if(peerConnection.iceConnectionState == 'disconnected') {
            console.log('Disconnected');
            window.location.reload(true);
            //localStream.stop();
            //peerConnection.removeStream(localStream);
            //peerConnection.close();
        }
      }
    }

    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    } else if(signal.client) {
      console.log("adding stream from pi");
      peerConnection.addStream(localStream);
      peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    }

}

function createdDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description).then(function() {
        serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
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
