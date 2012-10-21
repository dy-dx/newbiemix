var mongoose = require('mongoose');

var configSchema = new mongoose.Schema({
  _id: String,
  allowCoachless: {type: Boolean, default: false},
  enableFreeForAll: {type: Boolean, default: false}
});

var Config = mongoose.model('Config', configSchema);

module.exports = Config;

// If no config is in the DB, create one
Config.findById('newbiemix', function(err, config) {
  if (err) throw err;
  if (!config) {
    console.log('No config found, inserting new one');
    new Config({
      _id: 'newbiemix'
    }).save(function(e) {
      if (e) throw e;
    });
  }
});