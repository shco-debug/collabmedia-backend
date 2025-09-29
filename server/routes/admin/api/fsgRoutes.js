var fsg = require('../../../controllers/fsgController.js');
module.exports = function(router){
	 
	
	router.get('/view', function(req,res){
		fsg.findAll(req,res);
	})
	router.post('/add', function(req,res){
		fsg.add(req,res);
	})
	router.post('/edit', function(req,res){
		fsg.edit(req,res);
	})
	router.post('/delete', function(req,res){
		fsg.deleteOne(req,res);
	})
}