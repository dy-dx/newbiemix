var mongoose = require('mongoose');
var _ = require('underscore');
// var request = require('request');
// var env = require('../cfg/env'),
  // secrets = env.secrets;

var mixSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  bluScore: Number,
  redScore: Number,
  players: [{
    _id: { type: String, required: true},
    name: { type: String, required: true},
    avatar: String,
    class: { type: String, required: true},
    rank: String,
    team: { type: String, required: true}, // 'red' or 'blu'
    playCount: Number,
    // 'reportCount' is a global count of mixes the player got reported in
    reportCount: Number,
    // 'reports' is an array of players requesting a sub for this player
    reports: [String],
    // 'isSubstituted' serves as a lock to prevent 2 players from
    //  fulfilling a sub request at the same time.
    isSubstituted: { type: Boolean, default: false },
    isASubstitute: { type: Boolean, default: false }
  }],
  server: {
    name: String,
    ip: String,
    port: Number,
    convenienceIp: String,
    password: String
  },
  updated: Date,
  isActive: { type: Boolean, default: true }
});

// Take as parameters the mixId and scores, return array of winning players or the string 'tie'
mixSchema.statics.updateScores = function(mixId, bluscore, redscore, callback) {
  Mix.findByIdAndUpdate(mixId, {bluScore: bluscore, redScore: redscore, isActive: false}, function(err, mix) {
    if (err) {return callback(err);}
    if (!mix) {return callback(new Error('No mix found'));}
    // Figure out which team won and return those players.
    var winners = [];
    if (bluscore > redscore) {
      winners = _.filter(mix.players, function(p) { return p.team === 'blu'; });
    } else if (redscore > bluscore) {
      winners = _.filter(mix.players, function(p) { return p.team === 'red'; });
    } else {
      return callback(null, 'tie');
    }
    return callback(null, winners);
  });
};

mixSchema.statics.addReport = function(reporterId, data, callback) {
  Mix.findById(data.mixId, function(err, mix) {
    if (err || !mix) { return callback(new Error('No mix found')); }
    // Check if reportee exists
    var reportee = _.find(mix.players, function(p) { return p._id === data.reporteeId; });
    if (!reportee) { return callback(new Error('Reportee not found')); }
    // Check if reporter exists
    var reporter = _.find(mix.players, function(p) { return p._id === reporterId; });
    if (!reporter) { return callback(new Error('Reporter not found')); }
    // Check if reporter already reported reportee
    if ( _.contains(reportee.reports, reporterId) ) { return callback(new Error('Already reported')); }

    // Add report
    reportee.reports.push(reporterId);
    mix.save(function(err) {
      if (err) { return callback(new Error('Error updating mix')); }
      return callback(null, reportee);
    });

  });
};

var Mix = mongoose.model('Mix', mixSchema);

module.exports = Mix;
