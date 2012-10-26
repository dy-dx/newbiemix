var mongoose = require('mongoose');
var _ = require('underscore');
// var request = require('request');
// var env = require('../cfg/env'),
  // secrets = env.secrets;

var mixSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  bluScore: Number,
  redScore: Number,
  redteam: [{
    _id: String,
    name: String,
    avatar: String,
    class: String,
    rank: String,
    team: { type: String, default: 'red' },
    playCount: Number,
    // 'reportCount' is a global count of mixes the player got reported in
    reportCount: Number,
    // 'reports' is an array of players requesting a sub for this player
    reports: [String],
    // 'isSubstituted' describes whether or not the player has been subbed out
    //  This doesn't belong here. remove it.
    isSubstituted: { type: Boolean, default: false },
    isASubstitute: { type: Boolean, default: false }
  }],
  bluteam: [{
    _id: String,
    name: String,
    avatar: String,
    class: String,
    rank: String,
    team: { type: String, default: 'blu' },
    playCount: Number,
    // 'reportCount' is a global count of mixes the player got reported in
    reportCount: Number,
    // 'reports' is an array of players requesting a sub for this player
    reports: [String],
    // 'isSubstituted' describes whether or not the player has been subbed out
    //  This doesn't belong here. remove it.
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
    if (bluscore > redscore) {
      return callback(null, mix.bluteam);
    } else if (redscore > bluscore) {
      return callback(null, mix.redteam);
    } else {
      return callback(null, 'tie');
    }
  });
};

mixSchema.statics.addReport = function(reporterId, data, callback) {
  Mix.findById(data.mixId, function(err, mix) {
    if (err || !mix) { return callback(new Error('No mix found')); }
    // Check if reportee exists
    var reportee = ( _.find(mix.bluteam, function(p) { return p._id === data.reporteeId}) ||
                     _.find(mix.redteam, function(p) { return p._id === data.reporteeId}) );
    if (!reportee) { return callback(new Error('Reportee not found')); }
    // Check if reporter exists
    var reporter = ( _.find(mix.bluteam, function(p) { return p._id === reporterId}) ||
                     _.find(mix.redteam, function(p) { return p._id === reporterId}) );
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
