var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var User = require('./../models/userModel.js');
var Friend = require('./../models/friendsModel.js');
var fs = require('fs');
var formidable = require('formidable');
var mediaController = require('./../controllers/mediaController.js');
var nodemailer = require('nodemailer');
//var Page = require('./../models/pageModel.js');
var im   = require('imagemagick');
var counters=require('./../models/countersModel.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');

// added by arun sahani 20/05/2016
var Capsule = require('./../models/capsuleModel.js');
var dateFormat =function(){
	var d = new Date,
	dformat = [(d.getMonth()+1)>10?(d.getMonth()+1):'0'+(d.getMonth()+1),
		(d.getDate())>10?d.getDate():'0'+d.getDate(),
		d.getFullYear()].join('')+''+
		[d.getHours(),
		d.getMinutes(),
		d.getSeconds()].join('');
		return dformat;
}
//Chapters In the making Apis

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		find
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var find = function ( req , res ){
	var conditions = {
		//CreaterId : req.session.user._id,
		_id: req.headers.chapter_id ? req.headers.chapter_id : 0,
		Status : 1,
		//IsLaunched : 0,
		IsDeleted : 0
	};
	
	var fields = {};
	console.log('===========================================');
	console.log(conditions);
	console.log('===========================================');
	
	Chapter.findOne(conditions).exec(function( err , results ){
		if( !err ){
			var response = {
				status: 200,
				message: "Chapters listing",
				result : results
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
	});
}


/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		findAll
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var findAll = function ( req , res ){
	/*
	var conditions = {
		$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"}],
		CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		CreaterId : req.session.user._id,
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	*/
	
	var conditions = {
		CreaterId : req.session.user._id,
		CapsuleId : req.headers.capsule_id,
		$or : [
			{Origin : "created"},
			{Origin : "duplicated"},
			{Origin : "addedFromLibrary"}
		],
		IsLaunched : false,
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).exec(function( err , results ){
		if( !err ){
			var response = {
				status: 200,
				message: "Chapters listing",
				results : results
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
	});
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		findAllPaginated
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var findAllPaginated = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	/*
	var conditions = {
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		$or : [{CreaterId : req.session.user._id, Origin:{$ne : "createdForMe"}},{OwnerId : req.session.user._id , OwnerEmail:req.session.user.Email}],
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	*/
	
	var conditions = {
		$or : [
			{CreaterId : req.session.user._id,Origin : "created",IsLaunched : true,"LaunchSettings.MakingFor" : "ME"},
			{CreaterId : req.session.user._id,Origin : "duplicated",IsLaunched : true,"LaunchSettings.MakingFor" : "ME"},
			{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsLaunched : true,"LaunchSettings.MakingFor" : "ME"},
			{CreaterId : req.session.user._id,IsLaunched : true,"LaunchSettings.MakingFor" : "OTHERS"},
			{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "shared"} //this may not have option for further share. ? - May be key for furtherSharable ?
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Chapter.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Chapters listing",
						results : results
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
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		createdByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var createdByMe = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	/*
	var conditions = {
		$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"}],
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		CreaterId : req.session.user._id,
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	*/
	var conditions = {
		$or : [
			{CreaterId : req.session.user._id,Origin : "created",IsLaunched : true,"LaunchSettings.MakingFor" : "ME"},
			{CreaterId : req.session.user._id,Origin : "duplicated",IsLaunched : true,"LaunchSettings.MakingFor" : "ME"},
			{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsLaunched : true,"LaunchSettings.MakingFor" : "ME"},
			{CreaterId : req.session.user._id,IsLaunched : true,"LaunchSettings.MakingFor" : "OTHERS"}
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Chapter.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Chapters listing",
						results : results
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
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		sharedWithMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var sharedWithMe = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	/*
	var conditions = {
		Origin : "shared",
		CreaterId : {$ne:req.session.user._id},
		OwnerId : req.session.user._id,
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	*/
	
	var conditions = {
		$or : [
			{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "shared"} //this may not have option for further share. ? - May be key for furtherSharable ?
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Chapter.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Chapters listing",
						results : results
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
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		createdByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var createdForMe = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	var conditions = {
		Origin : "createdForMe",
		OwnerId : req.session.user._id,
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Chapter.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Chapters listing",
						results : results
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
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		byTheHouse
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var byTheHouse = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	var conditions = {
		Origin : "byTheHouse",
		CreaterId : req.session.user._id,
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Chapter.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Chapters listing",
						results : results
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
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}



/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		create
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var create = function ( req , res ){
	var data = {};
	//set required field of the chapterModel
	data = {
		CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		CreaterId : req.session.user._id,
		OwnerId : req.session.user._id,
	}
	console.log("data = ",data);	
	Chapter(data).save(function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Chapter created successfully.",
				result : result				
			}
			pushChapterId(data.CapsuleId,result._id);
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
	});

}


/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		duplicate
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

var duplicate = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		Title : 1,
		CoverArt : 1,
		CapsuleId : 1
	};
	
	conditions._id = req.headers.chapter_id;
	
	Chapter.findOne(conditions , fields , function( err , result ){
		if( !err ){
			var data = {};
			data.Origin = "duplicated";
			data.OriginatedFrom = conditions._id;
			
			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.Title = result.Title;
			data.CoverArt = result.CoverArt;
			data.CapsuleId = result.CapsuleId;
			
			var nowDate = Date.now();
			data.CreatedOn = nowDate;
			data.ModifiedOn = nowDate;
			
			//console.log("data = ",data);
			Chapter(data).save(function( err , result ){
				if( !err ){
					//pages under chapters duplication will be implemented later
					var conditions = {
						ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0, 
						OwnerId : req.session.user._id,
						IsDeleted : 0,
						PageType : {$in : ["gallery" , "content"]}
					};
					var sortObj = {
						Order : 1,
						UpdatedOn : -1
					};
					var fields = {
						_id : true
					}; 
					
					var newChapterId = result._id;
					Page.find(conditions , fields).sort(sortObj).exec(function( err , results ){
						if( !err ){
							var fields = {
								_id : true,
								Title : true,
								PageType : true,
								Order : true,
								HeaderImage : true,
								BackgroundMusic : true,
								CommonParams : true,
								ViewportDesktopSections : true,
								ViewportTabletSections : true,
								ViewportMobileSections : true,
								SelectedMedia : true,
								SelectedCriteria : true
							}; 
							for( var loop = 0; loop < results.length; loop++ ){
								var conditions = {};
								conditions._id = results[loop]._id;
								Page.findOne(conditions , fields, function( err , result ){
									//delete result._id;
									var data = {};
									data.CreaterId = req.session.user._id;
									data.OwnerId = req.session.user._id;
									data.ChapterId = newChapterId?newChapterId:"";
									data.Title = result.Title;
									data.PageType = result.PageType;
									data.Order = result.Order;
									data.HeaderImage = result.HeaderImage?result.HeaderImage:"";
									data.BackgroundMusic = result.BackgroundMusic?result.BackgroundMusic:"";
									data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
									data.SelectedCriteria = result.SelectedCriteria;
									
									if(data.PageType == "content"){
										data.CommonParams = result.CommonParams ? result.CommonParams : {};
										data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
										data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
										data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};
									}
									
									data.CreatedOn = nowDate;
									data.UpdatedOn = nowDate;
									
									console.log("-------",result);
									Page(data).save(function( err , result ){
										if(!err){
											console.log("----new page instance created..",result);
										}
										else{
											console.log(err);
										}
									});
								});
							}
							
							var response = {
								status: 200,
								message: "Chapter duplicated successfully.",
								result : result				
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
					});	
				}
				else{
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong." 
					}
					res.json(response);
				}
			});
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

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		deleteChapter
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

var remove = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)
	
	conditions._id = req.headers.chapter_id;
	data.IsDeleted = 1;
	
	var capsuleId  = req.headers.capsule_id;
	console.log("conditions = ",conditions);
	//Chapter.update(query , $set:data , function( err , result ){
	Chapter.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var conditions = {};
			var data = {};
			
			conditions.ChapterId = req.headers.chapter_id;
			data.IsDeleted = 1;
			
			console.log("----",conditions , "------ set data = " , {$set:data});
			
			Page.update(conditions , {$set:data} ,{multi:true} , function( err , result ){
				if( !err ){
					var response = {
						status: 200,
						message: "page deleted successfully.",
						result : result				
					}
					console.log(response);
				}
				else{
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong." 
					}
					console.log(response);
				}
			});
		
			var response = {
				status: 200,
				message: "Chapter deleted successfully.",
				result : result				
			}
			pullChapterId(capsuleId,conditions.ChapterId);
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
	});

}




/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		reorder
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

function getObjArrayIdxByKey (ObjArr , matchKey , matchVal){
	var idx;
	for( var loop = 0; loop < ObjArr.length; loop++ ){
		if (ObjArr[loop].hasOwnProperty(matchKey)) {
			if(ObjArr[loop][matchKey] == matchVal){
				idx = loop;
				break;
			}
		}
	}
	return idx;
}

var reorder = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var chapterIds = req.body.chapter_ids ? req.body.chapter_ids : [];
	//console.log("chapterIds = ",chapterIds);
	var resultCount = 0;
	for( var loop = 0; loop < chapterIds.length; loop++,resultCount++ ){
		var chapterId = chapterIds[loop];
		var conditions = {};
		var data = {};
		//console.log("req.headers = " , req.headers)
		conditions._id = chapterId;
		//console.log("conditions = ",conditions);
		findAndUpdate(conditions , loop+1);
	}
	
	function findAndUpdate(conditions , order){
		Chapter.findOne(conditions , function( err , result ){
			if( !err ){
				result.Order = order;
				//console.log("result = ",result);
				result.save(function(err , result){
					//console.log("Reordered = ",result);
				});
			}
		});
	}
	
	console.log("chapterIds.length = "+chapterIds.length+"------------------------ resultCount = "+resultCount);
	
	if( chapterIds.length > 0 && resultCount == chapterIds.length ){
		var response = {
			status: 200,
			message: "Chapters reordered successfully."
		}
		res.json(response);
		
	}
	else{
		var response = {
			status: 501,
			message: "Something went wrong." 
		}
		res.json(response);
	}
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		updateChapterName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

var updateChapterName = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)
	
	conditions._id = req.headers.chapter_id;
	data.Title = req.body.chapter_name ? req.body.chapter_name : "Untitled Chapter";
	
	console.log("conditions = ",conditions);
	//Chapter.update(query , $set:data , function( err , result ){
	Chapter.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Chapter name updated successfully.",
				result : result				
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
	});

}


//Chapter library Apis

/*________________________________________________________________________
   * @Date:      		31 Aug 2015
   * @Method :   		addFromLibrary
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var addFromLibrary = function ( req , res ){
	
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		CapsuleId : true,
		Title : true,
		CoverArt : true
	};
	
	conditions._id = req.headers.chapter_id;
	
	Chapter.findOne(conditions , fields , function( err , result ){
		if( !err ){
			console.log("9999999999999999999999",result);
			var data = {};
			data.Origin = "addedFromLibrary";
			data.OriginatedFrom = conditions._id;
			
			data.CapsuleId = req.headers.capsule_id ? req.headers.capsule_id : 0;
			
			
			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.Title = result.Title;
			data.CoverArt = result.CoverArt;
			var nowDate = Date.now();
			data.CreatedOn = nowDate;
			data.ModifiedOn = nowDate;
			console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^data = ",data);
			Chapter(data).save(function( err , result ){
				if( !err ){
					//pages under chapters duplication will be implemented later
					var conditions = {
						ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0, 
						OwnerId : req.session.user._id,
						IsDeleted : 0,
						PageType : {$in : ["gallery" , "content"]}
					};
					var sortObj = {
						Order : 1,
						UpdatedOn : -1
					};
					var fields = {
						_id : true
					}; 
					
					var newChapterId = result._id;
					Page.find(conditions , fields).sort(sortObj).exec(function( err , results ){
						if( !err ){
							var fields = {
								_id : true,
								Title : true,
								PageType : true,
								Order : true,
								HeaderImage : true,
								BackgroundMusic : true,
								CommonParams : true,
								ViewportDesktopSections : true,
								ViewportTabletSections : true,
								ViewportMobileSections : true,
								SelectedMedia : true,
								SelectedCriteria : true
								
							}; 
							for( var loop = 0; loop < results.length; loop++ ){
								var conditions = {};
								conditions._id = results[loop]._id;
								Page.findOne(conditions , fields, function( err , result ){
									//delete result._id;
									var data = {};
									data.CreaterId = req.session.user._id;
									data.OwnerId = req.session.user._id;
									data.ChapterId = newChapterId?newChapterId:"";
									data.Title = result.Title;
									data.PageType = result.PageType;
									data.Order = result.Order;
									data.HeaderImage = result.HeaderImage?result.HeaderImage:"";
									data.BackgroundMusic = result.BackgroundMusic?result.BackgroundMusic:"";
									data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
									data.SelectedCriteria = result.SelectedCriteria;
									
									if(data.PageType == "content"){
										data.CommonParams = result.CommonParams ? result.CommonParams : {};
										data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
										data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
										data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};
									}
												
									data.CreatedOn = nowDate;
									data.UpdatedOn = nowDate;
									
									console.log("-------",result);
									Page(data).save(function( err , result ){
										if(!err){
											console.log("----new page instance created..",result);
										}
										else{
											console.log(err);
										}
									});
								});
							}
							
							var response = {
								status: 200,
								message: "Chapter duplicated successfully.",
								result : result				
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
					});	
				}
				else{
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong." 
					}
					res.json(response);
				}
			});
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


/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		previewChapter
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var preview = function ( req , res ){
	var query = {};
	var fields = {};
	query._id = req.header.chapter_id;
	
	Chapter.findOne(query , fields , function( err , result ){
		
		var query = {};
		var fields = {};
		query._id = req.header.chapter_id;
		
		Page.find(data , function( err , result ){
			if( !err ){
				var response = {
					status: 200,
					message: "Chapter added successfully.",
					result : result				
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
		});
		
	})

}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		shareChapter
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var share = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		Title : 1,
		CoverArt : 1,
		CapsuleId : 1
	};
	
	conditions._id = req.headers.chapter_id;
	
	Chapter.findOne(conditions , fields , function( err , result ){
		if( !err ){
			var shareWithEmail = req.body.share_with_email ? req.body.share_with_email : false;
			if( shareWithEmail ){
				var conditions = {};
				conditions.Email = shareWithEmail;
				
				var fields = {
					Email : true
				};
				
				User.find(conditions , fields , function(err , UserData){
					if(!err){
						var data = {};
						data.Origin = "shared";
						data.OriginatedFrom = req.headers.chapter_id;
						data.CreaterId = req.session.user._id;
						
						if(!UserData.length){
							//Non-Registered user case
							data.OwnerId = req.session.user._id;
							data.OwnerEmail = req.session.user.Email;
						}
						else{
							data.OwnerId = UserData[0]._id;
							data.OwnerEmail = UserData[0].Email;
						}
						
						data.Title = result.Title;
						data.CoverArt = result.CoverArt;
						//data.CapsuleId = result.CapsuleId;
						
						var nowDate = Date.now();
						data.CreatedOn = nowDate;
						data.ModifiedOn = nowDate;
						
						//console.log("data = ",data);
						Chapter(data).save(function( err , result ){
							if( !err ){
								//pages under chapters duplication will be implemented later
								var conditions = {
									ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0, 
									OwnerId : req.session.user._id,
									IsDeleted : 0,
									PageType : {$in : ["gallery" , "content"]}
								};
								var sortObj = {
									Order : 1,
									UpdatedOn : -1
								};
								var fields = {
									_id : true
								}; 
								
								var newChapterId = result._id;
								Page.find(conditions , fields).sort(sortObj).exec(function( err , results ){
									if( !err ){
										var fields = {
											_id : true,
											Title : true,
											PageType : true,
											Order : true,
											HeaderImage : true,
											BackgroundMusic : true,
											CommonParams : true,
											ViewportDesktopSections : true,
											ViewportTabletSections : true,
											ViewportMobileSections : true,
											SelectedMedia : true,
											SelectedCriteria : true
										}; 
										for( var loop = 0; loop < results.length; loop++ ){
											var conditions = {};
											conditions._id = results[loop]._id;
											Page.findOne(conditions , fields, function( err , result ){
												//delete result._id;
												var data = {};
												data.Origin = "shared";
												data.OriginatedFrom = result._id;
												data.CreaterId = req.session.user._id;
												
												if(!UserData.length){
													//Non-Registered user case
													data.OwnerId = req.session.user._id;
													data.OwnerEmail = req.session.user.Email;
												}
												else{
													data.OwnerId = UserData[0]._id;
													data.OwnerEmail = UserData[0].Email;
												}
												
												data.ChapterId = newChapterId?newChapterId:"";
												data.Title = result.Title;
												data.PageType = result.PageType;
												data.Order = result.Order;
												data.HeaderImage = result.HeaderImage?result.HeaderImage:"";
												data.BackgroundMusic = result.BackgroundMusic?result.BackgroundMusic:"";
												data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
												data.SelectedCriteria = result.SelectedCriteria;
												
												if(data.PageType == "content"){
													data.CommonParams = result.CommonParams ? result.CommonParams : {};
													data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
													data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
													data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};
												}
												
												data.CreatedOn = nowDate;
												data.UpdatedOn = nowDate;
												
												console.log("-------",result);
												Page(data).save(function( err , result ){
													if(!err){
														console.log("----new page instance created..",result);
													}
													else{
														console.log(err);
													}
												});
											});
										}
										
										var response = {
											status: 200,
											message: "Chapter shared successfully.",
											result : result				
										}
										res.json(response);
										
										/*
										var transporter = nodemailer.createTransport({
											service: 'Gmail',
											auth: {
												user: 'collabmedia.scrpt@gmail.com',
												pass: 'scrpt123_2014collabmedia#1909'
											}
										});	
										var to = shareWithEmail;
										
										var mailOptions = {
											from: 'collabmedia support  <collabmedia.scrpt@gmail.com>', // sender address
											to: to, // list of receivers
											subject: 'Scrpt - '+req.session.user.Name+' has sent you a Chapter!',
											text: 'http://203.100.79.94:8888/#/login', 
											html: "Hi , <br/><br/> Scrpt - "+req.session.user.Name+" has sent you a Chapter : '"+data.Title+"'.<br/><br/>Sincerely,<br>The Scrpt team. "
										};

										transporter.sendMail(mailOptions, function(error, info){
											if(error){
												console.log(error);
												//res.json(err);
											}else{
												console.log('Message sent to: '+to + info.response);
												//res.json({'msg':'done','code':'200'});
											}
										});
										*/
										var condition = {};
                                        condition.name = "Share__Chapter"

                                        EmailTemplate.find(condition, {}, function (err, results) {
                                            if (!err) {
                                                if (results.length) {
                                                    
                                                    var RecipientName = '';
                                                    User.find({'Email':shareWithEmail}, {'Name':true}, function (err, name) {
                                                    if(name.length > 0){
                                                       var name = name[0].Name ? name[0].Name.split(' ') : "";
                                                       RecipientName = name[0];
                                                    }
                                             
                                                    var newHtml = results[0].description.replace('{SharedByUserName}', req.session.user.Name);
                                                    newHtml = newHtml.replace('{ChapterName}', data.Title)
                                                    newHtml = newHtml.replace('{RecipientName}', RecipientName);
                                                    console.log("**** New Html - - >*****", newHtml);
                                                    var transporter = nodemailer.createTransport({
                                                        service: 'Gmail',
                                                        auth: {
                                                            user: 'collabmedia.scrpt@gmail.com',
                                                            pass: 'scrpt123_2014collabmedia#1909'
                                                        }
                                                    });
                                                    var to = shareWithEmail;

                                                    var mailOptions = {
                                                        from: 'collabmedia support  <collabmedia.scrpt@gmail.com>', // sender address
                                                        to: to, // list of receivers
                                                        subject: 'Scrpt - ' + req.session.user.Name + ' has shared a Chapter with you!',
                                                        //text: 'http://203.100.79.94:8888/#/login',
                                                        html: newHtml
														//html: "Hi , <br/><br/> Scrpt - " + req.session.user.Name + " has sent you a Capsule : '" + data.Title + "'.<br/><br/>Sincerely,<br>The Scrpt team. "
                                                    };

                                                    transporter.sendMail(mailOptions, function (error, info) {
                                                        if (error) {
                                                            console.log(error);
                                                        } else {
                                                            console.log('Message sent to: ' + to + info.response);
                                                        }
                                                    });
                                                }) 
                                                }
                                            }
                                        })
										
									}
									else{
										console.log(err);
										var response = {
											status: 501,
											message: "Something went wrong." 
										}
										res.json(response);
									}
								});	
							}
							else{
								console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong." 
								}
								res.json(response);
							}
						});
					}
					else{
					
					}
				});
			}
			else{
			
			}
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


