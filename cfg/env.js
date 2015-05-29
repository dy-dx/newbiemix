var env = module.exports = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8003,
  mongo_url: process.env.MONGO_URL || process.env.MONGOHQ_URL || 'mongodb://localhost/newbiemix',
  redis_host: process.env.REDIS_HOST || '127.0.0.1',
  redis_port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  redis_db: parseInt(process.env.REDIS_DB, 10) || 1,
  redis_password: process.env.REDIS_PASSWORD,
  session_prefix: (process.env.SESSION_PREFIX) || 'nmsess:',
  dispatch_port: parseInt(process.env.DISPATCH_PORT, 10) || 27030
};

env.development = env.node_env === 'development';
env.production = !env.development;

if (env.development) {
  env.hostname = (process.env.HOSTNAME || 'http://localhost') + ':' + env.port;

  try { env.secrets = require('./secrets'); }
  catch(e) { throw new Error('cfg/secrets.js is missing. See cfg/secrets.js.example'); }

  env.irc = {
    username: 'etcBOT',
    server: 'irc.whatever.net',
    channels: ['#etc', '#whatever']
  };
} else {
  env.hostname = process.env.HOSTNAME || 'http://newbiemix.com';

  env.secrets = {
    steam: process.env.STEAM_API_KEY,
    // postageapp: process.env.POSTAGEAPP_SECRET,
    session: process.env.EXPRESS_SESSION_KEY
  };
  env.irc = {
    username: 'etcBot',
    server: 'irc.gamesurge.net',
    channels: ['#whatever', '#something']
  };
}
