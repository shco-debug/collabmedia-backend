var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var User = require('./../models/userModel.js');
var Friend = require('./../models/friendsModel.js');

var fs = require('fs');
var formidable = require('formidable');
var mediaController = require('./../controllers/mediaController.js');
var nodemailer = require('nodemailer');
var im   = require('imagemagick');
//var Page = require('./../models/pageModel.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');

var counters=require('./../models/countersModel.js');
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

//Capsules In the making Apis

/*________________________________________________________________________
   * @Date:      		07 September 2015
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
		_id: req.headers.capsule_id ? req.headers.capsule_id : 0,
		Status : 1,
		IsDeleted : 0
	};
	
	var fields = {};
	console.log('===========================================');
	console.log(conditions);
	console.log('===========================================');
	
	Capsule.findOne(conditions).exec(function( err , results ){
		if( !err ){
			var response = {
				status: 200,
				message: "Capsules listing",
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
   * @Date:      		07 September 2015
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
		CreaterId : req.session.user._id,
		IsPublished : false,
		Status : 1,
		IsDeleted : 0
	};
	*/
	var conditions = {
		CreaterId : req.session.user._id,
		$or : [
			{Origin : "created"},
			{Origin : "duplicated"},
			{Origin : "addedFromLibrary"}
		],
		IsPublished : false,
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Capsule.find(conditions , fields).sort(sortObj).exec(function( err , results ){
		if( !err ){
			var response = {
				status: 200,
				message: "Capsules listing",
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
   * @Date:      		07 September 2015
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
		//Origin : "created",
		OwnerId : req.session.user._id,
		Status : 1,
		IsDeleted : 0
	};
	*/
	var conditions = {
		$or : [
			{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience" : "OTHERS"},	//made for other - skeleton - this should have the option for addOther user
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
		
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Capsules listing",
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
   * @Date:      		07 September 2015
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
		CreaterId : req.session.user._id,
		Status : 1,
		IsDeleted : 0
	};
	*/
	var conditions = {
		$or : [
			{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience" : "OTHERS"}	//made for other - skeleton - this should have the option for addOther user
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Capsules listing",
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
   * @Date:      		07 September 2015
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
		IsDeleted : 0
	};
	*/
	var conditions = {
		$or : [
			{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "shared"}
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Capsules listing",
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
   * @Date:      		07 September 2015
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
		IsDeleted : 0
	};
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Capsules listing",
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
   * @Date:      		14 October 2015
   * @Method :   		allPublished
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var allPublished = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	/*
	var conditions = {
		$or : [
			{Origin:"created",CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{Origin:"duplicated",CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{Origin:"addedFromLibrary",CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{Origin:"published",OwnerId : req.session.user._id},
			//{Origin:"shared",OwnerId : req.session.user._id,IsPublised : false} //add invitation case here
		],
		//IsPublished : true, 
		Status : true,
		IsDeleted : false
	};
	*/
	var conditions = {
		$or : [
			{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience":"ME"},
			{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience":"ME"},
			{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience":"ME"},
			{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"}
			//{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id} //Add Invitation Logic here.
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
	
	console.log("published by me = ",conditions);
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Capsules listing",
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
   * @Date:      		14 October 2015
   * @Method :   		publishedByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var publishedByMe = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	
	/*
	var conditions = {
		CreaterId : req.session.user._id,
		"LaunchSettings.Audience" : "ME",
		$or : [
			{Origin:"created"},
			{Origin:"duplicated"},
			{Origin:"addedFromLibrary"}
		],
		IsPublished : true,
		Status : true,
		IsDeleted : false
	};
	*/
	var conditions = {
		$or : [
			{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience":"ME"},
			{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience":"ME"},
			{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience":"ME"}
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
	
	console.log("published by me = ",conditions);
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Capsules listing",
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
   * @Date:      		07 September 2015
   * @Method :   		publishedForMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var publishedForMe = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	/*
	var conditions = {
		OwnerId : req.session.user._id,
		"LaunchSettings.Audience" : "ME",
		$or : [
			{Origin:"published"}
		],
		//IsPublished : true,
		Status : true,
		IsDeleted : false
	};
	*/
	var conditions = {
		$or : [
			{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"}
		],
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).exec(function( errr , results2 ){
				if (!errr) {
					var response = {
						count : results2.length,
						status: 200,
						message: "Capsules listing",
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
   * @Date:      		07 September 2015
   * @Method :   		invitationForMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var invitationForMe = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	
	var conditions = {
		CapsuleId:{ $exists: true},
		"LaunchSettings.Invitees.UserID" :req.session.user._id,
		//"LaunchSettings.Invitees.UserEmail" :req.session.user.Email,
		IsLaunched : true,
		Status : true,
		IsDeleted : false
	}
	
	var fields = {
		CapsuleId : true
	}
	var sortObj = {
		//Order : 1,
		ModifiedOn : -1
	};
	
	var fields = {}; 
	
	Chapter.find(conditions, fields, function(err,result){
		if( !err ){
            var capsules=new Array();
            console.log(result);
            i = 0;
            for(test in result){
				capsules[i]=result[test].CapsuleId;
				i++;
            }        
			console.log(capsules);

			var conditions = {
				_id : {$in:capsules},
				IsPublished : true,
				IsLaunched : true,
				Status : true,
				IsDeleted : false
			}
			
			var fields = {
				//Title : true
			}
			var sortObj = {
				//Order : 1,
				ModifiedOn : -1
			};
			
			//Capsule.find(conditions,fields).exec(function(err,results){
			Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
				if( !err ){
					var response = {
						status: 200,
						message: "Capsules listing",
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
   * @Date:      		07 September 2015
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
	//set required field of the CapsuleModel
	data = {
		CreaterId : req.session.user._id,
		OwnerId : req.session.user._id,
	}
	console.log("data = ",data);	
	Capsule(data).save(function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Capsule created successfully.",
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


/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		duplicate
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var duplicate = function ( req , res ){
	//res.json({"status":"20000"});
	//console.log("status","20000");//return;

	//check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		Title : 1,
		CoverArt : 1
	};
	
	conditions._id = req.headers.capsule_id;
	
	Capsule.findOne(conditions , fields , function( err , result ){
		if( !err ){
			var data = {};
			data.Origin = "duplicated";
			data.OriginatedFrom = conditions._id;
			
			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.Title = result.Title;
			data.CoverArt = result.CoverArt;
			
			var nowDate = Date.now();
			data.CreatedOn = nowDate;
			data.ModifiedOn = nowDate;
			
			console.log("data = ",data);
			Capsule(data).save(function( err , result ){
				if( !err ){
					//console.log("==========CAPSULE INSTANCE : SUCCESS==================", result);
					
					//chapters under capsule
					var conditions = {
						CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0, 
						OwnerId : req.session.user._id,
						IsDeleted : false
					};
					var sortObj = {
						Order : 1,
						ModifiedOn : -1
					};
					var fields = {
						_id : true
					}; 
					
					var newCapsuleId = result._id;
					//console.log("&&&&&&&&&&&&&&&conditions = ",conditions);
					//Chapter.find(conditions , fields).sort(sortObj).exec(function( err , results ){
					Chapter.find(conditions , fields , function( err , results ){
						if(!err){
							console.log("==========CAPSULE INSTANCE : CHAPTERS COUNT ==================",results);
							for( var loop = 0; loop < results.length; loop++ ){
								var conditions = {};
								var fields = {
									Title : true,
									CoverArt : true,
									CapsuleId : true,
									Order : true
								};
								
								conditions._id = results[loop]._id;
								
								Chapter.findOne(conditions , fields , function( err , result ){
									if( !err ){
										var data = {};
										data.Origin = "duplicated";
										data.OriginatedFrom = conditions._id;
										
										data.CreaterId = req.session.user._id;
										data.OwnerId = req.session.user._id;
										data.Title = result.Title;
										data.CoverArt = result.CoverArt;
										data.CapsuleId = newCapsuleId;
										data.Order = result.Order;
										
										var nowDate = Date.now();
										data.CreatedOn = nowDate;
										data.ModifiedOn = nowDate;
										
										//console.log("Chapter under loop%%%%%%%%%%%%%%%%%%%%%%%%%%%%%data = ",data);
										var oldChapterId = result._id;
										//var Chapter = new Chapter(data);
										Chapter(data).save(function( err , result ){
										//Chapter.save(function( err , result ){
											if( !err ){
												//console.log("new chapter saved ------",result);
												//pages under chapters duplication will be implemented later
												var conditions = {
													ChapterId : oldChapterId, 
													OwnerId : req.session.user._id,
													IsDeleted : false,
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
														//console.log("@@@@@@@@@@@PAGE COUNT = ",results.length);
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
																data.Origin = "duplicated";
																data.OriginatedFrom = conditions._id;
																
																data.CreaterId = req.session.user._id;
																data.OwnerId = req.session.user._id;
																data.ChapterId = newChapterId;
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
																
																//console.log("-------",result);
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
					
					var response = {
						status: 20000,
						message: "Capsule duplicated successfully.",
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
	})
}

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		deleteCapsule
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var remove = function ( req , res ){
	//check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)
	
	conditions._id = req.headers.capsule_id;
	data.IsDeleted = 1;
	
	console.log("conditions = ",conditions);
	//Capsule.update(query , $set:data , function( err , result ){
	Capsule.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var conditions = {};
			var data = {};
						
			conditions.CapsuleId = req.headers.capsule_id;
			data.IsDeleted = 1;
			
			Chapter.update(conditions , {$set:data} , {multi:true} , function( err , result ){
				if( !err ){
					//get All chapters
					var fields = {
						_id : true
					};
					
					Chapter.find(conditions , fields , function( err , result ){
						if( !err ){
							
							var ChapterIds = [];
							for( var loop = 0; loop < result.length; loop++ ){
								ChapterIds.push(result[loop]._id);
							}
							var conditions = {};
							var data = {};
							
							conditions.ChapterId = {$in : ChapterIds};
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
				}
				else{
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong." 
					}
					console.log(response);
				}
			})
			
			var response = {
				status: 200,
				message: "Capsule deleted successfully.",
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



/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		reorder
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
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
	//check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check 
	var CapsuleIds = req.body.capsule_ids ? req.body.capsule_ids : [];
	//console.log("CapsuleIds = ",CapsuleIds);
	var resultCount = 0;
	for( var loop = 0; loop < CapsuleIds.length; loop++,resultCount++ ){
		var CapsuleId = CapsuleIds[loop];
		var conditions = {};
		var data = {};
		//console.log("req.headers = " , req.headers)
		conditions._id = CapsuleId;
		//console.log("conditions = ",conditions);
		findAndUpdate(conditions , loop+1);
	}
	
	function findAndUpdate(conditions , order){
		Capsule.findOne(conditions , function( err , result ){
			if( !err ){
				result.Order = order;
				//console.log("result = ",result);
				result.save(function(err , result){
					//console.log("Reordered = ",result);
				});
			}
		});
	}
	
	if( CapsuleIds.length > 0 && resultCount == CapsuleIds.length ){
		var response = {
			status: 200,
			message: "Capsules reordered successfully."
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
   * @Date:      		07 September 2015
   * @Method :   		updateCapsuleName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var updateCapsuleName = function ( req , res ){
	//check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)
	
	conditions._id = req.headers.capsule_id;
	data.Title = req.body.Capsule_name ? req.body.Capsule_name : "Untitled Capsule";
	
	console.log("conditions = ",conditions);
	//Capsule.update(query , $set:data , function( err , result ){
	Capsule.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Capsule name updated successfully.",
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


//Capsule library Apis

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
	
	//check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		Title : 1,
		CoverArt : 1
	};
	
	conditions._id = req.headers.capsule_id;
	
	Capsule.findOne(conditions , fields , function( err , result ){
		if( !err ){
			var data = {};
			data.Origin = "addedFromLibrary";
			data.OriginatedFrom = conditions._id;
			
			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.Title = result.Title;
			data.CoverArt = result.CoverArt;
			
			var nowDate = Date.now();
			data.CreatedOn = nowDate;
			data.ModifiedOn = nowDate;
			
			console.log("data = ",data);
			Capsule(data).save(function( err , result ){
				if( !err ){
					console.log("==========CAPSULE INSTANCE : SUCCESS==================", result);
					
					//chapters under capsule
					var conditions = {
						CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0, 
						OwnerId : req.session.user._id,
						IsDeleted : false
					};
					var sortObj = {
						Order : 1,
						ModifiedOn : -1
					};
					var fields = {
						_id : true
					}; 
					
					var newCapsuleId = result._id;
					console.log("&&&&&&&&&&&&&&&conditions = ",conditions);
					//Chapter.find(conditions , fields).sort(sortObj).exec(function( err , results ){
					Chapter.find(conditions , fields , function( err , results ){
						if(!err){
							console.log("==========CAPSULE INSTANCE : CHAPTERS COUNT ==================",results);
							for( var loop = 0; loop < results.length; loop++ ){
								var conditions = {};
								var fields = {
									Title : true,
									CoverArt : true,
									CapsuleId : true,
									Order : true
								};
								
								conditions._id = results[loop]._id;
								
								Chapter.findOne(conditions , fields , function( err , result ){
									if( !err ){
										var data = {};
										data.Origin = "addedFromLibrary";
										data.OriginatedFrom = conditions._id;
										
										data.CreaterId = req.session.user._id;
										data.OwnerId = req.session.user._id;
										data.Title = result.Title;
										data.CoverArt = result.CoverArt;
										data.CapsuleId = newCapsuleId;
										data.Order = result.Order;
										
										var nowDate = Date.now();
										data.CreatedOn = nowDate;
										data.ModifiedOn = nowDate;
										
										console.log("Chapter under loop%%%%%%%%%%%%%%%%%%%%%%%%%%%%%data = ",data);
										var oldChapterId = result._id;
										//var Chapter = new Chapter(data);
										Chapter(data).save(function( err , result ){
										//Chapter.save(function( err , result ){
											if( !err ){
												console.log("new chapter saved ------",result);
												//pages under chapters duplication will be implemented later
												/*
												var conditions = {
													ChapterId : oldChapterId, 
													OwnerId : req.session.user._id,
													IsDeleted : false
												};
												*/
												var conditions = {
													Origin : {$ne:"publishNewChanges"},
													ChapterId : oldChapterId,
													OwnerId : req.session.user._id,
													IsDeleted : false,
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
														console.log("@@@@@@@@@@@PAGE COUNT = ",results.length);
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
																data.Origin = "addedFromLibrary";
																data.OriginatedFrom = conditions._id;
																data.CreaterId = req.session.user._id;
																data.OwnerId = req.session.user._id;
																data.ChapterId = newChapterId;
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
					
					var response = {
						status: 20000,
						message: "Capsule added from library successfully.",
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
	})

}


/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		previewCapsule
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
	query._id = req.header.capsule_id;
	
	Capsule.findOne(query , fields , function( err , result ){
		
		var query = {};
		var fields = {};
		query._id = req.header.capsule_id;
		
		Page.find(data , function( err , result ){
			if( !err ){
				var response = {
					status: 200,
					message: "Capsule added successfully.",
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
   * @Date:      		07 September 2015
   * @Method :   		shareCapsule
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var share = function ( req , res ){
	//check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		Title : 1,
		CoverArt : 1
	};
	
	conditions._id = req.headers.capsule_id;
	
	Capsule.findOne(conditions , fields , function( err , result ){
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
						data.OriginatedFrom = conditions._id;
						
						data.CreaterId = req.session.user._id;
						
						if(!UserData.length){
							//Non-Registered user case
							data.OwnerId = req.session.user._id;
							//data.OwnerEmail = req.session.user.Email;
							data.OwnerEmail = shareWithEmail;			//fixed on 04Jan2017
						}
						else{
							data.OwnerId = UserData[0]._id;
							data.OwnerEmail = UserData[0].Email;
						}
						
						data.Title = result.Title;
						data.CoverArt = result.CoverArt;
						
						var nowDate = Date.now();
						data.CreatedOn = nowDate;
						data.ModifiedOn = nowDate;
						
						console.log("data = ",data);
						Capsule(data).save(function( err , result ){
							if( !err ){
								//console.log("==========CAPSULE INSTANCE : SUCCESS==================", result);
								
								//chapters under capsule
								var conditions = {
									CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0, 
									OwnerId : req.session.user._id,
									IsDeleted : false
								};
								var sortObj = {
									Order : 1,
									ModifiedOn : -1
								};
								var fields = {
									_id : true
								}; 
								
								var newCapsuleId = result._id;
								//console.log("&&&&&&&&&&&&&&&conditions = ",conditions);
								//Chapter.find(conditions , fields).sort(sortObj).exec(function( err , results ){
								Chapter.find(conditions , fields , function( err , results ){
									if(!err){
										console.log("==========CAPSULE INSTANCE : CHAPTERS COUNT ==================",results);
										for( var loop = 0; loop < results.length; loop++ ){
											var conditions = {};
											var fields = {
												Title : true,
												CoverArt : true,
												CapsuleId : true,
												Order : true
											};
											
											conditions._id = results[loop]._id;
											
											Chapter.findOne(conditions , fields , function( err , result ){
												if( !err ){
													var data = {};
													data.Origin = "shared";
													data.OriginatedFrom = conditions._id;
													
													data.CreaterId = req.session.user._id;
													
													if(!UserData.length){
														//Non-Registered user case
														data.OwnerId = req.session.user._id;
														//data.OwnerEmail = req.session.user.Email;
														data.OwnerEmail = shareWithEmail;			//fixed on 04Jan2017
													}
													else{
														data.OwnerId = UserData[0]._id;
														data.OwnerEmail = UserData[0].Email;
													}
													
													data.Title = result.Title;
													data.CoverArt = result.CoverArt;
													data.CapsuleId = newCapsuleId;
													data.Order = result.Order;
													
													var nowDate = Date.now();
													data.CreatedOn = nowDate;
													data.ModifiedOn = nowDate;
													
													//console.log("Chapter under loop%%%%%%%%%%%%%%%%%%%%%%%%%%%%%data = ",data);
													var oldChapterId = result._id;
													//var Chapter = new Chapter(data);
													Chapter(data).save(function( err , result ){
													//Chapter.save(function( err , result ){
														if( !err ){
															//console.log("new chapter saved ------",result);
															//pages under chapters duplication will be implemented later
															var conditions = {
																ChapterId : oldChapterId, 
																OwnerId : req.session.user._id,
																IsDeleted : false,
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
																	//console.log("@@@@@@@@@@@PAGE COUNT = ",results.length);
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
																			data.OriginatedFrom = conditions._id;
																			
																			data.CreaterId = req.session.user._id;
																			
																			if(!UserData.length){
																				//Non-Registered user case
																				data.OwnerId = req.session.user._id;
																				//data.OwnerEmail = req.session.user.Email;
																				data.OwnerEmail = shareWithEmail;			//fixed on 04Jan2017
																			}
																			else{
																				data.OwnerId = UserData[0]._id;
																				data.OwnerEmail = UserData[0].Email;
																			}
																			
																			data.ChapterId = newChapterId;
																			
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
																			
																			//console.log("-------",result);
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
								
								var response = {
									status: 200,
									message: "Capsule shared successfully.",
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
									subject: 'Scrpt - '+req.session.user.Name+' has sent you a Capsule!',
									text: 'http://203.100.79.94:8888/#/login', 
									html: "Hi , <br/><br/> Scrpt - "+req.session.user.Name+" has sent you a Capsule : '"+data.Title+"'.<br/><br/>Sincerely,<br>The Scrpt team. "
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
                                condition.name = "Share__Capsule"

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
												newHtml = newHtml.replace('{CapsuleName}', data.Title);
												newHtml = newHtml.replace('{RecipientName}', RecipientName);
												console.log("**** New Html - - >*****", newHtml,req.body);
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
													subject: 'Scrpt - ' + req.session.user.Name + ' has shared a Capsule with you!',
													//text: 'http://203.100.79.94:8888/#/login',
													html: newHtml
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
				console.log(err);
				var response = {
					status: 501,
					message: "Something went wrong." 
				}
				res.json(response);
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
    var uploadDir = "/../../public/assets/Media/capsules/";       //set upload directory
    form.keepExtensions = true;     //keep file extension
    form.parse(req, function(err, fields, files) {
        console.log("form.bytesReceived");
        console.log("file path: "+JSON.stringify(files.file[0]));
        console.log("file name: "+JSON.stringify(files.file.name));
        console.log("fields: "+fields);
        console.log("fields: "+JSON.stringify(fields));
        var dateTime = new Date().toISOString().replace(/T/,'').replace(/\..+/, '').split(" ");
        fs.rename(files.file.path, __dirname+"/../../public/assets/Media/capsules/"+  fields.capsule_id+'_'+Date.now()+ files.file.name, function(err) {
            if (err){
                throw err;
            }
            else {
                var imgUrl = fields.capsule_id+'_'+Date.now()+ files.file.name;
                var mediaCenterPath = "/../../public/assets/Media/capsules/";
                var srcPath = __dirname + mediaCenterPath + imgUrl;
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
					
					//update Capsule's CoverArt field
					var conditions = {_id:fields.capsule_id};
					var	data = {$set:{CoverArt:imgUrl}};
					Capsule.update(conditions , data , function(err , data){
						if(!err){
							var response = {
								status: 200,
								message: "Capsule cover uploaded successfully.",
								result : '/assets/Media/capsules/' + 'medium' + "/" + imgUrl 
							}
							res.json(response);
						}
						else{
							console.log('error2' )
							console.log(err);
							var response = {
								status: 501,
								message: "Something went wrong." 
							}
							res.json(response);
						}
					});
					
					
                }else{
					console.log('error2' )
					var response = {
						status: 501,
						message: "Something went wrong." 
					}
					res.json(response);
				}
				
            }
            console.log('renamed complete');  
        });
    });
}


/*________________________________________________________________________
   * @Date:      		17 sep 2015
   * @Method :   		saveSettings
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var saveSettings = function(req,res){
	console.log('getting here');
	var condition = {};
	condition._id = req.headers.capsule_id ? req.headers.capsule_id : '0';
	var makingFor = req.body.makingFor ? req.body.makingFor : 'ME';
	var participation = req.body.participation ? req.body.participation : 'private';
	if(req.body.title){
		var title = req.body.title;
		Capsule.update(condition,{$set:{'LaunchSettings.Audience' : makingFor,'LaunchSettings.ShareMode' : participation , Title : title}},{multi:false},function(err,numAffected){
		if (!err) {
			var response = {
				status: 200,
				message: "Capsule settings updated successfully.",
				result : numAffected
			}
			res.json(response);
		}else{
			var response = {
				status: 501,
				message: "Something went wrong." ,
				error : err
			}
			res.json(response);
		}
	})
	}else{
	
		Capsule.update(condition,{$set:{'LaunchSettings.Audience' : makingFor,'LaunchSettings.ShareMode' : participation}},{multi:false},function(err,numAffected){
			if (!err) {
				var response = {
					status: 200,
					message: "Capsule settings updated successfully.",
					result : numAffected
				}
				res.json(response);
			}else{
				var response = {
					status: 501,
					message: "Something went wrong." ,
					error : err
				}
				res.json(response);
			}
		})
	}
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
var invite = function(req,res){
	console.log('in function');
	var capsule_id = req.headers.capsule_id;
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
		Capsule.find({ _id : capsule_id ,  'LaunchSettings.Invitees': { $elemMatch: { UserEmail :{ $regex : new RegExp(invitee.email, "i") } } }  } , function(errr,dataa){
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
										console.log( capsule_id );
										Capsule.update({ _id : capsule_id },{$push : { "LaunchSettings.Invitees" : newInvitee}},{multi:false},function(err,data3){
											if (err) {
												var response = {
													status: 501,
													message: "Something went wrong." 
												}
												res.json(response)
											}else{
												console.log('updating capsule');
												
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
								Capsule.update({ _id : capsule_id },{$push : { "LaunchSettings.Invitees" : newInvitee}},{multi:false},function(err,data3){
									if (err) {
										var response = {
											status: 501,
											message: "Something went wrong." 
										}
										res.json(response)
									}else{
										console.log('updating capsule');
										
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
						message: "already invited" 
					}
					res.json(response);
				}
			}
		});
	}
}



/*________________________________________________________________________
   * @Date:      		1 Oct 2015
   * @Method :   		inviteMember
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var inviteMember = function ( req , res ){
	console.log('inviteMember');
	var capsule_id = req.headers.capsule_id;
	var member =  req.body.member ? req.body.member : '';
	Capsule.find({ _id : capsule_id ,  'LaunchSettings.Invitees': { $elemMatch: { UserEmail :{ $regex : new RegExp(member.UserEmail, "i") } } }  } , function(errr,dataa){
		if(errr){
			console.log('eerrrr1');
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response)
		}
		else{
			console.log(capsule_id);
			if (dataa.length == 0) {
				Capsule.update({ _id : capsule_id },{$push : { "LaunchSettings.Invitees" : member}},{multi:false},function(err,data3){
					if (err) {
						var response = {
							status: 501,
							message: "Something went wrong." 
						}
						res.json(response)
					}else{
						console.log('updating capsule');
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

/*________________________________________________________________________
   * @Date:      		1 Oct 2015
   * @Method :   		removeInvitee
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var removeInvitee = function ( req , res ){
	console.log('inviteMember');
	var capsule_id = req.headers.capsule_id;
	var member =  req.body.member ? req.body.member : '';
	Capsule.find({ _id : capsule_id ,  'LaunchSettings.Invitees': { $elemMatch: { UserEmail :{ $regex : new RegExp(member.UserEmail, "i") } } }  } , function(errr,dataa){
		if(errr){
			console.log('eerrrr1');
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response)
		}
		else{
			console.log(capsule_id);
			if (dataa.length == 0) {
				var response = {
					status: 401,
					message: "not a member" 
				}
				res.json(response);
			}else{
				Capsule.update({_id:capsule_id},{$pull:{'LaunchSettings.Invitees':{UserEmail :  { $regex : new RegExp(member.UserEmail, "i") }}}},{multi:false},function(err,data){
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

// //upload menu icon for capsule by arun sahani

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
		  console.log("fields  --",fields)
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
					try{
						im.identify(srcPath,function(err,features){
							if (err) {
								console.log(err);
							}else{
								if (features.width == features.height) {
									var dstPath = __dirname+mediaCenterPath+"resized/"+imgUrl;
									resize_image(srcPath,dstPath,50,50);
									var conditions = {},
									setData = {};
									conditions._id = fields.capsule_id;
									setData.MenuIcon = file_name;
									
									Capsule.update(conditions,{$set:setData},function( err , numAffected ){
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

// to delete menu icon of capsule

var delMenuIcon = function(req, res){
	console.log("------------------------------------------");
	console.log("Data come---",req.body);
	
	var conditions = {},
            fields = {};
	
	conditions._id = req.body.capsule_id;
	fields.MenuIcon = null;
			
	Capsule.update(conditions,{$set:fields},function( err , numAffected ){
		if( !err ){
			var response = {
				status: 200,
				message: "Menu icon deleted successfully.",
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
	
	conditions._id = req.body.capsule_id;
	fields.CoverArt = null;
			
	Capsule.update(conditions,{$set:fields},function( err , numAffected ){
		if( !err ){
			var response = {
				status: 200,
				message: "CoverArt deleted successfully.",
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

var updateCapsuleForChapterId = function(req,res){
	
	var conditionsIntial = {
		_id : req.headers.capsule_id,
	}
	Capsule.findOne(conditionsIntial).exec(function( err , results ){
		if( err ){
			console.log(err);
		}
		else{
			if(results.Chapters.length){
				var response = {
					status: 200,
					message: "Already updated.",
					result : results.length
				}
				res.json(response);	
			}else{
				var conditions = {
					CapsuleId : req.headers.capsule_id,
					
				};
				var fields = {};
				Chapter.find(conditions , fields).exec(function( err , results ){
					if( err ){
						console.log(err);
					}
					else{
						console.log("Searching:",results)
						var conditions = {
							_id : req.headers.capsule_id,
						
						};
						var chapterCount = 0;
						if (results.length) {
							for(var i=0;i< results.length;i++){
								
								Capsule.update({_id: conditions._id},{ $push: { Chapters: results[i]._id} },function(err,data){
									if (err) {
										console.log(err);
									}else{
										console.log("Chapter saved in capsule successfully.");
										
									}
								})
								chapterCount++;
							}
							
							if (chapterCount == results.length) {
								var response = {
									status: 200,
									message: "Capsule updated successfully.",
									result : results.length
								}
								res.json(response);
							}
						}else{
							var response = {
								status: 200,
								message: "No chapter exists.",
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

//Capsules In the making Apis
exports.find = find;
exports.findAll = findAll;
exports.findAllPaginated = findAllPaginated;
exports.createdByMe = createdByMe;
exports.sharedWithMe = sharedWithMe;
exports.byTheHouse = byTheHouse;

//dashboard
exports.allPublished = allPublished;
exports.publishedByMe = publishedByMe;
exports.publishedForMe = publishedForMe;
exports.invitationForMe = invitationForMe;

exports.create = create;
exports.duplicate = duplicate;
exports.remove = remove;
exports.reorder = reorder;
exports.updateCapsuleName = updateCapsuleName;
exports.uploadCover = uploadCover;
exports.saveSettings = saveSettings;
exports.invite = invite;
exports.inviteMember = inviteMember;
exports.removeInvitee = removeInvitee ; 

//Capsule library Apis
exports.addFromLibrary = addFromLibrary;
exports.preview = preview;
exports.share = share;

exports.uploadMenuIcon = uploadMenuIcon;

exports.delMenuIcon = delMenuIcon;

exports.delCoverArt = delCoverArt;

exports.updateCapsuleForChapterId = updateCapsuleForChapterId;
