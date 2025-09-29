var groupTags = require('../../../controllers/groupTagsController.js');
module.exports = function(router){
	 
	
	router.post('/view', function(req,res){
		groupTags.findTag(req,res);
	})
	router.post('/add', function(req,res){
		groupTags.addTag(req,res);
	})
	router.post('/edit', function(req,res){
		groupTags.editTag(req,res);
	})
	router.post('/delete', function(req,res){
		groupTags.deleteTag(req,res);
	})
	// added by parul
	router.post('/deleteUserTag', function(req,res){
		groupTags.deleteUserTag(req,res);
	})
	// added by parul
	router.post('/addUserTags', function(req,res){
		groupTags.addUserTags(req,res);
	})
	// added by parul
	router.get('/viewUserTag', function(req,res){
		groupTags.findAllUserTags(req,res);
	})
	// added by parul
	router.post('/editUserTag', function(req,res){
		groupTags.editUserTag(req,res);
	})
	// added by parul
	router.post('/updateUserTag', function(req,res){
		groupTags.updateUserTag(req,res);
	})
}