const metaMetaTags = require('./../models/metaMetaTagsModel.js');
const groupTags = require('./../models/groupTagsModel.js');
const mongoose = require("mongoose");

// Find all meta tags
const findAll = async (req, res) => {
    try {
        const result = await metaMetaTags.find({ status: 1 }).exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
    } catch (error) {
        console.error('Find all meta tags error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findAll = findAll;

// Find all meta meta tags of particular domain
const findDomainAll = async (req, res) => {
    try {
        const result = await metaMetaTags.find({ 
            status: 1, 
            "Domains.DomainId": req.body.domainid 
        }).populate('DomainTitle').exec();
        
        console.log(result);
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
    } catch (error) {
        console.error('Find domain all error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findDomainAll = findDomainAll;

// Check if meta meta tag exists - converted to async/await
const chkMmt = async (title) => {
    try {
        const result = await metaMetaTags.find({ status: 1, MetaMetaTagTitle: title }).exec();
        return result;
    } catch (error) {
        console.error('Check MMT error:', error);
        return [];
    }
};

// Check if meta tag exists - converted to async/await
const chkMt = async (req) => {
    try {
        const result = await metaMetaTags.find({ status: 1 }).exec();
        let mts = [];
        let dup = false;
        
        for (let a in result) {
            for (let b in result[a].MetaTags) {
                if (result[a].MetaTags[b].MetaTagTitle === req.body.name) {
                    if (req.body.metaid) {
                        if (req.body.metaid === result[a].MetaTags[b]._id) {
                            // Same ID, no duplicate
                        } else {
                            dup = true;
                        }
                    } else {
                        dup = true;
                    }
                }
            }
        }
        return dup;
    } catch (error) {
        console.error('Check MT error:', error);
        return false;
    }
};

// Add new meta meta tag - converted to async/await
const add = async (req, res) => {
    try {
        // Check if meta meta tag already exists
        const existingTags = await chkMmt(req.body.name);
        
        if (existingTags.length !== 0) {
            return res.status(400).json({ code: "400", msg: "Meta meta tag already exists" });
        }
        
        let fields = {
            MetaMetaTagTitle: req.body.name,
            Notes: req.body.notes,
            DateAdded: Date.now(),
            status: 1
        };
        
        if (typeof req.body.domainid !== 'undefined') {
            fields.Domains = [{
                DomainTitle: req.body.title,
                DomainId: req.body.domainid
            }];
        }
        
        const newMetaMetaTag = new metaMetaTags(fields);
        await newMetaMetaTag.save();
        
        // Return only the newly created meta meta tag
        res.json({ 
            code: "200", 
            msg: "Meta meta tag created successfully", 
            response: newMetaMetaTag 
        });
        
    } catch (error) {
        console.error('Add meta meta tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.add = add;

// Edit meta meta tag - converted to async/await
const edit = async (req, res) => {
    try {
        const data = await metaMetaTags.findOne({ _id: req.body.id, status: 1 }).exec();
        
        if (!data) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }
        
        // Check if name is being changed and if new name already exists
        if (data.MetaMetaTagTitle !== req.body.name) {
            const existingTags = await chkMmt(req.body.name);
            
            if (existingTags.length !== 0) {
                return res.status(400).json({ code: "400", msg: "Meta meta tag name already exists" });
            }
        }
        
        // Update only the fields that should change
        const updateFields = {
            MetaMetaTagTitle: req.body.name,
            Notes: req.body.notes,
            LastModified: Date.now()
        };
        
        const query = { _id: req.body.id };
        const result = await metaMetaTags.updateOne(query, { $set: updateFields }).exec();
        
        if (result.modifiedCount === 0) {
            return res.status(400).json({ code: "400", msg: "No changes made or meta meta tag not found" });
        }
        
        // Return only the updated meta meta tag
        const updatedData = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        res.json({ 
            code: "200", 
            msg: "Meta meta tag updated successfully", 
            response: updatedData 
        });
        
    } catch (error) {
        console.error('Edit meta meta tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.edit = edit;

// Add domain to meta meta tag - converted to async/await
const addDomain = async (req, res) => {
    try {
        const fields = {
            DomainTitle: req.body.title,
            DomainId: req.body.domainid
        };
        
        console.log(req.body.id);
        
        const result = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }
        
        const query = { _id: req.body.id };
        const updateResult = await metaMetaTags.updateOne(query, { $push: { Domains: fields } }).exec();
        
        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({ code: "400", msg: "Failed to add domain" });
        }
        
        // Return the updated meta meta tag
        const updatedData = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        res.json({ 
            code: "200", 
            msg: "Domain added successfully", 
            response: updatedData 
        });
        
    } catch (error) {
        console.error('Add domain error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.addDomain = addDomain;

// Add multiple domains to meta meta tag - converted to async/await
const addDomains = async (req, res) => {
    try {
        const result = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }
        
        const domains = req.body.domains || [];
        const query = { _id: req.body.id };
        
        const updateResult = await metaMetaTags.updateOne(query, { $push: { Domains: { $each: domains } } }).exec();
        
        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({ code: "400", msg: "Failed to add domains" });
        }
        
        // Return the updated meta meta tag
        const updatedData = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        res.json({ 
            code: "200", 
            msg: "Domains added successfully", 
            response: updatedData 
        });
        
    } catch (error) {
        console.error('Add domains error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.addDomains = addDomains;

// Delete meta meta tag - converted to async/await
const deleteOne = async (req, res) => {
    try {
        const result = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }
        
        const query = { _id: req.body.id };
        const updateResult = await metaMetaTags.updateOne(query, { $set: { status: 0 } }).exec();
        
        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({ code: "400", msg: "Failed to delete meta meta tag" });
        }
        
        res.json({ 
            code: "200", 
            msg: "Meta meta tag deleted successfully", 
            response: { _id: req.body.id, status: 0 }
        });
        
    } catch (error) {
        console.error('Delete meta meta tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.deleteOne = deleteOne;

// Find meta meta tag by ID - converted to async/await
const findById = async (req, res) => {
    try {
        const result = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
        
    } catch (error) {
        console.error('Find by ID error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findById = findById;

// Find all meta meta tags with meta tags - converted to async/await
const findAllWithMetaTags = async (req, res) => {
    try {
        const result = await metaMetaTags.find({ status: 1 }).exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
        
    } catch (error) {
        console.error('Find all with meta tags error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findAllWithMetaTags = findAllWithMetaTags;

// Find meta meta tags by domain - converted to async/await
const findByDomain = async (req, res) => {
    try {
        const fields = {
            status: 1,
            "Domains.DomainId": req.body.domainid
        };
        
        const result = await metaMetaTags.find(fields).exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
        
    } catch (error) {
        console.error('Find by domain error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findByDomain = findByDomain;

// Update meta meta tag - converted to async/await
const update = async (req, res) => {
    try {
        const result = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }
        
        const fields = {
            MetaMetaTagTitle: req.body.title,
            Notes: req.body.notes,
            LastModified: Date.now()
        };
        
        const query = { _id: req.body.id };
        const updateResult = await metaMetaTags.updateOne(query, { $set: fields }).exec();
        
        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({ code: "400", msg: "No changes made or meta meta tag not found" });
        }
        
        // Return the updated meta meta tag
        const updatedData = await metaMetaTags.findOne({ _id: req.body.id }).exec();
        
        res.json({ 
            code: "200", 
            msg: "Meta meta tag updated successfully", 
            response: updatedData 
        });
        
    } catch (error) {
        console.error('Update meta meta tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.update = update;

// Add new meta tag to a meta meta tag
const addMeta = async (req, res) => {
    try {
        if (!req.body.mmt || !req.body.MetaTagTitle) {
            return res.status(400).json({ code: "400", msg: "Meta meta tag ID and meta tag title are required" });
        }

        const metaTagData = {
            MetaTagTitle: req.body.MetaTagTitle,
            Notes: req.body.MetaTagDescription || "",
            DateAdded: Date.now(),
            LastModified: Date.now(),
            status: 1,
            IsAllowedForIdeas: req.body.IsAllowedForIdeas || false,
            Order: req.body.Order || 1000
        };

        const result = await metaMetaTags.findOne({ _id: req.body.mmt, status: 1 }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }

        // Check if meta tag already exists
        const existingMetaTag = result.MetaTags.find(tag => 
            tag.MetaTagTitle === req.body.MetaTagTitle && tag.status === 1
        );
        
        if (existingMetaTag) {
            return res.status(400).json({ code: "400", msg: "Meta tag already exists in this meta meta tag" });
        }

        await metaMetaTags.updateOne(
            { _id: req.body.mmt },
            { $push: { MetaTags: metaTagData } }
        ).exec();

        res.json({ code: "200", msg: "Meta tag added successfully" });

    } catch (error) {
        console.error('Add meta tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.addMeta = addMeta;

// Edit existing meta tag within a meta meta tag
const editMeta = async (req, res) => {
    try {
        if (!req.body.mmt || !req.body.metaTagId || !req.body.MetaTagTitle) {
            return res.status(400).json({ code: "400", msg: "Meta meta tag ID, meta tag ID, and title are required" });
        }

        const result = await metaMetaTags.findOne({ _id: req.body.mmt, status: 1 }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }

        // Check if meta tag exists
        const metaTagIndex = result.MetaTags.findIndex(tag => 
            tag._id.toString() === req.body.metaTagId && tag.status === 1
        );
        
        if (metaTagIndex === -1) {
            return res.status(404).json({ code: "404", msg: "Meta tag not found" });
        }

        // Check if new title conflicts with existing meta tag
        const titleConflict = result.MetaTags.find(tag => 
            tag._id.toString() !== req.body.metaTagId && 
            tag.MetaTagTitle === req.body.MetaTagTitle && 
            tag.status === 1
        );
        
        if (titleConflict) {
            return res.status(400).json({ code: "400", msg: "Meta tag title already exists in this meta meta tag" });
        }

        const updateData = {
            [`MetaTags.${metaTagIndex}.MetaTagTitle`]: req.body.MetaTagTitle,
            [`MetaTags.${metaTagIndex}.Notes`]: req.body.MetaTagDescription || "",
            [`MetaTags.${metaTagIndex}.LastModified`]: Date.now(),
            [`MetaTags.${metaTagIndex}.IsAllowedForIdeas`]: req.body.IsAllowedForIdeas || false,
            [`MetaTags.${metaTagIndex}.Order`]: req.body.Order || 1000
        };

        await metaMetaTags.updateOne(
            { _id: req.body.mmt },
            { $set: updateData }
        ).exec();

        res.json({ code: "200", msg: "Meta tag updated successfully" });

    } catch (error) {
        console.error('Edit meta tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.editMeta = editMeta;

// Delete meta tag from a meta meta tag (soft delete)
const deleteMeta = async (req, res) => {
    try {
        if (!req.body.mmt || !req.body.metaTagId) {
            return res.status(400).json({ code: "400", msg: "Meta meta tag ID and meta tag ID are required" });
        }

        const result = await metaMetaTags.findOne({ _id: req.body.mmt, status: 1 }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }

        // Check if meta tag exists
        const metaTagIndex = result.MetaTags.findIndex(tag => 
            tag._id.toString() === req.body.metaTagId && tag.status === 1
        );
        
        if (metaTagIndex === -1) {
            return res.status(404).json({ code: "404", msg: "Meta tag not found" });
        }

        await metaMetaTags.updateOne(
            { _id: req.body.mmt },
            { $set: { [`MetaTags.${metaTagIndex}.status`]: 0 } }
        ).exec();

        res.json({ code: "200", msg: "Meta tag deleted successfully" });

    } catch (error) {
        console.error('Delete meta tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.deleteMeta = deleteMeta;

// Find meta tags by meta meta tag ID
const findMeta = async (req, res) => {
    try {
        if (!req.body.mmt) {
            return res.status(400).json({ code: "400", msg: "Meta meta tag ID is required" });
        }

        const result = await metaMetaTags.findOne({ _id: req.body.mmt, status: 1 }).exec();
        
        if (!result) {
            return res.status(404).json({ code: "404", msg: "Meta meta tag not found" });
        }

        // Filter only active meta tags
        const activeMetaTags = result.MetaTags.filter(tag => tag.status === 1);
        
        if (activeMetaTags.length === 0) {
            return res.status(404).json({ code: "404", msg: "No active meta tags found" });
        }

        res.json({ 
            code: "200", 
            msg: "Success", 
            response: {
                metaMetaTag: {
                    _id: result._id,
                    MetaMetaTagTitle: result.MetaMetaTagTitle,
                    Notes: result.Notes
                },
                metaTags: activeMetaTags
            }
        });

    } catch (error) {
        console.error('Find meta tags error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findMeta = findMeta;