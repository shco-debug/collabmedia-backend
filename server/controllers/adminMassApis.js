var media = require('./../models/mediaModel.js');
var groupTags = require('./../models/groupTagsModel.js');

// For getMediaTitlesFile
var getMediaTitlesFile = function (req, res){
	var offset = req.body.offset ? req.body.offset : 0;
	var limit = req.body.limit ? req.body.limit : 15000;
	var conditions = {};
		conditions['Status'] = 1;
		conditions['IsDeleted'] = 0;
		conditions['IsPrivate'] = 0;
		
	var fields = {
		Title:1,
		AutoId:1
	};

	media.find(conditions,fields).sort({AutoId: 'asc'}).skip(offset).limit(limit).exec(function(err,result){
		if(err){ 		
			res.json(err);
		}
		else{
			if(result.length==0){
				res.json({"code":"404","msg":"Not Found",responselength:0})
			}
			else{				
				media.find(conditions,fields).count().exec(function(err,resultlength){								
					if(err){ 		
						res.json(err);
					}
					else{					
						console.log("yes confirmed return.....");
						res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength});
						
					}
				})
			}
		}
	})
}

//for getGTsFile
var getGTsFile = function(req, res){
	groupTags.find({$or:[{status:1},{status:3}]} , {GroupTagTitle : 1}).sort({DateAdded:1}).exec(function(err,result){		
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
						res.json({"code":"404","msg":"Not Found"})
					}
					else{				
						res.json({"code":"200","msg":"Success","response":result})
					}
				}
			});
		}
    });
}

exports.getMediaTitlesFile = getMediaTitlesFile;
exports.getGTsFile = getGTsFile;
//exports.getMediaTitlesFile = getMediaTitlesFile;