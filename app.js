const express = require("express");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");
const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

const onConnection = require("./utils/onConnection");
const io = socketIO(server);
io.on("connection", onConnection);

app.use(express.static(path.join(__dirname, "public")));

server.listen(port, () => {
  console.log("now is listening on port %d", port);
});
