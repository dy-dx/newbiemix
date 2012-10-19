/*
 * Serve content over a socket
 */
// Following http://www.danielbaulig.de/socket-ioexpress/

var _ = require('underscore');
var parseCookie = require('connect').utils.parseCookie;
var mongoose = require('mongoose');
var Player = require('../models/player');
var Server = require('../models/server');
var Mix = require('../models/mix');
var Counter = require('../models/counter');
var matchmaker = require('./matchmaker');
var dispatchListener = require('./dispatchlistener');

module.exports = function(app) {
  var io = app.io;

  // State
  var state = {
    users: {},
    servers: [],
    newbiequeue: [],
    coachqueue: []
  };

  // Get list of servers, this is async but I'm gonna assume
  //  that it'll complete by the time I need the data
  Server.find({ isAvailable: true }, function(err, servers) {
    if (err) throw err;
    state.servers = servers;
  });


  // Express session authorization

  app.io.set('authorization', function(data, fn) {
    if (!data.headers.cookie) {
      data.NOT_LOGGED_IN = true;
      return fn(null, true);
    }
    var cookies = parseCookie(data.headers.cookie);
    var sid = cookies['connect.sid'];
    app.store.get(sid, function(err, sess){
      if (err || !sess || !sess.auth || !sess.auth.loggedIn) {
        data.NOT_LOGGED_IN = true;
        return fn(null, true);
      }
      data.session = sess;

      // If user is already connected, disconnect the old socket;
      if (state.users[sess.auth.steam.user._id]) {
        state.users[sess.auth.steam.user._id].socket.disconnect();
      }

      fn(null, true);
    });
  });

  io.sockets.on('connection', function(socket) {

    // Don't take input from not_logged_in sockets
    if (socket.handshake.NOT_LOGGED_IN) return;

    /**
     * Initialization/Reconnection
     */

    var user = socket.handshake.session.auth.steam.user;
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
      rank: user.rank,
      classes: user.classes,
      added: user.added,
      queuepos: queuePos
    });

    console.log('A socket connected: ' + user.name);


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


    // Sprite/Chat Stuff

    socket.on('message', function(data) {
      if (Date.now() - socket.lastMessageAt < 100) {
        return;
      }
      socket.lastMessageAt = Date.now();
      data.id = socket.id;
      return socket.json.broadcast.send(data);
    });
    
    socket.on('disconnect', function() {
      console.log('A socket disconnected: ' + user.name);
      // The sprite stuff
      socket.json.broadcast.send({
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


  // Status Updates

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


  // Matchmaking

  var matchMake = function() {
    var availableServers = _.where(state.servers, {isInUse: false});
    if (availableServers.length === 0) {
      return;
    }

    var chosenPlayers = matchmaker.matchmaker(state.newbiequeue, state.coachqueue);
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
        bluteam.push(coach);
      } else {
        redteam.push(coach);
      }
    });

    newbies.forEach(function(newbie, index) {
      
      removeFromQueue(newbie, 'newbiequeue');

      // Push to team
      if (redteam.length === 6) return bluteam.push(newbie);
      var c = newbie.class;
      var limit = 1;
      if (c === 'Scout') limit = 2;
      if ( _.where(redteam, {class: c}).length === limit ) {
        bluteam.push(newbie);
      } else {
        redteam.push(newbie);
      }
    });

    // Set server isInUse to true
    availableServers[0].isInUse = true;

    // Create new "mix" document, save to db
    // Get mixId
    Counter.findOneAndUpdate({ "counter" : "mixes" },
                             { $inc: {next:1} },
                             function(err, mixCounter) {
      if (err || !mixCounter) {
        console.log(err);
        // TODO: Handle an err here
        return;
      }
      var mixId = mixCounter.next.toString();

      // I DON'T KNOW WHY I HAVE TO COPY THE SERVER OBJ
      //  BUT IT DOESN'T WORK UNLESS I DO
      var server = _.clone(availableServers[0]);
      var newMix = new Mix({
        _id: mixId,
        redteam: redteam,
        bluteam: bluteam,
        server: server,
        updated: new Date()
      });
      newMix.save(function(err) {
        if (err) {
          console.log(err);
          // TODO: Handle an err here
        }

        chosenPlayers.forEach(function(player, index) {
          state.users[player._id].added = false;
          io.sockets.socket(player.socket.id).emit('match:join', {
            mixId: mixId
          });
        });
      });

    }); // End Counter.findOneAndUpdate()

  };



  /**
   * Dispatch Listener Events
   */

  dispatchListener.on('logout', function (userId) {
    findAndDestroyUser(userId);
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

  dispatchListener.on('!gameover', function (data) {
    var server = _.find(state.servers, function(s) { return s.ip === data.ip; });
    if (server) {
      server.isInUse = false;
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

  var findAndDestroyUser = function(userId) {
    var user = state.users[userId];
    if (!user) return;
    if (user.socket) {
      user.socket.disconnect();
    }
    removeFromQueue(user);
    // Maybe i need to call delete on the socket as well? who knows
    delete(state.users[user._id]);
  };


};