
/**
 * Module dependencies.
 */

var express = require('express'),
  util = require('util'),
  mongoose = require('mongoose'),
  everyauth = require('everyauth'),
  request = require('request'),
  env = require('./cfg/env'),
  port = env.port,
  secrets = env.secrets,
  routes = require('./routes');
mongoose.connect(env.mongo_url);

var Player = require('./models/player');

var app = module.exports = express.createServer();


// Everyauth Configuration

everyauth.everymodule.moduleTimeout(5000); // Wait 5 seconds per step before timing out (default is 10)
everyauth.everymodule.findUserById( function (req, userId, callback) {
  Player.findById(userId, callback);
  // callback has the signature, function (err, user) {...}
});
everyauth.steam
//  .myHostname('http://192.168.1.6:3000')
  .myHostname('http://localhost:8003')
  // .myHostname('http://www.sizzlingstats.com:8008')
  .findOrCreateUser( function (session, openIdUserAttributes) {
    console.log(session);
    console.log(openIdUserAttributes);
    var promise = this.Promise();
    var steamid;
    try {
      steamid = openIdUserAttributes.claimedIdentifier.split('/').slice(-1)[0];
      if (!steamid) throw new Error('No steamid???');
    } catch (e) {
      promise.fail(e);
      return promise;
    }
    Player.findById(steamid, function(err, player) {
      if (err) {
        console.log('Err looking up player', err);
        return promise.fail(err);
      }
      if (player) {
        // Probably change this to update the player's info on login
        // Instead of just retrieving old info
        promise.fulfill(player);
      } else {
        var options = {
          uri: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
          qs: { key: secrets.steam, steamids: steamid },
          json: true
        };

        request(options, function(err, res, body) {
          if (err) {
            console.log('Steam API Request Error', err);
            return promise.fail(err);
          }
          if (res.statusCode !== 200) {
            console.log('Steam API Status Code: ' + res.statusCode);
            console.log(res.body);
            return promise.fail();
          }
          if (body.response.players.length === 0) {
            console.log('Steam Api Player Not Found: ' + steamid);
            return promise.fail();
          }

          var steamInfo = body.response.players[0];
          var newPlayer = new Player({
            _id: steamid,
            name: steamInfo.personaname,
            avatar: steamInfo.avatar,
            updated: new Date(),
            status: 'active', // I forget what this was for?
            rank: 'newbie'
          });
          if (steamInfo.loccountrycode) {
            newPlayer.country = steamInfo.loccountrycode;
          }

          newPlayer.save(function(err) {
            if (err) {
              console.log('Error saving new player', err);
              return promise.fail(err);
            }
            promise.fulfill(newPlayer);
          });
        }); // End request()
      }

      // session.save();

    });

    return promise;
  })
  .moduleErrback( function (err) {
    console.log( 'EVERYAUTH ERROR:', err);
  })
  .redirectPath('/');
// everyauth.debug = false;

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', {
    layout: false
  });

  // var RedisStore = require('connect-redis')(express);
  app.store = new express.session.MemoryStore;

  app.use(express.cookieParser());
  app.use(express.session({
    secret: secrets.session,
    store: app.store
    // store: new RedisStore
  }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(everyauth.middleware());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);


// Hook Socket.io into Express
var parseCookie = require('connect').utils.parseCookie;
app.io = require('socket.io').listen(app);
app.io.enable('browser client minification');
app.io.enable('browser client etag');
app.io.enable('browser client gzip');
app.io.set('log level', 1);
app.io.set('transports', [
  'websocket',
  // 'flashsocket',
  'htmlfile',
  'xhr-polling',
  'jsonp-polling'
]);
app.io.set('authorization', function(data, fn){
  var cookies = parseCookie(data.headers.cookie);
  var sid = cookies['connect.sid'];
  app.store.load(sid, function(err, sess){
    if (err) {
      // return fn(err);
      return fn(null, false);
    }
    data.session = sess;
    fn(null, true);
  });
});
var socket = require('./routes/socket')(app);

app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});