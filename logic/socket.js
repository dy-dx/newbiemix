/**
 * Main logic, state handling, and socket communication happens here.
 */

var _ = require('underscore'),
  cookie = require('cookie'),
  cookieParser = require('cookie-parser'),
  mongoose = require('mongoose'),
  env = require('../cfg/env'),
  Config = require('../models/config'),
  Player = require('../models/player'),
  Server = require('../models/server'),
  Counter = require('../models/counter'),
  Mix = require('../models/mix'),
  matchmaker = require('./matchmaker'),
  dispatchListener = require('./dispatchlistener');

module.exports = function(app) {
  var io = app.io;

  /**
   * Initialize State
   */

  var state = {
    config: {},
    users: {},
    servers: [],
    freequeue: [],
    newbiequeue: [],
    coachqueue: []
  };

  // Get config and list of servers, this is async but I'm gonna assume
  //  that it'll complete by the time I need the data

  Config.findById('newbiemix', function(err, config) {
    if (err) throw new Error('No config found!');
    if (config) return state.config = config;

    // If no config is in the DB, create one
    console.log('No config found, inserting new one');
    var newConfig = new Config({
      _id: 'newbiemix'
    });
    newConfig.save(function(e) {
      if (e) throw e;
      state.config = newConfig;
    });
  });

  Server.find({ isAvailable: true }, function(err, servers) {
    if (err) throw err;
    state.servers = servers;
  });


  /**
   * Socket.IO handlers
   */

  // Express session authorization

  io.use(function (socket, next) {
    var data = socket.request;
    if (!data.headers.cookie) {
      data.NOT_LOGGED_IN = true;
      return next();
    }
    var cookies = cookie.parse(data.headers.cookie);
    cookies = cookieParser.signedCookies(cookies, env.secrets.session);
    var sid = cookies['connect.sid'];
    app.store.get(sid, function (err, sess) {
      if (err || !sess || !sess.auth || !sess.auth.loggedIn) {
        data.NOT_LOGGED_IN = true;
        return next();
      }
      data.session = sess;
      data.session.sid = sid;

      // If user is already connected, disconnect the old socket;
      if (state.users[sess.auth.steam.user._id]) {
        state.users[sess.auth.steam.user._id].socket.disconnect();
      }

      return next();
    });
  });

  io.sockets.on('connection', function(socket) {

    // Don't take input from not_logged_in sockets
    if (socket.request.NOT_LOGGED_IN) return;

    /**
     * Initialization/Reconnection
     */

    var user = socket.request.session.auth.steam.user;
    user.sid = socket.request.session.sid;
    var queuePos;
    // If existing user in state, then take that one instead
    //  and clear timeout if that exists
    if (state.users[user._id]) {
      user = state.users[user._id];
      if (user.timeoutId) {
        clearTimeout(user.timeoutId);
      }
      // Check if in queue, get queue position
      if (user.added) {
        for (var i=0, len=state[user.rank+'queue'].length; i<len; i++) {
          if (state[user.rank+'queue'][i]._id === user._id) {
            queuePos = i;
            break;
          }
        }
      }
    } else {
      // Else save user and user.socket in state.users Object
      state.users[user._id] = user;
      user.added = false;
    }
    user.socket = socket;
    user.status = 'active';

    // Send initialization info
    socket.emit('state:init', {
      id: user._id,
      name: user.name,
      rank: user.rank,
      avatar: user.avatar,
      classes: user.classes,
      added: user.added,
      queuepos: queuePos
    });

    // console.log('A socket connected: ' + user.name);


    /**
     * Queue stuff
     */

    socket.on('queue:add', function(classes, callback) {
      // Validate inputted array of user's chosen classes
      if (!(Array.isArray(classes) && classes.length === 5)) { return callback(false); }
      var selectedClasses = [];
      // Oh dear god
      classes.forEach(function(c,index) {
        if ( (c.id === 'Scout' || c.id === 'Pocket' || c.id === 'Roamer' || c.id === 'Medic' || c.id === 'Demoman') && c.selected === true ) {
          selectedClasses.push(c.id);
        }
      });

      // Create costs array for the Hungarian Algorithm
      // Doesn't this belong in matchmaker.js instead?
      var costs = [3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000];
      var duplicates = []; // Holds processed classes to check for duplicates
      selectedClasses.forEach( function(cid, index) {
        var c = index + 1;
        if (duplicates.indexOf(cid) > -1) {
          return callback(false);
        }
        if (cid === 'Scout') {
          costs[0] = c;
          costs[1] = c;
          costs[2] = c;
          costs[3] = c;
        } else if (cid === 'Pocket') {
          costs[4] = c;
          costs[5] = c;
        } else if (cid === 'Roamer') {
          costs[6] = c;
          costs[7] = c;
        } else if (cid === 'Demoman') {
          costs[8] = c;
          costs[9] = c;
        } else if (cid === 'Medic') {
          costs[10] = c;
          costs[11] = c;
        } else {
          return callback(false);
        }
        duplicates.push(cid);
      });

      // Update user with new costs array
      user.costs = costs;
      user.classes = classes;
      // Save his preferred classes to database
      Player.update({_id: user._id}, {classes: classes}, function(err) {
        // I don't care about errs here
      });

      // If user is already in a queue, remove from queue. Then add to queue.
      var queueType = user.rank + 'queue';
      removeFromQueue(user, queueType);
      state[queueType].push(user);
      user.added = true;

      socket.broadcast.emit('queue:add', {
        _id: user._id,
        classes: user.classes,
        name: user.name,
        rank: user.rank,
        status: user.status
      });

      callback(state[queueType].length - 1); // Player's queue position

      matchMake();
    });


    socket.on('queue:remove', function() {
      removeFromQueue(user);
    });


    /**
     * Mix-specific events - Chat, Reporting
     */

    socket.on('report:player', function(data, callback) {
      if (!data || !data.mixId || !data.reporteeId) { return callback(false); }
      // Add report to database, then send a message to chat notifying how many reports left are needed.
      Mix.addReport(user._id, data, function(err, reportee) {
        if (err) {
          if (err.message == 'Already reported') { return callback('You have already reported this player.'); }
          if (err.message == 'Reporter not found') { return callback('You are not authorized to report this player'); }
          console.log(err);
          return callback(false);
        }

        var REPORT_LIMIT = state.config.reportLimit || 3;

        if (reportee.reports.length < REPORT_LIMIT) {
          io.sockets.in(data.mixId).emit('system:message', user.name + ' has reported ' +
              reportee.team + ' ' + reportee.class + ' ' + reportee.name + '. ' +
              REPORT_LIMIT - reportee.reports.length + ' more reports needed to request a sub.' );
        } else if (reportee.reports.length == REPORT_LIMIT) {
          io.sockets.in(data.mixId).emit('system:message', 'A sub for ' + reportee.team +
              ' ' + reportee.class + ' ' + reportee.name + ' has been requested.');
          requestSubstitute(data.mixId, reportee);
        }

        return callback(true);
      });
    });

    socket.on('chat:message', function(message) {
      if (currentroom) {
        io.sockets.in(currentroom).emit('chat:message', {name: user.name, message: message});
      }
    });

    socket.on('substitute:join', function(data, callback) {
      // user wants to join data.mixId and replace data.reporteeId.
      if (!data || !data.mixId || !data.reporteeId) { return callback(false); }
      if (user.added) { return callback('You are already added up!'); }

      Mix.findById(data.mixId, function(err, mix) {
        if (err || !mix) { return callback(false); }
        // Check if reportee exists or has already been substituted
        var reportee = _.find(mix.players, function(p) { return p._id === data.reporteeId; });
        if (!reportee || reportee.isSubstituted) { return callback(false); }
        // Check if prospective substitute is already in the mix
        if (_.find(mix.players, function(p) { return p._id === user._id; })) {
          return callback('You may not sub in a mix you are already in.');
        }


        // Attempt to atomically set reportee (embedded doc) to isSubstituted.
        //  If successful, then continue on with the process. isSubstituted serves as a
        //  lock to prevent 2 players from fulfilling the sub request at the same time.
        Mix.update( {_id: mix._id, 'players._id': reportee._id, 'players.isSubstituted': false},
                    {$set:{'players.$.isSubstituted': true}}, function(err, numUpdated) {
          if (err || numUpdated === 0) {
            if (err) console.log(err);
            // do something
            return callback(false);
          }
          // Push new player into mix document.
          // This is too messy. fix this.
          var newPlayer = _.clone(user);
          delete newPlayer.socket;
          delete newPlayer.sid;
          delete newPlayer.permissions;
          delete newPlayer.classes;
          newPlayer.class = reportee.class;
          newPlayer.team = reportee.team;
          newPlayer.isASubstitute = true;
          Mix.update( {_id: mix._id}, {$push: {players: newPlayer}}, function(err) {
            if (err) {
              // There is not much I can do about an err here. Shit.
            }

            // Ok, so the user is finally going to sub. Now send all the events.

            // Notify everyone that the sub request is fulfilled
            io.sockets.emit('notification:subfulfilled', {
              mixId: data.mixId,
              reporteeId: data.reporteeId
            });

            // Notify players in mix that a sub joined
            io.sockets.in(data.mixId).emit('mix:newplayer', {
              newPlayer: newPlayer,
              reporteeId: reportee._id
            });

            sendToMatch(user, data.mixId);
          }); // End Mix.update($push)
        }); // End Mix.update($set)
      }); // End Mix.findById()
    });


    /**
     * Sprite/Chat Stuff
     */

    // Room Subscription
    var currentroom;
    socket.on('subscribe:room', function (room) {
      if (currentroom) {
        leaveRoom(socket, currentroom);
      }
      socket.join(room);
      currentroom = room;
    });

    socket.on('message', function(data) {
      if (Date.now() - socket.lastMessageAt < 100) {
        return;
      }
      socket.lastMessageAt = Date.now();
      data.id = socket.id;
      // Only send sprite messages to users in the same room
      return socket.json.broadcast.to(currentroom).send(data);
    });

    socket.on('disconnect', function() {
      // console.log('A socket disconnected: ' + user.name);
      // The sprite stuff
      socket.json.broadcast.to(currentroom).send({
        id: socket.id,
        disconnect: true
      });

      // Smart disconnect handling (give user 1 min to reconnect,
      //  in the meantime set his status to 'idle' so he is
      //  rejected by the matchmaker)
      user.status = 'idle';
      user.timeoutId = setTimeout(function() {
        removeFromQueue(user);
        // Maybe i need to call delete on the socket as well? who knows
        delete(state.users[user._id]);
      }, 60*1000);
    });
  });


  /**
   * Status Updates
   */

  setInterval(function() {
    io.sockets.emit('status:counts', {
      newbie: state.newbiequeue.length,
      coach: state.coachqueue.length,
      // This is slow supposedly? Maybe just keep a count
      users: Object.keys(state.users).length,
      servers: state.servers.length,
      freeservers: _.where(state.servers, {isInUse: false}).length
    });
  }, 3000);


  /**
   * Matchmaking
   */

  var matchMake = function() {
    var availableServers = _.where(state.servers, {isInUse: false});
    if (availableServers.length === 0) {return false;}
    var chosenServer = availableServers[0];

    var chosenPlayers = matchmaker.matchmaker(state.config, state.freequeue, state.newbiequeue, state.coachqueue);
    if (chosenPlayers === false) {
      return;
    }

    var coaches = _.chain(chosenPlayers).where({rank: 'coach'}).shuffle().value();
    var newbies = _.chain(chosenPlayers).where({rank: 'newbie'}).shuffle().value();
    var redteam = [];
    var bluteam = [];

    coaches.forEach(function(coach, index) {

      removeFromQueue(coach, 'coachqueue');

      // Push to team
      if (redteam.length > bluteam.length) {
        coach.team = 'blu';
        bluteam.push(coach);
      } else {
        coach.team = 'red';
        redteam.push(coach);
      }
    });

    newbies.forEach(function(newbie, index) {

      removeFromQueue(newbie, 'newbiequeue');

      // Push to team
      if (redteam.length === 6) {
        newbie.team = 'blu';
        return bluteam.push(newbie);
      }
      var c = newbie.class;
      var limit = 1;
      if (c === 'Scout') limit = 2;
      if ( _.where(redteam, {class: c}).length === limit ) {
        newbie.team = 'blu';
        bluteam.push(newbie);
      } else {
        newbie.team = 'red';
        redteam.push(newbie);
      }
    });

    // Set server isInUse to true
    chosenServer.isInUse = true;
    // RCON to the server, do stuff
    chosenServer.execConfig('cp_badlands', function(err) {
      // Handle an err here
      if (err) {console.log(err);}
    });

    // Create new "mix" document, save to db
    // Get mixId
    Counter.findOneAndUpdate({ "counter" : "mixes" },
                             { $inc: {next:1} },
                             function(err, mixCounter) {
      if (err || !mixCounter) {
        console.log('Error getting mixId', err);
        // TODO: Handle an err here
        return;
      }

      var mixId = mixCounter.next.toString();
      chosenServer.currentMixId = mixId;
      var newMix = new Mix({
        _id: mixId,
        players: bluteam.concat(redteam),
        // Clone server obj or else Mongoose complains
        server: _.clone(chosenServer),
        updated: new Date(),
        isActive: true
      });
      newMix.save(function(err) {
        if (err) {
          console.log('Error saving mix document', err);
          // TODO: Handle an err here
        }
        chosenPlayers.forEach(function(player, index) {
          var user = state.users[player._id];
          if (!user) return;
          sendToMatch(user, mixId);
        });
      });

    }); // End Counter.findOneAndUpdate()

  };

  /**
   * Global Notifications
   */

  requestSubstitute = function(mixId, reportee) {
    io.sockets.emit('notification:needsub', {
      mixId: mixId,
      reporteeId: reportee._id,
      classNeeded: reportee.class
    });
  };


  /**
   * Dispatch Listener Handlers
   */

  dispatchListener.on('findAndDestroyUser', function (userId, userToBeDestroyed, options) {
    findAndDestroyUser(userId, userToBeDestroyed, options);
  });

  dispatchListener.on('configUpdated', function(updatedConfig) {
    state.config = updatedConfig;
  });

  dispatchListener.on('serverUpdated', function (updatedServer) {
    // If server's availability changed to false, remove from state
    if (!updatedServer.isAvailable) {
      for (var i=0, len=state.servers.length; i<len; i++) {
        if ( state.servers[i]._id.equals(updatedServer._id) ) {
          state.servers.splice(i,1);
          break;
        }
      }
      return;
    }

    var server = _.find(state.servers, function(s) { return s._id.equals(updatedServer._id); });
    if (server) {
      updatedServer.isInUse = server.isInUse;
      server = updatedServer;
    } else {
      updatedServer.isInUse = false;
      state.servers.push(updatedServer);
      matchMake();
    }
  });

  dispatchListener.on('serverDestroyed', function (destroyedServer) {
    for (var i=0, len=state.servers.length; i<len; i++) {
      if ( state.servers[i]._id.equals(destroyedServer._id)) {
        state.servers.splice(i,1);
        break;
      }
    }
  });

  dispatchListener.on('playerUpdated', function (updatedPlayer) {
    if (updatedPlayer && updatedPlayer._id) {
      // THIS IS SO HACKY UGGHGHGHH
      var user = state.users[updatedPlayer._id];
      if (user) {
        user.rank = updatedPlayer.rank;
        findAndDestroyUser(null, user);
      }
    }
  });

  dispatchListener.on('!gameover', function (data) {
    var server = _.find(state.servers, function(s) { return s.ip+':'+s.port === data.ip; });
    if (server) {
      server.isInUse = false;
      if (server.currentMixId) {
        Mix.updateScores(server.currentMixId, data.bluScore, data.redScore, function(err, winners) {
          if (err) { return console.log(err); }
          if (!winners || winners == 'tie') { return; }
          // For each winner, increment winCount in state and in DB
          winners.forEach(function(w, index) {
            var user = state.users[w._id];
            if (user) {user.winCount = user.winCount + 1 || 1;}
            Player.incrementWinCount(w._id, function(err) {
              if (err) { return console.log(err); }
            });
          });
        });
      }
      matchMake();
    }
  });


  /**
   * Helpers
   */

  var removeFromQueue = function(user, queueType) {
    if (!queueType) { queueType = user.rank + 'queue'; }
    user.added = false;

    for (var i=0, len=state[queueType].length; i<len; ++i) {
      if (state[queueType][i]._id === user._id) {
        state[queueType].splice(i,1);

        io.sockets.emit('queue:remove', {
          rank: user.rank,
          queuePos: i
        });

        return i;
      }
    }
    return false;
  };

  var sendToMatch = function(user, mixId) {
    removeFromQueue(user);
    // Increment player's playCount, in state and in DB
    user.playCount = user.playCount + 1 || 1;
    Player.update({_id:user._id}, {$inc:{playCount:1}}, {safe:true}, function(err) {
      if (err) {
        // I don't care too much about an err here.
        console.log(err);
      }
    });
    // Notify player that he got picked
    io.sockets.socket(user.socket.id).emit('match:join', {
      mixId: mixId
    });
  };

  var leaveRoom = function(socket, room) {
    socket.leave(room);
    // 'roomchange' tells tf.js to delete all other sprites.
    socket.emit('roomchange');
    // tell everyone in the old room to delete the sprite.
    io.sockets.json.in(room).send({
      id: socket.id,
      disconnect: true
    });
  };

  var findAndDestroyUser = function(userId, userToBeDestroyed, options) {
    var user = userToBeDestroyed || state.users[userId];
    if (!user) {
      console.log('You\'re trying to findAndDestroy a user that I can\'t find!')
      return;
    }
    if (!options || options.disconnect) {
      if (user.socket) {
        user.socket.disconnect();
      }
    }
    removeFromQueue(user);
    // Maybe i need to call delete on the socket as well? who knows
    delete(state.users[user._id]);

    app.store.destroy(user.sid, function(err) {
      if (err) {
        console.log('Error destroying ' + userId, err);
        // Do something
      }
    });
  };


};
