/*
 * Serve content over a socket
 */
// Following http://www.danielbaulig.de/socket-ioexpress/

var parseCookie = require('connect').utils.parseCookie;
var matchmaker = require('./matchmaker');

module.exports = function(app) {
  var io = app.io;

  // State
  var state = {
    users: {},
    newbiequeue: [],
    coachqueue: []
  };

  // Express session authorization

  app.io.set('authorization', function(data, fn) {
    var cookies = parseCookie(data.headers.cookie);
    var sid = cookies['connect.sid'];
    app.store.load(sid, function(err, sess){
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

    // Save user and user.socket in state.users Object
    var user = socket.handshake.session.auth.steam.user;
    user.socket = socket;

    state.users[user._id] = user;

    console.log('A socket connected: ' + user._id);


    // Queue Stuff

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

      var validClasses = ['scout','psoldier','rsoldier', 'medic', 'demoman'];
      var addedUp = false;
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

      // Update user with new classes/costs arrays
      user.classes = selectedClasses;
      user.costs = costs;

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

      console.log(user.classes);

      io.sockets.emit('queue:add', {
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

      for (var i=0, len=state[queueType].length; i<len; ++i) {
        if (state[queueType][i]._id === user._id) {

          state[queueType].splice(i,1);
          break; //Break because you spliced it

        }
      }

      callback(true);
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
      console.log('A socket disconnected: ' + user._id);
      return socket.json.broadcast.send({
        id: socket.id,
        disconnect: true
      });
    });

  });


  // Status Updates

  setInterval(function() {
    io.sockets.emit('status:userCounts', {
      newbies: state.newbiequeue.length,
      coaches: state.coachqueue.length,
      // This is slow supposedly? Maybe just keep a count
      users: Object.keys(state.users).length
    });
  }, 2000);


  // Matchmaking

  var matchMake = function() {
    var solution = matchmaker.matchmaker(state.newbiequeue, state.coachqueue);

    if (solution === false) {
      return;
    }

    console.log(solution);

  };


  // Helpers



};