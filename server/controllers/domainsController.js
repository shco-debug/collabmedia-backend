const domain = require('./../models/domainModel.js');
const formidable = require('formidable');

// To fetch all domains
const findAll = async function(req, res) {
    try {
        const result = await domain.find({status: 1, isDeleted: {$ne: 1}}).exec();
        
        if (result.length === 0) {
            return res.json({"code": "404", "msg": "Not Found"});
        } else {
            return res.json({"code": "200", "msg": "Success", "response": result});
        }
    } catch (err) {
        console.error('Error in findAll:', err);
        return res.status(500).json({"code": "500", "msg": "Internal server error", "error": err.message});
    }
};

exports.findAll = findAll;

// Add a new domain
const add = async function(req, res) {
    try {
        const fields = {
            DomainTitle: req.body.name,
            Notes: req.body.notes,
            status: 1
        };
        
        const newDomain = new domain(fields);
        await newDomain.save();
        
        // Return the newly created domain
        return res.json({
            "code": "200", 
            "msg": "Domain added successfully", 
            "response": newDomain
        });
    } catch (err) {
        console.error('Error in add:', err);
        return res.status(500).json({"code": "500", "msg": "Internal server error", "error": err.message});
    }
};

exports.add = add;

// Edit domain
const edit = async function(req, res) {
    try {
        const dt = Date.now();
        
        const fields = {
            LastModified: dt,
            DomainTitle: req.body.name,
            Notes: req.body.notes,
            status: 1
        };
        
        const query = {_id: req.body.id};
        const options = { multi: true };
        
        const result = await domain.updateMany(query, { $set: fields}, options).exec();
        
        if (result.modifiedCount > 0) {
            // Fetch updated domains
            await findAll(req, res);
        } else {
            return res.json({"code": "404", "msg": "Domain not found or no changes made"});
        }
    } catch (err) {
        console.error('Error in edit:', err);
        return res.status(500).json({"code": "500", "msg": "Internal server error", "error": err.message});
    }
};

exports.edit = edit;

// Upload file
const uploadfile = function(req, res) {
    const form = new formidable.IncomingForm();
    
    form.parse(req, function(err, fields, files) {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).json({"code": "500", "msg": "Error parsing form", "error": err.message});
        }
        
        console.log('Files:', files);
        res.send("File upload processed");
    });
};

exports.uploadfile = uploadfile;

// Delete domain
const deleteOne = async function(req, res) {
    try {
        console.log("Request params:", JSON.stringify(req.body));
        
        const fields = {
            isDeleted: 1
        };
        
        const query = {_id: req.body.id};
        console.log("ID to delete:", req.body.id);
        
        const options = { multi: false };
        const result = await domain.updateMany(query, { $set: fields}, options).exec();
        
        if (result.modifiedCount > 0) {
            // Fetch updated domains
            await findAll(req, res);
        } else {
            return res.json({"code": "404", "msg": "Domain not found or already deleted"});
        }
    } catch (err) {
        console.error('Error in deleteOne:', err);
        return res.status(500).json({"code": "500", "msg": "Internal server error", "error": err.message});
    }
};

exports.deleteOne = deleteOne;