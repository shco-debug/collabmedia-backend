const groupTags = require('./../models/groupTagsModel.js');
const media = require('./../models/mediaModel.js');
const User = require('./../models/userModel.js');
const mongoose = require('mongoose');
const async_lib = require('async');
const ObjectId = mongoose.Types.ObjectId;
const ObjectID = require('mongodb').ObjectID;
// Find all group tags
const findAll = async (req, res) => {
    try {
        const result = await groupTags.find({ $or: [{ status: 1 }, { status: 3 }] }).populate('MetaMetaTagID').exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
        
    } catch (error) {
        console.error('Find all group tags error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findAll = findAll;


// Smooth-Media Manager - Find all group tags of a mt
const findAllGtOfMt = async (req, res) => {
    try {
        const MetaMetaTag = req.query.mmt || "";
        const MetaTag = req.query.mt || "";

        const conditions = {
            MetaMetaTagID: MetaMetaTag,
            MetaTagID: MetaTag,
            $or: [{ status: 1 }, { status: 3 }]
        };

        const result = await groupTags.find(conditions).populate('MetaMetaTagID').exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
        
    } catch (error) {
        console.error('Find all GT of MT error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findAllGtOfMt = findAllGtOfMt;

// Find all group tags without descriptors - converted to async/await
const withoutDescriptors = async (req, res) => {
    try {
        const result = await groupTags.find({ $or: [{ status: 1 }, { status: 3 }] }).exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
        
    } catch (error) {
        console.error('Without descriptors error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.withoutDescriptors = withoutDescriptors;

// find all user defined group tags ---parul


const findAllUserGt = async (req, res) => {
    try {
        const result = await groupTags.find({ status: 2 }).populate('MetaMetaTagID').exec();
        
        if (result.length === 0) {
            return res.json({ "code": "404", "msg": "Not Found" });
        } else {
            return res.json({ "code": "200", "msg": "Success", "response": result });
        }
    } catch (error) {
        console.error('Find all user GT error:', error);
        return res.status(500).json({ "code": "500", "msg": "Internal server error", "error": error.message });
    }
};

exports.findAllUserGt = findAllUserGt;


// Find group tag by ID - converted to async/await
const findById = async (req, res) => {
    try {
        const result = await groupTags.find({ _id: req.body.id }).exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
        
    } catch (error) {
        console.error('Find by ID error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findById = findById;


// Find all group tags by meta tag ID - converted to async/await
const findMTAll = async (req, res) => {
    try {
        const result = await groupTags.find({ MetaTagID: req.body.mt }).exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "Not Found" });
        }
        
        res.json({ code: "200", msg: "Success", response: result });
        
    } catch (error) {
        console.error('Find MT all error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findMTAll = findMTAll;

// Find all group tag bindings - converted to async/await
const findAllBinding = async (req, res) => {
    try {
        // Check if groupTagId is provided to filter by specific group tag
        if (req.body.groupTagId) {
            const groupTag = await groupTags.findOne({ 
                _id: req.body.groupTagId, 
                $or: [{ status: 1 }, { status: 3 }] 
            }).exec();
            
            if (!groupTag) {
                return res.status(404).json({ code: "404", msg: "Group tag not found" });
            }
            
            // Return the tags (bindings) within this group tag
            return res.json({ 
                code: "200", 
                msg: "Success", 
                response: groupTag.Tags || [] 
            });
        }
        
        // If no groupTagId provided, return all group tags with their tags
        const result = await groupTags.find({ 
            $or: [{ status: 1 }, { status: 3 }] 
        }).exec();
        
        if (result.length === 0) {
            return res.status(404).json({ code: "404", msg: "No group tags found" });
        }
        
        // Extract tags from all group tags
        const allBindings = result.reduce((acc, groupTag) => {
            if (groupTag.Tags && groupTag.Tags.length > 0) {
                acc.push(...groupTag.Tags.map(tag => ({
                    ...tag.toObject(),
                    groupTagId: groupTag._id,
                    groupTagTitle: groupTag.GroupTagTitle
                })));
            }
            return acc;
        }, []);
        
        res.json({ code: "200", msg: "Success", response: allBindings });
        
    } catch (error) {
        console.error('Find all binding error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.findAllBinding = findAllBinding;





// Delete group tag - converted to async/await
const deleteOne = async (req, res) => {
    try {
        const fields = { status: 0 };
        const query = { _id: req.body.id };
        
        if (req.body.status === 2) {
            await groupTags.updateOne(query, { $set: fields }).exec();
            await findAllUserGt(req, res);
        } else {
            await groupTags.updateOne(query, { $set: fields }).exec();
            await findAll(req, res);
        }
        
    } catch (error) {
        console.error('Delete one error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.deleteOne = deleteOne;

// Check if group tag exists - converted to async/await
const chkGt = async (title) => {
    if (!title) return [];
    
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return [];
    
    try {
        const result = await groupTags.find({
            $or: [{ status: 1 }, { status: 3 }],
            GroupTagTitle: { $regex: new RegExp("^" + trimmedTitle + "$", "i") }
        }).exec();
        
        return result;
    } catch (error) {
        console.error('Check GT error:', error);
        return [];
    }
};

// Check if tag exists - converted to async/await
const chkTag = async (title, selectedGT) => {
    if (!title || !selectedGT) return [];
    
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return [];
    
    try {
        const result = await groupTags.find({
            _id: selectedGT,
            $or: [{ status: 1 }, { status: 3 }],
            "Tags.TagTitle": { $regex: new RegExp("^" + trimmedTitle + "$", "i") }
        }).exec();
        
        return result;
    } catch (error) {
        console.error('Check tag error:', error);
        return [];
    }
};

// Add new group tag - converted to async/await
const add = async (req, res) => {
    try {
        if (!req.body.name || req.body.name.trim() === "") {
            return res.status(400).json({ code: "400", msg: "Name is required" });
        }

        const name = req.body.name.trim();
        
        // Check if group tag already exists
        const existingTags = await groupTags.find({ 
            GroupTagTitle: name,
            $or: [{ status: 1 }, { status: 3 }]
        }).exec();

        if (existingTags.length > 0) {
            return res.status(400).json({ code: "400", msg: "Group tag already exists" });
        }

        // Create new group tag
        const fields = {
            GroupTagTitle: name,
            Notes: req.body.notes || "",
            DateAdded: Date.now(),
            MetaMetaTagID: req.body.mmt || null,
            MetaTagID: req.body.mt || null,
            status: 1
        };

        // Custom descriptor check
        if (String(req.body.mmt) === "54c98aab4fde7f30079fdd5a") {
            fields.status = 3;
        }

        const newGroupTag = new groupTags(fields);
        const savedGroupTag = await newGroupTag.save();

        // Add tag with same name
        if (savedGroupTag) {
            await groupTags.updateOne(
                { _id: savedGroupTag._id },
                { 
                    $push: { 
                        Tags: {
                            TagTitle: name,
                            status: 1
                        }
                    }
                }
            ).exec();
        }

        res.json({ code: "200", response: "gt saved" });

    } catch (error) {
        console.error('Add group tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.add = add;

// Edit group tag - converted to async/await
const edit = async (req, res) => {
    try {
        if (!req.body.name || req.body.name.trim() === "") {
            return res.status(400).json({ code: "400", msg: "Name is required" });
        }

        const name = req.body.name.trim();
        
        const data = await groupTags.find({ _id: req.body.id }).exec();
        
        if (data.length === 0) {
            return res.status(404).json({ code: "404", msg: "Group tag not found" });
        }

        if (data[0].GroupTagTitle.trim() === name) {
            // Same name, just update
            const fields = {
                GroupTagTitle: name,
                Notes: req.body.notes || "",
                MetaMetaTagID: req.body.mmt || null,
                MetaTagID: req.body.mt || null,
                status: 1
            };

            if (String(req.body.mmt) === "54c98aab4fde7f30079fdd5a") {
                fields.status = 3;
            }

            const query = { _id: req.body.id };
            await groupTags.updateOne(query, { $set: fields }).exec();
            
            await findAll(req, res);
        } else {
            // Different name, check for duplicates
            const existingTags = await chkGt(name);
            
            if (existingTags.length !== 0) {
                return res.status(400).json({ code: "400", msg: "Group tag name already exists" });
            }

            const fields = {
                GroupTagTitle: name,
                Notes: req.body.notes || "",
                MetaMetaTagID: req.body.mmt || null,
                MetaTagID: req.body.mt || null,
                status: 1
            };

            if (String(req.body.mmt) === "54c98aab4fde7f30079fdd5a") {
                fields.status = 3;
            }

            const query = { _id: req.body.id };
            await groupTags.updateOne(query, { $set: fields }).exec();
            
            await findAll(req, res);
        }
        
    } catch (error) {
        console.error('Edit group tag error:', error);
        res.status(500).json({ code: "500", msg: "Internal server error" });
    }
};

exports.edit = edit;

// approve group tag---parul

var approve = function(req,res){
	if(req.body.name){
		req.body.name = req.body.name ? req.body.name.trim() : "";	//added by manishp on 09032016
	}

	if(req.body.name != ""){
		chkGt(req.body.name,function(response){
			if (response.length!=0){
				res.json({"code":"400"});
			}else{
				req.body.mmt = req.body.mmt ? req.body.mmt : null;
				var fields = {
					GroupTagTitle : req.body.name ? req.body.name : null,
					Notes : req.body.notes ? req.body.notes : null,
					MetaMetaTagID : req.body.mmt ? req.body.mmt : null,
					MetaTagID : req.body.mt ? req.body.mt : null,
					status : 1
				};

				if(String(req.body.mmt) == "54c98aab4fde7f30079fdd5a"){
					fields.status = 3;
				}

				req.body.id = req.body.id ? req.body.id : null;
				if( req.body.id ) {
					var query = {_id:req.body.id};
					var options = { multi: true };
					groupTags.update(query, { $set: fields}, options,function(err, numAffected){
						if(err){
							res.json(err)
						}
						else{
							groupTags.findOne({_id:req.body.id},function(err,gtData){
								if(!err){
									/*
									gtData.Tags.push({
										TagTitle : req.body.name,
										status : 1
									});
									*/
									gtData.Tags = {
										TagTitle : req.body.name,
										status : 1
									};
									gtData.save();
								}
							});
							findAllUserGt(req,res)
						}
					});
				}
				else{
					res.json({"code":"400"});
				}
			}
		});
	}else{
		res.json({"code":"400"});
	}
};
var approve_v2 = function(req,res){
	var selectedGT = req.body.selectedGt ? req.body.selectedGt : null;
	var oldUserSuggestedGt = req.body.id ? req.body.id : null;

	if(req.body.name){
		req.body.name = req.body.name ? req.body.name.trim() : "";	//added by manishp on 09032016
	}

	if(req.body.name != ""){
		if(!selectedGT){
			chkGt(req.body.name,function(response){
				if (response.length!=0){
					res.json({"code":"400"});
				}else{
					req.body.mmt = req.body.mmt ? req.body.mmt : null;
					var fields = {
						GroupTagTitle : req.body.name ? req.body.name : null,
						Notes : req.body.notes ? req.body.notes : null,
						MetaMetaTagID : req.body.mmt ? req.body.mmt : null,
						MetaTagID : req.body.mt ? req.body.mt : null,
						status : 1
					};

					if(String(req.body.mmt) == "54c98aab4fde7f30079fdd5a"){
						fields.status = 3;
					}

					req.body.id = req.body.id ? req.body.id : null;
					if( req.body.id ) {
						var query = {_id:req.body.id};
						var options = { multi: true };
						groupTags.update(query, { $set: fields}, options,function(err, numAffected){
							if(err){
								res.json(err)
							}
							else{
								groupTags.findOne({_id:req.body.id},function(err,gtData){
									if(!err){
										/*
										gtData.Tags.push({
											TagTitle : req.body.name,
											status : 1
										});
										*/
										gtData.Tags = {
											TagTitle : req.body.name,
											status : 1
										};
										gtData.save();
									}
								});
								findAllUserGt(req,res)
							}
						});
					}
					else{
						res.json({"code":"400"});
					}
				}
			});
		}
		else{
			//add as a tag
			chkTag(req.body.name, selectedGT,function(response , selectedGt2){
				if (response.length!=0){
					//replace group tag id in media collection and delete the old user suggested group tag id.
					replaceGroupTagIdInMedia(req , res, oldUserSuggestedGt , selectedGt2)
					//res.json({"code":"400"});
				}else{
					var query = {
						_id : selectedGT
					};
					var options = { multi: false };
					var fields = {
						TagTitle : req.body.name ? req.body.name : null,
						status : 1
					};

					groupTags.findOne(query, function(err,gtData){
						if(!err){
							gtData.Tags.push({
								TagTitle : req.body.name,
								status : 1
							});

							gtData.save(function(err , result){
								if(!err){
									//replace group tag id in media collection and delete the old user suggested group tag id.
									replaceGroupTagIdInMedia(req,res,oldUserSuggestedGt , selectedGt)

								}
							});
						}
					});
					findAllUserGt(req,res)
				}
			});
		}
	}else{
		res.json({"code":"400"});
	}
};

function replaceGroupTagIdInMedia(req,res,oldUserSuggestedGt , selectedGt) {
	if(oldUserSuggestedGt && selectedGt) {
		var query = {
			"GroupTags.GroupTagID" : String(oldUserSuggestedGt)
		};

		var setObj = {
			"GroupTags.$.GroupTagID" : selectedGt
		};

		var options = { multi: true };
		media.update(query, {$set : setObj}, options, function (err , result){
			if(!err){
				var query = {_id:oldUserSuggestedGt};
				var options = { multi: false };
				var fields = {
					status : 0
				}
				groupTags.update(query, { $set: fields}, options,function(err, numAffected){
					if(!err){
						console.log("userSuggestedGt has been deleted after replacement mapping...");
						findAllUserGt(req,res)
					}
				});
				console.log(result);
			}
			else{
				console.log(err);
			}
		});
	}
	else{
		findAllUserGt(req,res)
	}
}

//exports.approve = approve;
exports.approve = approve_v2;

// Add binding - converted to async/await
const addBinding = async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.groupTagId || !req.body.tagId) {
            return res.status(400).json({ 
                code: "400", 
                msg: "groupTagId and tagId are required" 
            });
        }

        // Find the group tag to add the binding to
        const groupTag = await groupTags.findOne({ 
            _id: req.body.groupTagId,
            $or: [{ status: 1 }, { status: 3 }]
        }).exec();

        if (!groupTag) {
            return res.status(404).json({ 
                code: "404", 
                msg: "Group tag not found" 
            });
        }

        // Find the tag to bind
        const tagToBind = await groupTags.findOne({
            _id: req.body.tagId,
            $or: [{ status: 1 }, { status: 3 }]
        }).exec();

        if (!tagToBind) {
            return res.status(404).json({ 
                code: "404", 
                msg: "Tag to bind not found" 
            });
        }

        // Create binding object
        const binding = {
            GroupTagName: tagToBind.GroupTagTitle,
            GroupTagId: tagToBind._id
        };

        // Add to appropriate array based on call type
        if (req.body.call === "More") {
            groupTag.More.push(binding);
        } else if (req.body.call === "Less") {
            groupTag.Less.push(binding);
        } else if (req.body.call === "Think") {
            groupTag.Think.push(binding);
        } else {
            return res.status(400).json({ 
                code: "400", 
                msg: "Invalid call type. Must be 'More', 'Less', or 'Think'" 
            });
        }

        // Save the updated group tag
        await groupTag.save();

        // Return the updated group tag
        res.json({ 
            code: "200", 
            msg: "Binding added successfully", 
            response: groupTag 
        });

    } catch (error) {
        console.error('Add binding error:', error);
        res.status(500).json({ 
            code: "500", 
            msg: "Internal server error" 
        });
    }
};

exports.addBinding = addBinding;


// Delete binding - converted to async/await
const deleteBinding = async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.id || !req.body.tagid || !req.body.call) {
            return res.status(400).json({ 
                code: "400", 
                msg: "id, tagid, and call are required" 
            });
        }

        // Find the group tag
        const groupTag = await groupTags.findOne({ 
            _id: req.body.id,
            $or: [{ status: 1 }, { status: 3 }]
        }).exec();

        if (!groupTag) {
            return res.status(404).json({ 
                code: "404", 
                msg: "Group tag not found" 
            });
        }

        let removed = false;

        // Remove from appropriate array based on call type
        if (req.body.call === "More") {
            const moreIndex = groupTag.More.findIndex(item => 
                item._id.toString() === req.body.tagid
            );
            if (moreIndex !== -1) {
                groupTag.More.splice(moreIndex, 1);
                removed = true;
            }
        } else if (req.body.call === "Less") {
            const lessIndex = groupTag.Less.findIndex(item => 
                item._id.toString() === req.body.tagid
            );
            if (lessIndex !== -1) {
                groupTag.Less.splice(lessIndex, 1);
                removed = true;
            }
        } else if (req.body.call === "Think") {
            const thinkIndex = groupTag.Think.findIndex(item => 
                item._id.toString() === req.body.tagid
            );
            if (thinkIndex !== -1) {
                groupTag.Think.splice(thinkIndex, 1);
                removed = true;
            }
        } else {
            return res.status(400).json({ 
                code: "400", 
                msg: "Invalid call type. Must be 'More', 'Less', or 'Think'" 
            });
        }

        if (!removed) {
            return res.status(404).json({ 
                code: "404", 
                msg: "Binding not found" 
            });
        }

        // Save the updated group tag
        await groupTag.save();

        // Return the updated group tag
        res.json({ 
            code: "200", 
            msg: "Binding deleted successfully", 
            response: groupTag 
        });

    } catch (error) {
        console.error('Delete binding error:', error);
        res.status(500).json({ 
            code: "500", 
            msg: "Internal server error" 
        });
    }
};

exports.deleteBinding = deleteBinding;


const findTag = async (req, res) => {
    try {
        const fields = {
            _id: req.body.id
        };

        const result = await groupTags.find(fields).exec();
        
        if (result.length === 0) {
            return res.json({"code": "404", "msg": "Not Found"});
        } else {
            return res.json({"code": "200", "msg": "Success", "response": result[0].Tags});
        }
    } catch (error) {
        console.error('Find tag error:', error);
        return res.status(500).json({"code": "500", "msg": "Internal server error", "error": error.message});
    }
};

exports.findTag = findTag

//var addTag = function(req,res){
//
//  var tags = req.body.name;
//  tags = tags.split(',');
//
//  groupTags.findOne({_id:req.body.id},function(err,result){
//  //console.log(res)
//  var gt = result;
//  for(k in tags){
//	gt.Tags.push({
//		TagTitle:tags[k],
//		status:1
//	});
//  }
//  gt.save(function(err){
//	if(err)
//	res.json(err);
//	else
//	findTag(req,res)
//  });
//  })
//
//
//};
const addTag = async (req, res) => {
    try {
        const tags = req.body.name.split(',');
        const groupTagId = req.body.id;

        const gt = await groupTags.findOne({ _id: groupTagId }).exec();
        
        if (!gt) {
            return res.status(404).json({ "code": "404", "msg": "Group tag not found" });
        }

        let gtChanged = false;
        
        for (let k = 0; k < tags.length; k++) {
            tags[k] = tags[k].trim();
            let duplicate = false;
            
            for (let j = 0; j < gt.Tags.length; j++) {
                if (gt.Tags[j].TagTitle.trim().toLowerCase() === tags[k].toLowerCase() && gt.Tags[j].status === 1) {
                    duplicate = true;
                    break;
                }
            }

            if (!duplicate) {
                gtChanged = true;
                gt.Tags.push({
                    TagTitle: tags[k],
                    status: 1
                });
            }
        }

        if (gtChanged) {
            await gt.save();
            await findTag(req, res);
        } else {
            return res.json({ 'code': '420', 'response': 'duplicate tag' });
        }
    } catch (error) {
        console.error('Add tag error:', error);
        return res.status(500).json({ "code": "500", "msg": "Internal server error", "error": error.message });
    }
};

exports.addTag = addTag;

const editTag = async (req, res) => {
    try {
        req.body.name = req.body.name ? req.body.name.trim() : "";
        const fields = {
            _id: req.body.tagid,
            TagTitle: req.body.name,
            status: 1
        };

        const gt = await groupTags.findOne({ _id: req.body.id }).exec();
        
        if (!gt) {
            return res.status(404).json({ "code": "404", "msg": "Group tag not found" });
        }

        gt.Tags.id(req.body.tagid).remove();
        gt.Tags.push(fields);
        await gt.save();
        
        await findTag(req, res);
    } catch (error) {
        console.error('Edit tag error:', error);
        return res.status(500).json({ "code": "500", "msg": "Internal server error", "error": error.message });
    }
};

exports.editTag = editTag;


const deleteTag = async (req, res) => {
    try {
        req.body.name = req.body.name ? req.body.name.trim() : "";
        const fields = {
            _id: req.body.tagid,
            TagTitle: req.body.name,
            status: 0
        };

        const gt = await groupTags.findOne({ _id: req.body.id }).exec();
        
        if (!gt) {
            return res.status(404).json({ "code": "404", "msg": "Group tag not found" });
        }

        gt.Tags.id(req.body.tagid).remove();
        gt.Tags.push(fields);
        await gt.save();
        
        await findTag(req, res);
    } catch (error) {
        console.error('Delete tag error:', error);
        return res.status(500).json({ "code": "500", "msg": "Internal server error", "error": error.message });
    }
};

exports.deleteTag = deleteTag;

// function to update status of approved tag in parent  gt---- added by --parul shukla---on ---27 November
var updateUserTag=function(req,res){
	req.body.TagTitle = req.body.TagTitle ? req.body.TagTitle.trim() : "";
    var dt=Date.now();
	var fields={
		_id:req.body._id,
		TagTitle:req.body.TagTitle,
		LastModified:dt,
		status:1
	};

	groupTags.findOne({_id:req.body.gtId},function(err,result){
		var gt = result;
		gt.Tags.id(req.body._id).remove();
		gt.Tags.push(fields);
		gt.save(function(err){
			if(err)
				res.json(err);
			else
				findAllUserTags(req,res)
		});
	})
}
exports.updateUserTag=updateUserTag;



// function to add approved tag to new system suggested gt's---- added by --parul shukla---on ---27 November
var addUserTags=function(req,res){
	req.body.TagTitle = req.body.TagTitle ? req.body.TagTitle.trim() : "";
    var fields={
		DateAdded:Date.now(),
		LastModified:Date.now(),
		TagTitle:req.body.TagTitle,
	    status:1
	};
    for (t in req.body.newGT) {
		groupTags.findOne({_id:req.body.newGT[t]._id},function(err,result){
			var gt = result;
			gt.Tags.push(fields);
			gt.save(function(err){
				if(err){
					res.json(err);
				}
				else if((t+1)==req.body.newGT.length) {
					findAllUserTags(req,res);
				}
			});
		})
    }
    findAllUserTags(req,res);
}
exports.addUserTags=addUserTags;

//edit user tag created by ---Parul Shuklla on--- 26 november
var editUserTag = function(req,res){
	req.body.TagTitle = req.body.TagTitle ? req.body.TagTitle.trim() : "";
	if(req.body.TagTitle != ""){
		var dt=Date.now();
		fields={
			_id:req.body._id,
			LastModified:dt,
			TagTitle:req.body.TagTitle,
			status:2
		};
		groupTags.findOne({_id:req.body.gtId},function(err,result){
			var gt = result;
			gt.Tags.id(req.body._id).remove();
			gt.Tags.push(fields);
			gt.save(function(err){
				if(err)
					res.json(err);
				else
					findAllUserTags(req,res)
			});
		})
	}else{
		findAllUserTags(req,res)
	}
};

exports.editUserTag = editUserTag;

// find all user added tags under group tags -------Parul Shukla on- 26th november
const findAllUserTags = async (req, res) => {
    try {
        const conditions = {
            $or: [{ status: 1 }, { status: 3 }]
        };

        const fields = {
            _id: true,
            GroupTagTitle: true,
            Tags: true
        };

        const result = await groupTags.find(conditions, fields).exec();
        
        const tags = [];
        for (const x of result) {
            for (const tg of x.Tags) {
                if (tg.status === 2) { // user added tags under group tags - Need to remember the case, when tags will be added by user.
                    tg.gtTitle = x.GroupTagTitle.trim();
                    tg.gtId = x._id;
                    tags.push(tg);
                }
            }
        }
        
        return res.json({ "code": "200", "msg": "success", "response": tags });
    } catch (error) {
        console.error('Find all user tags error:', error);
        return res.status(500).json({ "code": "500", "msg": "Internal server error", "error": error.message });
    }
};
exports.findAllUserTags=findAllUserTags;

// delete group tag added by ---parul shukla on---- 26th november
var deleteUserTag = function(req,res){
    groupTags.findOne({_id:req.body.gtId},function(err,result){
		for(x in result.Tags){
			if (result.Tags[x]._id==req.body._id) {
				var index=x;
			}

		}
		result.Tags.splice(index,1);
		result.save(function(err){
			if(err){
				res.json(err);
			}else{
				findAllUserTags(req,res);
			}
		});
	})
};

exports.deleteUserTag = deleteUserTag;



/*________________________________________________________________________
	* @Date:      	21 May 2015
	* @Method :   	findPerPage
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used get only limited no of grouptags per page.
	* @Param:     	4
	* @Return:    	no
_________________________________________________________________________
*/
var findPerPage = function(req,res){

	var skip = req.body.offset ? parseInt(req.body.offset) : 0;
	var limit = req.body.limit ? parseInt(req.body.limit) : 100;
	//groupTags.find({$or:[{status:1},{status:3}]}).sort({DateAdded:1}).skip(req.body.offset).limit(req.body.limit).populate('MetaMetaTagID').exec(function(err,result){
	groupTags.find({$or:[{status:1},{status:3}]}).sort({DateAdded:1}).skip(skip).limit(limit).populate('MetaMetaTagID').exec(function(err,result){
	if(err){
		res.json(err);
	}
	else{
	    if(result.length==0){
		    res.json({"code":"404","msg":"Not Found"})
	    }
	    else{
			groupTags.find({$or:[{status:1},{status:3}]}).count().exec(function(err,dataLength){
				if (!err) {
					res.json({"code":"200","msg":"Success","response":result,"count":dataLength })
				}
				else{
					res.json({"code":"200","msg":"Success","response":result,"count": 0 })
				}
			});

	    }
	}
    });
}
exports.findPerPage = findPerPage;

/*________________________________________________________________________
	* @Date:      	17 july 2015
	* @Method :   	delete__duplicateDescriptor
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	27 july
	* @Purpose:   	This function is used to delete duplicate keywords.
	* @Param:     	2
	* @Return:    	no
_________________________________________________________________________
*/
var delete__duplicateDescriptor = function(req,res){
	groupTags.find({status:3}, function(err , data1){
		if (!err) {
			var descriptors = data1;
			groupTags.find({status:1}, function(err , data){
				if (!err) {
					var dup = 0;
					var del_keywords = [];
					for (var i = 0 ; i < data.length ; i++ ) {
						data[i].GroupTagTitle = data[i].GroupTagTitle ? data[i].GroupTagTitle.trim() : "";
						for(var j =0; j < descriptors.length; j++){
							descriptors[j].GroupTagTitle = descriptors[j].GroupTagTitle ? descriptors[j].GroupTagTitle.trim() : "";
							if (data[i].GroupTagTitle.toLowerCase() == descriptors[j].GroupTagTitle.toLowerCase()) {
								del_keywords.push(data[i].GroupTagTitle);
								addRef_toMedia(data[i]._id,descriptors[j]._id);
								groupTags.remove({_id:descriptors[j]._id},function(){
									console.log('deleted')
								});
								dup++;
							}
						}
					}
					console.log(dup);
				}
			});
		}
	})
}

//added by manishp
var delete__duplicateDescriptor_2 = function(req,res){
	var searchObj = {
		map: function (){
			emit(
				this.GroupTagTitle.trim(),
				{
					id:this._id ,
					count:1 ,
					keywords:[
						{
							id:this._id,
							GroupTagTitle:this.GroupTagTitle,
							status:this.status
						}
					],
					replace_with_id:"",
					remaining_ids:[],
					remaining_objids : []
				}
			);
		},
		reduce : function(key , values){
			var reduced = {
				_id:"" ,
				count:0 ,
				keywords:[],
				replace_with_id:"",
				remaining_ids:[],
				remaining_objids : []
			}; // initialize a doc (same format as emitted value)

			values.forEach(function(val) {
				reduced.count += val.count;
				reduced.keywords.push(val.keywords[0]);
			});
			return reduced;
		},
		finalize : function(key, reduced){
			/*
			// Make final updates or calculations
			reduced.avgAge = reduced.age / reduced.count;
			*/
			reduced.keywords.sort(function(a,b){
				return (a.status - b.status)
			})

			reduced.replace_with_id = reduced.keywords[0].id.valueOf().toString();
			reduced.keywords.forEach(function(val) {
				if(val.id != reduced.replace_with_id){
					reduced.remaining_objids.push(val.id.valueOf());
					reduced.remaining_ids.push(val.id.valueOf().toString());
				}
			})

			return reduced;
		},
		query : {status:{$in:[1,3]}},
		scope : {},
		out : {replace: "keywords_mapped_out"}
	};

	groupTags.mapReduce(searchObj,function(err,result){
		console.log("Error---"+err);
		var stuff = {name: searchObj.out.replace}; // Define info.
		var KeywordMappedModel = __createModelForName(stuff.name); // Create the model.

		var conditions = {"value.count":{$gt:1}};
		var sortObj = {"value.keywords.status":1,"value.count":-1};
		KeywordMappedModel.find(conditions).sort(sortObj).exec(function (err,results) { // Save
			if (err) {
				console.log(err);
				res.json({"status":"error"});
			}
			else{
				console.log("results.length =>>>>>>>>>> ",results.length);
				var options = { multi: true };
				var resCounter = 0;
				var keywordsToDelete = [];

				results.forEach(function(result){
					var conditions = {"GroupTags.GroupTagID":{"$in":result.value.remaining_ids}};

					var pushObj = {"GroupTags":{"GroupTagID":result.value.replace_with_id}};

					resCounter ++;
					var n = 0;
					media.update(conditions,{"$push":pushObj},options,function(err , numAffected){
						if(err){
							console.log("ERROR---",err);
							res.json(err);return;
						}
						else{
							n += numAffected
							//res.json({"numAffected":numAffected , "result" : result});
						}
					})

					keywordsToDelete = keywordsToDelete.concat(result.value.remaining_objids);

					if(resCounter == results.length){
						console.log("total numAffected =========== ",n);

						var finalArr = [];
						for(var loop=0;loop < keywordsToDelete.length;loop++){
							var key = keywordsToDelete[loop];
							var i = mongoose.Types.ObjectId(key);
							finalArr.push(i);
							//console.log(typeof i);
							//console.log(typeof i.valueOf());
						}

						console.log("finalArr.length ====== ",finalArr.length);
						var deleteCondition = {_id:{"$in":finalArr}};
						//console.log("deleteCondition = ",deleteCondition);
						groupTags.remove({_id:{"$in":finalArr}},function(err , result){
							if( !err ){
								console.log("all groupTags count = ",result)
								res.json(result)
							}
							else{
								console.log(err);
								res.json(err);
							}
						});
						//res.json({"resCounter":resCounter,"keywordsToDelete":finalArr,"results":results});
					}
				})
			}
		});
	});
}

var establishedModels = {};
function __createModelForName(name) {
	if (!(name in establishedModels)) {
		var Any = new mongoose.Schema(
					{
						_id: {type:String},
						value:{
								_id : {type:String},
								count : {type:Number},
								keywords : {type:Object},
								replace_with_id : {type:String},
								remaining_ids : {type:Array},
								remaining_objids : {type:Array}
							}
					},
					{ collection: name }
				);
		establishedModels[name] = mongoose.model(name, Any);
	}
	return establishedModels[name];
}

var addRef_toMedia = function(gtId,desId){
	//media.find().elemMatch("GroupTags", {"GroupTagsID":desId}).exec(function(err,data){
	media.find({GroupTags:{$elemMatch:{GroupTagID:desId}}},function(err,data){
		if (err) {
			res.json({'code':400,'error':err});
		}else{
			console.log('---------------------------------------------------------');
			console.log('descriptor----Id');
			console.log(desId);
			console.log('number of media having this descriptor');
			console.log(data.length);
			console.log('---------------------------------------------------------');
			for(var i=0; i<data.length;i++){
				media.findOne({_id:data[i]._id},function(err,med){
					if (err) {
						res.json({'code':400,'error':err});
					}else{
						var flag = false;
						for(var j = 0; j < med.GroupTags.length; j++){
							if ( gtId == med.GroupTags[j].GroupTagID ) {
								flag = true;
							}
						}
						if (!flag) {
							var gt = {};
							gt.GroupTagID = gtId;
							med.GroupTags.push(gt);
							med.save();
						}
					}
				});
			}
		}
	})
}
//exports.delete__duplicateDescriptor = delete__duplicateDescriptor;

exports.delete__duplicateDescriptor = delete__duplicateDescriptor_2;

/*________________________________________________________________________
	* @Date:      	30 june 2015
	* @Method :   	add__tagToDescriptor
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to add gt of same name to previously added descriptors.
	* @Param:     	2
	* @Return:    	no
_________________________________________________________________________
*/
var add__tagToDescriptor = function(req,res){
	var count=0;
	groupTags.find({status:3}, function(err , data1){
		for(var i=0; i < data1.length ; i++){
			//groupTags.findOne({_id:data1[i]._id}, function(err , gt){
			//	gt.Tags=[];
			//	gt.save();
			//});
			if (data1[i].Tags.length ==0) {
				count++;
				add__tagToDescriptor_final(data1[i]._id);
			}else{
				var flag = true;
				for(var j=0; j < data1[i].Tags.length; j++){
					if(data1[i].Tags[j].TagTitle == data1[i].GroupTagTitle){
						flag = false;
					}
				}
				if (flag) {
					count++;
					add__tagToDescriptor_final(data1[i]._id);
				}
			}
			if ((data1.length-1) ==i) {
				console.log('end of 1st for')
			}
		}
		console.log('##################################################################');
		console.log('count = '+count);
		console.log('##################################################################');
	})
}
var add__tagToDescriptor_final= function(id){
	//groupTags.findOne({_id:id},function(err,result){
	//	var gt = result;
	//	gt.Tags.push({
	//		TagTitle:gt.GroupTagTitle,
	//		status:1
	//	});
	//
	//	gt.save(function(err,dataa){
	//		if(err){
	//			res.json(err);
	//		}
	//		else{
	//			console.log(dataa);
	//		}
	//	});
	//})
}
exports.add__tagToDescriptor = add__tagToDescriptor;


/*________________________________________________________________________
	* @Date:      	30 june 2015
	* @Method :   	remove_dup_tags
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to add gt of same name to previously added descriptors.
	* @Param:     	2
	* @Return:    	no
_________________________________________________________________________
*/
//var remove_dup_tags = function(req,res){
//	console.log('remove_dup_tags function');
//	var count=0;
//	groupTags.find({status:3}, function(err , data1){
//		for(var i=0; i < data1.length ; i++){
//			if (data1[i].Tags.length ==0) {
//				//count++;
//				//add__tagToDescriptor_final(data1[i]._id);
//			}else{
//				//var flag = false;
//				for(var j=0; j < data1[i].Tags.length; j++){
//					for(var k=0; k < data1[i].Tags.length; k++){
//						if(data1[i].Tags[j].TagTitle == data1[i].Tags[k].TagTitle && j != k){
//							console.log('here');
//							count++;
//								//groupTags.findOne({_id:data1[i]._id},function(err,result){
//								//	var gt = result;
//								//	gt.Tags.splice(k,1);
//								//
//								//	gt.save(function(err,dataa){
//								//		if(err){
//								//			//res.json(err);
//								//		}
//								//		else{
//								//			console.log(dataa);
//								//		}
//								//	});
//								//})
//						}
//					}
//				}
//			}
//
//		}
//		console.log('##################################################################');
//		console.log('count = '+count);
//		console.log('##################################################################');
//	})
//}
//exports.remove_dup_tags = remove_dup_tags;

var getKeywords = function(req, res){
	//var regex = new RegExp('^('+req.body.startsWith+')','i');
	var regex = new RegExp('\s*\s*^\s*\s*'+req.body.startsWith,'i');
	console.log(regex);
    var conditions = {
		GroupTagTitle:regex,
		//status : 3
		$or : [{status : 1},{status : 3}]
	};
	var fields = {};
	var sort = {
		GroupTagTitle:1
	};

	var limit = 100;
	groupTags.find(conditions,fields).sort(sort).limit(limit).exec(function(err,result){
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
    });
};

var trim =function(req,res){
	var count = 0;
	groupTags.find({},function(err,data){
		if (!err) {
			for(var i =0; i<data.length;i++){
				if (data[i].GroupTagTitle != undefined) {
					groupTags.findOne({_id:data[i]._id},function(err2,gt){
						if (!err2) {
							var abc=(gt.GroupTagTitle).replace(/^\s+|\s+$/g, "")
							console.log(abc);
							gt.GroupTagTitle = abc;
							gt.save();
							count++;
							console.log(count);
						}
					})
				}
			}
		}
	})
}
exports.trim = trim;

var deleteAll = function(req,res){
	var ids = req.body.ids ? req.body.ids : [];
	groupTags.update({_id:{$in:ids}},{$set:{status:0}},{multi:true},function(err,data){
		if( !err ){
			var response = {
				status: 200,
				message: "items removed",
				result : data
			}
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	})
}
exports.deleteAll = deleteAll;

// Search Query by Arun Sahani
var searchQuery = function(req, res){
	var mmts,mt,searchCriteria,
		searchparam = req.body.searchText;

	if (req.body.mmtSq) {
	    mmts= new  ObjectID(req.body.mmtSq);
	}
	if (req.body.mtSq) {
	    mt= req.body.mtSq;
	}
	console.log("MMM",mmts);
	console.log("MT",mt);

	if (searchparam) {
	    if(mmts) {
			if (mt) {
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(searchparam, "i")},MetaMetaTagID: mmts,MetaTagID: mt};
			}
			if(mt ==" " || typeof(mt) == "undefined"){
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(searchparam, "i")},MetaMetaTagID: mmts};
			}
	    }
	    if (mmts ==" " || typeof(mmts) == "undefined") {
			searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(searchparam, "i")}};
	    }
	    console.log("Limit",req.body.limit);
	    console.log("Skip",req.body.offset)
	    console.log("Search1")


	    groupTags.find(searchCriteria).sort({DateAdded:1}).skip(req.body.offset).limit(req.body.limit).populate('MetaMetaTagID').exec(function(err,result){
			if(err){
				res.json(err);
			}
			else{
				if(result.length==0){
					res.json({"code":"404","msg":"Not Found"})
				}else{
					groupTags.find(searchCriteria).count().exec(function(err,dataLength){
						if (!err) {
							res.json({"code":"200","msg":"Success","response":result,"count":dataLength })
						}
						else{
							res.json({"code":"200","msg":"Success","response":result,"count": 0 })
						}
					});
				}
			}
	    });
	}
	if (searchparam =="" || typeof(searchparam) == "undefined") {
	    if(mmts) {
			if (mt) {
				searchCriteria = {$or:[{status:1},{status:3}],MetaMetaTagID: mmts,MetaTagID: mt};
			}
			if(mt =="" || typeof(mt) == "undefined"){
				searchCriteria = {$or:[{status:1},{status:3}],MetaMetaTagID: mmts};
			}
	    }
	    if (mmts =="" || typeof(mmts) == "undefined") {
			searchCriteria = {$or:[{status:1},{status:3}]};
	    }

	    var skip = req.body.offset ? parseInt(req.body.offset) : 0;
		var limit = req.body.limit ? parseInt(req.body.limit) : 0;

	    groupTags.find(searchCriteria).sort({DateAdded:1}).skip(skip).limit(limit).populate('MetaMetaTagID').exec(function(err,result){
			if(err){
				res.json(err);
			}
			else{
				if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
				}else{
				groupTags.find(searchCriteria).count().exec(function(err,dataLength){
					if (!err) {
						res.json({"code":"200","msg":"Success","response":result,"count":dataLength })
					}
					else{
						res.json({"code":"200","msg":"Success","response":result,"count": 0 })
					}
				});
				}
			}
	    });
	}
};
exports.searchQuery = searchQuery;

// Search via MT by Arun Sahani
var searchMT = function(req, res){
	var mmts,mt,searchCriteria,
		mmts= new  ObjectID(req.body.mmtSq);
	    mt= req.body.mtSq;

	console.log("MMM",mmts);
	console.log("MT",mt);
	if (mt) {
		if (mmts) {
			if(req.body.searchText) {
				console.log("Mt with all params");
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(req.body.searchText, "i")},MetaMetaTagID: mmts,MetaTagID: mt};
			}
			if(req.body.searchText =="" || typeof(req.body.searchText) == "undefined") {
				 console.log("Mt without search");
				searchCriteria = {$or:[{status:1},{status:3}],MetaMetaTagID: mmts,MetaTagID: mt};
			}
	    }
	    if(mmts =="" || typeof(mmts) == "undefined"){
			if(req.body.searchText) {
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(req.body.searchText, "i")},MetaTagID: mt};
			}
			if (req.body.searchText =="" || typeof(req.body.searchText) == "undefined") {
				searchCriteria = {$or:[{status:1},{status:3}],MetaTagID: mt};
			}
	    }
	}
	if(mt ==" " || typeof(mt) == "undefined" ){
	    if (mmts) {
			if(req.body.searchText) {
				console.log("Mt with all params");
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(req.body.searchText, "i")},MetaMetaTagID: mmts};
			}
			if(req.body.searchText =="" || typeof(req.body.searchText) == "undefined") {
				 console.log("Mt without search");
				searchCriteria = {$or:[{status:1},{status:3}],MetaMetaTagID: mmts};
			}
	    }
	    if(mmts =="" || typeof(mmts) == "undefined"){
			if(req.body.searchText) {
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(req.body.searchText, "i")}};
			}
			if (req.body.searchText =="" || typeof(req.body.searchText) == "undefined") {
				searchCriteria = {$or:[{status:1},{status:3}]};
			}
	    }
	}

	var skip = req.body.offset ? parseInt(req.body.offset) : 0;
	var limit = req.body.limit ? parseInt(req.body.limit) : 0;

	groupTags.find(searchCriteria).sort({DateAdded:1}).skip(skip).limit(limit).populate('MetaMetaTagID').exec(function(err,result){
		if(err){
			res.json(err);
		}
		else{
		    if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
		    }else{
			groupTags.find(searchCriteria).count().exec(function(err,dataLength){
				if (!err) {
					res.json({"code":"200","msg":"Success","response":result,"count":dataLength })
				}
				else{
					res.json({"code":"200","msg":"Success","response":result,"count": 0 })
				}
			});
		    }
		}
	});

};
exports.searchMT = searchMT;

