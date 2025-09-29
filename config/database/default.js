/*
* Author - Dipin Behl
* Date - 3 June 1985
* Comments - Sets the default values for database and furthers the call to set the same for node's current environment
* ToDo - Loading of mongoose models from ../Server/Models' folder
*/

//require statements
var mongoose = require('mongoose');

module.exports = function(app){
	var db = {};

	switch (process.env.NODE_ENV){
		case 'development':
			db = require(__dirname + '/development.js');
		break;

		case 'production':
			db = require(__dirname + '/production.js');
		break;

		default:
			// Use development config for Vercel and other environments
			db = require(__dirname + '/development.js');
		break;
	}

	mongoose.connect(db.uri, db.options, function(){
		//Load Models here
	});

}
