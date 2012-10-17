/*
 * /routes/index.js
 */

module.exports = function(app) {

  app.dynamicHelpers({
    loggedIn: function(req, res) {
      return req.loggedIn;
    },
    user: function(req, res) {
      return req.user;
    }
  });

  app.get('/', index);
  app.get('/partials/:name', partials);


  require('./api')(app);
  require('./admin')(app);


  app.get('*', index);
};


var index = function(req, res) {
  res.render('index');
};

var partials = function (req, res) {
  res.render('partials/' + req.params.name);
};
