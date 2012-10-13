var mongoose = require('mongoose');
// var request = require('request');
// var env = require('../cfg/env'),
  // secrets = env.secrets;

var serverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String, default: 'available' }
});

var Server = mongoose.model('Server', serverSchema);

module.exports = Server;