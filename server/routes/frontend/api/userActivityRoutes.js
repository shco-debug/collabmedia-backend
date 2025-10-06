var UserActivities = require('../../../controllers/getUserActivities.js');

module.exports = function(router){
	
	// Get activities of a specific user (including inviter)
	router.post('/getUserActivities', function(req, res){
		UserActivities.getUserActivities(req, res);
	});
	
	// Get user activities via GET request
	router.get('/getUserActivities', function(req, res){
		UserActivities.getUserActivities(req, res);
	});

	// Get activity statistics for a specific user
	router.post('/getUserActivityStats', function(req, res){
		UserActivities.getUserActivityStats(req, res);
	});
	
	// Get user activity stats via GET request
	router.get('/getUserActivityStats', function(req, res){
		UserActivities.getUserActivityStats(req, res);
	});

};
