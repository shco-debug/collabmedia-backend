/*
* Author - Dipin Behl
* Date - 3 June 1985
* Comments - Sets the default values for environment variables and furthers the call to set the same for node's environment
*/

module.exports = function(app){

	switch (process.env.NODE_ENV){
		case 'development':
			require(__dirname + '/development.js')();
			require('../../server/routes/routes.js')(app);
		break;

		case 'production':
			require(__dirname + '/production.js')();
		break;
	}

}
