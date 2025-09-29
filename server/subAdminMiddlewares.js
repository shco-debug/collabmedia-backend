/*
Comments - Loads custom middle-wares for the application.
TEMPORARILY DISABLED DUE TO SESSION DESERIALIZATION ISSUES
*/

module.exports = function(router){
	
	//1) authentication middle-ware
	//Loading custom middle-ware to check the session with each request
	// TEMPORARILY DISABLED - All subadmin routes are now public
	// var checkAdminSession = require('./middlewares/checkSubAdminSession.js');
	// router.use(checkAdminSession);
	
	// Allow all requests to pass through without authentication
	console.log('⚠️ SubAdmin middleware temporarily disabled - all routes are public');
}