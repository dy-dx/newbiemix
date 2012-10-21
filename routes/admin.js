/*
 * /routes/admin.js
 */

var Page = require('../models/page');
var Config = require('../models/config');
var Server = require('../models/server');
var Player = require('../models/player');
var request = require('request');
var xml2js = require('xml2js');
var env = require('../cfg/env'),
  secrets = env.secrets;
var dispatchListener = require('./dispatchlistener');

module.exports = function(app) {

  app.get('/admin', isAdmin, index);


  app.get('/admin/config/edit', isAdmin, configEdit);
  app.put('/admin/config', isAdmin, configUpdate);


  app.get('/admin/pages', isAdmin, pageIndex);
  app.get('/admin/pages/new', isAdmin, pageNew);
  app.get('/admin/pages/:id/edit', isAdmin, pageEdit);

  app.post('/admin/pages', isAdmin, pageCreate);
  app.put('/admin/pages/:id', isAdmin, pageUpdate);
  app.del('/admin/pages/:id', isAdmin, pageDestroy);


  app.get('/admin/servers', isAdmin, serverIndex);
  app.get('/admin/servers/new', isAdmin, serverNew);
  app.get('/admin/servers/:id/edit', isAdmin, serverEdit);
  
  app.post('/admin/servers', isAdmin, serverCreate);
  app.put('/admin/servers/:id', isAdmin, serverUpdate);
  app.del('/admin/servers/:id', isAdmin, serverDestroy);


  app.get('/admin/players', isAdmin, playerIndex);
  app.get('/admin/players/new', isAdmin, playerNew);
  app.get('/admin/players/:id/edit', isAdmin, playerEdit);
  
  app.put('/admin/players/:id', isAdmin, playerUpdate);
  app.post('/admin/players', isAdmin, playerCreate);

};


// Helpers

var isAdmin = function(req, res, next) {
  if (req.user && req.user.permissions >= 5)
    return next();
  res.send(404);
};


// Routes

var index = function(req, res) {
  res.render('admin/index');
};

var configEdit = function(req, res) {
  Config.findById('newbiemix').exec(function(err, config) {
    if (err) return res.json(false);
    res.render('admin/config/edit', { config: config });
  });
};

var configUpdate = function(req, res) {
  if (!req.body || !req.body.config) return res.json(false);

  var config = req.body.config;
  config.updated = new Date();
  Config.update({ _id: 'newbiemix' }, { $set: config }, function(err) {
    if (err) return res.json(false);

    res.json(true);
    dispatchListener.emit('configUpdated', config);

  });
};


/**
 * Pages
 */

var pageIndex = function(req, res) {
  Page.find({}).sort('order').exec(function(err, pages) {
    if (err) return res.json(false);
    res.render('admin/pages/index', { pages: pages });
  });
};

var pageNew = function(req, res) {
  res.render('admin/pages/new');
};

var pageEdit = function(req, res) {
  Page.findById(req.params.id).exec(function(err, page) {
    if (err) return res.json(false);
    res.render('admin/pages/edit', { page: page });
  });
};

var pageUpdate = function(req, res) {
  if (!req.body || !req.body.page) return res.json(false);

  req.body.page.updated = new Date();
  Page.update({ _id: req.params.id }, { $set: req.body.page }, function(err) {
    if (err) return res.json(false);
    res.json(true);
  });
};

var pageCreate = function(req, res) {
  if (!req.body || !req.body.page) return res.json(false);

  req.body.page.updated = new Date();
  Page.create(req.body.page, function(err) {
    if (err) return res.json(false);
    res.json(true);
  });
};

var pageDestroy = function(req, res) {
  Page.findByIdAndRemove(req.params.id, function(err) {
    if (err) return res.json(false);
    return res.json(true);
  });
};


/**
 * Servers
 */

var serverIndex = function(req, res) {
  Server.find({}).exec(function(err, servers) {
    if (err) return res.json(false);
    res.render('admin/servers/index', { servers: servers });
  });
};

var serverNew = function(req, res) {
  res.render('admin/servers/new');
};

var serverEdit = function(req, res) {
  Server.findById(req.params.id).exec(function(err, server) {
    if (err) return res.json(false);
    res.render('admin/servers/edit', { server: server });
  });
};

var serverUpdate = function(req, res) {
  if (!req.body || !req.body.server) return res.json(false);

  Server.findByIdAndUpdate(req.params.id, { $set: req.body.server }, function(err, server) {
    if (err) return res.json(false);
    res.json(true);
    dispatchListener.emit('serverUpdated', server);
  });
};

var serverCreate = function(req, res) {
  if (!req.body || !req.body.server) return res.json(false);

  Server.create(req.body.server, function(err, server) {
    if (err) return res.json(false);
    res.json(true);
    dispatchListener.emit('serverUpdated', server);
  });
};

var serverDestroy = function(req, res) {
  Server.findByIdAndRemove(req.params.id, function(err, server) {
    if (err) return res.json(false);
    res.json(true);
    if (server) {
      dispatchListener.emit('serverDestroyed', server);
    }
  });
};

/**
 * Players
 */

// This is for batch adding coaches only!
var playerNew = function(req, res) {
  res.render('admin/players/new');
};

var playerIndex = function(req, res) {
  Player.find({}).exec(function(err, players) {
    if (err) return res.json(false);
    res.render('admin/players/index', { players: players });
  });
};

var playerEdit = function(req, res) {
  Player.findById(req.params.id).exec(function(err, player) {
    if (err) return res.json(false);
    res.render('admin/players/edit', { player: player });
  });
};

var playerUpdate = function(req, res) {
  if (!req.body || !req.body.player) return res.json(false);
  req.body.updated = new Date();
  Player.findByIdAndUpdate(req.params.id,
                           {$set:{name: req.body.player.name,
                                  rank: req.body.player.rank,
                                  updated: new Date() }},
                           function(err, player) {
    if (err) return res.json(false);
    res.json(true);
    dispatchListener.emit('playerUpdated', player);
  });
};
// This is for batch adding coaches only!
var playerCreate = function(req, res) {
  if (!req.body || !req.body.coachurls) return res.json(false);

  var coachurls = req.body.coachurls;

  if (!Array.isArray(coachurls) || coachurls.length === 0) return res.json(false);

  var itsOver = false;
  // I don't think this is correct but whatever
  reg = new RegExp(/http\:\/\/\w+(\/\S*)?/);
  coachurls.forEach(function(url, index) {
    if (itsOver || !reg.test(url)) return;

    request({timeout: 7000, url:url + '?xml=true'}, function(err, steamRes, body) {
      if (err || steamRes.statusCode !== 200){
        itsOver = true;
        return res.json(false);
      }
      var parser = new xml2js.Parser();
      parser.parseString(body, function (err, result) {
        if (err || !result || !result.profile || !result.profile.steamID64 || !result.profile.steamID){
          itsOver = true;
          return res.json(false);
        }
        var steamid = result.profile.steamID64[0];
        var name = result.profile.steamID[0];
        var coach = {
          name: name,
          rank: 'coach',
          updated: new Date()
        };
        Player.update({_id: steamid}, coach, {upsert: true}, function(err) {
          if (err) {
            itsOver = true;
            return res.json(false);
          }

          coach._id = steamid;
          dispatchListener.emit('playerUpdated', coach);

          if (index == coachurls.length-1) {
            // This is stupid because of async but oh well
            return res.json(true);
          }
        });

      });
    });


  }); // End coachurls.forEach()
};
