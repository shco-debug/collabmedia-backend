var media = require('../../../controllers/mediaController.js');
module.exports = function(router){
	 
	
	router.post('/add',function(req,res){
		media.uploadfile(req,res);
	})
	
	router.post('/edit',function(req,res){
		media.edit(req,res);
	})
	router.post('/editall',function(req,res){
		media.editAll(req,res);
	})
	router.post('/editTag',function(req,res){
		media.editTags(req,res);
	})	
	router.post('/view',function(req,res){
		media.findAll(req,res);
	})
	router.post('/view/all',function(req,res){
		media.findAllStatus(req,res);
	})
	router.post('/delete',function(req,res){
		media.deleteMedia(req,res);
	})
	// parul 08-01-2015
	router.post('/viewMedia',function(req,res){
		media.viewMedia(req,res);
	})
	// end
}