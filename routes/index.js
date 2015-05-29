/*
 * /routes/index.js
 */

env = require('../cfg/env');

module.exports = function(app) {

  app.use(function (req, res, next) {
    res.locals.loggedIn = req.loggedIn;
    res.locals.user = req.user;
    res.locals.port = env.port;
    next();
  });

  app.get('/', index);
  app.get('/partials/:name', partials);


  require('./api')(app);
  require('./admin')(app);


  app.get('*', index);
};


var index = function (req, res) {
  res.render('index');
};

var partials = function (req, res) {
  res.render('partials/' + req.params.name);
};
