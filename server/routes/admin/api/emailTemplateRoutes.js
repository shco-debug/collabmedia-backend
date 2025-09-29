var emailTemplate = require('../../../controllers/emailTemplateController.js');
module.exports = function(router){
	
        router.get('/view', function(req,res){
		emailTemplate.findAll(req,res);
	})
	router.post('/add', function(req,res){
            console.log("-----Inside Email Template Routes -------",req.body);
		emailTemplate.add(req,res);
	})
        router.post('/edit', function(req,res){
		emailTemplate.edit(req,res);
	})
}