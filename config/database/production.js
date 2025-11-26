/*
* Author - Dipin Behl
* Date - 3 June 1985
* Comments - Sets the default values for database values for the production environment
*/

module.exports = {
	uri: process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/collabmedia',
	options: {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		maxPoolSize: 10,
		// NO TIMEOUT for long-running operations like buyNow
		// Process can take many minutes (capsule instance creation, email sending, etc.)
		serverSelectionTimeoutMS: 3600000, // 1 hour (3600000ms) - long enough for buyNow operations
		socketTimeoutMS: 3600000, // 1 hour (3600000ms) - long enough for buyNow operations
		retryWrites: true,
		retryReads: true
	}
}
