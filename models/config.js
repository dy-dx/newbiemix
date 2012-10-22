var mongoose = require('mongoose');

var configSchema = new mongoose.Schema({
  _id: String,
  allowCoachless: {type: Boolean, default: false},
  enableFreeForAll: {type: Boolean, default: false}
});

var Config = mongoose.model('Config', configSchema);

module.exports = Config;