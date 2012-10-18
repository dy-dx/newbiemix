/*
 * /routes/admin.js
 */

var Page = require('../models/page');
var Server = require('../models/server');
var dispatchListener = require('./dispatchlistener');

module.exports = function(app) {

  app.get('/admin', isAdmin, index);


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
