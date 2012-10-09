/*
 * Serve content over a socket
 */
// Following http://www.danielbaulig.de/socket-ioexpress/

var parseCookie = require('connect').utils.parseCookie;

module.exports = function(app) {
  var io = app.io;

  // State
  var state = {
    users: [],
    newbiequeue: [],
    coachqueue: []
  };

  // Express session authorization

  app.io.set('authorization', function(data, fn) {
    var cookies = parseCookie(data.headers.cookie);
    var sid = cookies['connect.sid'];
    app.store.load(sid, function(err, sess){
      // if (err) {
        // return fn(err);
      if (err || !sess || !sess.auth || !sess.auth.loggedIn) {
        return fn('NOT_LOGGED_IN', false);
      }
      data.session = sess;
      fn(null, true);
    });
  });

  io.sockets.on('connection', function(socket) {

    var user = socket.handshake.session.auth.steam.user;
    console.log('A socket connected: ');
    console.log(socket.handshake.session.auth);


    // Queue Stuff

    socket.on('addUp', function(classes, callback) {
      // Validate inputted array of user's chosen classes
      if (!(Array.isArray(classes) && classes.length > 0 && classes.length < 6)) { return res(false); }
      var validClasses = ['class-scout','class-psoldier','class-rsoldier', 'class-medic', 'class-demoman'];
      var addedUp = false;
      // Create costs matrix for the Hungarian Algorithm
      var costs = [100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000];
      var prefscale = 1; // How much to weigh the order of class preferences
      var duplicates = []; // Holds processed classes to check for duplicates
      classes.forEach( function(classId, index) {
        if (duplicates.indexOf(classId) > -1) {
          return res(false);
        }
        if (classId === 'class-scout') {
          costs[0] = (index + 1)*prefscale;
          costs[1] = (index + 1)*prefscale;
          costs[2] = (index + 1)*prefscale;
          costs[3] = (index + 1)*prefscale;
        } else if (classId === 'class-psoldier') {
          costs[4] = (index + 1)*prefscale;
          costs[5] = (index + 1)*prefscale;
        } else if (classId === 'class-rsoldier') {
          costs[6] = (index + 1)*prefscale;
          costs[7] = (index + 1)*prefscale;
        } else if (classId === 'class-demoman') {
          costs[8] = (index + 1)*prefscale;
          costs[9] = (index + 1)*prefscale;
        } else if (classId === 'class-medic') {
          costs[10] = (index + 1)*prefscale;
          costs[11] = (index + 1)*prefscale;
        } else {
          return res(false);
        }
        duplicates.push(classId);
      });

      // Update user with new classes/costs arrays
      user.classes = classes;
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

      console.log(state);
      io.sockets.emit('addUp', {
        _id: user._id,
        classes: user.classes,
        name: user.name,
        rank: user.rank,
        status: user.status
      });
      
      callback(state.length); // Place in line
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
      return socket.json.broadcast.send({
        id: socket.id,
        disconnect: true
      });
    });

  });

  // Helpers



};