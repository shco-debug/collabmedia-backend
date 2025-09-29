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
		serverSelectionTimeoutMS: 5000,
		socketTimeoutMS: 45000,
		retryWrites: true,
		retryReads: true
	}
}