// Search via MMT by Arun Sahani
var searchMMT = function(req, res){
	var mmts,mt,searchCriteria,
	    mt = req.body.mtSq;

	if (req.body.mmtSq) {
		mmts= new  ObjectID(req.body.mmtSq);
	}

	console.log("MMM",mmts);
	console.log("MT",mt);

	if (mmts) {
	    if (mt) {
			if(req.body.searchText) {
				console.log("MMT Search Text -------------------------->req.body.searchText")
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(req.body.searchText, "i")},MetaMetaTagID: mmts,MetaTagID: mt};
			}
			if(req.body.searchText =="" || typeof(req.body.searchText) == "undefined") {
				console.log("MMT without Search text ----------------------------------> req.body.searchText == || typeof(req.body.searchText) == undefined");
				searchCriteria = {$or:[{status:1},{status:3}],MetaMetaTagID: mmts,MetaTagID: mt};
			}
	    }
	    if(mt ==" " || typeof(mt) == "undefined" ){
			if(req.body.searchText) {
				console.log("MMT without mt --------------->mt == || typeOf(mt) == undefined");
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(req.body.searchText, "i")},MetaMetaTagID: mmts};
			}
			if (req.body.searchText =="" || typeof(req.body.searchText) == "undefined") {
				console.log("MMT without mt --------------->req.body.searchText == || typeof(req.body.searchText)");
				searchCriteria = {$or:[{status:1},{status:3}],MetaMetaTagID: mmts};
			}
	    }
	}
	if (mmts ==" " || typeof(mmts) == "undefined") {
	    console.log("All Case ")
	    if (mt) {
			if(req.body.searchText) {
				console.log("MMT Search Text -------------------------->req.body.searchText")
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(req.body.searchText, "i")},MetaTagID: mt};
			}
			if(req.body.searchText =="" || typeof(req.body.searchText) == "undefined") {
				console.log("MMT without Search text ----------------------------------> req.body.searchText == || typeof(req.body.searchText) == undefined");
				searchCriteria = {$or:[{status:1},{status:3}],MetaTagID: mt};
			}
	    }
	    if(mt ==" " || typeof(mt) == "undefined" ){
			if(req.body.searchText) {
				console.log("MMT without mt --------------->mt == || typeOf(mt) == undefined");
				searchCriteria = {$or:[{status:1},{status:3}],GroupTagTitle: { $regex: new RegExp(req.body.searchText, "i")}};
			}
			if (req.body.searchText =="" || typeof(req.body.searchText) == "undefined") {
				console.log("MMT without mt --------------->req.body.searchText == || typeof(req.body.searchText)");
				searchCriteria = {$or:[{status:1},{status:3}]};
			}
	    }
	}

	var skip = req.body.offset ? parseInt(req.body.offset) : 0;
	var limit = req.body.limit ? parseInt(req.body.limit) : 0;

	groupTags.find(searchCriteria).sort({DateAdded:1}).skip().limit(limit).populate('MetaMetaTagID').exec(function(err,result){
		if(err){
			res.json(err);
		}
		else{
		    if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
		    }else{
				groupTags.find(searchCriteria).count().exec(function(err,dataLength){
					if (!err) {
						res.json({"code":"200","msg":"Success","response":result,"count":dataLength })
					}
					else{
						res.json({"code":"200","msg":"Success","response":result,"count": 0 })
					}
				});
		    }
		}
	});

};
exports.searchMMT = searchMMT;


