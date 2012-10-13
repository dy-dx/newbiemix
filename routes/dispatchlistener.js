var env = require('../cfg/env');
var events = require('events');
var net = require('net');

var dispatchListener = module.exports = new events.EventEmitter();

// Set up a TCP server
var server = net.createServer(function (socket) {

  console.log('Connection from ' + socket.remoteAddress);

  socket.on('data', function(data) {
    console.log(data.toString());
    var tokens = data.toString().split(' ');

    if (tokens.length === 3 && tokens[1] === '!gameover') {
      var scores = tokens[2].split(':');
      dispatchListener.emit('!gameover', {
        ip: tokens[0],
        bluscore: scores[0],
        redscore: scores.slice(-1)[0]
      });

      return socket.end();
    }

    socket.end();
  });

});

// Fire up the server
server.listen(env.dispatch_port, function() {
  console.log('TCP dispatch server listening on port ' + env.dispatch_port);
});
