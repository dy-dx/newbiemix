var mongoose = require('mongoose');
// var request = require('request');
// var env = require('../cfg/env'),
  // secrets = env.secrets;
var Rcon = require('rcon').newHandle;

var serverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true },
  port: { type: Number, required: true },
  convenienceIp: { type: String, default: '' },
  password: { type: String, required: true },
  rconPassword: { type: String, required: true },
  pushConfig: { type: String, default: 'esea_push.cfg' },
  kothConfig: { type: String, default: 'esea_koth.cfg' },
  stopwatchConfig: { type: String, default: 'esea_stopwatch.cfg' },
  isAvailable: { type: Boolean, required: true },
  // This one isn't used in database but it's here cause I set it in socket.js
  isInUse: { type: Boolean, default: false }
});


// RCON Communication
serverSchema.methods.execConfig = function(map, callback) {

  var config = '';
  if (map === 'cp_gravelpit') {
    config = this.stopwatchConfig;
  } else {
    switch(map.split('_')[0]) {
      case 'cp':
        config = this.pushConfig;
        break;
      case 'koth':
        config = this.kothConfig;
        break;
      case 'pl':
        config = this.stopwatchConfig;
        break;
      default:
        config = this.pushConfig;
        break;
    }
  }
  
  var rcon = new Rcon();
  rcon.connect(this.ip, this.port, this.rconPassword, onConnected);

  function onConnected(err, response) {
    // if(err){console.error(err);callback(err);return;}
    if (err) {
      console.log(err);
      return;
    }

    rcon.sendCommand('exec ' + config, function(err, response) {
      console.log("Config executed:", response.data);
    });

    rcon.sendCommand("say Newbie Mix starting!", function(err, response) {
      // do something
    });

    rcon.end();

    callback(null);
  }

};


var Server = mongoose.model('Server', serverSchema);

module.exports = Server;