// For Text Search added by arun

var getallKeywords = function(req, res){
	//var regex = new RegExp('^('+req.body.startsWith+')','i');
	var regex = new RegExp('\s*\s*^\s*\s*'+req.body.startsWith,'i');
	console.log(regex);
    //groupTags.find({$or:[{status:1,'Tags.TagTitle':regex},{status:1,'GroupTagTitle':regex},{status:3,'Tags.TagTitle':regex},{status:3,'GroupTagTitle':regex}]},function(err,result){
	//groupTags.find({$or:[{status:1},{status:3}],'GroupTagTitle':regex},function(err,result){
	//groupTags.find({$or:[{status:1},{status:3}]},function(err,result){
	//groupTags.find({$or:[{status:1},{status:3}],'GroupTagTitle':regex},function(err,result){
	var conditions = {
		$or:[{status:1},{status:3}],
		'GroupTagTitle':regex
	};

	var fields = {
		_id : true,
		GroupTagTitle : true,
		Tags : true
	};

	var sort = {
		GroupTagTitle:1
	};

	var limit = 100;

	groupTags.find(conditions , fields).sort(sort).limit(limit).exec(function(err,result){
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
    });
};
exports.getallKeywords = getallKeywords;

// For frontend search drop-down auto-complete - With New logics - different Rounds
function AddDupsCountPerIndex (a) {	//private function for the getKeywords api just below...
	var tempArr = [];
	for(var i = 0; i < a.length; i++) {
		var tempCount = 1;
		//console.log(a[i]);
		for(var j = 0; j < a.length; j++) {
			if( i != j && a[i].GroupTagTitle.toLowerCase() == a[j].GroupTagTitle.toLowerCase() ) {
				tempCount++;
			}
		}
		tempArr[i] = a[i];
		tempArr[i].dupsCount = tempCount;
	}

	for(var loop = 0; loop < tempArr.length; loop++ ){
    	if(tempArr[loop].dupsCount > 1){
        	tempArr[loop].GroupTagTitle += " ("+tempArr[loop].GTTitle+")";
        }
    }
	return tempArr;
}

