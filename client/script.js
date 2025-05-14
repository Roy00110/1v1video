const socket = io();
let peerConnection;
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your_xirsys_url_here',
      username: 'your_xirsys_username',
      credential: 'your_xirsys_credential'
    }
  ]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;

    socket.on('match', () => {
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
    });

    socket.on('signal', async data => {
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

    socket.on('partner-disconnected', () => {
      alert('Partner disconnected');
      location.reload();
    });

  }).catch(err => {
    alert('Camera access denied');
  });
