var keywords = require('../../../controllers/keywordManagementController.js');
var GroupTags = require('../../../controllers/groupTagsController.js');
var keyword_bulkAPI = require('../../../cron-jobs/cronJobsController.js');
module.exports = function( router ){
	
	router.post('/parse',function(req,res){
		keywords.keywordParsar(req,res);
	});
	
	router.get('/updateAlltagsCollection_API', function(req, res){
		keyword_bulkAPI.updateAlltagsCollection_API(req, res);
	})
	
	router.post('/speechToTextKeywordMapping',function(req,res){
		GroupTags.speechToTextKeywordMapping(req,res);
	});
	
	router.get('/getSpeechToTextMediaId', function(req, res){
		GroupTags.getSpeechToTextMediaId(req, res);
	});
	
	router.post('/deleteKeywordFromMedia',function(req,res){
		GroupTags.deleteKeywordFromMedia(req,res);
	});
	
	router.post('/deleteMedia',function(req,res){
		GroupTags.deleteMedia(req,res);
	});
}