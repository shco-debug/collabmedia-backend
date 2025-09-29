var collections = require('../../../controllers/collectionsController.js');
module.exports = function(router){
	 
	
	router.get('/view', function(req,res){
		collections.findAll(req,res);
	})
	router.post('/add', function(req,res){
		collections.add(req,res);
	})
	router.post('/edit', function(req,res){
		collections.edit(req,res);
	})
	router.post('/delete', function(req,res){
		collections.deleteOne(req,res);
	})
}