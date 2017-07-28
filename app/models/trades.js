'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Trade = new Schema({
	askerId: Schema.Types.Mixed,
	bookId: Schema.Types.Mixed,
	ownerId: Schema.Types.Mixed,
	status: Number
});

module.exports = mongoose.model('Trade', Trade);