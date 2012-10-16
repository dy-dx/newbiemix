
/*
 * GET home page.
 */

var Mix = require('../models/mix');
var Page = require('../models/page');

exports.index = function(req, res) {
  res.render('index', {
    loggedIn: req.loggedIn,
    user: req.user
  });
};

exports.partials = function (req, res) {
  res.render('partials/' + req.params.name);
};

exports.mixes = function (req, res) {
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

exports.pages = function (req, res) {
  Page.find({}).select('id title').exec(function(err, pages) {
    if (err) {
      // TODO: Handle an err here
      console.log(err);
      return res.json(false);
    }
    Page.findOne({id: req.params.id}, function(err, page) {
      if (err) {
        // TODO: Handle an err here
        console.log(err);
        return res.json(false);
      }

      return res.json({
        page: page,
        pages: pages
      });

    });
  });
};
