var metaMetaTags = require('../../../controllers/metaMetaTagsController.js');
module.exports = function(router){
	 
	
	router.get('/view', function(req,res){
		metaMetaTags.findAll(req,res);
	})
	router.post('/view', function(req,res){
		metaMetaTags.findDomainAll(req,res);
	})
	router.post('/add', function(req,res){
		metaMetaTags.add(req,res);
	})
	router.post('/edit', function(req,res){
		metaMetaTags.edit(req,res);
	})
	router.post('/delete', function(req,res){
		metaMetaTags.deleteOne(req,res);
	})
	router.post('/addDomain', function(req,res){
		metaMetaTags.addDomain(req,res);
	})
	router.post('/addDomains', function(req,res){
		metaMetaTags.addDomains(req,res);
	})
}