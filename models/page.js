var mongoose = require('mongoose');
// var request = require('request');
// var env = require('../cfg/env'),
//   secrets = env.secrets;

var pageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, sparse: true },
  order: { type: Number, required: true },
  title: { type: String, required: true },
  updated: Date,
  text: { type: String, required: true }
});

var Page = mongoose.model('Page', pageSchema);

module.exports = Page;