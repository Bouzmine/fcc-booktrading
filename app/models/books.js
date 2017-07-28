'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Book = new Schema({
    name: String,
    userId: Schema.Types.Mixed
});

module.exports = mongoose.model('Book', Book);