/*________________________________________________________________________
   * @Date:      		25 Aug 2015
   * @Method :   		uploadCover
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var uploadCover = function(req,res){
	var form = new formidable.IncomingForm();
    form.keepExtensions = true;     //keep file extension
    var uploadDir = "/../../public/assets/Media/Covers/";       //set upload directory
    form.keepExtensions = true;     //keep file extension
    form.parse(req, function(err, fields, files) {
        console.log("form.bytesReceived");
        console.log("file path: "+JSON.stringify(files.file.path));
        console.log("file name: "+JSON.stringify(files.file.name));
        console.log("fields: "+fields);
        console.log("fields: "+JSON.stringify(fields));
        var dateTime = new Date().toISOString().replace(/T/,'').replace(/\..+/, '').split(" ");
        fs.rename(files.file.path, __dirname+"/../../public/assets/Media/covers/"+  fields.chapter_id+'_'+Date.now()+ files.file.name, function(err) {
            if (err){
                throw err;
            }
            else {
                var imgUrl = fields.chapter_id+'_'+Date.now()+ files.file.name;
                var mediaCenterPath = "/../../public/assets/Media/covers/";
                var srcPath = __dirname + mediaCenterPath + imgUrl;
				setTimeout(function(){
					if (fs.existsSync(srcPath)) {
						var dstPathCrop_300 = __dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+ imgUrl;
						var dstPathCrop_600 = __dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl;
						var dstPathCrop_SMALL = __dirname+ mediaCenterPath + 'small'+"/"+imgUrl ;
						var dstPathCrop_MEDIUM = __dirname+ mediaCenterPath +  'medium' +"/"+imgUrl ;
						mediaController.crop_image(srcPath,dstPathCrop_300,100,100);
						mediaController.crop_image(srcPath,dstPathCrop_600,600,600);
						mediaController.crop_image(srcPath,dstPathCrop_SMALL,155,121);
						mediaController.crop_image(srcPath,dstPathCrop_MEDIUM,262,162);
						//mediaController.resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);
						
						//update chapter's CoverArt field
						var conditions = {_id:fields.chapter_id};
						var	data = {$set:{CoverArt:imgUrl}};
						Chapter.update(conditions , data , function(err , data){
							if(!err){
								var response = {
									status: 200,
									message: "Chapter cover uploaded successfully.",
									result : '/assets/Media/covers/' + 'medium' + "/" + imgUrl 
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
						});
						
						
						
					}else{
						var response = {
							status: 501,
							message: "Something went wrong." 
						}
						res.json(response);
					}
				},10)
            }
            console.log('renamed complete');  
        });
    });
}


/*________________________________________________________________________
   * @Date:      		26 Aug 2015
   * @Method :   		invite
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var chapter__sendInvitations = function (ChapterData, invitees, req) {
    
    function sendInvitationEmail (results,shareWithEmail,ChapterViewURL){
        User.find({'Email': shareWithEmail}, {'Name': true}, function (err, name) {
            var RecipientName = "";
            if (name.length > 0) {
                var name = name[0].Name ? name[0].Name.split(' ') : "";
                RecipientName = name.length ? name[0] : "";
            }

            var newHtml = results[0].description.replace('{OwnerName}', req.session.user.Name);
            newHtml = newHtml.replace('{ChapterName}', ChapterData.Title);
            newHtml = newHtml.replace('{RecipientName}', RecipientName);
            newHtml = newHtml.replace('{ChapterViewURL}', ChapterViewURL);

            var to = shareWithEmail;
            var subject = 'Scrpt - ' + req.session.user.Name + ' has invited you in a chapter to join!';

            var mailOptions = {
                from: 'collabmedia support  <collabmedia.scrpt@gmail.com>', // sender address
                to: to, // list of receivers
                subject: subject,
                html: newHtml
            };
            
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'collabmedia.scrpt@gmail.com',
                    pass: 'scrpt123_2014collabmedia#1909'
                }
            });

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Message sent to: ' + mailOptions.to + info.response);
                }
            });
        });
    }
    
    //make chapter view url
    var condition = {};
    condition = {
        ChapterId: ChapterData._id ? ChapterData._id : 0,
        IsDeleted: 0,
        IsDasheditpage: {$ne: true},
        PageType: {$in: ["gallery", "content"]}
    };


    var sortObj = {
        Order: 1
    };

    var fields = {
        _id: true,
        ChapterId: true,
        PageType: true
    };

    var ChapterViewURL = "";
    Page.find(condition, fields).sort(sortObj).exec(function (err, results) {
        if (!err) {
            var data = {
                status: 200,
                message: "Pages listing",
                results: results
            }
            //res.json(response);

            if (data.results.length) {
                if (data.results[0].PageType == "content") {
                    ChapterViewURL = process.HOST_URL + '/capsule/#/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
                } else if (data.results[0].PageType == "gallery") {
                    ChapterViewURL = process.HOST_URL + '/capsule/#/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
                } else {
                    console.log("Something went wrong.");
                    ChapterViewURL = process.HOST_URL + '/capsule/#/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
                }
                
                var conditions = {};
                conditions.name = "Chapter__Invitation";

                EmailTemplate.find(conditions, {}, function (err, results) {
                    if (!err) {
                        if (results.length) {
                            for (var loop = 0; loop < invitees.length; loop++) {
                                var shareWithEmail = invitees[loop].UserEmail;
                                console.log("* * * * * Share with Email * * * * * ",shareWithEmail);
                                sendInvitationEmail(results,shareWithEmail,ChapterViewURL);
                                
                            }
                        }
                    }
                })
            } else {
                console.log("No Page Found...");
            }
        } else {
            console.log(err);
        }
    });
};

var invite = function(req,res){
	console.log('in function');
	var chapter_id = req.headers.chapter_id;
	var invitee = {};
	invitee.email = req.body.invitee.email ? req.body.invitee.email : '';
	invitee.name =  req.body.invitee.name ? req.body.invitee.name : '';
	invitee.relation =  req.body.invitee.relation ? req.body.invitee.relation : '';
	var rel = invitee.relation;
	rel = rel.split('~');
	console.log(new RegExp(invitee.email, "i").test(req.session.user.Email));
	if (new RegExp(invitee.email, "i").test(req.session.user.Email)) {
		var response = {
			status: 402,
			message: "Can not invite yourself." 
		}
		res.json(response)
	}else{
		Chapter.find({ _id : chapter_id ,  'LaunchSettings.Invitees': { $elemMatch: { UserEmail :{ $regex : new RegExp(invitee.email, "i") } } }  } , function(errr,dataa){
			if(errr){
				console.log('eerrrr1');
				var response = {
					status: 501,
					message: "Something went wrong." 
				}
				res.json(response)
			}
			else{
				console.log(dataa);
				if (dataa.length == 0) {
					
					User.findOne({Email:{ $regex : new RegExp(invitee.email, "i") }},function(err,data){
						if (err) {
							var response = {
								status: 501,
								message: "Something went wrong." 
							}
							res.json(response)
						}else{
							console.log('in find user');
							if (data != undefined && data != null) {
								console.log('user found');
								var newInvitee = {};
								newInvitee.UserID = data._id;
								newInvitee.UserEmail = data.Email;
								newInvitee.UserName = invitee.name;
								newInvitee.UserNickName = data.NickName;
								newInvitee.CreatedOn = Date.now();
								newInvitee.Relation = rel[0].trim();
								newInvitee.RelationId = rel[1].trim();
								newInvitee.UserPic = data.ProfilePic;
								newInvitee.IsRegistered = true;
								var userPic = data.ProfilePic;
								console.log(req.session.user._id);
								
								console.log(invitee.email);
								Friend.find({UserID:req.session.user._id,'Friend.Email':{ $regex : new RegExp(invitee.email, "i") },Status:1,IsDeleted:0},function(err1,data2){
									if (err1) {
										var response = {
											status: 501,
											message: "Something went wrong." 
										}
										res.json(response)
									}else{
										
										if (data2.length > 0 ) {
											//do nothing
											console.log('already friend');
										}else{
											//call function to add member
											console.log('saving as friend');
											var newFriendData = {};
											newFriendData.ID = newInvitee.UserID;
											newFriendData.Email = newInvitee.UserEmail;
											newFriendData.Name = newInvitee.UserName ;
											newFriendData.NickName =  newInvitee.UserNickName;
											newFriendData.Pic =  userPic;
											newFriendData.Relation =  rel[0].trim();
											newFriendData.RelationID =  rel[1].trim();
											
											var friendship = new Friend();
											friendship.UserID = req.session.user._id;
											friendship.Friend = newFriendData;
											friendship.Status = 1;
											friendship.IsDeleted = 0;
											friendship.CreatedOn = Date.now();
											friendship.ModifiedOn = Date.now();
											friendship.save(function(err4,data){
												if (err4) {
													console.log(err4)
												}
											});
										}
										console.log('===========================================');
										console.log(newInvitee);
										console.log('===========================================');
										console.log( chapter_id );
										Chapter.update({ _id : chapter_id },{$push : { "LaunchSettings.Invitees" : newInvitee}},{multi:false},function(err,data3){
											if (err) {
												var response = {
													status: 501,
													message: "Something went wrong." 
												}
												res.json(response)
											}else{
												console.log('updating chapter');
												var response = {
													status: 200,
													message: "user invited sucessfully",
													result : data3 
												}
												res.json(response);
											}
										})
									}
								})
								
							}else{
								
								console.log('user found');
								var newInvitee = {};
								newInvitee.UserEmail = invitee.email;
								newInvitee.UserName = invitee.name;
								newInvitee.CreatedOn = Date.now();
								newInvitee.Relation = rel[0].trim();
								newInvitee.RelationId = rel[1].trim();
								newInvitee.IsRegistered = false;
								console.log(req.session.user._id);
								Chapter.update({ _id : chapter_id },{$push : { "LaunchSettings.Invitees" : newInvitee}},{multi:false},function(err,data3){
									if (err) {
										var response = {
											status: 501,
											message: "Something went wrong." 
										}
										res.json(response)
									}else{
										console.log('updating chapter');
										//send email if the chapter has already been launched...
										Chapter.findOne({ _id : chapter_id},{},function( err , result ){
											if( !err ){
												var ChapterData = result;
												console.log("ChapterData = ",ChapterData);
												if( ChapterData.IsLaunched ){
													console.log("----------------LAUNCHED CHAPTER CASE------------------");
													var invitees = new Array();
													invitees.push(member);
													chapter__sendInvitations(ChapterData , invitees , req)
												}
											}
										})
										var response = {
											status: 200,
											message: "user invited sucessfully",
											result : data3 
										}
										res.json(response);
									}
								})
								/*
								var response = {
									status: 501,
									message: "User not registered" 
								}
								// send user email
								// add simple entry to table without invitee id
								res.json(response);
								*/	
							}
						}
					});
				}else{
					var response = {
						status: 401,
						message: "already invited" 
					}
					res.json(response);
				}
			}
		});
	}
}



