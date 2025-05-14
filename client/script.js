const socket = io();
let peerConnection;
let peerConnectionCreated = false;  // Flag to avoid creating multiple peer connections
const config = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },  // Google STUN server for fallback
    {
      urls: [
        "turn:bn-turn1.xirsys.com:80?transport=udp",
        "turn:bn-turn1.xirsys.com:3478?transport=udp",
        "turn:bn-turn1.xirsys.com:80?transport=tcp",
        "turn:bn-turn1.xirsys.com:3478?transport=tcp",
        "turns:bn-turn1.xirsys.com:443?transport=tcp",
        "turns:bn-turn1.xirsys.com:5349?transport=tcp"
      ],
      username: "yVKe1J8bwlH5D_DmvFzFqvQrQX-JRYUvtUYNdcLEZSU7Fcmup6ctxLvgy9uctsHiAAAAAGgknM1BZHJpZnQwMQ==",
      credential: "b3ad7dcc-30c8-11f0-942d-0242ac140004"
    }
  ]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;

    // When a match is found, create a peer connection
    socket.on('match', () => {
      if (!peerConnectionCreated) {
        peerConnectionCreated = true;  // Ensure peer connection is only created once

        peerConnection = new RTCPeerConnection(config);
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        peerConnection.onicecandidate = e => {
          if (e.candidate) {
            socket.emit('signal', { candidate: e.candidate });
          }
        };

        peerConnection.ontrack = e => {
          remoteVideo.srcObject = e.streams[0];
        };

        peerConnection.createOffer()
          .then(offer => peerConnection.setLocalDescription(offer))
          .then(() => socket.emit('signal', { offer: peerConnection.localDescription }));
      }
    });

    // Handle incoming signaling data
    socket.on('signal', async data => {
      console.log('Received signal data:', data);  // Log incoming signaling data

      if (data.offer) {
        peerConnection = new RTCPeerConnection(config);
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        peerConnection.onicecandidate = e => {
          if (e.candidate) {
            socket.emit('signal', { candidate: e.candidate });
          }
        };

        peerConnection.ontrack = e => {
          remoteVideo.srcObject = e.streams[0];
        };

        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { answer });
      }

      if (data.answer) {
        await peerConnection.setRemoteDescription(data.answer);
      }

      if (data.candidate) {
        try {
          await peerConnection.addIceCandidate(data.candidate);
        } catch (err) {
          console.error('Error adding received ice candidate', err);
        }
      }
    });

    // Partner disconnected, reload the page
    socket.on('partner-disconnected', () => {
      alert('Partner disconnected');
      location.reload();
    });

  })
  .catch(err => {
    console.error('Error accessing media devices: ', err);  // Log error for debugging
    alert('Camera access denied: ' + err.message);  // Show user-friendly message
  });
