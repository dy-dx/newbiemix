/*
 * Serve content over a socket
 */

module.exports = function(app) {
  var io = app.io;

  io.sockets.on('connection', function(client) {

    client.on('message', function(data) {
      if (Date.now() - client.lastMessageAt < 100) {
        return;
      }
      client.lastMessageAt = Date.now();
      data.id = client.id;
      return client.json.broadcast.send(data);
    });
    return client.on('disconnect', function() {
      return client.json.broadcast.send({
        id: client.id,
        disconnect: true
      });
    });

  });

};