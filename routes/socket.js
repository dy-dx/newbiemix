/*
 * Serve content over a socket
 */
// Following http://www.danielbaulig.de/socket-ioexpress/

var parseCookie = require('connect').utils.parseCookie;

module.exports = function(app) {
  var io = app.io;

  io.sockets.on('connection', function(socket) {

    console.log(socket.handshake.session);

    console.log('A socket with sessionID ' + socket.handshake.session +
        ' connected!');

    socket.on('message', function(data) {
      if (Date.now() - socket.lastMessageAt < 100) {
        return;
      }
      socket.lastMessageAt = Date.now();
      data.id = socket.id;
      return socket.json.broadcast.send(data);
    });
    return socket.on('disconnect', function() {
      return socket.json.broadcast.send({
        id: socket.id,
        disconnect: true
      });
    });

  });

};