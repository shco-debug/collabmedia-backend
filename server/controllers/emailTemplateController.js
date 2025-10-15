var emailTemplate = require('./../models/emailTemplateModel.js');


// To fetch all domains
var findAll = async function(req, res){    
    try {
        const result = await emailTemplate.find({}).exec();
        if(result.length==0){
            res.json({"code":"404","msg":"Not Found"})
        }
        else{				
            res.json({"code":"200","msg":"Success","response":result})
        }
    } catch(err) {
        res.json(err);
    }
};
exports.findAll = findAll;


// Add a new Email Template
var add = async function(req,res){
    try {
        var data = {
          name:req.body.name ? req.body.name : '',
          constants:req.body.constants ? req.body.constants : '',
          subject:req.body.subject ? req.body.subject : '',
          description:req.body.description ? req.body.description : '',
        };
        
        await emailTemplate(data).save();
        findAll(req,res);
    } catch(err) {
        res.json(err);
    }
};
exports.add = add;


// Edit Email Template
var edit = async function(req,res){	
    try {
        var fields = {
            name:req.body.name ? req.body.name : '',
            constants:req.body.constants ? req.body.constants : '',
            subject:req.body.subject ? req.body.subject : '',
            description:req.body.description ? req.body.description : '',
        };
        
        var query={_id:req.body.id};
        await emailTemplate.updateOne(query, { $set: fields}).exec();
        findAll(req,res);
    } catch(err) {
        res.json(err);
    }
};
exports.edit = edit;