var inviteMember = function ( req , res ){
	console.log('0000000000000000000000000000000000000000000000000000000000000inviteMember');
	console.log('inviteMember');
	var chapter_id = req.headers.chapter_id;
	var member =  req.body.member ? req.body.member : '';
	console.log("Member Email--------------------------------", member.UserEmail)
	Chapter.find({ _id : chapter_id ,  'LaunchSettings.Invitees': { $elemMatch: { UserEmail :{ $regex : new RegExp(member.UserEmail, "i") } } }  } , function(errr,dataa){
		if(errr){
			console.log('eerrrr1');
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response)
		}
		else{
			console.log(chapter_id);
			if (dataa.length == 0) {
				Chapter.update({ _id : chapter_id },{$push : { "LaunchSettings.Invitees" : member}},{multi:false},function(err,data3){
					if (err) {
						var response = {
							status: 501,
							message: "Something went wrong." 
						}
						res.json(response)
					}else{
						console.log('updating chapter');
						//send email if the chapter has already been launched...
						Chapter.findOne({ _id : chapter_id},{},function( err , result ){
							if( !err ){
								var ChapterData = result;
								console.log("ChapterData = ",ChapterData);
								if( ChapterData.IsLaunched ){
									console.log("----------------LAUNCHED CHAPTER CASE------------------");
									var invitees = new Array();
									invitees.push(member);
									chapter__sendInvitations(ChapterData , invitees , req)
								}
							}
						})
						var response = {
							status: 200,
							message: "user invited sucessfully",
							result : data3 
						}
						res.json(response);
					}
				})
			}else{
				var response = {
					status: 401,
					message: "already invited" 
				}
				res.json(response);
			}
		}
	})
	
}



