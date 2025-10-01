var MediaActionLogs = require('../../../controllers/mediaActionLogsController.js');

module.exports = function(router){
	
	// Get stream likes (using MediaActionLogs collection)
	router.post('/getStreamLikes', function(req, res){
		MediaActionLogs.getStreamLikes(req, res);
	});
	
	// Get page likes (using MediaActionLogs collection)
	router.post('/getPageLikes', function(req, res){
		MediaActionLogs.getPageLikes(req, res);
	});

	// Add like to comment (using MediaActionLogs collection)
	router.post('/addCommentLike', function(req, res){
		MediaActionLogs.addCommentLike(req, res);
	});

	// Remove like from comment (using MediaActionLogs collection)
	router.post('/removeCommentLike', function(req, res){
		MediaActionLogs.removeCommentLike(req, res);
	});

	// Get comment likes (using MediaActionLogs collection)
	router.post('/getCommentLikes', function(req, res){
		MediaActionLogs.getCommentLikes(req, res);
	});

};

