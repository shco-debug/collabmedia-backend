/*
Comments - Loads custom middle-wares for the application.
*/

module.exports = function(router){
	
	//1) authentication middle-ware
	//Loading custom middle-ware to check the session with each request
	var checkSession = require('./middlewares/checkSession.js');
	router.use(checkSession);
	
	//2) session compatibility middle-ware
	//Maps JWT user data to req.session.user for backward compatibility
	var sessionCompatibility = require('./middlewares/sessionCompatibility.js');
	router.use(sessionCompatibility);
}