var removeInvitee = function ( req , res ){
	console.log('inviteMember');
	var chapter_id = req.headers.chapter_id;
	var member =  req.body.member ? req.body.member : '';
	
	if (member.UserEmail) {
		//code
		Chapter.find({ _id : chapter_id ,  'LaunchSettings.Invitees': { $elemMatch: { UserEmail :{ $regex : new RegExp(member.UserEmail, "i") } } }  } , function(errr,dataa){
			if(errr){
				console.log('eerrrr1',errr);
				var response = {
					status: 501,
					message: "Something went wrong." 
				}
				res.json(response)
			}
			else{
				console.log(chapter_id);
				if (dataa.length == 0) {
					var response = {
						status: 401,
						message: "not a member" 
					}
					res.json(response);
				}else{
					Chapter.update({_id:chapter_id},{$pull:{'LaunchSettings.Invitees':{UserEmail :  { $regex : new RegExp(member.UserEmail, "i") }}}},{multi:false},function(err,data){
						if (err) {
				var response = {
								status: 502,
								message: "something went wrong" 
							}
							res.json(response);
			    }else{
				var response = {
								status: 200,
								message: "user deleted sucessfully",
								result : data
							}
							res.json(response);
			    }
					})
				}
			}
		})
	}
	else{
		console.log('eerrrr2222');
		var response = {
			status: 501,
			message: "Something went wrong." 
		}
		res.json(response)
		
	}
	
}

