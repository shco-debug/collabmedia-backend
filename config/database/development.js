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
		useUnifiedTopology: true,
		// NO TIMEOUT for long-running operations like buyNow
		// Process can take many minutes (capsule instance creation, email sending, etc.)
		serverSelectionTimeoutMS: 3600000, // 1 hour (3600000ms) - long enough for buyNow operations
		socketTimeoutMS: 3600000, // 1 hour (3600000ms) - long enough for buyNow operations
	}

}
