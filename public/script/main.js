const socket = window.io.connect("/");
let peer = null; // RTCPeerConnection
let cacheStream = null; // MediaStreamTrack

function init() {
  const socketId = document.getElementById("socket-id");
  socketId.textContent = socket.id;

  socket.on("newUser", ({ username, room }) => {
    console.log(`歡迎 ${username} 進到房間 ${room}`);
  });

  socket.on("userLeft", ({ username, room }) => {
    console.log(`${username} 已離開房間 ${room}`);
  });

  socket.on("leaveRoom", () => {
    console.log("你已離開房間");
  });

  socket.on("offer", onSDPOfferReceived);
  socket.on("answer", onSDPAnswerReceived);
  socket.on("icecandidate", onNewIceCandidateAdded);
}

function onJoinRoom(room) {
  init();
  const username = `Guest__${new Date().getTime()}`;
  // in order to share streaming , we should notify other peer to add candidate
  peer.onicecandidate = onSendIceCandidateToRemotePeer;
  // display video if received remote connection
  peer.ontrack = onRemoteStreamReceived;
  peer.onnegotiationneeded = onNegotiationNeeded;
  try {
    // RTCPeerConnection.addTrack => add MediaStreamTrack
    cacheStream
      .getTracks()
      .forEach((track) => peer.addTrack(track, cacheStream));
  } catch (error) {
    console.error("Peer addTrack error", error.message);
  }
  console.log("onJoinRoom");
  socket.emit("joinRoom", { username, room });
}

function onLeaveRoom(room) {
  console.log("now you leave room");
  if (!peer) return;

  // remote event listeners
  peer.ontrack = null;
  peer.onicecandidate = null;
  peer.onnegotiationneeded = null;

  // stop all connection media stream
  peer.getSenders().forEach((sender) => peer.removeTrack(sender));
}

function onDisconnect(room) {
  onLeaveRoom(room);

  // stop local video play, and stop media track
  const localVideo = document.getElementById("local-video");
  localVideo.pause();
  localVideo.srcObject.getTracks().forEach((track) => track.stop());
  localVideo.srcObject = null;
  // cleanup
  peer.close();
  peer = null;
  cacheStream = null;
}

function onSendIceCandidateToRemotePeer(event) {
  socket.emit("icecandidate", { room: "lobby", candidate: event.candidate });
}

function onRemoteStreamReceived(event) {
  console.log("*** receive remote stream");
  const remoteVideos = document.getElementById("remote-videos");
  const h3 = document.createElement("h3");
  h3.textContent = socket.id;
  const remoteVideo = document.createElement("video");
  remoteVideo.autoplay = true;
  console.log("event.streams", event.streams);
  const [stream] = event.streams;
  if (remoteVideo.srcObject !== stream) remoteVideo.srcObject = stream;
  remoteVideos.appendChild(h3);
  remoteVideos.appendChild(remoteVideo);
}

async function onNegotiationNeeded(event) {
  console.log("*** prepare to connect remote peer");
  try {
    console.log("start createOffer");
    const offerOptions = {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1,
    };
    await peer.setLocalDescription(await peer.createOffer(offerOptions));
    socket.emit("offer", { room: "lobby", offer: peer.localDescription });
  } catch (error) {
    console.error("onNegotiationNeeded error", error.message);
  }
}

function createPeerConnection() {
  console.log("creating peer connection");
  peer = new RTCPeerConnection();
}

async function addStreamProcess() {
  try {
    console.log("receiving local media stream");
    const mediaConstraints = {
      audio: false,
      video: {
        height: 200,
        aspectRatio: {
          ideal: 1.333333, // 3:2 aspect
        },
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    const localVideo = document.getElementById("local-video");
    localVideo.srcObject = stream;
    cacheStream = stream;
  } catch (error) {
    console.error("getUserStream error", error.message);
  }
}

async function onConnection() {
  createPeerConnection(); // create RTCPeerConnection instance
  if (!cacheStream) await addStreamProcess(); // getUserMedia & addTrack
}

async function createAnswer() {
  console.log("create answer");
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  socket.emit("answer", { room: "lobby", answer });
}

async function onSDPOfferReceived({ room, offer }) {
  console.log(`*** 收到遠端 ${room} 送來的 offer`);
  try {
    console.log("*** 設定 remote description");

    await peer.setRemoteDescription(offer);
    await createAnswer();
  } catch (error) {
    console.error("onSDPOfferReceived error", error.message);
  }
}

async function onSDPAnswerReceived({ room, answer }) {
  console.log(`*** 遠端 ${room} 接受我們的 offer 並發送 answer 回來`);
  try {
    await peer.setRemoteDescription(answer);
  } catch (error) {
    console.error("handleSDPAnswerReceived error", error.message);
  }
}

async function onNewIceCandidateAdded({ room, candidate }) {
  console.log(`*** 新的 Candidate 加入 ${room}`, JSON.stringify(candidate));
  try {
    await peer.addIceCandidate(candidate);
  } catch (error) {
    console.error("onNewIceCandidateAdded error", error.message);
  }
}