var addOwner = function(req,res){
	console.log('in function');
	var chapter_id = req.headers.chapter_id;
	var email = req.body.email ? req.body.email : '';
	if (new RegExp(email, "i").test(req.session.user.Email)) {
		var response = {
			status: 402,
			message: "Can not invite yourself." 
		}
		res.json(response)
	}else{
		Chapter.find({ _id : chapter_id ,  'LaunchSettings.OthersData': { $elemMatch: { UserEmail :{ $regex : new RegExp(email, "i") } } }  } , function(errr,dataa){
			if(errr){
				console.log('eerrrr1');
				var response = {
					status: 501,
					message: "Something went wrong." 
				}
				res.json(response)
			}
			else{
				console.log(dataa);
				if (dataa.length == 0) {
					
					User.findOne({Email:{ $regex : new RegExp(email, "i") }},function(err,data){
						if (err) {
							var response = {
								status: 501,
								message: "Something went wrong." 
							}
							res.json(response)
						}else{
							console.log('in find user');
							if (data != undefined && data != null) {
								console.log('user found');
								var newOwner = {};
								newOwner.UserID = data._id;
								newOwner.UserEmail = data.Email;
								newOwner.UserName = data.Name;
								newOwner.UserNickName = data.NickName;
								newOwner.CreatedOn = Date.now();
								newOwner.UserPic = data.ProfilePic;
								newOwner.IsRegistered = true;
								var userPic = data.ProfilePic;
										console.log('===========================================');
										console.log(newOwner);
										console.log('===========================================');
										console.log( chapter_id );
										Chapter.update({ _id : chapter_id },{$push : { "LaunchSettings.OthersData" : newOwner}},{multi:false},function(err,data3){
											if (err) {
												var response = {
													status: 501,
													message: "Something went wrong." 
												}
												res.json(response)
											}else{
												console.log('updating chapter');
												
												var response = {
													status: 200,
													message: "user invited sucessfully",
													result : data3 
												}
												res.json(response);
											}
										})
								
							}else{
								
								console.log('user found');
								var newOwner = {};
								newOwner.UserEmail = email;
								newOwner.CreatedOn = Date.now();
								newOwner.IsRegistered = false;
								console.log(req.session.user._id);
								Chapter.update({ _id : chapter_id },{$push : { "LaunchSettings.OthersData" : newOwner}},{multi:false},function(err,data3){
									if (err) {
										var response = {
											status: 501,
											message: "Something went wrong." 
										}
										res.json(response)
									}else{
										console.log('updating chapter');
										
										var response = {
											status: 200,
											message: "user invited sucessfully",
											result : data3 
										}
										res.json(response);
									}
								})
							}
						}
					});
				}else{
					var response = {
						status: 401,
						message: "already added to owners" 
					}
					res.json(response);
				}
			}
		});
	}
}

