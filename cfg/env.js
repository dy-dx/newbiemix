var env = module.exports = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8003,
  mongo_url: process.env.MONGOHQ_URL || 'mongodb://localhost/newbiemix'
};

env.development = env.node_env === 'development';
env.production = !env.development;

if (env.development) {
  env.hostname = 'http://localhost:' + env.port;

  // env.facebook_app_id = 'etc';
  // env.twitter_app_id = 'etc';
  try { env.secrets = require('./secrets'); }
  catch(e) { throw 'cfg/secrets.js is missing. See cfg/secrets.js.example'; }
  env.irc = {
    username: 'etcBOT',
    server: 'irc.whatever.net',
    channels: ['#etc', '#whatever']
  };
} else {
  env.hostname = 'http://www.newbiemix.com';

  // env.facebook_app_id = 'etc';
  env.secrets = {
    steam: process.env.STEAM_API_KEY,
    // facebook: process.env.FACEBOOK_OAUTH_SECRET,
    // github: process.env.GITHUB_OAUTH_SECRET,
    // twitter: process.env.TWITTER_OAUTH_SECRET,
    // postageapp: process.env.POSTAGEAPP_SECRET,
    session: process.env.EXPRESS_SESSION_KEY
    // twitterUser: {
    //   user: process.env.TWITTER_USER,
    //   password: process.env.TWITTER_PASSWORD
    // }
  };
  env.irc = {
    username: 'etcBot',
    server: 'irc.gamesurge.net',
    channels: ['#whatever', '#something']
  };
}