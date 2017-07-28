'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
	github: {
		id: String,
		displayName: String,
		username: String,
        publicRepos: Number
	},
    settings: {
        name: String,
        city: String,
        state: String
    }
});

module.exports = mongoose.model('User', User);
