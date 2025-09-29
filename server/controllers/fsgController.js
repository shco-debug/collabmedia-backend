const fsg = require('./../models/fsgModel.js');
const formidable = require('formidable');

// To fetch all domains
const findAll = async (req, res) => {
    try {
        const result = await fsg.find({ status: 1, isDeleted: { $ne: 1 } })
            .sort({ order: 'asc' })
            .exec();
        
        if (result.length === 0) {
            return res.json({ "code": "404", "msg": "Not Found" });
        } else {
            return res.json({ "code": "200", "msg": "Success", "response": result });
        }
    } catch (err) {
        return res.json(err);
    }
};

exports.findAll = findAll;

// Helper function to validate and clean values
const validateAndCleanValues = (valuesString) => {
    if (!valuesString || typeof valuesString !== 'string') {
        return [];
    }
    
    const values = valuesString.split(';');
    const cleanedValues = [];
    
    for (const value of values) {
        const trimmedValue = value.trim();
        // Only add non-empty values that don't look like JavaScript functions
        if (trimmedValue && 
            !trimmedValue.startsWith('function') && 
            !trimmedValue.includes('=>') &&
            !trimmedValue.includes('var ') &&
            !trimmedValue.includes('let ') &&
            !trimmedValue.includes('const ') &&
            trimmedValue.length < 1000) { // Reasonable length limit
            cleanedValues.push(trimmedValue);
        }
    }
    
    return cleanedValues;
};

// Add a new domain
const add = async (req, res) => {
    try {
        const fields = {
            Title: req.body.name,
            Values: [],
            status: 1
        };
        
        const cleanedValues = validateAndCleanValues(req.body.values);
        
        if (cleanedValues.length === 0) {
            return res.json({ "code": "400", "msg": "No valid values provided" });
        }
        
        for (const value of cleanedValues) {
            fields.Values.push({
                valueTitle: value
            });
        }
        
        await fsg(fields).save();
        await findAll(req, res);
    } catch (err) {
        return res.json(err);
    }
};

exports.add = add;

const edit = async (req, res) => {
    try {
        const dt = Date.now();
        const fields = {
            LastModified: dt,
            Title: req.body.name,
            Values: [],
            status: 1
        };
        
        const cleanedValues = validateAndCleanValues(req.body.values);
        
        if (cleanedValues.length === 0) {
            return res.json({ "code": "400", "msg": "No valid values provided" });
        }
        
        for (const value of cleanedValues) {
            fields.Values.push({
                valueTitle: value
            });
        }

        const query = { _id: req.body.id };
        const options = { multi: true };
        
        await fsg.updateOne(query, { $set: fields }, options);
        await findAll(req, res);
    } catch (err) {
        return res.json(err);
    }
};

exports.edit = edit;

const deleteOne = async (req, res) => {
    try {
        const fields = {
            isDeleted: 1
        };
        const query = { _id: req.body.id };
        const options = { multi: false };
        
        await fsg.updateOne(query, { $set: fields }, options);
        await findAll(req, res);
    } catch (err) {
        return res.json(err);
    }
};

exports.deleteOne = deleteOne;