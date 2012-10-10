/*
 * Serve content over a socket
 */
// Following http://www.danielbaulig.de/socket-ioexpress/

var parseCookie = require('connect').utils.parseCookie;

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
      // Create costs matrix for the Hungarian Algorithm
      var costs = [100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000];
      var prefscale = 1; // How much to weigh the order of class preferences
      var duplicates = []; // Holds processed classes to check for duplicates
      selectedClasses.forEach( function(cid, index) {
        if (duplicates.indexOf(cid) > -1) {
          return callback(false);
        }
        if (cid === 'scout') {
          costs[0] = (index + 1)*prefscale;
          costs[1] = (index + 1)*prefscale;
          costs[2] = (index + 1)*prefscale;
          costs[3] = (index + 1)*prefscale;
        } else if (cid === 'psoldier') {
          costs[4] = (index + 1)*prefscale;
          costs[5] = (index + 1)*prefscale;
        } else if (cid === 'rsoldier') {
          costs[6] = (index + 1)*prefscale;
          costs[7] = (index + 1)*prefscale;
        } else if (cid === 'demoman') {
          costs[8] = (index + 1)*prefscale;
          costs[9] = (index + 1)*prefscale;
        } else if (cid === 'medic') {
          costs[10] = (index + 1)*prefscale;
          costs[11] = (index + 1)*prefscale;
        } else {
          return res(false);
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

      callback(state[queueType].length); // Place in line
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


  // Helpers



};