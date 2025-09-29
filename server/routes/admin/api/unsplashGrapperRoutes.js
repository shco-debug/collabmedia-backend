var unsplashGrapper = require('../../../controllers/unsplashGrapperController.js');
module.exports = function(router){
	
	router.post('/uploader/', function(req,res){
		unsplashGrapper.uploader(req,res);
	});
}