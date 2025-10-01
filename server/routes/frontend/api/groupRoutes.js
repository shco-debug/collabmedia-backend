var group = require('../../../controllers/groupController.js');
module.exports = function(router){
	//console.log("in groupRoutes.js",router);
	
	router.get('/',function(req,res){
		group.getAll(req,res);
	});
	
	router.post('/',function(req,res){
		group.getAllPaginated(req,res);
	});
	
	router.post('/removeGroup',function(req,res){
		group.removeGroup(req,res);
	});
	
    router.post('/addGroup',function(req,res){
		group.addGroup(req,res);
	});
	router.post('/updateGroup',function(req,res){
		group.updateGroup(req,res);
	});
	router.post('/addMember',function(req,res){
		group.addMember(req,res);
	});
	router.post('/current',function(req,res){
		group.current(req,res);
	});
	router.post('/removeMember',function(req,res){
		group.removeMember(req,res);
	});
	router.post('/iconUpload',function(req,res){
		group.iconUpload(req,res);
	});
}