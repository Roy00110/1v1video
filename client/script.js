const socket = io();
let peerConnection;
const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
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

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;

    socket.on("match", () => {
      console.log("🟢 Matched with a partner");

      peerConnection = new RTCPeerConnection(config);
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.onicecandidate = e => {
        if (e.candidate) {
          console.log("📡 Sending ICE candidate");
          socket.emit("signal", { candidate: e.candidate });
        }
      };

      peerConnection.ontrack = e => {
        console.log("📹 Remote track received", e.streams);
        remoteVideo.srcObject = e.streams[0];
      };

      peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
          console.log("📨 Sending offer");
          socket.emit("signal", { offer: peerConnection.localDescription });
        });
    });

    socket.on("signal", async data => {
      if (data.offer) {
        console.log("📩 Offer received");
        peerConnection = new RTCPeerConnection(config);
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        peerConnection.onicecandidate = e => {
          if (e.candidate) {
            console.log("📡 Sending ICE candidate");
            socket.emit("signal", { candidate: e.candidate });
          }
        };

        peerConnection.ontrack = e => {
          console.log("📹 Remote track received", e.streams);
          remoteVideo.srcObject = e.streams[0];
        };

        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log("📨 Sending answer");
        socket.emit("signal", { answer });
      }

      if (data.answer) {
        console.log("📩 Answer received");
        await peerConnection.setRemoteDescription(data.answer);
      }

      if (data.candidate) {
        console.log("📥 ICE candidate received");
        try {
          await peerConnection.addIceCandidate(data.candidate);
        } catch (err) {
          console.error("🚨 Error adding received ice candidate", err);
        }
      }
    });

    socket.on("partner-disconnected", () => {
      alert("❌ Partner disconnected");
      location.reload();
    });
  })
  .catch(err => {
    console.error("🚫 Camera access denied or error:", err);
    alert("❌ Please allow camera and mic access.");
  });
