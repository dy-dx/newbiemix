var mongoose = require('mongoose');
// var request = require('request');
// var env = require('../cfg/env'),
  // secrets = env.secrets;

var mixSchema = new mongoose.Schema({
  _id: String,
  // redteam: { type: Array, required: true },
  // bluteam: { type: Array, required: true },
  redteam: [{
    _id: String,
    name: String,
    avatar: String,
    class: String,
    rank: String
  }],
  bluteam: [{
    _id: String,
    name: String,
    avatar: String,
    class: String,
    rank: String
  }],
  server: {
    name: String,
    ip: String,
    password: String
  },
  updated: Date
});

var Mix = mongoose.model('Mix', mixSchema);

module.exports = Mix;