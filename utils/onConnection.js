const users = {};

const onJoinRoom =
  (socket) =>
  ({ username, room }) => {
    const callback = () => {
      const clientId = socket.client.id;
      console.log("clientId", clientId);
      // create room
      if (!users[room]) users[room] = {};
      // add user info to room
      users[room][clientId] = {
        username,
        clientId,
      };

      // notify all the users in same room
      socket.broadcast.in(room).emit("newUser", users[room][clientId]);
    };

    console.log("onJoinRoom", socket.client.id);
    socket.join(room, callback);
  };

const onLeaveRoom =
  (socket) =>
  ({ room }) => {
    const callback = () => {
      const clientId = socket.client.id;
      delete users[room][clientId];

      // notify all user someone leave
      socket.broadcast.in(room).emit("userLeft", users[room][clientId]);
    };
    socket.leave(room, callback);
  };

const onOffer =
  (socket) =>
  ({ room, offer }) => {
    console.log("switch offer");

    socket.broadcast.in(room).emit("offer", { room, offer });
  };

const onAnswer =
  (socket) =>
  ({ room, answer }) => {
    console.log("switch answer");

    socket.broadcast.in(room).emit("answer", { room, answer });
  };

const onIceCandidate =
  (socket) =>
  ({ room, candidate }) => {
    console.log("switch icecandidate");

    socket.broadcast.in(room).emit("icecandidate", { room, candidate });
  };

const onConnection = (socket) => {
  console.log("Socket connect success");
  // user join the room
  socket.on("joinRoom", onJoinRoom(socket));
  // user leave the room
  socket.on("leaveRoom", onLeaveRoom(socket));

  // p2p communication
  socket.on("offer", onOffer(socket));
  socket.on("answer", onAnswer(socket));
  socket.on("icecandidate", onIceCandidate(socket));
};

module.exports = onConnection;
