var mongoose = require('mongoose');

var configSchema = new mongoose.Schema({
  _id: String,
  allowCoachless: {type: Boolean, default: false},
  enableFreeForAll: {type: Boolean, default: false},
  reportLimit: {type: Number, default: 3}
});

var Config = mongoose.model('Config', configSchema);

module.exports = Config;