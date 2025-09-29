var contribution = require('../../../controllers/contributionController.js');
module.exports = function(router){
	 
	
	router.get('/view', function(req,res){
		contribution.findAll(req,res);
	})
	router.post('/add', function(req,res){
		contribution.add(req,res);
	})
	router.post('/edit', function(req,res){
		contribution.edit(req,res);
	})
}