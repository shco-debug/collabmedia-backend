var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var User = require('./../models/userModel.js');
var Friend = require('./../models/friendsModel.js');

var Order = require('./../models/orderModel.js');
var mongoose = require("mongoose");
var Cart = require('./../models/cartModel.js');

var fs = require('fs');
var formidable = require('formidable');
var mediaController = require('./../controllers/mediaController.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var im   = require('imagemagick');
//var Page = require('./../models/pageModel.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');

var async = require('async');

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
			Capsule.find(conditions , fields).count().exec(function( errr , resultsLength ){
				if (!errr) {
					var response = {
						count : resultsLength,
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
			Capsule.find(conditions , fields).count().exec(function( errr , resultsLength ){
				if (!errr) {
					var response = {
						count : resultsLength,
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
			Capsule.find(conditions , fields).count().exec(function( errr , resultsLength ){
				if (!errr) {
					var response = {
						count : resultsLength,
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
			Capsule.find(conditions , fields).count().exec(function( errr , resultsLength ){
				if (!errr) {
					var response = {
						count : resultsLength,
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

var allPublished_backup = function ( req , res ){
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
			Capsule.find(conditions , fields).exec(function( errr , resultsLength ){
				if (!errr) {
					var response = {
						count : resultsLength,
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

var allPublished = function ( req , res ){
	var finalObj = {
		count : 0,
		results : []
	};
	
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;

	var sortObj = {
		ModifiedOn : -1
	};

	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);

	async.series({
		getAllPublished : function(callback){
			var returnObj = {
				count : 0,
				results : []
			};
			
			var conditions = {
				$or : [
					{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"}
				],
				Status : true,
				IsDeleted : false
			};
			var fields = {}; 
			console.log("published by me = ",conditions);
			Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
				if( !err ){
					Capsule.find(conditions , fields).count().exec(function( errr , results2count ){
						if (!errr) {
						
							console.log("getAllPublished--------results2count-------------------------",results2count);
							console.log("getAllPublished--------results-------------------------",results);
							
							returnObj.count = results2count;
							returnObj.results = results;
							
							callback(null , returnObj);
						}
						else{
							return callback(errr , returnObj);
						}
					});
				}
				else{
					return callback(err , returnObj);
				}
			});
		},
		getAllInvited : function(callback){
			var returnObj = {
				count : 0,
				results : []
			};
		
			var conditions = {
				CapsuleId:{ $exists: true},
				//"LaunchSettings.Invitees.UserID" :req.session.user._id,
				"LaunchSettings.Invitees.UserEmail" :req.session.user.Email,
				IsLaunched : true,
				Status : true,
				IsDeleted : false
			}
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
					
					var totalNoOfPages = (capsules.length > 0 && capsules.length <= limit) ? 1 : (capsules.length == 0) ? 0 : Math.ceil(capsules.length/limit);
					
										
					Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
						if( !err ){
							Capsule.find(conditions , fields).count().exec(function(err , results2count){
								if(!err){
									console.log("results2count-------------------------",results2count);
									console.log("results-------------------------",results);
									returnObj.count = results2count;
									returnObj.results = results;
									
									callback(null , returnObj);
								}
								else{
									return callback(err , returnObj);
								}
							});
						}
						else{
							return callback(err , returnObj);
						}
					})
				}
				else{
					return callback(err , returnObj);
				}
			});
		}
	},
	function(err, results) {
		//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
		if(!err){
			console.log("*************************************** results**************",results);
			finalObj = {
				count : parseInt(results.getAllPublished.count + results.getAllInvited.count),
				results : results.getAllPublished.results.concat(results.getAllInvited.results)
			};
			console.log("-----------------------------finalObj------------------",finalObj);
			//sort it
			var response = {
				count : finalObj.count,
				status: 200,
				message: "Capsules listing",
				results : finalObj.results
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

var allDashboardCapsules = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;

	var sortObj = {
		ModifiedOn : -1
	};

	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);

	async.series({
		getAllInvitedCapsules : function(callback){
			var conditions = {
				CapsuleId:{ $exists: true},
				//"LaunchSettings.Invitees.UserID" :req.session.user._id,
				"LaunchSettings.Invitees.UserEmail" :req.session.user.Email,
				IsLaunched : true,
				Status : true,
				IsDeleted : false
			}
			var fields = {
				CapsuleId : true
			}; 
			
			Chapter.find(conditions, fields, function(err,result){
				if( !err ){
					var capsules=new Array();
					console.log(result);
					i = 0;
					for(test in result){
						if(result[test].CapsuleId){
							capsules[i]=result[test].CapsuleId;
						}
						i++;
					}        
					//console.log(capsules);
					callback(null , capsules);
				}
				else{
					return callback(err , []);
				}
			});
		}
	},
	function(err, results) {
		//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
		if(!err){
			console.log("*************************************** results**************",results);
			var allInvitedCapsulesIds = results.getAllInvitedCapsules.length ? results.getAllInvitedCapsules : [];
			var conditions = {
				$or : [
					{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience":"BUYERS",IsAllowedForSales : true}
				],
				Status : true,
				IsDeleted : false
			};
			
			if(allInvitedCapsulesIds.length){
				conditions = {
					$or : [
						{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience":"ME"},
						{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience":"ME"},
						{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience":"ME"},
						{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"},
						{CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience":"BUYERS",IsAllowedForSales : true},
						{_id : {$in:allInvitedCapsulesIds},IsPublished : true}
					],
					Status : true,
					IsDeleted : false
				};
			}
			var fields = {}; 
			console.log("My All Capsules =----------- ",conditions);
			Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
				if( !err ){
					Capsule.find(conditions , fields).count().exec(function( err , results2count ){
						if (!err) {
							console.log("getAllPublished--------results2count-------------------------",results2count);
							console.log("getAllPublished--------results-------------------------",results);
							
							var response = {
								count : results2count,
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
			//Capsule.find(conditions , fields).exec(function( errr , results2 ){
			Capsule.find(conditions , fields).count().exec(function( err , results2count ){
				if (!err) {
					var response = {
						count : results2count,
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
			//Capsule.find(conditions , fields).exec(function( errr , results2 ){
			Capsule.find(conditions , fields).count().exec(function( err , results2count ){
				if (!err) {
					var response = {
						count : results2count,
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
		//"LaunchSettings.Invitees.UserID" :req.session.user._id,
		"LaunchSettings.Invitees.UserEmail" :req.session.user.Email,
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
				if(result[test].CapsuleId){
					capsules[i]=result[test].CapsuleId;
				}
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
						count : capsules.length,
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
   * @Date:      		10 July 2017
   * @Method :   		ForSalesByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var ForSalesByMe = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	var conditions = {
		CreaterId : req.session.user._id,
		"LaunchSettings.Audience" : "BUYERS",
		IsPublished : true,
		IsAllowedForSales : true,
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).count().exec(function( errr , resultsLength ){
				if (!errr) {
					var response = {
						count : resultsLength,
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
									Order : true,
									CoverArtFirstPage : true,
									ChapterPlaylist : true
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
										data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
										data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];
										
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
															SelectedCriteria : true,
															HeaderBlurValue : true,
															HeaderTransparencyValue : true
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
																data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
																data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;
																																
																data.CreatedOn = nowDate;
																data.UpdatedOn = nowDate;
																
																var Desktop__allHiddenBoardId_Arr = [];
																var Tablet__allHiddenBoardId_Arr = [];
																var Mobile__allHiddenBoardId_Arr = [];

																var allHiddenBoardId_Arr = [];

																var Desktop__allHiddenBoardId__index_Arr = [];
																var Tablet__allHiddenBoardId__index_Arr = [];
																var Mobile__allHiddenBoardId__index_Arr = [];

																var margedArrOfAllQAPageIds = [];
																var UNIQUE__margedArrOfAllQAPageIds = [];

																var sourcePageId__DestinationPageId__Arr = [];
																	
																if(data.PageType == "content"){
																	data.CommonParams = result.CommonParams ? result.CommonParams : {};
																	data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
																	data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
																	data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};
																	
																	
																	//AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
																	//desktop viewport filter
																	data.ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportDesktopSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportDesktopSections.Widgets[loop];
																		widObj.Type = widObj.Type ? widObj.Type : "";
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
																				Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
																				Desktop__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'DESKTOP');
																			}
																		}
																	}
																	
																	//tablet viewport filter
																	data.ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportTabletSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportTabletSections.Widgets[loop];
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING_WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
																				Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
																				Tablet__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'TABLET');
																			}
																		}
																	}
																	
																	//mobile viewport filter
																	data.ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportMobileSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportMobileSections.Widgets[loop];
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
																				Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
																				Mobile__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'MOBILE');
																			}
																		}
																	}
																	
																	
																	margedArrOfAllQAPageIds = Desktop__allHiddenBoardId__index_Arr.concat(Tablet__allHiddenBoardId__index_Arr);
																	margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(Mobile__allHiddenBoardId__index_Arr);
																	
																	//UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();
																	
																	allHiddenBoardId_Arr = Desktop__allHiddenBoardId_Arr.concat(Tablet__allHiddenBoardId_Arr);
																	allHiddenBoardId_Arr = allHiddenBoardId_Arr.concat(Mobile__allHiddenBoardId_Arr);
																	
																	UNIQUE__allHiddenBoardId_Arr = allHiddenBoardId_Arr.unique();
																	
																	//just for testing...
																	var finalObj = {
																		Desktop__allHiddenBoardId__index_Arr : Desktop__allHiddenBoardId__index_Arr,
																		Tablet__allHiddenBoardId__index_Arr : Tablet__allHiddenBoardId__index_Arr,
																		Mobile__allHiddenBoardId__index_Arr : Mobile__allHiddenBoardId__index_Arr,
																		margedArrOfAllQAPageIds : margedArrOfAllQAPageIds,
																		UNIQUE__allHiddenBoardId_Arr : UNIQUE__allHiddenBoardId_Arr
																	}
																	
																	//now create new instances of the unique hidden boards and update the PageId on corresponding entries... 
																	async.series({
																		createNewInstance__HiddenBoard : function(callback){
																			if( finalObj.UNIQUE__allHiddenBoardId_Arr.length ){
																				var conditions = {
																					_id : {$in : finalObj.UNIQUE__allHiddenBoardId_Arr}
																				}
																				var fields = {
																					Medias : false
																				}
																				Page.find(conditions , fields).lean().exec(function(err , results){
																					if(!err){
																						console.log("-------------results------------",results);
																						var results = results ? results : [];
																						var returnCounter = 0;
																						var totalOps = results.length ? results.length : 0;
																						if(totalOps){
																							var oldPageId = null;
																							for( var loop = 0; loop < totalOps; loop++ ){
																								oldPageId = results[loop]._id;
																								var newInstanceData = results[loop];
																								newInstanceData.OriginatedFrom = oldPageId;
																								newInstanceData.Origin = 'duplicated';
																								
																								//console.log("WTF-----------------------",oldPageId);
																								delete newInstanceData._id;
																								//console.log("WTF-----------------------",oldPageId);
																								
																								newInstanceData.CreatedOn = Date.now();
																								newInstanceData.UpdatedOn = Date.now();
																								//console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
																								CreateNewInstance__HiddenBoardFunc ( oldPageId , newInstanceData , totalOps );
																							}
																							
																							function CreateNewInstance__HiddenBoardFunc ( sourcePageId , dataToSave , totalOps ) {
																								var sourcePageId = sourcePageId ? sourcePageId : "SOMETHING_WRONG";
																								//sourcePageId__DestinationPageId
																								Page(dataToSave).save(function(err , result){
																									returnCounter++;
																									if(!err){
																										var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
																										sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
																									}
																									else{
																										console.log("DB ERROR : ",err);
																										return callback(err);
																									}
																									
																									if( totalOps == returnCounter ){
																										callback(null , sourcePageId__DestinationPageId__Arr);
																									}
																								})
																							}
																						}
																						else{
																							callback(null , sourcePageId__DestinationPageId__Arr);
																						}
																					}
																					else{
																						console.log("DB ERROR : ",err);
																						return callback(err);
																					}
																				});
																			}
																			else{
																				callback(null , sourcePageId__DestinationPageId__Arr);
																			}
																		}
																	},
																	function(err, results) {
																		//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
																		if(!err){
																			console.log("*************************************** results**************",results);
																			var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
																			for( var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++  ){
																				var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
																				var SourcePageId = recordArr[0];
																				var NewPageId = recordArr[1];
																				console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ",finalObj.margedArrOfAllQAPageIds );
																				console.log("*************************************** SourcePageId**************NewPageId ",SourcePageId+"------------------"+NewPageId );
																				for( var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++ ){
																					var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
																					var SourcePageId_2 = recordArr2[0];
																					var WidgetIndex = recordArr2[1];
																					var Viewport = recordArr2[2];
																					if( SourcePageId_2 == SourcePageId ){
																						console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2+" ====== "+ SourcePageId );
																						switch (Viewport){
																							case 'DESKTOP' : 
																								data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																								
																							case 'TABLET' : 
																								data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																								
																							case 'MOBILE' : 
																								data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																						}
																					}
																				}
																			}
																		}
																		else{
																			console.log("**************************************************DB ERROR :",err);
																		}
																		
																		console.log("data = ",data);
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
																else{
																	console.log("data = ",data);
																	Page(data).save(function( err , result ){
																		if(!err){
																			console.log("----new page instance created..",result);
																		}
																		else{
																			console.log(err);
																		}
																	});
																}
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
	data.ModifiedOn = Date.now();
	//if this is called from member's dashboard then just unfollow him from the all chapters of the capsule
	//case pending ...
	//end
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

//this is upgraded version - now the same function will work for Owner (will delete the instance) and Members (will unfollow the member).
var remove_V2 = function ( req , res ){
	//check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check 
	
	var conditions = {
		_id : req.headers.capsule_id,
		OwnerId : req.session.user._id,
		IsDeleted : 0
	};
	
	
	var fields = {
		OwnerId : true
	};
	
	Capsule.find(conditions , fields).count().exec(function(err , resultLength){
		if( !err ){
			console.log("88888888888888888888888888888888888888888888resultLength-----------------------------------",resultLength);
			if(resultLength){	//Owner wants to delete - just delete the capsule paranently. 
				var conditions = {};
				var data = {};
				//console.log("req.headers = " , req.headers)
				
				conditions._id = req.headers.capsule_id;
				data.IsDeleted = 1;
				data.ModifiedOn = Date.now();
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
			else{				//Member wants to delete - just un-follow the member from this association.
				var UserEmail = req.session.user.Email;
				var findConditions = {
					CapsuleId : req.headers.capsule_id,
					'LaunchSettings.Invitees': { $elemMatch:{UserEmail :{$regex :new RegExp(UserEmail, "i")}} },
					IsDeleted : 0
				};
				
				Chapter.update(findConditions,{$pull:{'LaunchSettings.Invitees':{UserEmail:{$regex:new RegExp(UserEmail,"i")}}}},{multi:true},function(err,result){
					if (err) {
                        var response = {
							status: 501,
							message: "something went wrong" 
						}
						res.json(response);
                    }else{
                        var response = {
							status: 200,
							message: "Capsule deleted successfully.",
							result : result				
						}
						res.json(response);
                    }
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
	})

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
	data.ModifiedOn = Date.now();
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
									Order : true,
									CoverArtFirstPage : true,
									ChapterPlaylist : true
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
										data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
										data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];
										
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
															SelectedCriteria : true,
															HeaderBlurValue : true,
															HeaderTransparencyValue : true
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
																data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
																data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;
																
																data.CreatedOn = nowDate;
																data.UpdatedOn = nowDate;
																
																var Desktop__allHiddenBoardId_Arr = [];
																var Tablet__allHiddenBoardId_Arr = [];
																var Mobile__allHiddenBoardId_Arr = [];

																var allHiddenBoardId_Arr = [];

																var Desktop__allHiddenBoardId__index_Arr = [];
																var Tablet__allHiddenBoardId__index_Arr = [];
																var Mobile__allHiddenBoardId__index_Arr = [];

																var margedArrOfAllQAPageIds = [];
																var UNIQUE__margedArrOfAllQAPageIds = [];

																var sourcePageId__DestinationPageId__Arr = [];
																	
																if(data.PageType == "content"){
																	data.CommonParams = result.CommonParams ? result.CommonParams : {};
																	data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
																	data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
																	data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};
																	
																	
																	//AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
																	//desktop viewport filter
																	data.ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportDesktopSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportDesktopSections.Widgets[loop];
																		widObj.Type = widObj.Type ? widObj.Type : "";
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
																				Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
																				Desktop__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'DESKTOP');
																			}
																		}
																	}
																	
																	//tablet viewport filter
																	data.ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportTabletSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportTabletSections.Widgets[loop];
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING_WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
																				Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
																				Tablet__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'TABLET');
																			}
																		}
																	}
																	
																	//mobile viewport filter
																	data.ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportMobileSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportMobileSections.Widgets[loop];
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
																				Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
																				Mobile__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'MOBILE');
																			}
																		}
																	}
																	
																	
																	margedArrOfAllQAPageIds = Desktop__allHiddenBoardId__index_Arr.concat(Tablet__allHiddenBoardId__index_Arr);
																	margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(Mobile__allHiddenBoardId__index_Arr);
																	
																	//UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();
																	
																	allHiddenBoardId_Arr = Desktop__allHiddenBoardId_Arr.concat(Tablet__allHiddenBoardId_Arr);
																	allHiddenBoardId_Arr = allHiddenBoardId_Arr.concat(Mobile__allHiddenBoardId_Arr);
																	
																	UNIQUE__allHiddenBoardId_Arr = allHiddenBoardId_Arr.unique();
																	
																	//just for testing...
																	var finalObj = {
																		Desktop__allHiddenBoardId__index_Arr : Desktop__allHiddenBoardId__index_Arr,
																		Tablet__allHiddenBoardId__index_Arr : Tablet__allHiddenBoardId__index_Arr,
																		Mobile__allHiddenBoardId__index_Arr : Mobile__allHiddenBoardId__index_Arr,
																		margedArrOfAllQAPageIds : margedArrOfAllQAPageIds,
																		UNIQUE__allHiddenBoardId_Arr : UNIQUE__allHiddenBoardId_Arr
																	}
																	
																	//now create new instances of the unique hidden boards and update the PageId on corresponding entries... 
																	async.series({
																		createNewInstance__HiddenBoard : function(callback){
																			if( finalObj.UNIQUE__allHiddenBoardId_Arr.length ){
																				var conditions = {
																					_id : {$in : finalObj.UNIQUE__allHiddenBoardId_Arr}
																				}
																				var fields = {
																					Medias : false
																				}
																				Page.find(conditions , fields).lean().exec(function(err , results){
																					if(!err){
																						console.log("-------------results------------",results);
																						var results = results ? results : [];
																						var returnCounter = 0;
																						var totalOps = results.length ? results.length : 0;
																						if(totalOps){
																							var oldPageId = null;
																							for( var loop = 0; loop < totalOps; loop++ ){
																								oldPageId = results[loop]._id;
																								var newInstanceData = results[loop];
																								newInstanceData.OriginatedFrom = oldPageId;
																								newInstanceData.Origin = 'addedFromLibrary';
																								
																								//console.log("WTF-----------------------",oldPageId);
																								delete newInstanceData._id;
																								//console.log("WTF-----------------------",oldPageId);
																								
																								newInstanceData.CreatedOn = Date.now();
																								newInstanceData.UpdatedOn = Date.now();
																								//console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
																								CreateNewInstance__HiddenBoardFunc ( oldPageId , newInstanceData , totalOps );
																							}
																							
																							function CreateNewInstance__HiddenBoardFunc ( sourcePageId , dataToSave , totalOps ) {
																								var sourcePageId = sourcePageId ? sourcePageId : "SOMETHING_WRONG";
																								//sourcePageId__DestinationPageId
																								Page(dataToSave).save(function(err , result){
																									returnCounter++;
																									if(!err){
																										var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
																										sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
																									}
																									else{
																										console.log("DB ERROR : ",err);
																										return callback(err);
																									}
																									
																									if( totalOps == returnCounter ){
																										callback(null , sourcePageId__DestinationPageId__Arr);
																									}
																								})
																							}
																						}
																						else{
																							callback(null , sourcePageId__DestinationPageId__Arr);
																						}
																					}
																					else{
																						console.log("DB ERROR : ",err);
																						return callback(err);
																					}
																				});
																			}
																			else{
																				callback(null , sourcePageId__DestinationPageId__Arr);
																			}
																		}
																	},
																	function(err, results) {
																		//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
																		if(!err){
																			console.log("*************************************** results**************",results);
																			var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
																			for( var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++  ){
																				var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
																				var SourcePageId = recordArr[0];
																				var NewPageId = recordArr[1];
																				console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ",finalObj.margedArrOfAllQAPageIds );
																				console.log("*************************************** SourcePageId**************NewPageId ",SourcePageId+"------------------"+NewPageId );
																				for( var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++ ){
																					var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
																					var SourcePageId_2 = recordArr2[0];
																					var WidgetIndex = recordArr2[1];
																					var Viewport = recordArr2[2];
																					if( SourcePageId_2 == SourcePageId ){
																						console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2+" ====== "+ SourcePageId );
																						switch (Viewport){
																							case 'DESKTOP' : 
																								data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																								
																							case 'TABLET' : 
																								data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																								
																							case 'MOBILE' : 
																								data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																						}
																					}
																				}
																			}
																		}
																		else{
																			console.log("**************************************************DB ERROR :",err);
																		}
																		
																		console.log("data = ",data);
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
																else{
																	console.log("data = ",data);
																	Page(data).save(function( err , result ){
																		if(!err){
																			console.log("----new page instance created..",result);
																		}
																		else{
																			console.log(err);
																		}
																	});
																}
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
	var init_conditions = {};
	var fields = {
		Title : 1,
		CoverArt : 1
	};
	
	init_conditions._id = req.headers.capsule_id;
	
	Capsule.findOne(init_conditions , fields , function( err , result ){
		if( !err ){
			var shareWithEmail = req.body.share_with_email ? req.body.share_with_email : false;
			var shareWithName = req.body.share_with_name ? req.body.share_with_name : '';
			
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
						data.OriginatedFrom = init_conditions._id;	//logging refeerence of the parent capsule.
						
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
												Order : true,
												CoverArtFirstPage : true,
												ChapterPlaylist : true
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
													data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
													data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];
													
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
																		SelectedCriteria : true,
																		HeaderBlurValue : true,
																		HeaderTransparencyValue : true
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
																			data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
																			data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;
																			
																			data.CreatedOn = nowDate;
																			data.UpdatedOn = nowDate;
																			
																			var Desktop__allHiddenBoardId_Arr = [];
																			var Tablet__allHiddenBoardId_Arr = [];
																			var Mobile__allHiddenBoardId_Arr = [];

																			var allHiddenBoardId_Arr = [];

																			var Desktop__allHiddenBoardId__index_Arr = [];
																			var Tablet__allHiddenBoardId__index_Arr = [];
																			var Mobile__allHiddenBoardId__index_Arr = [];

																			var margedArrOfAllQAPageIds = [];
																			var UNIQUE__margedArrOfAllQAPageIds = [];

																			var sourcePageId__DestinationPageId__Arr = [];
																				
																			if(data.PageType == "content"){
																				data.CommonParams = result.CommonParams ? result.CommonParams : {};
																				data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
																				data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
																				data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};
																				
																				
																				//AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
																				//desktop viewport filter
																				data.ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];
																				
																				for( var loop = 0; loop < data.ViewportDesktopSections.Widgets.length; loop++ ){
																					var widObj = data.ViewportDesktopSections.Widgets[loop];
																					widObj.Type = widObj.Type ? widObj.Type : "";
																					if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																						widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																						var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
																						if( HiddenBoardId != 'SOMETHING__WRONG' ){
																							Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
																							Desktop__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'DESKTOP');
																						}
																					}
																				}
																				
																				//tablet viewport filter
																				data.ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];
																				
																				for( var loop = 0; loop < data.ViewportTabletSections.Widgets.length; loop++ ){
																					var widObj = data.ViewportTabletSections.Widgets[loop];
																					if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																						widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																						var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING_WRONG';
																						if( HiddenBoardId != 'SOMETHING__WRONG' ){
																							Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
																							Tablet__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'TABLET');
																						}
																					}
																				}
																				
																				//mobile viewport filter
																				data.ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];
																				
																				for( var loop = 0; loop < data.ViewportMobileSections.Widgets.length; loop++ ){
																					var widObj = data.ViewportMobileSections.Widgets[loop];
																					if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																						widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																						var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
																						if( HiddenBoardId != 'SOMETHING__WRONG' ){
																							Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
																							Mobile__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'MOBILE');
																						}
																					}
																				}
																				
																				
																				margedArrOfAllQAPageIds = Desktop__allHiddenBoardId__index_Arr.concat(Tablet__allHiddenBoardId__index_Arr);
																				margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(Mobile__allHiddenBoardId__index_Arr);
																				
																				//UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();
																				
																				allHiddenBoardId_Arr = Desktop__allHiddenBoardId_Arr.concat(Tablet__allHiddenBoardId_Arr);
																				allHiddenBoardId_Arr = allHiddenBoardId_Arr.concat(Mobile__allHiddenBoardId_Arr);
																				
																				UNIQUE__allHiddenBoardId_Arr = allHiddenBoardId_Arr.unique();
																				
																				//just for testing...
																				var finalObj = {
																					Desktop__allHiddenBoardId__index_Arr : Desktop__allHiddenBoardId__index_Arr,
																					Tablet__allHiddenBoardId__index_Arr : Tablet__allHiddenBoardId__index_Arr,
																					Mobile__allHiddenBoardId__index_Arr : Mobile__allHiddenBoardId__index_Arr,
																					margedArrOfAllQAPageIds : margedArrOfAllQAPageIds,
																					UNIQUE__allHiddenBoardId_Arr : UNIQUE__allHiddenBoardId_Arr
																				}
																				
																				//now create new instances of the unique hidden boards and update the PageId on corresponding entries... 
																				async.series({
																					createNewInstance__HiddenBoard : function(callback){
																						if( finalObj.UNIQUE__allHiddenBoardId_Arr.length ){
																							var conditions = {
																								_id : {$in : finalObj.UNIQUE__allHiddenBoardId_Arr}
																							}
																							var fields = {
																								Medias : false
																							}
																							Page.find(conditions , fields).lean().exec(function(err , results){
																								if(!err){
																									console.log("-------------results------------",results);
																									var results = results ? results : [];
																									var returnCounter = 0;
																									var totalOps = results.length ? results.length : 0;
																									if(totalOps){
																										var oldPageId = null;
																										for( var loop = 0; loop < totalOps; loop++ ){
																											oldPageId = results[loop]._id;
																											var newInstanceData = results[loop];
																											newInstanceData.OriginatedFrom = oldPageId;
																											newInstanceData.Origin = 'shared';
																											
																											//console.log("WTF-----------------------",oldPageId);
																											delete newInstanceData._id;
																											//console.log("WTF-----------------------",oldPageId);
																											
																											newInstanceData.CreatedOn = Date.now();
																											newInstanceData.UpdatedOn = Date.now();
																											//console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
																											CreateNewInstance__HiddenBoardFunc ( oldPageId , newInstanceData , totalOps );
																										}
																										
																										function CreateNewInstance__HiddenBoardFunc ( sourcePageId , dataToSave , totalOps ) {
																											var sourcePageId = sourcePageId ? sourcePageId : "SOMETHING_WRONG";
																											//sourcePageId__DestinationPageId
																											Page(dataToSave).save(function(err , result){
																												returnCounter++;
																												if(!err){
																													var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
																													sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
																												}
																												else{
																													console.log("DB ERROR : ",err);
																													return callback(err);
																												}
																												
																												if( totalOps == returnCounter ){
																													callback(null , sourcePageId__DestinationPageId__Arr);
																												}
																											})
																										}
																									}
																									else{
																										callback(null , sourcePageId__DestinationPageId__Arr);
																									}
																								}
																								else{
																									console.log("DB ERROR : ",err);
																									return callback(err);
																								}
																							});
																						}
																						else{
																							callback(null , sourcePageId__DestinationPageId__Arr);
																						}
																					}
																				},
																				function(err, results) {
																					//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
																					if(!err){
																						console.log("*************************************** results**************",results);
																						var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
																						for( var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++  ){
																							var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
																							var SourcePageId = recordArr[0];
																							var NewPageId = recordArr[1];
																							console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ",finalObj.margedArrOfAllQAPageIds );
																							console.log("*************************************** SourcePageId**************NewPageId ",SourcePageId+"------------------"+NewPageId );
																							for( var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++ ){
																								var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
																								var SourcePageId_2 = recordArr2[0];
																								var WidgetIndex = recordArr2[1];
																								var Viewport = recordArr2[2];
																								if( SourcePageId_2 == SourcePageId ){
																									console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2+" ====== "+ SourcePageId );
																									switch (Viewport){
																										case 'DESKTOP' : 
																											data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
																											data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																											break;
																											
																										case 'TABLET' : 
																											data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
																											data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																											break;
																											
																										case 'MOBILE' : 
																											data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
																											data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																											break;
																									}
																								}
																							}
																						}
																					}
																					else{
																						console.log("**************************************************DB ERROR :",err);
																					}
																					
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
																			else{
																				Page(data).save(function( err , result ){
																					if(!err){
																						console.log("----new page instance created..",result);
																					}
																					else{
																						console.log(err);
																					}
																				});
																			}
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
								
								var condition = {};
                                condition.name = "Share__Capsule"

                                EmailTemplate.find(condition, {}, function (err, results) {
                                    if (!err) {
                                        if (results.length) {
                                            var RecipientName = shareWithName ? shareWithName : '';
                                            User.find({'Email':shareWithEmail}, {'Name':true}, function (err, name) {
												if(name.length > 0){
												   var name = name[0].Name ? name[0].Name.split(' ') : "";
												   RecipientName = name[0];
												}
												
												var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";
												
												var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
												newHtml = newHtml.replace(/{CapsuleName}/g, data.Title);
												newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
												console.log("**** New Html - - >*****", newHtml,req.body);
												/*
												var transporter = nodemailer.createTransport({
													service: 'Gmail',
													auth: {
														user: 'collabmedia.scrpt@gmail.com',
														pass: 'scrpt123_2014collabmedia#1909'
													}
												}); 
												*/
												/*
												var options = {
													service: 'Godaddy',
													auth: {
														user: 'info@scrpt.com',
														pass: 'TaKe1Off13!MpdC'
													}
												};
												*/
												var transporter = nodemailer.createTransport(smtpTransport(process.EMAIL_ENGINE.info.smtpOptions))
												
												var to = shareWithEmail;
												results[0].subject = typeof(results[0].subject)=='string' ? results[0].subject : '';
												var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);
												
												var mailOptions = {
													//from: "Scrpt <collabmedia.scrpt@gmail.com>",
													from: process.EMAIL_ENGINE.info.senderLine,
													to: to,
													subject: (subject!='' ? subject : 'Scrpt - ' + req.session.user.Name + ' has shared a Capsule with you!'),
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
        var imgUrl = fields.capsule_id+'_'+Date.now()+ files.file.name;
		var mediaCenterPath = "/../../public/assets/Media/capsules/";
		var srcPath = __dirname + mediaCenterPath + imgUrl;
		fs.rename(files.file.path, srcPath, function(err) {
            if (err){
                throw err;
            }
            else {
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
					var	data = {
						$set:{
							CoverArt:imgUrl,
							ModifiedOn : Date.now()
						}
					};
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
	var price = req.body.price ? parseFloat(req.body.price) : 0;
	if(req.body.title){
		var title = req.body.title;
		
		var setObj = {
			'LaunchSettings.Audience' : makingFor,
			'LaunchSettings.ShareMode' : participation,
			'Title' : title,
			'ModifiedOn' : Date.now()
		};
		
		if(makingFor == 'BUYERS' && price == 0) {
			//setObj.Price = price;
		}
		else{
			setObj.Price = price;
		}
		
		Capsule.update(condition,{$set:setObj},{multi:false},function(err,numAffected){
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
	
		Capsule.update(condition,{$set:{'LaunchSettings.Audience' : makingFor,'Price' : price,'LaunchSettings.ShareMode' : participation, ModifiedOn : Date.now()}},{multi:false},function(err,numAffected){
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
								//if (features.width == features.height) {
								if (features.width == 50 && features.height == 50) {
									var dstPath = __dirname+mediaCenterPath+"resized/"+imgUrl;
									resize_image(srcPath,dstPath,50,50);
									var conditions = {},
									setData = {};
									conditions._id = fields.capsule_id;
									setData.MenuIcon = file_name;
									setData.ModifiedOn = Date.now();
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
	fields.ModifiedOn = Date.now();
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
	fields.ModifiedOn = Date.now();		
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


/*________________________________________________________________________
 * @Date:      		
 * @Method :   		
 * Created By: 		smartData Enterprises Ltd
 * Modified On:		-
 * @Purpose:
 * @Param:     		2
 * @Return:    	 	yes
 * @Access Category:	"UR"
 _________________________________________________________________________
 */

var getIds = function(req, res) {
    var conditions = {
        $or: [
            {CreaterId: req.session.user._id, Origin: "created", IsPublished: true, "LaunchSettings.Audience": "ME"},
            {CreaterId: req.session.user._id, Origin: "duplicated", IsPublished: true, "LaunchSettings.Audience": "ME"},
            {CreaterId: req.session.user._id, Origin: "addedFromLibrary", IsPublished: true, "LaunchSettings.Audience": "ME"}
        ],
        Status: true,
        IsDeleted: false
    };

    var fields = {
        Title:1,
        Origin:1,
        CreaterId:1,
        IsPublished:1,
        LaunchSettings:1
    };
    //console.log('***',conditions);
    Capsule.find(conditions,fields).exec(function(err, results) {
        if (!err) {
            var response = {
                status: 200,
                message: "Capsules listing",
                result: results
            }
            res.json(response);
        }
        else {
            console.log(err);
            var response = {
                status: 501,
                message: "Something went wrong."
            }
            res.json(response);
        }
    });
}

var saveMetaDataSettings = function(req,res){
	var condition = {};
	condition._id = req.headers.capsule_id ? req.headers.capsule_id : '0';
	if(req.body.MetaData){
        var metadata = req.body.MetaData;
		Capsule.update(condition,{$set:{'MetaData' :metadata }},{multi:false},function(err,numAffected){
			if (!err) {
				Capsule.findOne(condition,function(err,capsule){
					if (!err) {
						var response = {
							status: 200,
							message: "Capsule settings updated successfully.",
							result : capsule.MetaData
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
				});
			}else{
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		})
	}
} 

var saveMetaDataFsg = function(req,res){
	var condition = {};
	condition._id = req.body.capsuleId ? req.body.capsuleId : '0';
	//console.log('******************************',req.body);
	if(req.body.temp){
        var metadata = req.body.temp;
		Capsule.update(condition,{$set:{'MetaData.Fsg' :metadata.FSGsArr }},{multi:false},function(err,numAffected){
			if (!err) {
				Capsule.findOne(condition,function(err,capsule){
					if (!err) {
						console.log(capsule);
						var response = {
							status: 200,
							message: "Capsule settings updated successfully.",
							result : capsule.MetaData
						}
						res.json(response);
					}
				});
				
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
		var response = {
			status: 501,
			message: "Something went wrong." ,
			error : err
		}
		res.json(response);
	}
}

var savePhaseFocusKey = function(req,res){
	var condition = {};
	condition._id = req.body.capsuleId ? req.body.capsuleId : '0';
	var type = req.body.type ? req.body.type : 'Phase';
	//console.log('******************************',req.body);
	if(req.body.temp){
		if(type){
			if(type == 'Phase'){
				var data = {'MetaData.phase':req.body.temp}
			}else if(type == 'Focus'){
				var data = {'MetaData.focus':req.body.temp}
			}else if(type == 'Keywords'){
				var data = {'MetaData.keywords':req.body.temp}
			}

			//var metadata = req.body.temp;
			console.log(data);//return
			Capsule.update(condition,{$set:data},{multi:false},function(err,numAffected){
				if (!err) {
					Capsule.findOne(condition,function(err,capsule){
						if (!err) {
							console.log(capsule);
							var response = {
									status: 200,
									message: "Capsule settings updated successfully.",
									result : capsule.MetaData
							}
							res.json(response);
						}
					});

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
		else{
			var response = {
					status: 501,
					message: "Something went wrong."
			}
			res.json(response);
		}
	}
	else{
		var response = {
				status: 501,
				message: "Something went wrong."
		}
		res.json(response);
	}
} 

var getUniqueIds = function(req,res){
    var requiredIds = req.query.requiredIds?req.query.requiredIds:0;
    var uniqueIds= [];
    if(requiredIds.length){
        for( var j=0; j < requiredIds; j++ ){
            var text = "";
            var possible = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

            for( var i=0; i < 12; i++ ){
                  text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            uniqueIds.push(text);
        }
        var response = {
			status: 200,
			message:'Unique Ids received.',
			result : uniqueIds
		   
		}
	}else{
         var response = {
			status: 501,
			message:'Something went wrong.',
			result : uniqueIds
		   
		}
    }
	res.json(response);
}


var getCreaterName = function(req,res){
    var conditions = {};
    conditions._id = req.query.userId;
    var fields = {
        _id: 1,
        Name: 1
    }

    User.findOne(conditions, function(err, user) {
        var response = {
            status: 200,
            message: "User Data retrieved successfully",
            user: user
        }
        res.json(response);
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

var allUnverifiedCapsules = function ( req , res ){
	req.session = req.session ? req.session : {};
	req.session.user = req.session.user ? req.session.user : {};
	req.session.user.Email = req.session.user.Email ? req.session.user.Email : null;
	
	if(req.session.user.Email != null && process.CAPSULE_VERIFIER.indexOf(req.session.user.Email) >= 0 ) {

		var limit = req.body.perPage ? req.body.perPage : 0;
		var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
		console.log('--------------------limit = '+limit);
		console.log('--------------------Offset = '+offset);
		var conditions = {
			"LaunchSettings.Audience" : "BUYERS",
			IsPublished : true,
			IsAllowedForSales : false,
			Status : true,
			IsDeleted : false
		};
		
		var sortObj = {
			ModifiedOn : -1
		};
		
		var fields = {}; 
			
		Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
			if( !err ){
				Capsule.find(conditions , fields).count().exec(function( errr , resultsLength ){
					if (!errr) {
						var response = {
							count : resultsLength,
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
   * @Method :   		findAllPaginated
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var allPublicCapsules = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	console.log('--------------------limit = '+limit);
	console.log('--------------------Offset = '+offset);
	var conditions = {
		"LaunchSettings.Audience" : "BUYERS",
		IsPublished : true,
		IsAllowedForSales : true,
		Status : true,
		IsDeleted : false
	};
	
	var sortObj = {
		ModifiedOn : -1
	};
	
	var fields = {}; 
		
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function( err , results ){
		if( !err ){
			Capsule.find(conditions , fields).count().exec(function( errr , resultsLength ){
				if (!errr) {
					var response = {
						count : resultsLength,
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
   * @Method :   		deleteCapsule
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var approveCapsuleForSales = function ( req , res ){
	req.session = req.session ? req.session : {};
	req.session.user = req.session.user ? req.session.user : {};
	req.session.user.Email = req.session.user.Email ? req.session.user.Email : null;
	
	if(req.session.user.Email != null && process.CAPSULE_VERIFIER.indexOf(req.session.user.Email) >= 0 ) {
		var conditions = {};
		var data = {};
		
		conditions._id = req.headers.capsule_id;
		data.IsAllowedForSales = true;
		data.ModifiedOn = Date.now();
		Capsule.update(conditions , {$set:data} , function( err , result ){
			if( !err ){
				var response = {
					status: 200,
					message: "Capsule approved for sales by admin authority.",
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
		var response = {
			status: 501,
			message: "Something went wrong." 
		}
		res.json(response);
	}
}

var getCartCapsule = function ( req , res ){
	var conditions = {
           '_id':{$in:req.body.capsuleIds}
	};

	var fields = {}; 
	var count = 0;	
          var uniqueIds = [];
        
	Capsule.findOne(conditions , fields).exec(function( err , results ){
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


var updateCartCapsule = function ( req , res ){
	var data = {
		CreatedById:req.session.user._id,  
	}
	var operation = req.body.operation;
	var CartItems= {
		CapsuleId: req.body.capsuleId,
		CapsuleCreatedBy: req.body.CapsuleCreatedBy
	},
	query = {'CreatedById': req.session.user._id};
	
	if(operation == 'push'){
		doc = {
			$set: {CreatedById:req.session.user._id,CreatedByEmail:req.session.user.Email},
			$push: {CartItems: CartItems}
		}
	}
   
	options = {upsert: true};
	
	
	Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, record) {
		if (err) {
			var response = {status: 402,  message: "something went wrong please try again later.",results :record}
			res.json(response);
		} else {
			if (record == null) {
			   
				Cart.update(query,doc,options, function (err, ucart) {
					if (err) {
						console.log("ERROR----------@@@@@@@@@@@@@@@@--------",err);
						var response = {status: 403,  message: "something went wrong please try again later.",results :record}
						res.json(response);
					} else {
					   Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').populate('CartItems.CapsuleCreatedBy','Name').exec(function (err, recordLatest) {
							if(!err){
								var response = {status: 200,  message: "Capsules has been added to cart.",results : recordLatest}
								res.json(response);
							}
						})
					}
				})
				//res.jsonp({status: "Success", statusCode: 200, data: record, message: constObj.messages.noRecordFount});
			} else {
				Cart.findOne({CreatedById: req.session.user._id,CartItems: {$elemMatch: {CapsuleId: req.body.capsuleId}}}, function (err, recordMatch) {
					if (err) {
						var response = {status: 405,  message: "something went wrong please try again later.",results :record}
						res.json(response);
					} else {
						if(recordMatch == null){
							 Cart.update(query,doc,options, function (err, ucart) {
								if (err) {
									var response = {status: 406,  message: "something went wrong please try again later.",results : record}
									res.json(response);
									//res.jsonp({"status": "error", "data": "null", "error": {"code": 201, "message": err.message}});
								} else {
								   Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').populate('CartItems.CapsuleCreatedBy','Name').exec(function (err, recordLatest) {
										if(!err){
											var response = {status: 200,  message: "Capsules has been added.",results : recordLatest}
											res.json(response);
										}
									}) 
								}
							})
						}else{
							var response = {status: 201,  message: "Capsule already exists.",results : record}
							res.json(response);
						}
					}
				})
			}
		}
	});
}


var updatePullCartCapsule = function ( req , res ){
	var data = {
		CreatedById:req.session.user._id,  
	}
	var operation = req.body.operation;
	var CartItems= {
		CapsuleId: req.body.capsuleId,
	},
	query = {'CreatedById': req.session.user._id};
	if(operation == 'pull'){
		doc = {
			$pull: {CartItems: CartItems}
		}
	}
   
   
	Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, record) {
		if (err) {
			var response = {status: 407,  message: "Something went wrong.",results : err}
			 res.json(response);
		} else {
			if (record == null) {            
				 var response = {status: 200,  message: "This cart is empty.",results : record}
							res.json(response);
			} else {
				console.log(query);
				console.log(doc);
			   // console.log(query);
				Cart.update(query,doc, function (err, ucart) {
					if (err) {
						var response = {status: 408,  message: "Something went wrong.",results : err}
							res.json(response);
					} else {
						if(ucart.nModified == 1){
							Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').populate('CartItems.CapsuleCreatedBy','Name').exec(function (err, recordLatest) {
										if(!err){
										   var response = {status: 200,  message: "Capsule has been removed.",results : recordLatest}
											res.json(response);
										}
									}) 
						  
						}else{
							var response = {status: 200,  message: "This capsule does not exists.",results : record}
							res.json(response);
						}
					}
				})
			}
		}
	});
}



var getCart = function ( req , res ){
	//.populate('CartItems.CapsuleCreatedBy','Name')
	Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
        if(!err){
			Cart.populate(recordLatest, 
			{
				path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
				model: 'user',
				select : 'Name'
			}, function(err, recordLatest2) {
				if (err){
					console.log(err);
					var response = {status: 501,  message: "Error!",results : recordLatest}
					res.json(response);
				}
				else{
					//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
					var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
					res.json(response);
				}
			})
			
			//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
			//res.json(response);
        }
    })     
}

var updateCartOwners_v1 = function ( req , res ){
      
	var ownerObj = req.body.owner?req.body.owner:[];
	var text = "";
	var possible = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

	if(ownerObj.length >1 ){
		for(var j=0;j< ownerObj.length;j++ ){
			for( var i=0; i < 12; i++ ){
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			ownerObj[j].uniqueId = text;
		}
	}else{
		for( var i=0; i < 12; i++ ){
		  text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		ownerObj.uniqueId =  text;      
	}
	
	var CapsuleId =  req.body.capsuleId?req.body.capsuleId:[];
   
	query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};
   

	doc = {
		$push: {'CartItems.$.Owners':ownerObj}
	}
	
	console.log('------------------------------------------',doc);

	Cart.update(query,doc,function (err, record) {
		if (err) {
			 var response = {status: 402,  message: "something went wrong please try again later.",results :record}
						res.json(response);
		   
		} else {
			if (record.nModified == 1) {
					   Cart.findOne(query,{'CartItems.$': 1},function (err, recordLatest) {
							if(!err){
								var response = {status: 200,  message: "Owner added successfully.",results : recordLatest}
								res.json(response);
							}
						})
				   
			} else {
				var response = {status: 200,  message: "Incapable to update owner",results :record}
				res.json(response);
			}
		}
				
	});
}

var updateCartOwners = function ( req , res ){
	console.log(typeof req.body.owner);
	var ownerObj = req.body.owner?req.body.owner:[];
	var text = "";
	var possible = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	//console.log(req.body.owner.length);
	 var outOwnerArr = [];
	if(typeof ownerObj == 'object' ){
		outOwnerArr.push(ownerObj);
		console.log(')))))))))))))))))))',outOwnerArr.length);
		for( var i=0; i < 12; i++ ){
		  text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		ownerObj.uniqueId =  text;      
	}else{
		 for(var j=0;j< ownerObj.length;j++ ){
			for( var i=0; i < 12; i++ ){
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			ownerObj[j].uniqueId = text;
		   
		}
		 outOwnerArr = ownerObj;
	   
	}
	
	var CapsuleId =  req.body.capsuleId?req.body.capsuleId:[];
   
	var query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};
   
	var doc= {};
   
	
	//console.log('------------------------------------------',doc);
	
	Cart.findOne(query,{'CartItems.$': 1},function (err, commonRecordCheck) {
	if(!err){
			console.log('***-----------------***',commonRecordCheck);
			var insideOwners = commonRecordCheck.CartItems[0].Owners;
			console.log('***------ownerObj.length-----------***',outOwnerArr.length);
			console.log('***---------insideOwners.length--------***',insideOwners.length);
			for(var x = 0; x < outOwnerArr.length; x++){
			  
				//Iterate through all elements in second array    
				for(var y = 0; y < insideOwners.length; y++){


				  /*This causes us to compare all elements 
					 in first array to each element in second array
					Since md1[x] stays fixed while md2[y] iterates through second array.
					 We compare the first two indexes of each array in conditional
				  */
				  var countmatch = 0;
				  console.log(outOwnerArr[x].UserEmail,'------',insideOwners[y].UserEmail);
				  console.log(outOwnerArr[x].UserEmail,'------',insideOwners[y].UserEmail)
				  if(outOwnerArr[x].UserEmail == insideOwners[y].UserEmail){
					console.log('match found');
					//console.log(outOwnerArr[x][0],'',insideOwners[y][0]);
					console.log("outOwnerArr element with index " + x + " matches insideOwners element with index " + y);
					outOwnerArr.splice(x, 1);
					countmatch++;
					if(outOwnerArr.length == 0){
						break;
					}


				  }else{
					console.log('match not found');
					console.log("Array 1 element with index " + x + " matches Array 2 element with index " + y); 
				  }
				}
		}
		
		console.log('outer arra length',outOwnerArr.length);
		console.log('matched element count',countmatch);
		
		if(outOwnerArr.length == countmatch){
			if(outOwnerArr.length == 1){
				console.log('this owner already added');
				var response = {status: 200,  message: "Owner already exists",results :commonRecordCheck}
				res.json(response);
			}else{
				console.log('all selected owners already exists 7');
				var response = {status: 200,  message: "All group owners already exists",results :commonRecordCheck}
				res.json(response);
			}
		   
			
		}else{
			if(outOwnerArr.length == 1){
				console.log('one owner has been added (Object)');
				doc = {
					$push: {'CartItems.$.Owners':outOwnerArr[0]}
				}
				Cart.update(query,doc,function (err, record) {
					if (err) {
						 var response = {status: 402,  message: "something went wrong please try again later.",results :record}
									res.json(response);

					} else {
						if (record.nModified == 1) {
								   Cart.findOne(query,{'CartItems.$': 1},function (err, recordLatest) {
										if(!err){
											var response = {status: 200,  message: "Owner added successfully.",results : recordLatest}
											res.json(response);
										}
									})

						} else {
							var response = {status: 200,  message: "Incapable to update owner",results :record}
							res.json(response);
						}
					}

				});
			}else if(outOwnerArr.length > 1){
				console.log('more than one owners added');
				doc = {
					$push: {'CartItems.$.Owners':outOwnerArr}
				}
					Cart.update(query,doc,function (err, record) {
					if (err) {
						var response = {status: 402,  message: "something went wrong please try again later.",results :record}
						res.json(response);

					} else {
						if (record.nModified == 1) {
								   Cart.findOne(query,{'CartItems.$': 1},function (err, recordLatest) {
										if(!err){
											var response = {status: 200,  message: "Owners added successfully.",results : recordLatest}
											res.json(response);
										}
									})

						} else {
							var response = {status: 200,  message: "Incapable to update owner",results :record}
							res.json(response);
						}
					}

				});
			}else{
				Cart.findOne(query,{'CartItems.$': 1},function (err, recordLatest) {
					if(!err){
						var response = {status: 200,  message: "Owners already exists.",results : recordLatest}
						res.json(response);
					}
				})
			   
			}

			 
		}
		
	 
		}
	})
}

var updatePullCartOwners = function ( req , res ){
	var ownerEmail = req.body.ownerEmail?req.body.ownerEmail:"";
	
	var CapsuleId =  req.body.capsuleId?req.body.capsuleId:0;
   
	query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};

	doc = {
		$pull: {'CartItems.$.Owners':{UserEmail:ownerEmail}}
	}

	Cart.update(query,doc,function (err, record) {
		if (err) {
		   // console.log(err);
			 var response = {status: 402,  message: "something went wrong please try again later.",results :record}
						res.json(response);
		   
		} else {
			if (record.nModified == 1) {
				Cart.findOne(query,{'CartItems.$': 1},function (err, recordLatest) {
					if(!err){
						var response = {status: 200,  message: "Owner removed successfully.",results : recordLatest}
						res.json(response);
					}
				})
				   
			} else {
				var response = {status: 200,  message: "Incapable to update owner",results :record}
				res.json(response);
			}
		}
				
	});
}

var getCapsuleOwners = function ( req , res ){
    query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':req.query.capsuleId};
    Cart.findOne(query,{'CartItems.$': 1},function (err, recordLatest) {
        if(!err){
           var response = {status: 200,  message: "Cart owners  has been retrieved successfully.",results : recordLatest}
            res.json(response);
        }
    })     
}

var updateCartForMyself = function ( req , res ){
	var myself = req.session.user ? req.session.user : {};
	  var text = "";
		var possible = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		for( var i=0; i < 12; i++ ){
			  text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
	   // uniqueIds.push(text);
	var ownerObj = {
		UserID : myself._id,
		UserEmail : myself.Email,
		UserName : myself.Name,
		UserNickName : myself.NickName,
		CreatedOn : Date.now(),
		uniqueId:text,
		//member.Relation : myself.MemberRelation,
		//member.RelationId : myself.MemberRelationID,
		UserPic : myself.ProfilePic
		
	};
	
	//console.log(ownerObj);return
	
	var CapsuleId =  req.body.capsuleId?req.body.capsuleId:0;
   
	var query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};

	var doc = {
		$set: {'CartItems.$.PurchaseFor':'Myself','CartItems.$.Owners':[]}
	}
	 var docOnlyMyself = {
		$set: {'CartItems.$.PurchaseFor':'Myself'},
		$push: {'CartItems.$.Owners':ownerObj}
	}
	
	var docMyself = {
		$push: {'CartItems.$.Owners':ownerObj}
	}

	Cart.findOne(query,{'CartItems.$': 1},function (err, recordLatest) {
		if(!err){
		   if(recordLatest.CartItems[0].Owners.length){
			   //console.log('i am in');
			   Cart.update(query,doc,function (err, record) {
					if (err) {
						//.populate('CartItems.CapsuleCreatedBy','Name')
						Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
							if(!err){
								//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
								//res.json(response);
								
								Cart.populate(recordLatest, 
								{
									path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
									model: 'user',
									select : 'Name'
								}, function(err, recordLatest2) {
									if (err){
										console.log(err);
										var response = {status: 501,  message: "Error!",results : recordLatest}
										res.json(response);
									}
									else{
										//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
										var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
										res.json(response);
									}
								})
							}
						})  

					} else {
						if (record.nModified == 1) {
							Cart.update(query,docMyself,function (err, record) {
									if (err) {
										//.populate('CartItems.CapsuleCreatedBy','Name')
									    Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
											if(!err){
												//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
												//res.json(response);
												
												Cart.populate(recordLatest, 
												{
													path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
													model: 'user',
													select : 'Name'
												}, function(err, recordLatest2) {
													if (err){
														console.log(err);
														var response = {status: 501,  message: "Error!",results : recordLatest}
														res.json(response);
													}
													else{
														//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
														var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
														res.json(response);
													}
												})
											}
										})  

									} else {
										if (record.nModified == 1) {
											//.populate('CartItems.CapsuleCreatedBy','Name')
											Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
												if(!err){
													//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
													//res.json(response);
													
													Cart.populate(recordLatest, 
													{
														path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
														model: 'user',
														select : 'Name'
													}, function(err, recordLatest2) {
														if (err){
															console.log(err);
															var response = {status: 501,  message: "Error!",results : recordLatest}
															res.json(response);
														}
														else{
															//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
															var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
															res.json(response);
														}
													})
												}
											})  

										} else {
											//.populate('CartItems.CapsuleCreatedBy','Name')
											Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
												if(!err){
													//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
													//res.json(response);
													
													Cart.populate(recordLatest, 
													{
														path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
														model: 'user',
														select : 'Name'
													}, function(err, recordLatest2) {
														if (err){
															console.log(err);
															var response = {status: 501,  message: "Error!",results : recordLatest}
															res.json(response);
														}
														else{
															//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
															var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
															res.json(response);
														}
													})
												}
											})  
										}
									}

							});

						} else {
							//.populate('CartItems.CapsuleCreatedBy','Name')
							Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
								if(!err){
									//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
									//res.json(response);
									
									Cart.populate(recordLatest, 
									{
										path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
										model: 'user',
										select : 'Name'
									}, function(err, recordLatest2) {
										if (err){
											console.log(err);
											var response = {status: 501,  message: "Error!",results : recordLatest}
											res.json(response);
										}
										else{
											//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
											var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
											res.json(response);
										}
									})
								}
							})  
						}
					}

				});
		   }else{
			   Cart.update(query,docOnlyMyself,function (err, record) {
					if (err) {
						//.populate('CartItems.CapsuleCreatedBy','Name')
						Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
							if(!err){
								//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
								//res.json(response);
								
								Cart.populate(recordLatest, 
								{
									path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
									model: 'user',
									select : 'Name'
								}, function(err, recordLatest2) {
									if (err){
										console.log(err);
										var response = {status: 501,  message: "Error!",results : recordLatest}
										res.json(response);
									}
									else{
										//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
										var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
										res.json(response);
									}
								})
							}
						})  

					} else {
						if (record.nModified == 1) {
							//.populate('CartItems.CapsuleCreatedBy','Name')
							Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
								if(!err){
									//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
									//res.json(response);
									
									Cart.populate(recordLatest, 
									{
										path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
										model: 'user',
										select : 'Name'
									}, function(err, recordLatest2) {
										if (err){
											console.log(err);
											var response = {status: 501,  message: "Error!",results : recordLatest}
											res.json(response);
										}
										else{
											//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
											var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
											res.json(response);
										}
									})
								}
							})  

						} else {
							//.populate('CartItems.CapsuleCreatedBy','Name')
							Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
								if(!err){
									//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
									//res.json(response);
									
									Cart.populate(recordLatest, 
									{
										path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
										model: 'user',
										select : 'Name'
									}, function(err, recordLatest2) {
										if (err){
											console.log(err);
											var response = {status: 501,  message: "Error!",results : recordLatest}
											res.json(response);
										}
										else{
											//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
											var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
											res.json(response);
										}
									})
								}
							})  
						}
					}

				});
		   }
		}else{
			//.populate('CartItems.CapsuleCreatedBy','Name')
			Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
				if(!err){
					//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
					//res.json(response);
					
					Cart.populate(recordLatest, 
					{
						path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
						model: 'user',
						select : 'Name'
					}, function(err, recordLatest2) {
						if (err){
							console.log(err);
							var response = {status: 501,  message: "Error!",results : recordLatest}
							res.json(response);
						}
						else{
							//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
							var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
							res.json(response);
						}
					})
				}
			})  
		}
	});
}


var updateCartForGift = function ( req , res ){

	var CapsuleId =  req.body.capsuleId?req.body.capsuleId:0;
   
	var query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};

	var doc = {
		$set: {'CartItems.$.Owners':[],'CartItems.$.PurchaseFor':'Gift'}
	}
	
  
	Cart.update(query,doc,function (err, record) {
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@--------err--------------------",err);
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@--------record--------------------",record);
		if (err) {
			Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
				if(!err){
					//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
					//res.json(response);
					Cart.populate(recordLatest, 
					{
						path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
						model: 'user',
						select : 'Name'
					}, function(err, recordLatest2) {
						if (err){
							console.log(err);
							var response = {status: 501,  message: "Error!",results : recordLatest}
							res.json(response);
						}
						else{
							//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
							var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
							res.json(response);
						}
					})
				}
			})  
		   
		} else {
			if (record.nModified == 1) {
				 Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
					if(!err){
						//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
						//res.json(response);
						Cart.populate(recordLatest, 
						{
							path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
							model: 'user',
							select : 'Name'
						}, function(err, recordLatest2) {
							if (err){
								console.log(err);
								var response = {status: 501,  message: "Error!",results : recordLatest}
								res.json(response);
							}
							else{
								//console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));     
								var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
								res.json(response);
							}
						})
					}
				})  
				   
			} else {
				Cart.findOne({CreatedById:req.session.user._id}).populate('CartItems.CapsuleId').exec(function (err, recordLatest) {
					if(!err){
						//var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
						//res.json(response);
						Cart.populate(recordLatest, 
						{
							path: 'CartItems.CapsuleId.CreaterId',//CapsuleCreatedBy
							model: 'user',
							select : 'Name'
						}, function(err, recordLatest2) {
							if (err){
								console.log(err);
								var response = {status: 501,  message: "Error!",results : recordLatest}
								res.json(response);
							}
							else{
								//console.log(util.inspect(recordLatest2, {showHidden: true, depth: null}));     
								var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest2}
								res.json(response);
							}
						})
					}
				})   
			}
		}		
	});
}

var getMyPurchases = function ( req , res ){
    console.log('---------------------',req.session.user._id);
	
	var offset = req.body.offset ? req.body.offset : 0;
    var limit = req.body.limit ? req.body.limit : 10;
	
	var conditions = {
		CreatedById : req.session.user._id, 
		TransactionState : "Completed"
	};
	var sortObj = {
		UpdatedOn : -1
	};
	
    Order.find(conditions).populate('CartItems.CapsuleId').sort(sortObj).skip(offset).limit(limit).exec(function (err, recordLatest) {
		if(!err){
			Order.find(conditions).count().exec(function (err, dataCount) {
				if (!err) {
					var response = {status: 200,  message: "Orders has been retrieved successfully.",results : recordLatest, count: dataCount}
				} else {
					var response = {status: 501,  message: "Something went wrong.",results : recordLatest, count: 0}
				}
				res.json(response);
			});
		}
		else{
			var response = {status: 501,  message: "Something went wrong.",results : recordLatest, count: 0}
			res.json(response);
		}
    }) 
}

var getMySales = function ( req , res ){
	var offset = req.body.offset ? req.body.offset : 0;
    var limit = req.body.limit ? req.body.limit : 10;

    var userId = req.session.user._id ? req.session.user._id : null;
    Order.aggregate([ 
        { $match : { TransactionState : "Completed" , OrderInitiatedFrom : "PGALLARY" } },
		{ $sort: { CreatedOn: 1 } },
		{ $unwind : "$CartItems" }, 
        { $match : { "CartItems.CapsuleCreatedBy" : mongoose.Types.ObjectId(userId) } },
		{ $group : {_id:'$CartItems.CapsuleId', numberOfOrders: {$sum:1},NoOfSoldCopies : {$sum: {$size :"$CartItems.Owners"}}, TotalPayments : {$sum:"$CartItems.TotalPayment"} , TotalCommission: {$sum:"$CartItems.PlatformCommission"} , grossProfit: {$sum:{$subtract : ["$CartItems.TotalPayment", "$CartItems.PlatformCommission"]}}, SalesGraphData : {$push : {CreatedOn : { $subtract: [ "$CreatedOn", new Date("1970-01-01") ] },NoOfSoldCopies : {$size :"$CartItems.Owners"}}}}},
		{ $skip: offset },
		{ $limit: offset + limit },
		{ $lookup: {     
			"from": "Capsules",     
			"localField": "_id",     
			"foreignField": "_id",     
			"as": "capsuleData"   
        }}
    ]).exec(function (err, data) {
        //console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');
        //console.log(data);
		Order.aggregate([ 
			{ $match : { TransactionState : "Completed" , OrderInitiatedFrom : "PGALLARY" } },
			{ $sort: { CreatedOn: 1 } },
			{ $unwind : "$CartItems" }, 
			{ $match : { "CartItems.CapsuleCreatedBy" : mongoose.Types.ObjectId(userId) } },
			{ $group : {_id:'$CartItems.CapsuleId'}} 
		]).exec(function (err, total) {
			if(!err) {
				var response = {status: 200,  message: "Sales has been retrieved successfully.",results : data,count:total.length?total.length:0}
			}
			else{
				var response = {status: 501,  message: "Something went wrong.", results:data, count:total.length?total.length:0}
			}
			res.json(response);
		});
    });
}

var getSalesExcel = function ( req , res ){
	var json2xls = require('json2xls');
	var userId = req.session.user._id ? req.session.user._id : null;
	Order.aggregate([ 
		{ $match : { TransactionState : "Completed" , OrderInitiatedFrom : "PGALLARY" } },
        { $unwind : "$CartItems" }, 
        { $match : { "CartItems.CapsuleCreatedBy" : mongoose.Types.ObjectId(userId) } },
		{ $group : {_id:'$CartItems.CapsuleId', numberOfOrders: {$sum:1},NoOfSoldCopies : {$sum: {$size :"$CartItems.Owners"}}, TotalPayments : {$sum:"$CartItems.TotalPayment"} , TotalCommission: {$sum:"$CartItems.PlatformCommission"} , grossProfit: {$sum:{$subtract : ["$CartItems.TotalPayment", "$CartItems.PlatformCommission"]}}}}, 
		
        { $lookup: {     
                "from": "Capsules",     
                "localField": "_id",     
                "foreignField": "_id",     
                "as": "capsuleData"   
        }}, 
    ]).exec(function (err, data) {
		var json = [];
		data.length = data.length ? data.length : 0;
		if(data.length) {
			for(var i=0;i<data.length;i++){
				console.log("-----------------data[i].numberOfOrders------------------",data[i].numberOfOrders);
				var revenueField = {
					label : 'NoOfOrders(TotalSoldCopies)',
					value : data[i].numberOfOrders+" ("+data[i].NoOfSoldCopies+")"
				}
				
				json.push({'Capsule':data[i].capsuleData[0].Title ,'NoOfOrders(TotalSoldCopies)':revenueField.value,'Revenue($)':data[i].grossProfit});
			}
			//export only the field 'poo'
			var xls = json2xls(json,{
				fields: ['Capsule','NoOfOrders(TotalSoldCopies)','Revenue($)']
			});
			
			var filename = 'sales_'+userId+'.xlsx';
			var salesExcelPath =  "/../../media-assets/downloads/";
			var filePath = __dirname + salesExcelPath + filename;
			//fs.renameSync(fielname, xls, 'binary');
			fs.exists(filePath, function (exists) {
				if (exists) {
					//var filePath = 'c:/book/discovery.docx';
					fs.unlinkSync(filePath);
					fs.writeFileSync(filePath, xls, 'binary');
				}else {
				   fs.writeFileSync(filePath, xls, 'binary');
				}
			});

			if(filename){
				var response = {status: 200,  message: "Excel generated successfully.",'filename':filename}
			}
			else{
				var response = {status: 501,  message: "Something went wrong.",'filename':filename}
			}
			res.json(response);
		}
		else{
			var response = {status: 501,  message: "Something went wrong.",'filename':filename}
			res.json(response);
		}
    });
}

//Capsules In the making Apis
exports.find = find;
exports.findAll = findAll;
exports.findAllPaginated = findAllPaginated;
exports.createdByMe = createdByMe;
exports.sharedWithMe = sharedWithMe;
exports.byTheHouse = byTheHouse;

//dashboard
//exports.allPublished = allPublished;
exports.allPublished = allDashboardCapsules;
exports.publishedByMe = publishedByMe;
exports.publishedForMe = publishedForMe;
exports.invitationForMe = invitationForMe;
exports.ForSalesByMe = ForSalesByMe;

exports.create = create;
exports.duplicate = duplicate;
//exports.remove = remove;
exports.remove = remove_V2;		//both case 1) remove action by Owner 2) remove Action by Member
exports.reorder = reorder;
exports.updateCapsuleName = updateCapsuleName;
exports.uploadCover = uploadCover;
exports.saveSettings = saveSettings;
exports.invite = invite;
exports.inviteMember = inviteMember;
exports.removeInvitee = removeInvitee; 

//Capsule library Apis
exports.addFromLibrary = addFromLibrary;
exports.preview = preview;
exports.share = share;
exports.uploadMenuIcon = uploadMenuIcon;
exports.delMenuIcon = delMenuIcon;
exports.delCoverArt = delCoverArt;
exports.updateCapsuleForChapterId = updateCapsuleForChapterId;
exports.getIds = getIds;
exports.saveMetaDataSettings = saveMetaDataSettings;
exports.saveMetaDataFsg = saveMetaDataFsg;
exports.savePhaseFocusKey = savePhaseFocusKey;

//capsule payment apis
exports.getUniqueIds = getUniqueIds;
exports.getCreaterName = getCreaterName;
//capsule payment apis

exports.allUnverifiedCapsules = allUnverifiedCapsules;		//Verify Dashboard Apis
exports.allPublicCapsules = allPublicCapsules;				//Public Gallery Capsules Apis

exports.approveCapsuleForSales = approveCapsuleForSales;

//Buy Now From Public Gallery - Shoping Cart Apis
exports.getCartCapsule= getCartCapsule;
exports.getCart = getCart;
exports.updatePullCartCapsule = updatePullCartCapsule;
exports.updateCartCapsule = updateCartCapsule;
exports.updateCartOwners = updateCartOwners;
exports.updatePullCartOwners = updatePullCartOwners;
exports.getCapsuleOwners = getCapsuleOwners;
exports.updateCartForMyself = updateCartForMyself;
exports.updateCartForGift = updateCartForGift;
//Buy Now From Public Gallery - Shoping Cart Apis

exports.getMyPurchases = getMyPurchases;
exports.getMySales = getMySales;
exports.getSalesExcel = getSalesExcel;