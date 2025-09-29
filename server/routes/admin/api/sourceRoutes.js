var sources = require('../../../controllers/sourcesController.js');
module.exports = function(router){
	 
	
	router.get('/view', function(req,res){
		sources.findAll(req,res);
	})
	router.post('/add', function(req,res){
		sources.add(req,res);
	})
	router.post('/edit', function(req,res){
		sources.edit(req,res);
	})
	router.post('/delete', function(req,res){
		sources.deleteOne(req,res);
	})
}