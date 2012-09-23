
/**
 * Module dependencies.
 */

var express = require('express'),
  util = require('util'),
  env = require('./cfg/env'),
  port = env.port,
  secrets = env.secrets,
  routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
app.ws = require('socket.io').listen(app);
app.ws.set('log level', 1);
app.ws.set('browser client minification', true);

app.ws.sockets.on('connection', function(client) {
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