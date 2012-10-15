var mongoose = require('mongoose');

// This is a model for an id counter (increments mixId)

var counterSchema = new mongoose.Schema({
  counter: String, //"mixes"
  next: Number
});

var Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;

// If no match counter is in the DB, create one
Counter.findOne({ counter: 'mixes' }, function(err, mixCounter) {
  if (err) throw err;
  if (!mixCounter) {
    console.log('No mix counter found, inserting new one');
    new Counter({ "counter" : "mixes", "next" : 0 }).save(function(e) {
      if (e) throw e;
    });
  }
});