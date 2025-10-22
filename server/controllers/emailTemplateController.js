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


// Delete Email Template
var deleteTemplate = async function(req, res) {
    try {
        const templateId = req.body.id || req.body._id;
        
        if (!templateId) {
            return res.status(400).json({
                "code": "400",
                "msg": "Template ID is required"
            });
        }

        const query = { _id: templateId };
        const result = await emailTemplate.deleteOne(query).exec();
        
        if (result.deletedCount > 0) {
            res.json({
                "code": "200",
                "msg": "Template deleted successfully"
            });
        } else {
            res.status(404).json({
                "code": "404",
                "msg": "Template not found"
            });
        }
    } catch (err) {
        console.error('Error deleting email template:', err);
        res.status(500).json({
            "code": "500",
            "msg": "Internal server error",
            "error": err.message
        });
    }
};
exports.deleteTemplate = deleteTemplate;