var domains = require('../../../controllers/domainsController.js');
module.exports = function(router){
	 
	
	router.get('/view', function(req,res){
		domains.findAll(req,res);
	})
	router.post('/add', function(req,res){
		domains.add(req,res);
	})
	router.post('/edit', function(req,res){
		domains.edit(req,res);
	})
	router.post('/delete', function(req,res){
		domains.deleteOne(req,res);
	})
}