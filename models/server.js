var mongoose = require('mongoose');
// var request = require('request');
// var env = require('../cfg/env'),
  // secrets = env.secrets;

var serverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true, unique: true, sparse: true },
  password: { type: String, required: true },
  isAvailable: { type: Boolean, required: true }
});

var Server = mongoose.model('Server', serverSchema);

module.exports = Server;