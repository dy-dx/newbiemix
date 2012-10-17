/*
 * /routes/api.js
 */

var Mix = require('../models/mix');
var Page = require('../models/page');

module.exports = function(app) {

  app.get('/api/mixes/:id', mixes);
  app.get('/api/page/:slug', page);
  app.get('/api/pages', pageList);

};


var mixes = function (req, res) {
  Mix.findById(req.params.id, function(err, mix) {
    if (err) {
      // TODO: Handle an err here
      console.log(err);
      return res.json(false);
    }
    return res.json({
      mix: mix
    });
  });
};

var page = function (req, res) {
  Page.findOne({slug: req.params.slug}, function(err, page) {
    if (err) {
      // TODO: Handle an err here
      console.log(err);
      return res.json(false);
    }
    return res.json({
      page: page
    });
  });
};


var pageList = function (req, res) {
  Page.find({}).sort('order').select('slug title').exec(function(err, pages) {
    if (err) {
      // TODO: Handle an err here
      console.log(err);
      return res.json(false);
    }
    return res.json({
      pages: pages
    });
  });
};
