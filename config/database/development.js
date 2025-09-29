/*
* Author - 
* Date - 3 June 1985
* Comments - Sets the default values for database variables for development environment
*/

module.exports = {

	uri : process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collabmedia',
	options : {
		// Local development options
		useNewUrlParser: true,
		useUnifiedTopology: true
	}

}
