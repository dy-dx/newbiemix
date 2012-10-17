/*
 * /routes/admin.js
 */

var Page = require('../models/page');


module.exports = function(app) {

  app.get('/admin', isAdmin, index);
  app.get('/admin/pages', isAdmin, pageIndex);
  app.get('/admin/pages/new', isAdmin, pageNew);
  app.get('/admin/pages/:id/edit', isAdmin, pageEdit);

  app.post('/admin/pages', isAdmin, pageCreate);
  app.put('/admin/pages/:id', isAdmin, pageUpdate);
  app.del('/admin/pages/:id', isAdmin, pageDestroy);

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
