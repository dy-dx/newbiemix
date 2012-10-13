
/*
 * GET home page.
 */

var Mix = require('../models/mix');

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