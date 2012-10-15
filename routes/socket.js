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
  Server.find({}, function(err, servers) {
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
     * Initialization
     */

    var user = socket.handshake.session.auth.steam.user;
    // If existing user in state, then take that one instead
    //  and clear timeout if that exists
    if (state.users[user._id]) {
      user = state.users[user._id];
      if (user.timeoutId) {
        clearTimeout(user.timeoutId);
      }
    } else {
      // Else save user and user.socket in state.users Object
      state.users[user._id] = user;
      user.added = false;
    }
    user.socket = socket;
    user.status = 'active';
    

    socket.emit('state:init', {
      rank: user.rank,
      classes: user.classes,
      added: user.added
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
        if ( (c.id === 'scout' || c.id === 'psoldier' || c.id === 'rsoldier' || c.id === 'medic' || c.id === 'demoman') && c.selected === true ) {
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
        if (cid === 'scout') {
          costs[0] = c;
          costs[1] = c;
          costs[2] = c;
          costs[3] = c;
        } else if (cid === 'psoldier') {
          costs[4] = c;
          costs[5] = c;
        } else if (cid === 'rsoldier') {
          costs[6] = c;
          costs[7] = c;
        } else if (cid === 'demoman') {
          costs[8] = c;
          costs[9] = c;
        } else if (cid === 'medic') {
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
      // You should probable make a removeFromQueue() function or something
      var queueType = user.rank + 'queue';
      for (var i=0, len=state[queueType].length; i<len; ++i) {
        if (state[queueType][i]._id === user._id) {
          state[queueType].splice(i,1);
          break;
        }
      }
      state[queueType].push(user);
      user.added = true;

      socket.broadcast.emit('queue:add', {
        _id: user._id,
        classes: user.classes,
        name: user.name,
        rank: user.rank,
        status: user.status
      });

      callback(state[queueType].length); // Player's queue position

      matchMake();
    });


    socket.on('queue:remove', function(dummy, callback) {
      // If user is already in a queue, remove from queue.
      // You should probable make a removeFromQueue() function or something

      var queueType = user.rank + 'queue';
      user.added = false;

      for (var i=0, len=state[queueType].length; i<len; ++i) {
        if (state[queueType][i]._id === user._id) {

          socket.broadcast.emit('queue:remove', {
            rank: user.rank,
            queuePos: i
          });

          state[queueType].splice(i,1);
          return callback(true);
          break; //Break because you spliced it
        }
      }
      callback(false);
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
        // Remove user from queue and users obj
        // You should probably make a removeFromQueue() function or something
        var queueType = user.rank + 'queue';

        for (var i=0, len=state[queueType].length; i<len; ++i) {
          if (state[queueType][i]._id === user._id) {

            socket.broadcast.emit('queue:remove', {
              rank: user.rank,
              queuePos: i
            });

            state[queueType].splice(i,1);
            break; //Break because you spliced it
          }
        }
        console.log('Deleting user for real: ' + user.name);
        delete(state.users[user._id]);
        // Maybe i need to call delete on the socket as well? who knows

      }, 60*1000);

    });

  });


  // Status Updates

  setInterval(function() {
    io.sockets.emit('status:userCounts', {
      newbie: state.newbiequeue.length,
      coach: state.coachqueue.length,
      // This is slow supposedly? Maybe just keep a count
      users: Object.keys(state.users).length
    });
  }, 2000);


  // Matchmaking

  var matchMake = function() {
    var availableServers = _.where(state.servers, {status: 'available'});
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

      // Remove from state.coachqueue
      for (var i=0, len=state.coachqueue.length; i<len; i++) {
        if (state.coachqueue[i]._id === coach._id) {
          state.coachqueue.splice(i,1);
        }
        io.sockets.emit('queue:remove', {
          rank: 'coach',
          queuePos: i
        });
        // Break because you spliced it
        break;
      }

      // Push to team
      if (redteam.length > bluteam.length) {
        bluteam.push(coach);
      } else {
        redteam.push(coach);
      }
    });

    newbies.forEach(function(newbie, index) {
      // Remove from state.newbiequeue
      for (var i=0, len=state.newbiequeue.length; i<len; i++) {
        if (state.newbiequeue[i]._id === newbie._id) {
          state.newbiequeue.splice(i,1);
        }
        io.sockets.emit('queue:remove', {
          rank: 'newbie',
          queuePos: i
        });
        // Break because you spliced it
        break;
      }

      // Push to team
      if (redteam.length === 6) return bluteam.push(newbie);
      var c = newbie.class;
      var limit = 2;
      if (c === 'scout') limit = 4;
      if ( _.where(redteam, {class: c}).length === limit ) {
        bluteam.push(newbie);
      } else {
        redteam.push(newbie);
      }
    });

    // Set server status to "in-game"
    availableServers[0].status = 'in-game';

    // Create new "mix" document, save to db

    var mixId = '' + Date.now();
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
  };



  /**
   * Dispatch Listener Events
   */

  dispatchListener.on('!gameover', function (data) {
    var servers = _.where(state.servers, {ip: data.ip});
    if (servers.length > 0) {
      servers[0].status = 'available';
      matchMake();
    }
  });


  /**
   * Helpers
   */


};