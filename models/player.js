var mongoose = require('mongoose');
var request = require('request');
var env = require('../cfg/env'),
  secrets = env.secrets;

var playerSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // numeric steamid
  name: String,
  avatar: String,
  updated: Date,
  country: { type: String, default: 'i dunno' }, // Some players don't have this
  rank: { type: String, required: true },
  playCount: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0},
  winCount: { type: Number, default: 0},
  classes: { type: Array, default: [
      {name: 'Scout', id: 'Scout', selected: false},
      {name: 'Pocket', id: 'Pocket', selected: false},
      {name: 'Roamer', id: 'Roamer', selected: false},
      {name: 'Medic', id: 'Medic', selected: false},
      {name: 'Demoman', id: 'Demoman', selected: false}
    ]}, // Do I need to validate this?
  permissions: { type: Number, default: 1 } // 1: user, 2: moderator, 5: admin, 10: superadmin
});

var steamIdToNumericId = function(steamid) {
  var parts = steamid.split(":");
  var iServer = Number(parts[1]);
  var iAuthID = Number(parts[2]);
  
  var converted = "76561197960265728";

  lastIndex = converted.length - 1;

  var toAdd = iAuthID * 2 + iServer;
  var toAddString = String(toAdd);
  var addLastIndex = toAddString.length - 1;

  for(var i=0;i<=addLastIndex;i++)
  {
    var num = Number(toAddString.charAt(addLastIndex - i));
    var j=lastIndex - i;
    do {
      var num2 = Number(converted.charAt(j));
      var sum = num + num2;
              
      converted = converted.substr(0,j) + (sum % 10).toString() + converted.substr(j+1);
  
      num = Math.floor(sum / 10);
      j--;
    }
    while(num);
  }
  return converted;
};

// I have no idea if this function works
var numericIdToSteamId = function(profile) {
  var base = "7960265728";
  var profile = profile.substr(7);
  
  var subtract = 0;
  var lastIndex = base.length - 1;
  
  for(var i=0;i<base.length;i++) {
    var value = profile.charAt(lastIndex - i) - base.charAt(lastIndex - i);
    
    if(value < 0) {
      var index = lastIndex - i - 1;
      
      base = base.substr(0,index) + (Number(base.charAt(index)) + 1) + base.substr(index+1);
      
      if(index) {
        value += 10;
      } else {
        break;
      }
    }
    
    subtract += value * Math.pow(10,i);
  }
  
  return "STEAM_0:" + (subtract%2) + ":" + Math.floor(subtract/2);
};

// This takes in non-numeric steamids only!
playerSchema.statics.updateSteamInfo = function(steamids) {

  var steamIdRegex = /STEAM_0\:(0|1)\:\d{1,15}$/;
  var convertedids = [];
  
  steamids.forEach(function(steamid) {
    // Validation should take place elsewhere.
    if (steamIdRegex.test(steamid)) {
      convertedids.push(steamIdToNumericId(steamid));
    }
  });

  var query = 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' +
              steamapi + '&steamids=' + convertedids.join();

  request(query, function(err, res, body) {
    if (err) {
      console.log(err);
      return false;
    }
    if (res.statusCode !== 200) {
      // do more stuff here
      console.log('Steam API Error: ' + res.statusCode);
      return false;
    }
    var steamInfo;
    try {
      steamInfo = JSON.parse(body);
    } catch (e) {
      console.log(e);
      return false;
    }
    steamInfo.response.players.forEach(function(player) {
      // Player.update()

      var steamid = numericIdToSteamId(player.steamid);
      var newPlayer = {
                        numericid: player.steamid,
                        name: player.personaname,
                        avatar: player.avatar,
                        updated: new Date()
                      };
      if (player.loccountrycode)
        newPlayer.country = player.loccountrycode;

      Player.update({ _id: steamid }, newPlayer, { upsert: true}, function(err) {
        if (err) {
          console.log(err);
        }
      });
    });
  }); // End request
};


// This takes in an already validated steamid
playerSchema.statics.getSteamApiInfo = function(steamid, callback) {

  var options = {
    uri: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
    qs: { key: secrets.steam, steamids: steamid },
    json: true,
    timeout: 7000
  };

  request(options, function(err, res, body) {
    if (err) {
      console.log('Steam API Request Error', err);
      return callback(err);
    }
    if (res.statusCode !== 200) {
      return callback(new Error('Steam API Status Code: ' + res.statusCode));
    }
    if (body.response.players.length === 0) {
      console.log('Steam Api Player Not Found: ' + steamid);
      return callback(new Error('Steam API Player Not Found: ' + steamid));
    }
    return callback(null, body.response.players[0]);
  }); // End request

};

playerSchema.statics.incrementWinCount = function(steamid, callback) {
  Player.update({_id:steamid}, {$inc:{winCount:1}}, {safe:true}, function(err) {
    if (err) {return callback(err);}
  });
};


var Player = mongoose.model('Player', playerSchema);

module.exports = Player;