var removeOwner = function( req , res ){
	console.log('removeOwner');
	var chapter_id = req.headers.chapter_id;
	var email =  req.body.email ? req.body.email : '';
	Chapter.find({ _id : chapter_id ,  'LaunchSettings.OthersData': { $elemMatch: { UserEmail :{ $regex : new RegExp(email, "i") } } }  } , function(errr,dataa){
		if(errr){
			console.log('eerrrr1');
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response)
		}
		else{
			console.log(chapter_id);
			if (dataa.length == 0) {
				var response = {
					status: 401,
					message: "not a member" 
				}
				res.json(response);
			}else{
				Chapter.update({_id:chapter_id},{$pull:{'LaunchSettings.OthersData':{UserEmail :  { $regex : new RegExp(email, "i") }}}},{multi:false},function(err,data){
					if (err) {
                        var response = {
							status: 502,
							message: "something went wrong" 
						}
						res.json(response);
                    }else{
                        var response = {
							status: 200,
							message: "owner deleted sucessfully",
							result : data
						}
						res.json(response);
                    }
				})
			}
		}
	})
}


/*________________________________________________________________________
   * @Date:      		25 Aug 2015
   * @Method :   		saveSetting
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var saveSetting = function(req, res){
	console.log('server side saveSetting function');
	var condition = {};
	condition._id = req.headers.chapter_id ? req.headers.chapter_id : '0';
	
	var title = req.body.newTitle ? req.body.newTitle : "Untitled Chapter";
	var ShareMode = req.body.participation ? req.body.participation : "private";
	var NamingConvention = req.body.namingConvention ? req.body.namingConvention : "realnames";
	
	Chapter.update(condition,{$set:{Title:title, 'LaunchSettings.ShareMode' : ShareMode , 'LaunchSettings.NamingConvention': NamingConvention}} , {multi:false}, function(err,numAffected){
		if(err){
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response)
		}else{
			var response = {
				status: 200,
				message: "Chapter name updated successfully.",
				result : numAffected				
			}
			res.json(response);
		}	
	})
}

/*________________________________________________________________________
   * @Date:      		25 September 2015
   * @Method :   		all__getLaunchedChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var all__getLaunchedChapters = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	var conditions = {
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		$or : [{"LaunchSettings.Invitees.UserEmail" : req.session.user.Email},{CreaterId : req.session.user._id, Origin:{$ne : "createdForMe"}},{OwnerId : req.session.user._id , OwnerEmail:req.session.user.Email}],
		Status : 1,
		IsLaunched : 1,
		IsDeleted : 0
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Chapter.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Chapters listing",
						results : results
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
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		25 September 2015
   * @Method :   		launchedByMe__getLaunchedChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var launchedByMe__getLaunchedChapters = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	var conditions = {
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		$or : [{CreaterId : req.session.user._id},{OwnerId : req.session.user._id}],
		Status : 1,
		IsLaunched : 1,
		IsDeleted : 0
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Chapter.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Chapters listing",
						results : results
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
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		25 September 2015
   * @Method :   		invitationForMe__getLaunchedChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var invitationForMe__getLaunchedChapters = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	var conditions = {
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		"LaunchSettings.Invitees.UserEmail" : req.session.user.Email,
		Status : 1,
		IsLaunched : 1,
		IsDeleted : 0
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Chapter.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Chapters listing",
						results : results
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
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

//dashboard apis
/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		dashboard__findAll
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var dashboard__findAll = function ( req , res ){
	/*
	var conditions = {
		//$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"}],
		CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		OwnerId : req.session.user._id,
		Status : 1,
		//IsLaunched : 0,
		IsDeleted : 0
	};
	*/
	
	var conditions = {
		CapsuleId : req.headers.capsule_id,
		$or : [
			{CreaterId : req.session.user._id,Origin : "created","LaunchSettings.MakingFor" : "ME",IsLaunched : true},
			{CreaterId : req.session.user._id,Origin : "duplicated","LaunchSettings.MakingFor" : "ME",IsLaunched : true},
			{CreaterId : req.session.user._id,Origin : "addedFromLibrary","LaunchSettings.MakingFor" : "ME",IsLaunched : true},
			{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id},  //this may not have option for further share. ? - May be key for furtherSharable ?
			{"LaunchSettings.Invitees.UserID":req.session.user._id,IsLaunched : true}	//member of the chapter case
			//{"LaunchSettings.Invitees.UserEmail":req.session.user.Email,IsLaunched : true}	//member of the chapter case
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Chapter.find(conditions , fields).sort(sortObj).exec(function( err , results ){
		if( !err ){
			var response = {
				status: 200,
				message: "Chapters listing",
				results : results
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
	});
}

//upload menu icon for chapter by arun sahani
var uploadMenuIcon = function(req,res){
    var incNum = 0;
    counters.findOneAndUpdate(
    { _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
    if (!err) {
            console.log('=========================')
            console.log(data);
            //data.seq=(data.seq)+1;
            console.log(data.seq);
            incNum = data.seq;
            //data.save(function(err){
            //if( !err ){
            console.log("incNum="+incNum);
            var form = new formidable.IncomingForm();        	
            var RecordLocator = "";

            form.parse(req, function(err, fields, files) {
              var file_name="";
              console.log("fields --",fields)
              console.log("Files  --",files)
              if(files.myFile.name){
                    uploadDir = __dirname + "/../../public/assets/Media/menu/";
                    file_name = files.myFile.name;
                    file_name = file_name.split('.');
                    ext = file_name[file_name.length-1];
                    RecordLocator = file_name[0];
                    var name = '';
                    name=dateFormat()+'_'+incNum;
                    name = Math.floor( Date.now() / 1000 ).toString()+'_'+incNum;
                    file_name=name+'.'+ext;
                    file_name=name+'.'+ext; //updated on 09022015 by manishp : <timestamp>_<media_unique_number>_<size>.<extension> = 1421919905373_101_600.jpeg
                    console.log(files.myFile.type);
                    fs.renameSync(files.myFile.path, uploadDir + "/" + file_name)

                    var media_type='';
                    if(files.myFile.type=="application/pdf" || files.myFile.type=="application/msword" || files.myFile.type=="application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||  files.myFile.type=="application/vnd.ms-excel" || files.myFile.type=="application/vnd.oasis.opendocument.spreadsheet" ||  files.myFile.type=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || files.myFile.type=="application/vnd.ms-powerpoint" || files.myFile.type=='application/vnd.openxmlformats-officedocument.presentationml.presentation'){
                            media_type='Document';
                    }
                    else if(files.myFile.type=='video/mp4' || files.myFile.type=='video/ogg'){
                            media_type='Video';			    
                    }
                    else if(files.myFile.type=='audio/mpeg' || files.myFile.type=='audio/ogg'){
                            media_type='Audio';			    
                    }
                    else{
			media_type='Image';
			//add thumbnail code
			var imgUrl = file_name;
			var mediaCenterPath = "/../../public/assets/Media/menu/";
			var srcPath = __dirname + mediaCenterPath + imgUrl;

			if (fs.existsSync(srcPath)) {
				console.log("In Synccc")
				try{
					im.identify(srcPath,function(err,features){
						if (err) {
							console.log(err);
						}else{
							if (features.width == features.height) {
								var dstPath = __dirname+mediaCenterPath+"resized/"+imgUrl;
								resize_image(srcPath,dstPath,30,30);
								var conditions = {},
								setData = {};
						
								conditions._id = fields.chapter_id;
								setData.MenuIcon = file_name;
						
								Chapter.update(conditions,{$set:setData},function( err , numAffected ){
									if( !err ){
										var response = {
											status: 200,
											message: "Image saved successfully.",
											result : {
												MenuIcon : file_name
											}
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
							else{
								res.json({'code':400,'msg':'file dimension error.',result:{dimensions : {width :features.width,height:features.height}}});
								//now unlink
								if(fs.existsSync(srcPath)){
									fs.unlink(srcPath);
								} 
							}
						}
					})
				}
				catch(e){
					console.log("=========================ERROR : ",e);
				}
			}
                    }
            }
            });
    }
    });
}

var resize_image = function(srcPath,dstPath,w,h){
	
    console.log("source : ",srcPath+" ---- destination : "+dstPath);

    try{
    im.identify(srcPath,function(err,features){
            if (err) {
                    console.log(err);
            }else{
                    console.log(features.width+"======================"+features.height);
                    if (features.height >= 50) {
                            console.log('========================================================================== here1');
                            im.resize({
                                    srcPath: srcPath,
                                    dstPath: dstPath,
                                    //width: w,
                                    height: h,
                                    //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
                                    //gravity: 'Center' // optional: position crop area when using 'aspectfill'
                            });
                    }
                    else if (features.width >= 50) {
                            console.log('========================================================================== here2');
                            im.resize({
                                    srcPath: srcPath,
                                    dstPath: dstPath,
                                    width: w,
                                    //height: 1440,
                                    //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
                                    //gravity: 'Center' // optional: position crop area when using 'aspectfill'
                            });
                    }
                    else{
                            console.log('========================================================================== here3');
                            im.resize({
                                    srcPath: srcPath,
                                    dstPath: dstPath,
                                    width: features.width,
                                    height: features.height,
                                    //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
                                    //gravity: 'Center' // optional: position crop area when using 'aspectfill'
                            });
                    }
            }
            })


    }
    catch(e){
            console.log("=========================ERROR : ",e);
    }
}

var delMenuIcon = function(req, res){
	console.log("------------------------------------------");
	console.log("Data come---",req.body);
	
	var conditions = {},
            fields = {};
	    conditions._id = req.body.chapter_id;
	    fields.MenuIcon = null;
	
	Chapter.update(conditions,{$set:fields},function( err , numAffected ){
		if( !err ){
			var response = {
				status: 200,
				message: "Menu Icon deleted successfully.",
				result : numAffected				
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
var delCoverArt = function(req, res){
	console.log("------------------------------------------");
	console.log("Data come---",req.body);
	
	var conditions = {},
            fields = {};
	    conditions._id = req.body.chapter_id;
	    fields.CoverArt = null;
	
	Chapter.update(conditions,{$set:fields},function( err , numAffected ){
		if( !err ){
			var response = {
				status: 200,
				message: "Cover Art deleted successfully.",
				result : numAffected				
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

// To push chapter id in capsule by arun sahani 20-05-2016
var pushChapterId = function(capsuleId , chapterId){
	Capsule.update({_id: capsuleId},{ $push: { Chapters: chapterId} },function(err,data){
		if (err) {
			console.log(err);
		}else{
			console.log("Chapter saved in capsule successfully.");
		}
	})
}

// To delete chapter id in capsule by arun sahani 20-05-2016
var pullChapterId = function(capsuleId , chapterId){
	var mongoose = require('mongoose');
	var chpId = mongoose.Types.ObjectId(chapterId);
	//db.Capsules.update({"_id": ObjectId("573ea437217581540bb6acab")},
	//{$pull: {'Chapters': {$in: [ObjectId('573ea914689766de10851e96')]}}})
	
	Capsule.update({_id: capsuleId},{ $pull: { 'Chapters': {$in :[chpId]} } },function(err,data1){
		if(err){
			console.log(err);
		} else{
			console.log("Chapter removed successfully.")
		}
	});
}

/*
var updateChapterForPageId = function(req,res){
	
	var conditionsIntial = {
		_id : req.headers.chapter_id,
	}
	Chapter.findOne(conditionsIntial).exec(function( err , results ){
		if( err ){
			console.log(err);
		}
		else{
			if(results.pages.length){
				var response = {
					status: 200,
					message: "Already updated.",
					result : results.length
				res.json(response);	
				}
			}else{
				var conditions = {
					ChapterId : req.headers.chapter_id,
					PageType : {$in : ["gallery" , "content"]}
				};
				var fields = {};
				Page.find(conditions , fields).exec(function( err , results ){
					if( err ){
						console.log(err);
					}
					else{
						console.log("Searching:",results)
						var conditions = {
							_id : req.headers.chapter_id,
						
						};
						
						if (results.length) {
							var pageCount = 0;
							for(var i=0;i< results.length;i++){
								Chapter.update({_id: conditions._id},{ $push: { pages: results[i]._id} },function(err,data){
									if (err) {
										console.log(err);
									}else{
										console.log("Page saved in chapter successfully.");
										
									}
								})
								pageCount++;
							}
							console.log("pageCount--------------------",pageCount);
							console.log("results.length +++++++++++++++++++",results.length);
							if (pageCount == results.length) {
								var response = {
									status: 200,
									message: "Chapter updated successfully.",
									result : results.length
								}
								res.json(response);
							}
						}else{
							var response = {
								status: 200,
								message: "No page exists.",
								result : results.length
							}
							res.json(response);
						}
					}
				});
			}
		}
	})
}
*/

var updateChapterForPageId = function(req,res){
	
	var conditionsIntial = {
		_id : req.headers.chapter_id,
	}
	Chapter.findOne(conditionsIntial).exec(function( err , results ){
		if( err ){
			console.log(err);
		}
		else{
			if(results.pages.length){
				var response = {
					status: 200,
					message: "Already updated.",
					result : results.length
				}
				res.json(response);	
			}else{
				var conditions = {
					ChapterId : req.headers.chapter_id,
					
				};
				var fields = {};
				Page.find(conditions , fields).exec(function( err , results ){
					if( err ){
						console.log(err);
					}
					else{
						console.log("Searching:",results)
						var conditions = {
							_id : req.headers.chapter_id,
						
						};
						
						if (results.length) {
							var pageCount = 0;
							for(var i=0;i< results.length;i++){
								Chapter.update({_id: conditions._id},{ $push: { pages: results[i]._id} },function(err,data){
									if (err) {
										console.log(err);
									}else{
										console.log("Page saved in chapter successfully.");
										
									}
								})
								pageCount++;
							}
							console.log("pageCount--------------------",pageCount);
							console.log("results.length +++++++++++++++++++",results.length);
							if (pageCount == results.length) {
								var response = {
									status: 200,
									message: "Chapter updated successfully.",
									result : results.length
								}
								res.json(response);
							}
						}else{
							var response = {
								status: 200,
								message: "No page exists.",
								result : results.length
							}
							res.json(response);
						}
					}
				});
			}
		}
	})
}

//dashboard
exports.dashboard__findAll = dashboard__findAll;

//Chapters In the making Apis
exports.find = find;
exports.findAll = findAll;
exports.findAllPaginated = findAllPaginated;
exports.createdByMe = createdByMe;
exports.sharedWithMe = sharedWithMe;
exports.createdForMe = createdForMe;
exports.byTheHouse = byTheHouse;
exports.saveSetting =saveSetting;

exports.all__getLaunchedChapters = all__getLaunchedChapters;
exports.launchedByMe__getLaunchedChapters = launchedByMe__getLaunchedChapters;
exports.invitationForMe__getLaunchedChapters = invitationForMe__getLaunchedChapters;

exports.create = create;
exports.duplicate = duplicate;
exports.remove = remove;
exports.reorder = reorder;
exports.updateChapterName = updateChapterName;
exports.uploadCover = uploadCover;
exports.invite = invite;
exports.inviteMember = inviteMember;
exports.removeInvitee = removeInvitee;
exports.addOwner = addOwner;
exports.removeOwner = removeOwner;

//Chapter library Apis
exports.addFromLibrary = addFromLibrary;
exports.preview = preview;
exports.share = share;

exports.uploadMenuIcon = uploadMenuIcon;
exports.delMenuIcon = delMenuIcon;
exports.delCoverArt = delCoverArt;
exports.updateChapterForPageId = updateChapterForPageId;


