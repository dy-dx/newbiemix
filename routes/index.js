
/*
 * GET home page.
 */

exports.index = function(req, res) {
  console.log(req.loggedIn);
  console.log(req.user);
  res.render('index', {
    loggedIn: req.loggedIn,
    user: req.user
  });
};

exports.partials = function (req, res) {
  res.render('partials/' + req.params.name);
};