var project = require('../../../controllers/projectController.js');
module.exports = function(router){
	 
	
	router.get('/',function(req,res){
		project.findAll(req,res);
	});
	
	router.post('/add',function(req,res){
		project.add(req,res);
	});
	
	router.post('/edit',function(req,res){
		project.edit(req,res);
	});
	
	router.post('/delete',function(req,res){
		project.deleteOne(req,res);
	});
}