var getKeywords_Tags = function(req, res){
	var inputStr = req.body.startsWith ? req.body.startsWith : '';
	//var inputStr = inputStr.replace(/[^\w\s]/gi, '');
	var inputStr = inputStr.replace(/[`~!@#$%^&*()|+\=?;'",.<>\{\}\[\]\\\/]/gi, '');
	//below are the 4 rounds of regular expression which will be applied if we will not get any result.

	var regex__WORD_Exact = new RegExp('(^\\s*'+inputStr+'\\s*$)' , 'i');

	var regex__WORD_startsWith = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(\\b^'+inputStr+'\\b)' , 'i');

	var regex__WORD_anywhere_BT_NOT_START_WITH = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)' , 'i');

	var regex__WORD_startsWith_EMBEDDED = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(?!\\b'+inputStr+'\\b)(^'+inputStr+')','i');

	var regex__WORD_anywhere_EMBEDDED = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(?!\\b'+inputStr+'\\b)(?!^'+inputStr+')('+inputStr+')','i');

	//var regex__WORD_anywhere = new RegExp('(?!\\b'+inputStr+'\\b$)(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)' , 'i');
	//var regex__WORD_anywhere_BT_NOT_START_WITH = new RegExp('(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)', 'i');

	//console.log("----ROUND:1-----",regex__WORD_Exact);
	//console.log("----ROUND:2-----",regex__WORD_startsWith);
	//console.log("----ROUND:3-----",regex__WORD_anywhere_BT_NOT_START_WITH);
	//console.log("----ROUND:4-----",regex__WORD_startsWith_EMBEDDED);
	//console.log("----ROUND:5-----",regex__WORD_anywhere_EMBEDDED);

    var fields = {};

	//var limit = 100;
	var limit = 20;
	var conditions_STEP1 = {
		"Tags.TagTitle":regex__WORD_Exact,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP2 = {
		"Tags.TagTitle":regex__WORD_startsWith,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP3 = {
		"Tags.TagTitle":regex__WORD_anywhere_BT_NOT_START_WITH,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP4 = {
		"Tags.TagTitle":regex__WORD_startsWith_EMBEDDED,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP5 = {
		"Tags.TagTitle":regex__WORD_anywhere_EMBEDDED,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}

	var sort_OnTags = {
		"GroupTagTitle" : 1
	}
	groupTags.aggregate(
		[
			//{$match: {$or : [{"Tags.TagTitle":regex__WORD_Exact},{"GroupTagTitle":regex__WORD_Exact}],$or:[{status : 1},{status : 3}]}},
			//{$match: conditions_STEP1},
			{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
			{$match: conditions_STEP1},
			{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
			//{$sort : sort_OnTags},
			{$limit : limit}
		]
	).exec(function(err,result){
		if(err){
			res.json(err);
		}
		else{
			var resultLength = result.length;
			if(resultLength < limit){
				//res.json({"code":"404","msg":"Not Found"})

				//step-2
				groupTags.aggregate(
					[
						//{$unwind: "$Tags"},
						{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
						{$match: conditions_STEP2},
						{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
						//{$sort : sort_OnTags},
						{$limit : parseInt(limit - resultLength)}
					]
				).exec(function(err,result2){
					if(err){
						res.json(err);
					}
					else{
						var finalResult = result.concat(result2);
						var finalresultLength = finalResult.length;
						if(finalresultLength < limit){
							//res.json({"code":"404","msg":"Not Found"})

							//step-3
							groupTags.aggregate(
								[
									//{$unwind: "$Tags"},
									{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
									{$match: conditions_STEP3},
									{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
									//{$sort : sort_OnTags},
									{$limit : parseInt(limit - finalresultLength)}
								]
							).exec(function(err,result3){
								if(err){
									res.json(err);
								}
								else{
									finalResult = finalResult.concat(result3);
									finalresultLength = finalResult.length;
									//if(finalresultLength == 0){
									if(finalresultLength < limit){
										//res.json({"code":"404","msg":"Not Found"})
										//step-4
										groupTags.aggregate(
											[
												//{$unwind: "$Tags"},
												{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
												{$match: conditions_STEP4},
												{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
												{$sort : sort_OnTags},
												//{$limit : limit}
												{$limit : parseInt(limit - finalresultLength)}
											]
										).exec(function(err,result4){
											if(err){
												res.json(err);
											}
											else{
												finalResult = finalResult.concat(result4);
												finalresultLength = finalResult.length;

												if(finalresultLength < limit){
													//res.json({"code":"404","msg":"Not Found"})

													groupTags.aggregate(
														[
															//{$unwind: "$Tags"},
															{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
															{$match: conditions_STEP5},
															{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
															{$sort : sort_OnTags},
															{$limit : parseInt(limit - finalresultLength)}
														]
													).exec(function(err,result5){
														if(err){
															res.json(err);
														}
														else{
															finalResult = finalResult.concat(result5);
															finalresultLength = finalResult.length;

															if(finalresultLength==0){
																res.json({"code":"404","msg":"Not Found"})
															}
															else{
																finalResult = AddDupsCountPerIndex(finalResult);
																res.json({"code":"200","msg":"Success","response":finalResult})
															}
														}
													});
												}
												else{
													finalResult = AddDupsCountPerIndex(finalResult);
													res.json({"code":"200","msg":"Success","response":finalResult})
												}
											}
										});
									}
									else{
										finalResult = AddDupsCountPerIndex(finalResult);
										res.json({"code":"200","msg":"Success","response":finalResult})
									}
								}
							});
						}
						else{
							finalResult = AddDupsCountPerIndex(finalResult);
							res.json({"code":"200","msg":"Success","response":finalResult})
						}
					}
				});


			}
			else{
				result = AddDupsCountPerIndex(result);
				res.json({"code":"200","msg":"Success","response":result})
			}
		}
    });

};

var getKeywords_Tags_parallelExec = async function(req, res){
	var inputStr = req.body.startsWith ? req.body.startsWith : '';
	//var inputStr = inputStr.replace(/[^\w\s]/gi, '');
	var inputStr = inputStr.replace(/[`~!@#$%^&*()|+\=?;'",.<>\{\}\[\]\\\/]/gi, '');
	//below are the 4 rounds of regular expression which will be applied if we will not get any result.

	var regex__WORD_Exact = new RegExp('(^\\s*'+inputStr+'\\s*$)' , 'i');

	var regex__WORD_startsWith = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(\\b^'+inputStr+'\\b)' , 'i');

	var regex__WORD_anywhere_BT_NOT_START_WITH = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)' , 'i');

	var regex__WORD_startsWith_EMBEDDED = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(?!\\b'+inputStr+'\\b)(^'+inputStr+')','i');

	var regex__WORD_anywhere_EMBEDDED = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(?!\\b'+inputStr+'\\b)(?!^'+inputStr+')('+inputStr+')','i');

	//var regex__WORD_anywhere = new RegExp('(?!\\b'+inputStr+'\\b$)(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)' , 'i');
	//var regex__WORD_anywhere_BT_NOT_START_WITH = new RegExp('(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)', 'i');

	//console.log("----ROUND:1-----",regex__WORD_Exact);
	//console.log("----ROUND:2-----",regex__WORD_startsWith);
	//console.log("----ROUND:3-----",regex__WORD_anywhere_BT_NOT_START_WITH);
	//console.log("----ROUND:4-----",regex__WORD_startsWith_EMBEDDED);
	//console.log("----ROUND:5-----",regex__WORD_anywhere_EMBEDDED);

    var fields = {};

	//var limit = 100;
	var limit = 20;
	var conditions_STEP1 = {
		"Tags.TagTitle":regex__WORD_Exact,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP2 = {
		"Tags.TagTitle":regex__WORD_startsWith,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP3 = {
		"Tags.TagTitle":regex__WORD_anywhere_BT_NOT_START_WITH,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP4 = {
		"Tags.TagTitle":regex__WORD_startsWith_EMBEDDED,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP5 = {
		"Tags.TagTitle":regex__WORD_anywhere_EMBEDDED,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}

	var sort_OnTags = {
		"GroupTagTitle" : 1
	}


	async_lib.parallel({
		regex__WORD_Exact_result: function(callback) {
			groupTags.aggregate(
				[
					{$match: conditions_STEP1},
					{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
					{$match: conditions_STEP1},
					{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
					//{$sort : sort_OnTags},
					{$limit : limit}
				]
			).exec(function(err,result){
				if(err){
					callback(null, []);
				}
				else{
					callback(null, result);
				}
			});
		},
		regex__WORD_startsWith_result: function(callback) {
			groupTags.aggregate(
				[
					{$match: conditions_STEP2},
					{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
					{$match: conditions_STEP2},
					{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
					//{$sort : sort_OnTags},
					{$limit : limit}
				]
			).exec(function(err,result){
				if(err){
					callback(null, []);
				}
				else{
					callback(null, result);
				}
			});
		},
		regex__WORD_anywhere_BT_NOT_START_WITH_result: function(callback) {
			groupTags.aggregate(
				[
					{$match: conditions_STEP3},
					{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
					{$match: conditions_STEP3},
					{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
					//{$sort : sort_OnTags},
					{$limit : limit}
				]
			).exec(function(err,result){
				if(err){
					callback(null, []);
				}
				else{
					callback(null, result);
				}
			});
		},
		regex__WORD_startsWith_EMBEDDED_result: function(callback) {
			groupTags.aggregate(
				[
					{$match: conditions_STEP4},
					{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
					{$match: conditions_STEP4},
					{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
					//{$sort : sort_OnTags},
					{$limit : limit}
				]
			).exec(function(err,result){
				if(err){
					callback(null, []);
				}
				else{
					callback(null, result);
				}
			});
		},
		regex__WORD_anywhere_EMBEDDED_result: function(callback) {
			groupTags.aggregate(
				[
					{$match: conditions_STEP5},
					{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
					{$match: conditions_STEP5},
					{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
					//{$sort : sort_OnTags},
					{$limit : limit}
				]
			).exec(function(err,result){
				if(err){
					callback(null, []);
				}
				else{
					callback(null, result);
				}
			});
		}
	}, function(err, results) {
		var regex__WORD_Exact_result = results.regex__WORD_Exact_result ? results.regex__WORD_Exact_result : [];
		var regex__WORD_startsWith_result = results.regex__WORD_startsWith_result ? results.regex__WORD_startsWith_result : [];
		var regex__WORD_anywhere_BT_NOT_START_WITH_result = results.regex__WORD_anywhere_BT_NOT_START_WITH_result ? results.regex__WORD_anywhere_BT_NOT_START_WITH_result : [];
		var regex__WORD_startsWith_EMBEDDED_result = results.regex__WORD_startsWith_EMBEDDED_result ? results.regex__WORD_startsWith_EMBEDDED_result : [];
		var regex__WORD_anywhere_EMBEDDED_result = results.regex__WORD_anywhere_EMBEDDED_result ? results.regex__WORD_anywhere_EMBEDDED_result : [];

		var finalResult = regex__WORD_Exact_result.concat(regex__WORD_startsWith_result, regex__WORD_anywhere_BT_NOT_START_WITH_result, regex__WORD_startsWith_EMBEDDED_result, regex__WORD_anywhere_EMBEDDED_result);
		finalresultLength = finalResult.length;

		if(finalresultLength==0){
			res.json({"code":"404","msg":"Not Found"})
		}
		else{
			finalResult = AddDupsCountPerIndex(finalResult);
			res.json({"code":"200","msg":"Success","response":finalResult})
		}

	})

};

var getKeywords_Tags_neededExec = async function(req, res){
	var inputStr = req.body.startsWith ? req.body.startsWith : '';
	//var inputStr = inputStr.replace(/[^\w\s]/gi, '');
	var inputStr = inputStr.replace(/[`~!@#$%^&*()|+\=?;'",.<>\{\}\[\]\\\/]/gi, '');
	//below are the 4 rounds of regular expression which will be applied if we will not get any result.

	var regex__WORD_Exact = new RegExp('(^\\s*'+inputStr+'\\s*$)' , 'i');

	var regex__WORD_startsWith = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(\\b^'+inputStr+'\\b)' , 'i');

	var regex__WORD_anywhere_BT_NOT_START_WITH = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)' , 'i');

	var regex__WORD_startsWith_EMBEDDED = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(?!\\b'+inputStr+'\\b)(^'+inputStr+')','i');

	var regex__WORD_anywhere_EMBEDDED = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(?!\\b'+inputStr+'\\b)(?!^'+inputStr+')('+inputStr+')','i');

	//var regex__WORD_anywhere = new RegExp('(?!\\b'+inputStr+'\\b$)(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)' , 'i');
	//var regex__WORD_anywhere_BT_NOT_START_WITH = new RegExp('(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)', 'i');

	//console.log("----ROUND:1-----",regex__WORD_Exact);
	//console.log("----ROUND:2-----",regex__WORD_startsWith);
	//console.log("----ROUND:3-----",regex__WORD_anywhere_BT_NOT_START_WITH);
	//console.log("----ROUND:4-----",regex__WORD_startsWith_EMBEDDED);
	//console.log("----ROUND:5-----",regex__WORD_anywhere_EMBEDDED);

    var fields = {};

	//var limit = 100;
	var limit = 20;
	var conditions_STEP1 = {
		"Tags.TagTitle":regex__WORD_Exact,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP2 = {
		"Tags.TagTitle":regex__WORD_startsWith,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP3 = {
		"Tags.TagTitle":regex__WORD_anywhere_BT_NOT_START_WITH,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP4 = {
		"Tags.TagTitle":regex__WORD_startsWith_EMBEDDED,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP5 = {
		"Tags.TagTitle":regex__WORD_anywhere_EMBEDDED,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}

	var sort_OnTags = {
		"GroupTagTitle" : 1
	}

	var result = await groupTags.aggregate([
		{$match: conditions_STEP1},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP1},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result = Array.isArray(result) ? result : [];
	if(result.length >= limit) {
		return res.json({"code":"200","msg":"Success","response":AddDupsCountPerIndex(result)})
	}

	var result2 = await groupTags.aggregate([
		{$match: conditions_STEP2},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP2},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result2 = Array.isArray(result2) ? result2 : [];
	result = result.concat(result2);

	if(result.length >= limit) {
		return res.json({"code":"200","msg":"Success","response":AddDupsCountPerIndex(result)});
	}

	var result3 = await groupTags.aggregate([
		{$match: conditions_STEP3},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP3},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result3 = Array.isArray(result3) ? result3 : [];
	result = result.concat(result3);

	if(result.length >= limit) {
		return res.json({"code":"200","msg":"Success","response":AddDupsCountPerIndex(result)});
	}

	var result4 = await groupTags.aggregate([
		{$match: conditions_STEP4},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP4},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result4 = Array.isArray(result4) ? result4 : [];
	result = result.concat(result4);

	if(result.length >= limit) {
		return res.json({"code":"200","msg":"Success","response":AddDupsCountPerIndex(result)});
	}

	var result5 = await groupTags.aggregate([
		{$match: conditions_STEP5},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP5},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result5 = Array.isArray(result5) ? result5 : [];
	result = result.concat(result5);

	if(result.length == 0){
		res.json({"code":"404","msg":"Not Found"})
	}
	else{
		return res.json({"code":"200","msg":"Success","response": AddDupsCountPerIndex(result)})
	}
};

//Not In Use - Need to improve this and use this for drop down api
var getKeywords_quickaccess = async function(req, res){
	var inputStr = req.body.startsWith ? req.body.startsWith : '';
	//var inputStr = inputStr.replace(/[^\w\s]/gi, '');
	var inputStr = inputStr.replace(/[`~!@#$%^&*()|+\=?;'",.<>\{\}\[\]\\\/]/gi, '');
	//below are the 4 rounds of regular expression which will be applied if we will not get any result.

	var regex__WORD_Exact = new RegExp('(^\\s*'+inputStr+'\\s*$)' , 'i');

	var regex__WORD_startsWith = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(\\b^'+inputStr+'\\b)' , 'i');

	var regex__WORD_anywhere_BT_NOT_START_WITH = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(\\b'+inputStr+'\\b)' , 'i');

	var regex__WORD_startsWith_EMBEDDED = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(?!\\b'+inputStr+'\\b)(^'+inputStr+')','i');

	var regex__WORD_anywhere_EMBEDDED = new RegExp('(?!^\\s*'+inputStr+'\\s*$)(?!\\b^'+inputStr+'\\b)(?!\\b'+inputStr+'\\b)(?!^'+inputStr+')('+inputStr+')','i');

	var fields = {};

	//var limit = 100;
	var limit = 20;
	var conditions_STEP1 = {
		"Tags.TagTitle":regex__WORD_Exact,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP2 = {
		"Tags.TagTitle":regex__WORD_startsWith,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP3 = {
		"Tags.TagTitle":regex__WORD_anywhere_BT_NOT_START_WITH,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP4 = {
		"Tags.TagTitle":regex__WORD_startsWith_EMBEDDED,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}
	var conditions_STEP5 = {
		"Tags.TagTitle":regex__WORD_anywhere_EMBEDDED,
		"Tags.status" : 1,
		$or:[{status : 1},{status : 3}],
		//MediaCount : {$gt : 0},
		MetaMetaTagID : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		}
	}

	var sort_OnTags = {
		"GroupTagTitle" : 1
	}

	var result = await groupTags.aggregate([
		{$match: conditions_STEP1},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP1},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result = Array.isArray(result) ? result : [];
	if(result.length >= limit) {
		return res.json({"code":"200","msg":"Success","response":AddDupsCountPerIndex(result)})
	}

	var result2 = await groupTags.aggregate([
		{$match: conditions_STEP2},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP2},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result2 = Array.isArray(result2) ? result2 : [];
	result = result.concat(result2);

	if(result.length >= limit) {
		return res.json({"code":"200","msg":"Success","response":AddDupsCountPerIndex(result)});
	}

	var result3 = await groupTags.aggregate([
		{$match: conditions_STEP3},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP3},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result3 = Array.isArray(result3) ? result3 : [];
	result = result.concat(result3);

	if(result.length >= limit) {
		return res.json({"code":"200","msg":"Success","response":AddDupsCountPerIndex(result)});
	}

	var result4 = await groupTags.aggregate([
		{$match: conditions_STEP4},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP4},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result4 = Array.isArray(result4) ? result4 : [];
	result = result.concat(result4);

	if(result.length >= limit) {
		return res.json({"code":"200","msg":"Success","response":AddDupsCountPerIndex(result)});
	}

	var result5 = await groupTags.aggregate([
		{$match: conditions_STEP5},
		{$unwind: { path: "$Tags", preserveNullAndEmptyArrays: true }},
		{$match: conditions_STEP5},
		{$project: {"_id": '$_id', status : "$status",GTTitle : "$GroupTagTitle", GroupTagTitle: { $ifNull: [ "$Tags.TagTitle", "$GroupTagTitle" ] }}},
		//{$sort : sort_OnTags},
		{$limit : limit}
	]);
	result5 = Array.isArray(result5) ? result5 : [];
	result = result.concat(result5);

	if(result.length == 0){
		res.json({"code":"404","msg":"Not Found"})
	}
	else{
		return res.json({"code":"200","msg":"Success","response": AddDupsCountPerIndex(result)})
	}
};

//exports.getKeywords = getKeywords;
//exports.getKeywords = getKeywords_Tags;
//exports.getKeywords = getKeywords_Tags_parallelExec;
exports.getKeywords = getKeywords_Tags_neededExec;


var findOnlyGt = function(req, res){
	groupTags.find({MetaMetaTagID:req.query.mmt,MetaTagID:req.query.mt,$or:[{status:1},{status:3}]},function(err,result){
		if(err){
			res.json(err);
		}
		else{
			groupTags.find({$or:[{status:1},{status:3}]}).count().exec(function(err , resultLength){
				if(err){
					res.json(err);
				}
				else{
					if(resultLength==0){
						//res.json({"code":"404","msg":"Not Found"})
						res.json({"code":"200","msg":"Success","response":[]})
					}
					else{
						res.json({"code":"200","msg":"Success","response":result})
					}
				}
			});
		}
    }).populate('MetaMetaTagID');
};

exports.findOnlyGt = findOnlyGt;



var addDescriptors__MassApi = async function (req, res) {
	//var commaSepKeywords = "";

	var keywords = commaSepKeywords.split(',');

	for(var i = 0; i < keywords.length; i++) {
		var keyword = keywords[i];
		if(keyword){
			keyword = keyword ? keyword.trim() : null;	//added by manishp on 09032016
		}

		if(keyword){
			var response = await groupTags.find({$or:[{status:1},{status:3}],GroupTagTitle:{ $regex : new RegExp("^"+keyword+"$", "i") }});
			if(response) {
				if (response.length > 1 ){
					console.log("keyword already saved as a GT / Desciptor ============= ", keyword);
				}else if (response.length == 1 && response[0].status == 1) {
					console.log("keyword already saved as a GT ============= ", keyword);
				}else if (response.length == 1 && response[0].status == 3) {
					console.log("keyword already saved as a desciptor ============= ", keyword);
				}
				else {
					var fields = {
						GroupTagTitle:keyword,
						Notes:"",
						DateAdded:Date.now(),
						MetaMetaTagID:"54c98aab4fde7f30079fdd5a",
						MetaTagID:"54c98aba4fde7f30079fdd5b",
						status:3,
						Tags : [
							{
								TagTitle:keyword,
								status:1
							}
						]
					};

					var data = await groupTags(fields).save();
					if(data){
						console.log("keyword saved ============= ", keyword);
					}
				}
			}
		}
	}
	res.send({'message' : "done"});
}

exports.addDescriptors__MassApi = addDescriptors__MassApi;

var speechToTextKeywordMapping = async function (req, res) {
	var MediaId = req.body.MediaId ? req.body.MediaId : null;
	var keywords = Array.isArray(req.body.keywords) ? req.body.keywords : []

	if(!MediaId) {
		return res.json({code: 404, message : 'Something went wrong', mediaObj: {}});
	}


	if(keywords.length){
		for(var i = 0; i < keywords.length; i++) {
			var keyword = keywords[i].toLowerCase().trim();
			if(keyword) {
				var result = await groupTags.find({
					$or:[
						{status:1},
						{status:3}
					],
					$or : [
						{ GroupTagTitle:{ $regex : new RegExp("^"+keyword+"$", "i") }},
						{ "Tags.TagTitle":{ $regex : new RegExp("^"+keyword+"$", "i") }}
					]
				});

				var gtId = null;
				if(!result.length) {
					//save it now.
					var newGtToSave = {
						GroupTagTitle:keyword,
						Notes:keyword,
						DateAdded:Date.now(),
						MetaMetaTagID:"54c98aab4fde7f30079fdd5a",
						MetaTagID:"54c98aba4fde7f30079fdd5b",
						status:3,
						AddedFrom: "SpeechToText"
					};

					var data = await groupTags(newGtToSave).save();
					//console.log("1.1 data._id = ", data._id)
					var gtData = await groupTags.findOne({_id:data._id});
					gtData.Tags.push({
						TagTitle:keyword,
						status:1
					});
					await gtData.save();
					gtId = gtData._id;
				} else {
					gtId = result[0]._id;
					console.log("1.2 result[0]._id = ", gtId)
				}

				if(gtId) {
					console.log("2 gtId = ", gtId);
					//map this gtId with Media record
					var mediaData = media.find({_id: ObjectId(MediaId), GroupTags:{$elemMatch:{GroupTagID:gtId}}});
					mediaData = Array.isArray(mediaData) ? mediaData : [];
					if(!mediaData.length) {
						var med = await media.findOne({_id:ObjectId(MediaId)});
						var gt = {
							_id : new ObjectId(),
							GroupTagID: gtId
						};

						var medMappingResult = await media.update({ _id:ObjectId(MediaId) },{$push : { "GroupTags" : gt}},{multi:false});

						//console.log("medMappingResult = ", medMappingResult);
					} else {
						//console.log("3.2 result[0]._id = ", gtId)
					}
				}
			}
		}
	}

	var query = {
		_id : ObjectId(MediaId)
	};

	var setObj = {
		"IsSpeechToTextDone" : true
	};

	var options = { multi: false };
	var updateResult = await media.update(query, {$set : setObj}, options);
	//console.log("4 updateResult = ", updateResult);

	var updateUserRecord = await User.update({_id : ObjectId(req.session.user._id)}, {$set : {SpeechToTextMediaId: ObjectId(MediaId)}});
	//console.log("5 updateUserRecord = ", updateUserRecord);

	var mediaObj = await media.findOne({_id: {$lt : ObjectId(MediaId)}, IsUnsplashImage: true, IsDeleted: 0}).populate('GroupTags.GroupTagID').sort({_id : -1});
	return res.json({code: 200, message : 'mapped successfully', mediaObj: mediaObj});
}

var getSpeechToTextMediaId = async function (req, res) {
	var mediaObj = await media.findOne({$or:[{IsSpeechToTextDone: false},{IsSpeechToTextDone: {$exists: false}}], IsUnsplashImage: true, IsDeleted: 0}).populate('GroupTags.GroupTagID').sort({_id : -1});
	return res.json({code: 200, message : 'SpeechToTextMediaId', mediaObj: mediaObj});
}

var deleteKeywordFromMedia = async function (req, res) {
	var KeywordId = req.body.KeywordId || null;
	var MediaId = req.body.MediaId || null;
	if(KeywordId && MediaId) {
		var conditions = {_id : ObjectId(MediaId), "GroupTags.GroupTagID": ObjectId(KeywordId)};
		var pullObj = {
			GroupTags:{
				GroupTagID : ObjectId(KeywordId)
			}
		};
		var options = { multi : false };
		var result = await media.update(conditions, { $pull : pullObj }, options);
	}
	getSpeechToTextMediaId(req, res);
}

var deleteMedia = async function (req, res) {
	var MediaId = req.body.MediaId || null;
	if(MediaId) {
		var conditions = {
			_id : ObjectId(MediaId)
		};
		var setObj = {
			IsDeleted : 1
		};
		var options = {
			multi : false
		};
		var result = await media.update(conditions, { $set : setObj }, options);
	}
	getSpeechToTextMediaId(req, res);
}

exports.getSpeechToTextMediaId = getSpeechToTextMediaId;
exports.speechToTextKeywordMapping = speechToTextKeywordMapping;
exports.deleteKeywordFromMedia = deleteKeywordFromMedia;
exports.deleteMedia = deleteMedia;