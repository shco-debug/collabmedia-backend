var groupTags = require('../../../controllers/groupTagsController.js');
module.exports = function(router){
	 
	
	router.post('/view', function(req,res){
		groupTags.findAllBinding(req,res);
	})	
	router.post('/add', function(req,res){
		groupTags.addBinding(req,res);
	})
	router.post('/delete',function(req,res){
		groupTags.deleteBinding(req,res);
	})
}