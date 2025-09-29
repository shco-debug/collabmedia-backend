var postManeger = require('../../../controllers/postManagerController.js');
module.exports = function(router){
	
	router.post('/allPost',function(req,res){
		postManeger.allPost(req,res);
	})
	router.post('/activateDeactivatePost',function(req,res){
		postManeger.activateDeactivatePost(req,res);
	})
}   