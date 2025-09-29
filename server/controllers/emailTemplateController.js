var emailTemplate = require('./../models/emailTemplateModel.js');


// To fetch all domains
var findAll = function(req, res){    
    emailTemplate.find({},function(err,result){
        if(err){ 		
                res.json(err);
        }
        else{
            if(result.length==0){
                res.json({"code":"404","msg":"Not Found"})
            }
            else{				
                res.json({"code":"200","msg":"Success","response":result})
            }
        }
    })
};
exports.findAll = findAll;


// Add a new Email Template
var add = function(req,res){
    var data = {
      name:req.body.name ? req.body.name : '',
      constants:req.body.constants ? req.body.constants : '',
	  subject:req.body.subject ? req.body.subject : '',
      description:req.body.description ? req.body.description : '',
    };
	
    emailTemplate(data).save(function(err,result){
      if(err){
          res.json(err)
      }
      else{
          findAll(req,res)
      }
    });
};
exports.add = add;


// Edit Email Template
var edit = function(req,res){	
    var fields = {
		name:req.body.name ? req.body.name : '',
		constants:req.body.constants ? req.body.constants : '',
		subject:req.body.subject ? req.body.subject : '',
		description:req.body.description ? req.body.description : '',
    };
	
    var query={_id:req.body.id};
    var options = { multi: true };
    emailTemplate.update(query, { $set: fields}, options, callback)
    function callback (err, numAffected) {
        if(err){
            res.json(err)
        }
        else{
            findAll(req,res)
        }
    } 
};
exports.edit = edit;
