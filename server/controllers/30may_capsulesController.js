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

var async_lib = require('async');

var counters=require('./../models/countersModel.js');

var SyncedPost = require('./../models/syncedpostModel.js');
const axios = require('axios');
var PageStream = require('./../models/pageStreamModel.js');
var StreamMembers = require('./../models/StreamMembersModel.js');
var ObjectId = mongoose.Types.ObjectId;

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


async function getCelebrities(StreamId) {
	var membersArr = [];
	var result = await Capsule.findOne({_id : ObjectId(StreamId), IsDeleted : false}, {_id : 1, CelebrityInstanceId : 1});
	result = typeof result == 'object' ? result : {};
	var CelebrityInstanceId = result.CelebrityInstanceId ? result.CelebrityInstanceId : null;
	
	if(!CelebrityInstanceId) {
		return {Celebrities : membersArr, CelebrityInstanceId : CelebrityInstanceId};
	}
	var conditions = {
		StreamId : ObjectId(CelebrityInstanceId),
		IsDeleted : false
	};
	
	var strm_result = await StreamMembers.find(conditions);//.populate('Members');
	strm_result = Array.isArray(strm_result) ? strm_result : [];
	strm_result = strm_result.length > 0 ? strm_result[0] : {};
	
	strm_result.Members = strm_result.Members ? strm_result.Members : [];
	strm_result.Members = Array.isArray(strm_result.Members) ? strm_result.Members : [];
	
	if(strm_result.Members.length) {
		var memberIds = [];
		for(var i = 0; i < strm_result.Members.length; i++) {
			memberIds.push(ObjectId(strm_result.Members[i]));
		}
		if(memberIds.length) {
			var conditions = {
				_id : {
					$in : memberIds
				},
				IsDeleted : 0
			};
			var fields = {
				Name : 1,
				Email : 1,
				ProfilePic : 1
			};
			var membersResult = await User.find(conditions, fields);
			for(var i = 0; i < membersResult.length; i++) {
				membersArr.push({
					_id : membersResult[i]._id,
					Name : membersResult[i].Name,
					Email : membersResult[i].Email
				});
			}
		}
	}
	return {Celebrities : membersArr, CelebrityInstanceId : CelebrityInstanceId};
}

function __sendEventAnnouncementEmail(OwnerEmail, OwnerName, StreamUrl) {
	console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@2Sending Email now to = ", OwnerEmail);
	var condition = {};
	condition.name = 'Event__Announcement__GroupStream';

	EmailTemplate.find(condition, {}, function (err, results) {
		if (!err) {
			if (results.length) {
				OwnerName = OwnerName ? OwnerName : '';
				OwnerEmail = OwnerEmail ? OwnerEmail : '';
				StreamUrl = StreamUrl ? StreamUrl : '';
				var newHtml = results[0].description ? results[0].description : '';
				newHtml = newHtml.replace(/{OwnerName}/g, OwnerName);
				newHtml = newHtml.replace(/{StreamUrl}/g, StreamUrl);
				var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
				var to = OwnerEmail;
				results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
				var subject = results[0].subject;

				var mailOptions = {
					from: process.EMAIL_ENGINE.info.senderLine,
					to: to, // list of receivers
					subject: subject,
					text: process.HOST_URL + '/login',
					html: newHtml
				};

				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
					} else {
						console.log('Message sent to: ' + to + info.response);
					}
				});
			}
		}
	});
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

	async_lib.series({
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

	//console.log('--------------------limit = '+limit);
	//console.log('--------------------Offset = '+offset);

	async_lib.series({
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
					//console.log(result);
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
			//console.log("*************************************** results**************",results);
			var allInvitedCapsulesIds = results.getAllInvitedCapsules.length ? results.getAllInvitedCapsules : [];
			var conditions = {
				$or : [
					{CreaterId : req.session.user._id, OwnerId : req.session.user._id,"LaunchSettings.Audience":"CELEBRITY","LaunchSettings.CapsuleFor":"Stream","LaunchSettings.StreamType":"Group"},
					{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience":"ME"},
					//{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{UniqueIdPerOwner : {$exists:true} , OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience":"BUYERS",IsAllowedForSales : true},
					{UniqueIdPerOwner : {$exists:true}, PurchasedBy : req.session.user._id, OwnerId : {$ne : req.session.user._id},Origin : "published", "LaunchSettings.Audience":"ME","LaunchSettings.CapsuleFor":"Stream","LaunchSettings.StreamType":"Group", IsSurpriseGift : true},
				],
				Status : true,
				IsDeleted : false
			};
			
			if(allInvitedCapsulesIds.length){
				conditions = {
					$or : [
						{CreaterId : req.session.user._id, OwnerId : req.session.user._id,"LaunchSettings.Audience":"CELEBRITY","LaunchSettings.CapsuleFor":"Stream","LaunchSettings.StreamType":"Group"},
						{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience":"ME"},
						{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience":"ME"},
						{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience":"ME"},
						//{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"},
						{UniqueIdPerOwner : {$exists:true} , OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"},
						{CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience":"BUYERS",IsAllowedForSales : true},
						{_id : {$in:allInvitedCapsulesIds},IsPublished : true},
						{UniqueIdPerOwner : {$exists:true}, PurchasedBy : req.session.user._id, OwnerId : {$ne : req.session.user._id},Origin : "published", "LaunchSettings.Audience":"ME","LaunchSettings.CapsuleFor":"Stream","LaunchSettings.StreamType":"Group", IsSurpriseGift : true},
					],
					Status : true,
					IsDeleted : false
				};
			}
			var fields = {}; 
			//console.log("My All Capsules =----------- ",conditions);
			Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).populate({
				path: 'OwnerId',
				model: 'user',
				select : '_id Name Email ProfilePic Birthdate',
				options: { lean: true}
			})
			.populate({
				path: 'PurchasedBy',
				model: 'user',
				select : '_id Name Email ProfilePic Birthdate',
				options: { lean: true}
			})
			.lean().exec(function( err , results ){
				if( !err ){
					var finalResults = [];
					var todayEnd = new Date();
					todayEnd.setHours(23,59,59,999);
					
					for ( var loop = 0; loop < results.length; loop++ ) {
						/*
						var OwnerId = results[loop].OwnerId._id;
						var OwnerName = results[loop].OwnerId.Name.split(' ')[0];
						results[loop].OwnerId = null;
						results[loop].OwnerId = OwnerId;
						results[loop].OwnerName = OwnerName;
						*/
						
						var OwnerDetails = typeof results[loop].OwnerId == 'object' ? results[loop].OwnerId : {};
						var PurchasedByObj = typeof results[loop].PurchasedBy == 'object' ? results[loop].PurchasedBy : {};
						
						results[loop].OwnerName = OwnerDetails.Name ? OwnerDetails.Name : '';
						results[loop].OwnerId = OwnerDetails._id ? OwnerDetails._id : '';
						results[loop].OwnerProfilePic = OwnerDetails.ProfilePic ? OwnerDetails.ProfilePic : '';
						
						results[loop].PurchasedByName = PurchasedByObj.Name ? PurchasedByObj.Name : '';
						results[loop].PurchasedBy = PurchasedByObj._id ? PurchasedByObj._id : '';
						results[loop].PurchasedByProfilePic = PurchasedByObj.ProfilePic ? PurchasedByObj.ProfilePic : '';
						
						
						results[loop].LaunchSettings.StreamType = results[loop].LaunchSettings.StreamType ? results[loop].LaunchSettings.StreamType : '';
						results[loop].IsSurpriseGift = results[loop].IsSurpriseGift ? results[loop].IsSurpriseGift : false;
						
						if(results[loop].LaunchSettings.CapsuleFor == 'Stream') {
							results[loop].MetaData = results[loop].MetaData ? results[loop].MetaData : {};
							results[loop].MetaData.StickerTextFriend = "Stream";
							results[loop].MetaData.StickerTextOwner = "Stream";
						}
						
						if(results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId != String(req.session.user._id)) {
							results[loop].Title = results[loop].OwnerName.split(' ')[0] +"'s " + results[loop].Title;
							if(results[loop].IsSurpriseGift) {
								if(String(results[loop].PurchasedBy) == String(req.session.user._id)) {
									//results[loop].Title = results[loop].OwnerName.split(' ')[0] +"'s " + results[loop].Title+ " (Surprise Gift)";
									results[loop].Title = results[loop].Title+ " (Surprise Gift)";
									
									results[loop].MetaData = results[loop].MetaData ? results[loop].MetaData : {};
									results[loop].MetaData.StickerTextFriend = "Surprise for "+OwnerDetails.Name.split(' ')[0];
									
									let todayYear = todayEnd.getFullYear();
									let todayTimestamp = todayEnd.getTime();
									
									OwnerDetails.Birthdate = OwnerDetails.Birthdate ? OwnerDetails.Birthdate : null;
									if(!OwnerDetails.Birthdate) {
										//continue;
									} else {
										let OwnerBirthdate = new Date(OwnerDetails.Birthdate);
										OwnerBirthdate.setFullYear(todayYear);
										
										let OBTimestamp = OwnerBirthdate.getTime();
										
										if(todayTimestamp >= OBTimestamp) {
											//continue;
										}
									}
								} else {
									continue;
								}
							} else {
								if(results[loop].LaunchSettings.Audience == 'CELEBRITY') {
									results[loop].Title = results[loop].Title + ' (Invited as Celebrity)';
								} else {
									results[loop].Title = results[loop].OwnerName.split(' ')[0] +"'s " + results[loop].Title;
								}
							}
						}
						
						
						if(results[loop].LaunchSettings.Audience == 'ME' && results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId == String(req.session.user._id) && !results[loop].IsSurpriseGift && String(results[loop].PurchasedBy) != '' && String(results[loop].PurchasedBy) != String(req.session.user._id)) {
							results[loop].Title = results[loop].Title;// + " (Gifted by "+ results[loop].PurchasedByName.split(' ')[0]+")";
							results[loop].MetaData = results[loop].MetaData ? results[loop].MetaData : {};
							results[loop].MetaData.StickerTextOwner = "Gifted by "+results[loop].PurchasedByName.split(' ')[0];
						}
						
						if(results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId == String(req.session.user._id) && results[loop].IsSurpriseGift && String(results[loop].PurchasedBy) != String(req.session.user._id)) {
							results[loop].Title = results[loop].Title;// + " (Gifted by "+ results[loop].PurchasedByName.split(' ')[0]+")";
							results[loop].MetaData = results[loop].MetaData ? results[loop].MetaData : {};
							results[loop].MetaData.StickerTextFriend = "Surprise from "+results[loop].PurchasedByName.split(' ')[0];
							
							let todayYear = todayEnd.getFullYear();
							let todayTimestamp = todayEnd.getTime();
							
							req.session.user.Birthdate = req.session.user.Birthdate ? req.session.user.Birthdate : null;
							if(!req.session.user.Birthdate) {
								continue;
							}				
							let OwnerBirthdate = new Date(req.session.user.Birthdate);
							OwnerBirthdate.setFullYear(todayYear);
							let OBTimestamp = OwnerBirthdate.getTime();
							
							if(todayTimestamp >= OBTimestamp) {
								continue;
							}
						}
						
						if(results[loop].LaunchSettings.Audience == 'CELEBRITY') {
							results[loop].MetaData.StickerTextFriend = "Stream for celebrities";
							results[loop].MetaData.StickerTextOwner = "Stream for celebrities";
						}
						
						finalResults.push(results[loop]);
					}
					
					Capsule.find(conditions , fields).count().exec(function( err , results2count ){
						if (!err) {
							//console.log("getAllPublished--------results2count-------------------------",results2count);
							//console.log("getAllPublished--------results-------------------------",results);
							
							var response = {
								count : results2count,
								status: 200,
								message: "Capsules listing",
								results : finalResults
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
	Capsule.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).populate({
		path: 'OwnerId',
		model: 'user',
		select : 'Name',
		options: { lean: true}
	})
	.lean().exec(function( err , results ){
		if( !err ){
			for ( var loop = 0; loop < results.length; loop++ ) {
				var OwnerId = results[loop].OwnerId._id;
				var OwnerName = results[loop].OwnerId.Name.split(' ')[0];
				results[loop].OwnerId = null;
				results[loop].OwnerId = OwnerId;
				results[loop].OwnerName = OwnerName;
			}
			
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
			//{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"}
			{UniqueIdPerOwner : {$exists:true} , OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"}
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
															TitleInvitees:true,
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
																data.TitleInvitees = result.TitleInvitees?result.TitleInvitees:result.Title;
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
																	async_lib.series({
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
															TitleInvitees:true,
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
																data.TitleInvitees = result.TitleInvitees?result.TitleInvitees:result.Title;
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
																	async_lib.series({
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
																				async_lib.series({
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
												var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
												
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
	var condition = {};
	condition._id = req.headers.capsule_id ? req.headers.capsule_id : '0';
	var makingFor = req.body.makingFor ? req.body.makingFor : 'ME';
	var CapsuleFor = req.body.CapsuleFor ? req.body.CapsuleFor : 'Stream';
	var StreamType = req.body.StreamType ? req.body.StreamType : null;
	var participation = req.body.participation ? req.body.participation : 'private';
	var price = req.body.price ? parseFloat(req.body.price) : 0;
	var DiscountPrice = req.body.DiscountPrice ? parseFloat(req.body.DiscountPrice) : 0;
	
	req.body.LaunchSettings = req.body.LaunchSettings ? req.body.LaunchSettings : {};
	var OwnerBirthday = req.body.LaunchSettings.OwnerBirthday ? req.body.LaunchSettings.OwnerBirthday : null;
	
	var StreamFlow = req.body.StreamFlow ? req.body.StreamFlow : 'Birthday';
	var OwnerAnswer = req.body.OwnerAnswer ? req.body.OwnerAnswer : false;
	var IsOwnerPostsForMember = req.body.IsOwnerPostsForMember ? req.body.IsOwnerPostsForMember : false;
	var IsPurchaseNeededForAllPosts = req.body.IsPurchaseNeededForAllPosts ? req.body.IsPurchaseNeededForAllPosts : false;
	
	if(req.body.title){
		var title = req.body.title;
		
		var setObj = {
			'LaunchSettings.Audience' : makingFor,
			'LaunchSettings.CapsuleFor' : CapsuleFor,
			'LaunchSettings.ShareMode' : participation,
			'Title' : title,
			'ModifiedOn' : Date.now()
		};
		
		if(setObj['LaunchSettings.CapsuleFor'] == 'Stream') {
			setObj['LaunchSettings.StreamType'] = StreamType ? StreamType : '';
			setObj['StreamFlow'] = StreamFlow;
			setObj['OwnerAnswer'] = OwnerAnswer;
			setObj['IsOwnerPostsForMember'] = IsOwnerPostsForMember;
			setObj['IsPurchaseNeededForAllPosts'] = IsPurchaseNeededForAllPosts;			
		}
		
		if(OwnerBirthday) {
			setObj['LaunchSettings.OwnerBirthday'] = OwnerBirthday;
		}
		
		if(makingFor == 'BUYERS' && price == 0) {
			//setObj.Price = price;
		}
		else{
			setObj.Price = price;
		}
		
		setObj.DiscountPrice = DiscountPrice;
		
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
	} else{
	
		Capsule.update(condition,{$set:{'LaunchSettings.CapsuleFor' : CapsuleFor,'LaunchSettings.Audience' : makingFor,'Price' : price,'LaunchSettings.ShareMode' : participation, ModifiedOn : Date.now()}},{multi:false},function(err,numAffected){
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
	console.log('in function------------------------------------------------');
	return;
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
	
	var specialUsers = ["manishpodiyal@gmail.com", "manishpodiyal@yopmail.com", "darshanchitrabhanu@gmail.com", "scrptco@gmail.com", "darshannyc@gmail.com"];
	if(specialUsers.indexOf(req.session.user.Email) < 0) {
		conditions._id = {$nin : mongoose.Types.ObjectId("60749d76d308334419f2fcf1")}; //don't show The Elements to public users
	}
	
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
		$set: {'CartItems.$.Owners':[],'CartItems.$.PurchaseFor':'Gift','CartItems.$.IsSurpriseGift':false}
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

var updateCartForSurpriseGift = function ( req , res ){

	var CapsuleId =  req.body.capsuleId?req.body.capsuleId:0;
   
	var query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};

	var doc = {
		$set: {'CartItems.$.Owners':[],'CartItems.$.PurchaseFor':'Gift','CartItems.$.IsSurpriseGift':true}
	}
	
  
	Cart.update(query,doc,function (err, record) {
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

var updateCartForMonth = function ( req , res ){

	var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
   
	var query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};

	var doc = {
		$set: {'CartItems.$.MonthFor' : req.body.MonthFor ? req.body.MonthFor : 'M1' }
	}
	
  
	Cart.update(query,doc,function (err, record) {
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


var updateCartForFrequency = function ( req , res ){

	var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
   
	var query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};

	var doc = {
		$set: {'CartItems.$.Frequency' : req.body.Frequency ? req.body.Frequency : 'high'}
	}
	
  
	Cart.update(query,doc,function (err, record) {
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

var updateCartForEmailTemplate = function ( req , res ){

	var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
   
	var query = {'CreatedById': req.session.user._id,'CartItems.CapsuleId':CapsuleId};

	var doc = {
		$set: {'CartItems.$.EmailTemplate' : req.body.EmailTemplate ? req.body.EmailTemplate : 'ImaginativeThinker'}
	}
	
  
	Cart.update(query,doc,function (err, record) {
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
var saveBirthday = function(req,res){
	var condition = {};
	condition._id = req.headers.capsule_id ? req.headers.capsule_id : '0';
	var OwnerBirthday = req.body.OwnerBirthday ? req.body.OwnerBirthday : null;
	
	if(OwnerBirthday){
		var setObj = {
			'LaunchSettings.OwnerBirthday' : OwnerBirthday,
			'ModifiedOn' : Date.now()
		};
		
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
	} else{
		var response = {
			status: 501,
			message: "Something went wrong." ,
			error : err
		}
		res.json(response);
	}
} 

var updateCartForMonth_ActiveCapsule = async function ( req , res ){

	var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
   
	var conditions = {
		_id : CapsuleId
	};

	var doc = {
		$set: {'MonthFor' : req.body.MonthFor ? req.body.MonthFor : 'M1'}
	}
	
	var result = await Capsule.update(conditions, doc);
	
	req.body.perPage = 25; 
	req.body.pageNo = 1;
	req.body.qc = "allPublished";
	allDashboardCapsules(req, res);
}

var updateCartForFrequency_ActiveCapsule = async function ( req , res ){

	var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
   
	var conditions = {
		_id : CapsuleId
	};

	var doc = {
		$set: {'Frequency' : req.body.Frequency ? req.body.Frequency : 'high'}
	}
	
	var result = await Capsule.update(conditions, doc);
	
	req.body.perPage = 25; 
	req.body.pageNo = 1;
	req.body.qc = "allPublished";
	allDashboardCapsules(req, res);
}

var toggleStream = async function ( req , res ){

	var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
   
	var conditions = {
		_id : CapsuleId
	};
	
	var result = await Capsule.findOne(conditions);
	var toggleValue = result.IsPaused ? false : true;
		
	var doc = {
		$set: {'IsPaused' : toggleValue}
	}
	
	var result = await Capsule.update(conditions, doc);
	
	req.body.perPage = 25; 
	req.body.pageNo = 1;
	req.body.qc = "allPublished";
	allDashboardCapsules(req, res);
}

function __getEmailEngineDataSetsBasedOnMonthAndKeyPost (CapsuleData) {
	var EmailEngineDataSets = [];
	
	var selectedMonths = CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M12';
	
	var afterDaysArr = process.StreamConfig[selectedMonths]['KeyPost'] ? process.StreamConfig[selectedMonths]['KeyPost'] : [];
	for(var i = 0; i < afterDaysArr.length; i++) {
		EmailEngineDataSets.push(
			{
				TextAboveVisual : '',
				TextBelowVisual : '',
				AfterDays : afterDaysArr[i]
			}
		);
	}
	
	return EmailEngineDataSets;
	
}

function __getEmailEngineDataSetsForKeyPost (currentPostObj, PagePosts, EmailEngineDataSets, CapsuleData) {
	//console.log("PagePosts.length ==--------------- ", PagePosts.length);
	var IsOnetimeStream = true;
	var IsOnlyPostImage = true; //CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
	
	var concatPostsArr = PagePosts;
	if(!IsOnetimeStream && (EmailEngineDataSets.length > PagePosts.length)) {
		var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts.length);
		for(var i = 0; i < neededConcatNo; i++) {
			concatPostsArr = concatPostsArr.concat(PagePosts);
		}
	}
	
	//var loopLimit = EmailEngineDataSets.length;
	var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	if(IsOnetimeStream) {
		loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	}
	
	var NewEmailEngineDataSets = [];
	var selectBlendImageCounter = -1;
	for(var i = 0; i < loopLimit; i++) {
		var postObj = concatPostsArr[i];
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[i];
			emailDataSet.VisualUrls = [];
			
			if(IsOnlyPostImage) {
				var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
				PostImage = PostImage ? PostImage : '';
				PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
				
				emailDataSet.VisualUrls[0] = PostImage;
				emailDataSet.VisualUrls[1] = PostImage;
				emailDataSet.BlendMode = 'hard-light';
			} else {
				if(postObj.SelectedBlendImages.length) {
					selectBlendImageCounter++;
					if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
						emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
						emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
					}
					
					emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';
					
					if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
						selectBlendImageCounter = -1;
					}
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}
		
	
	return NewEmailEngineDataSets;
	
}


function __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData) {
	console.log("__getEmailEngineDataSetsBasedOnMonthAndFreq ------------- ");
	var EmailEngineDataSets = [];
	
	var frequency = CapsuleData.Frequency ? CapsuleData.Frequency : 'medium';
	var selectedMonths = CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M1';
	
	var afterDaysArr = process.StreamConfig[selectedMonths][frequency] ? process.StreamConfig[selectedMonths][frequency] : [];
	for(var i = 0; i < afterDaysArr.length; i++) {
		EmailEngineDataSets.push(
			{
				TextAboveVisual : '',
				TextBelowVisual : '',
				AfterDays : afterDaysArr[i]
			}
		);
	}
	
	return EmailEngineDataSets;
	
}

function __getEmailEngineDataSetsBasedOnMonthAndFreq_GS(CapsuleData) {
	console.log("__getEmailEngineDataSetsBasedOnMonthAndFreq_GS ------------- ");
	var EmailEngineDataSets = [];
	
	var frequencyInDays = CapsuleData.FrequencyInDays ? CapsuleData.FrequencyInDays : '2';
	frequencyInDays = parseInt(frequencyInDays);
	
	var selectedMonths = CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M1';
	selectedMonths = selectedMonths.replace('M', '');
	selectedMonths = parseInt(sMonths);
	var totalDays = selectedMonths * 30;
	var afterDaysArr = ['1'];
	
	for(var loop = 1; loop < totalDays; loop++) {
		var pushDayOfDelivery = loop+frequencyInDays;
		afterDaysArr.push(String(pushDayOfDelivery));
	}
	
	for(var i = 0; i < afterDaysArr.length; i++) {
		EmailEngineDataSets.push(
			{
				TextAboveVisual : '',
				TextBelowVisual : '',
				AfterDays : afterDaysArr[i]
			}
		);
	}
	
	return EmailEngineDataSets;
	
}

function getAfterDaysForEditorialPost(currentIdx, EtArray, PostArray) {
	var gap = 6;
	var afterDays = 1;
	var nextIndex = 0;
	for(var i = currentIdx-1; i >= 0; i-- ) {
		var nextIndex = i+gap;
		if(nextIndex > PostArray.length) {
			nextIndex = currentIdx;
		}
		
		var postObj = PostArray[i];
		var etObj = EtArray[nextIndex];
		
		if(postObj.PostType == 'GeneralPost' && etObj.AfterDays) {
			afterDays = etObj.AfterDays;
			break;
		}
	}
	console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>afterDays-----------------------", afterDays);
	return afterDays;
}

function __getEmailEngineDataSetsFromSelectedBlendImages (currentPostObj, PagePosts, EmailEngineDataSets, CapsuleData) {
	var postPerDay = 3;
	var eeDataSets = [];
	for(var e = 0; e < EmailEngineDataSets.length; e++) {
		eeDataSets.push(EmailEngineDataSets[e]);
		for(var p = 1; p < postPerDay; p++) {
			eeDataSets.push(EmailEngineDataSets[e]);
		}
	}
	EmailEngineDataSets = eeDataSets;
	
	console.log("PagePosts.length ==--------------- ", PagePosts.length);
	var IsOnetimeStream = CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false;
	var IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
	
	var editorialPosts = PagePosts.filter(function(obj) {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType == 'GeneralPost' || obj.PostType == 'KeyPost') {
			return obj;
		}
	});
		
	var PagePosts_WithoutGeneralPosts = PagePosts.filter(function(obj) {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType == 'Post' || (obj.PostType == 'AnswerPost' && !obj.IsOnetimeStream)) {
			return obj;
		}
	});
	
	PagePosts = PagePosts_WithoutGeneralPosts;
	
	var concatPostsArr1 = PagePosts;
	if(!IsOnetimeStream && (EmailEngineDataSets.length > PagePosts.length)) {
		console.log("----->>>>>>>>>>>>>>>>>>> PagePosts_WithoutGeneralPosts.length -------------- ", PagePosts_WithoutGeneralPosts.length);
		if(PagePosts_WithoutGeneralPosts.length) {
			var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length);
			for(var i = 0; i < neededConcatNo; i++) {
				concatPostsArr1 = concatPostsArr1.concat(PagePosts_WithoutGeneralPosts);
			}
		}
	}
	
	console.log("----->>>>>>>>>>>>>>>>>>> concatPostsArr1.length -------------- ", concatPostsArr1.length);
	var concatPostsArr = concatPostsArr1;
	
	/*
	//postPerDay logic to repeat post
	for(var p = 1; p < postPerDay; p++) {
		concatPostsArr = concatPostsArr.concat(concatPostsArr1);
	}
	*/
	
	console.log("----->>>>>>>>>>>>>>>>>>> concatPostsArr.length -------------- ", concatPostsArr.length);
	console.log("----->>>>>>>>>>>>>>>>>>> EmailEngineDataSets.length -------------- ", EmailEngineDataSets.length);
	var NewEmailEngineDataSets = [];
	if(currentPostObj.PostType == 'GeneralPost' || currentPostObj.PostType == 'KeyPost') {
		concatPostsArr = editorialPosts;
		
		var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
		if(IsOnetimeStream) {
			loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
		}
		
		console.log("----->>>>>>>>>>>>>>>>>>> loopLimit -------------- ", loopLimit);
		var selectBlendImageCounter = -1;
		var gap = 2;
		for(var i = 0; i < loopLimit; i++) {
			var postObj = concatPostsArr[i];
			IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
			
			postObj.PostType = postObj.PostType ? postObj.PostType : 'Post';
			if(postObj.PostType == 'GeneralPost' || postObj.PostType == 'KeyPost' || postObj.MediaType != 'Notes') {
				IsOnlyPostImage = true;
			}
			
			postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
			if(currentPostObj._id == postObj._id) {
				var emailDataSet = EmailEngineDataSets[i];
				emailDataSet.VisualUrls = [];
				
				if(currentPostObj.PostType == 'GeneralPost' || postObj.PostType == 'KeyPost') {
					currentPostObj.AfterDays = currentPostObj.AfterDays ? currentPostObj.AfterDays : 1;
					emailDataSet.AfterDays = parseInt(currentPostObj.AfterDays * gap);
				}
				
				if(IsOnlyPostImage) {
					var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
					PostImage = PostImage ? PostImage : '';
					PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
					
					emailDataSet.VisualUrls[0] = PostImage;
					emailDataSet.VisualUrls[1] = PostImage;
					emailDataSet.BlendMode = 'hard-light';
				} else {
					if(postObj.SelectedBlendImages.length) {
						selectBlendImageCounter++;
						if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
							emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
							emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
						} else {
							console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
						}
						
						emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';
						
						if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
							selectBlendImageCounter = -1;
						}
					} else {
						console.log("oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo");
					}
				}
				NewEmailEngineDataSets.push(emailDataSet);
			}
		}
	} else {
		var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
		if(IsOnetimeStream) {
			loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
		}
		
		console.log("----->>>>>>>>>>>>>>>>>>> loopLimit -------------- ", loopLimit);
		var selectBlendImageCounter = -1;
		var gap = 2;
		for(var i = 0; i < loopLimit; i++) {
			var postObj = concatPostsArr[i];
			IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
			
			postObj.PostType = postObj.PostType ? postObj.PostType : 'Post';
			if(postObj.PostType == 'GeneralPost' || postObj.PostType == 'KeyPost' || postObj.MediaType != 'Notes') {
				IsOnlyPostImage = true;
			}
			
			postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
			if(currentPostObj._id == postObj._id) {
				var emailDataSet = EmailEngineDataSets[i];
				emailDataSet.VisualUrls = [];
				
				if(currentPostObj.PostType == 'GeneralPost' || postObj.PostType == 'KeyPost') {
					currentPostObj.AfterDays = currentPostObj.AfterDays ? currentPostObj.AfterDays : 1;
					emailDataSet.AfterDays = parseInt(currentPostObj.AfterDays * gap);
				}
				
				if(IsOnlyPostImage) {
					var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
					PostImage = PostImage ? PostImage : '';
					PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
					
					emailDataSet.VisualUrls[0] = PostImage;
					emailDataSet.VisualUrls[1] = PostImage;
					emailDataSet.BlendMode = 'hard-light';
				} else {
					if(postObj.SelectedBlendImages.length) {
						selectBlendImageCounter++;
						if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
							emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
							emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
						} else {
							console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
						}
						
						emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';
						
						if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
							selectBlendImageCounter = -1;
						}
					} else {
						console.log("oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo");
					}
				}
				NewEmailEngineDataSets.push(emailDataSet);
			}
		}
	}
	
	return NewEmailEngineDataSets;
	
}

function __getEmailEngineDataSetsFromSelectedBlendImages_v1 (currentPostObj, PagePosts, EmailEngineDataSets, CapsuleData) {
	var postPerDay = 3;
	console.log("PagePosts.length ==--------------- ", PagePosts.length);
	var IsOnetimeStream = CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false;
	var IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
	
	var concatPostsArr1 = PagePosts;
	if(!IsOnetimeStream && (EmailEngineDataSets.length > PagePosts.length)) {
		var PagePosts_WithoutGeneralPosts = PagePosts.filter(function(obj) {
			obj.PostType = obj.PostType ? obj.PostType : 'Post';
			/*if(obj.PostType == 'Post') {
				return obj;
			}*/
			if(obj.PostType == 'Post' || (obj.PostType == 'AnswerPost' && !obj.IsOnetimeStream)) {
				return obj;
			}
		});
		
		console.log("----->>>>>>>>>>>>>>>>>>> PagePosts_WithoutGeneralPosts.length -------------- ", PagePosts_WithoutGeneralPosts.length);
		if(PagePosts_WithoutGeneralPosts.length) {
			var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length);
			for(var i = 0; i < neededConcatNo; i++) {
				concatPostsArr1 = concatPostsArr1.concat(PagePosts_WithoutGeneralPosts);
			}
		}
	}
	
	console.log("----->>>>>>>>>>>>>>>>>>> concatPostsArr1.length -------------- ", concatPostsArr1.length);
	var concatPostsArr = concatPostsArr1;
	//postPerDay logic to repeat post
	for(var p = 1; p < postPerDay; p++) {
		concatPostsArr = concatPostsArr.concat(concatPostsArr1);
	}
	
	var eeDataSets = [];
	for(var e = 0; e < EmailEngineDataSets.length; e++) {
		eeDataSets.push(EmailEngineDataSets[e]);
		for(var p = 1; p < postPerDay; p++) {
			eeDataSets.push(EmailEngineDataSets[e]);
		}
	}
	
	EmailEngineDataSets = eeDataSets;
	console.log("----->>>>>>>>>>>>>>>>>>> concatPostsArr.length -------------- ", concatPostsArr.length);
	console.log("----->>>>>>>>>>>>>>>>>>> EmailEngineDataSets.length -------------- ", EmailEngineDataSets.length);
	
	//var loopLimit = EmailEngineDataSets.length;
	var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	if(IsOnetimeStream) {
		loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	}
	
	console.log("----->>>>>>>>>>>>>>>>>>> loopLimit -------------- ", loopLimit);
	var NewEmailEngineDataSets = [];
	var selectBlendImageCounter = -1;
	for(var i = 0; i < loopLimit; i++) {
		var postObj = concatPostsArr[i];
		IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
		
		postObj.PostType = postObj.PostType ? postObj.PostType : 'Post';
		if(postObj.PostType == 'GeneralPost') {
			IsOnlyPostImage = true;
		}
		
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[i];
			emailDataSet.VisualUrls = [];
			
			/*if(currentPostObj.PostType == 'GeneralPost') {
				emailDataSet.AfterDays = getAfterDaysForEditorialPost(i, EmailEngineDataSets, concatPostsArr);
			}*/
			
			if(IsOnlyPostImage) {
				var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
				PostImage = PostImage ? PostImage : '';
				PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
				
				emailDataSet.VisualUrls[0] = PostImage;
				emailDataSet.VisualUrls[1] = PostImage;
				emailDataSet.BlendMode = 'hard-light';
			} else {
				if(postObj.SelectedBlendImages.length) {
					selectBlendImageCounter++;
					if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
						emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
						emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
					}
					
					emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';
					
					if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
						selectBlendImageCounter = -1;
					}
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}
		
	
	return NewEmailEngineDataSets;
	
}

function __getEmailEngineDataSetsFromSelectedBlendImages_new(currentPostObj, PagePosts, EmailEngineDataSets, CapsuleData) {
	var postPerDay = 3;
	
	console.log("PagePosts.length ==--------------- ", PagePosts.length);
	var IsOnetimeStream = CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false;
	var IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
	
	var concatPostsArr1 = PagePosts;
	if(!IsOnetimeStream && (EmailEngineDataSets.length > PagePosts.length)) {
		var PagePosts_WithoutGeneralPosts = PagePosts.filter(function(obj) {
			obj.IsOnetimeStream = obj.IsOnetimeStream ? obj.IsOnetimeStream : false;
			obj.PostType = obj.PostType ? obj.PostType : 'Post';
			/*if(obj.PostType == 'Post') {
				return obj;
			}*/
			if(obj.PostType == 'Post' || (obj.PostType == 'AnswerPost' && !obj.IsOnetimeStream)) {
				return obj;
			}
		});
		
		if(PagePosts_WithoutGeneralPosts.length) {
			var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length);
			for(var i = 0; i < neededConcatNo; i++) {
				concatPostsArr1 = concatPostsArr1.concat(PagePosts_WithoutGeneralPosts);
			}
		}
	}
	
	var concatPostsArr = concatPostsArr1;
	//postPerDay logic to repeat post
	for(var p = 1; p < postPerDay; p++) {
		concatPostsArr = concatPostsArr.concat(concatPostsArr1);
	}
	
	var eeDataSets = [];
	for(var e = 0; e < EmailEngineDataSets.length; e++) {
		eeDataSets.push(EmailEngineDataSets[e]);
		for(var p = 1; p < postPerDay; p++) {
			eeDataSets.push(EmailEngineDataSets[e]);
		}
	}
	
	EmailEngineDataSets = eeDataSets;
	
	//var loopLimit = EmailEngineDataSets.length;
	var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	if(IsOnetimeStream) {
		loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	}
	
	var NewEmailEngineDataSets = [];
	var selectBlendImageCounter = -1;
	var afterDaysFrequency = 5;
	var GeneralPostAfterDays = 0;
	
	var gp_index = 0;
	for(var i = 0; i < loopLimit; i++) {
		var postObj = concatPostsArr[i];
		IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
		
		postObj.PostType = postObj.PostType ? postObj.PostType : 'Post';
		if(postObj.PostType == 'GeneralPost') {
			gp_index++;
			IsOnlyPostImage = true;
			GeneralPostAfterDays = gp_index * afterDaysFrequency;
		}
		
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[i];
			emailDataSet.VisualUrls = [];
			
			if(postObj.PostType == 'GeneralPost' && GeneralPostAfterDays > 0) {
				console.log("---------------------------------------------XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-------------------------------------------------------", GeneralPostAfterDays);
				emailDataSet.AfterDays = GeneralPostAfterDays;
			}
			
			if(IsOnlyPostImage) {
				var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
				PostImage = PostImage ? PostImage : '';
				PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
				
				emailDataSet.VisualUrls[0] = PostImage;
				emailDataSet.VisualUrls[1] = PostImage;
				emailDataSet.BlendMode = 'hard-light';
			} else {
				if(postObj.SelectedBlendImages.length) {
					selectBlendImageCounter++;
					if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
						emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
						emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
					}
					
					emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';
					
					if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
						selectBlendImageCounter = -1;
					}
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}
		
	
	return NewEmailEngineDataSets;
	
}
/*function __getEmailEngineDataSetsFromSelectedBlendImages (currentPostObj, PagePosts, EmailEngineDataSets) {
	
	var concatPostsArr = PagePosts;
	if(EmailEngineDataSets.length > PagePosts.length) {
		var PagePosts_WithoutGeneralPosts = PagePosts.filter(function(obj) {
			obj.PostType = obj.PostType ? obj.PostType : 'Post';
			if(obj.PostType == 'Post') {
				return obj;
			}
		});
		
		if(PagePosts_WithoutGeneralPosts.length) {
			var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length);
			for(var i = 0; i < neededConcatNo; i++) {
				concatPostsArr = concatPostsArr.concat(PagePosts_WithoutGeneralPosts);
			}
		}
	}
	
	var NewEmailEngineDataSets = [];
	var selectBlendImageCounter = -1;
	for(var i = 0; i < EmailEngineDataSets.length; i++) {
		var postObj = concatPostsArr[i];
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[i];
			emailDataSet.VisualUrls = [];
			
			if(postObj.SelectedBlendImages.length) {
				selectBlendImageCounter++;
				if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
					emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
					emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
				}
				
				emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';
				
				if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
					selectBlendImageCounter = -1;
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}
		
	
	return NewEmailEngineDataSets;
	
}*/

function __streamPagePostNow(PagePosts, PageData, req, CapsuleData, First_SyncedPosts) {
	console.log("----------------- __streamPagePostNow called ----------------------------");
	var EmailEngineDataSets = __getEmailEngineDataSetsBasedOnMonthAndFreq (CapsuleData);
	if(!EmailEngineDataSets.length) {
		EmailEngineDataSets = null;
	}
	PageData.EmailEngineDataSets = PageData.EmailEngineDataSets ? PageData.EmailEngineDataSets : [];
	PageData.EmailEngineDataSets = EmailEngineDataSets ? EmailEngineDataSets : PageData.EmailEngineDataSets;
	
	var PagePosts_keyposts = PagePosts.filter(function(obj) {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType == 'KeyPost') {
			return obj;
		}
	});
	
	var PagePosts = PagePosts.filter(function(obj) {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType != 'AdPost' && obj.PostType != 'BroadcastPost' && obj.PostType != 'KeyPost') {
			return obj;
		}
	});
	
	var afterDays = 0;
	for(var loop = 0; loop < PagePosts.length; loop++) {
		var postObj = PagePosts[loop];
		var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
		PostImage = PostImage ? PostImage : '';
		PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
		if(postObj.MediaType == 'Notes') {
			//PostImage = null;
		}
		var PostStatement = postObj.MediaType != 'Notes' ? postObj.PostStatement : (postObj.MediaType=='Link' ? '' : postObj.Content);
		PostStatement = PostStatement ? PostStatement : '';
		PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
		PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');
		
		var inputObj = {
			"CapsuleId" : CapsuleData._id ? CapsuleData._id : null,
			"PageId" : PageData._id ? PageData._id : null,
			"PostId": postObj._id,
			"PostOwnerId": postObj.PostedBy,
			"ReceiverEmails": req.session.user.Email ? [req.session.user.Email] : [],
			"PostImage": PostImage,
			"PostStatement": PostStatement,
			"IsSurpriseCase": true,
			"IsPageStreamCase": true,
			"EmailEngineDataSets": [],
			"SurpriseSelectedWords" : postObj.SurpriseSelectedWords ? postObj.SurpriseSelectedWords.split(',') : null,
			"SurpriseSelectedTags" : [],
			"SyncedBy" : req.session.user._id,
			"SyncedByName" : req.session.user.Name,
			"EmailTemplate" : CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'ImaginativeThinker',
			"IsStreamPaused" : CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0,
			"CreatedOn" : First_SyncedPosts.CreatedOn ? First_SyncedPosts.CreatedOn : Date.now(),
			EmailSubject : CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
			IsOnetimeStream : CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false,
			IsOnlyPostImage : CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false
		}
		
		inputObj.EmailEngineDataSets = [];
		
		var LabelId = postObj.Label ? String(postObj.Label) : null;
		
		for(var i = 0; i < PageData.EmailEngineDataSets.length; i++) {
			var obj = PageData.EmailEngineDataSets[i];
			obj.LabelId = obj.LabelId ? String(obj.LabelId) : null;
			if(LabelId === obj.LabelId) {
				inputObj.EmailEngineDataSets.push(obj);
			}								
		}
		
		if(!inputObj.EmailEngineDataSets.length) {
			inputObj.EmailEngineDataSets = PageData.EmailEngineDataSets ? PageData.EmailEngineDataSets : [];
		}
		
		console.log("------------ inputObj.EmailEngineDataSets.length = ", inputObj.EmailEngineDataSets.length);
		
		for( var i = 0; i < inputObj.EmailEngineDataSets.length; i++ ) {
			inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj.EmailEngineDataSets[i].TextAboveVisual ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(/\n/g,'<br />') : '';
			inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj.EmailEngineDataSets[i].TextBelowVisual ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(/\n/g,'<br />') : '';
		}
		
		//get the selected blend images of the post if there is any else use the default procedure.
		//inputObj.EmailEngineDataSets = __getEmailEngineDataSetsFromSelectedBlendImages (postObj, PagePosts, inputObj.EmailEngineDataSets);
		if(postObj.PostType == 'GeneralPost' || postObj.PostType == 'KeyPost') {
			afterDays++;
			postObj.AfterDays = afterDays;
		}
		inputObj.EmailEngineDataSets = __getEmailEngineDataSetsFromSelectedBlendImages (postObj, PagePosts, inputObj.EmailEngineDataSets, CapsuleData);
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		
		if(inputObj.IsOnetimeStream || postObj.PostType == 'GeneralPost') {
			
			for( var i = 0; i < inputObj.EmailEngineDataSets.length; i++ ) {
				inputObj.EmailEngineDataSets[i].AfterDays = inputObj.EmailEngineDataSets[i].AfterDays;
			}
			
			
			if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length) {
				//now call the api.
				var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
				//var request_url = 'https://www.scrpt.com/journal/streamPage';
				axios.post(request_url, inputObj)
					.then(response => {
						response.data = response.data ? response.data : {};
						response.data.code = response.data.code ? response.data.code : null;
						console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
					});
			} else {
				console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
			}
		} else {
			if(postObj.SelectedBlendImages.length) {
				console.log('----------------------------- 111111 --------------------------------');
				//inputObj.EmailEngineDataSets = NewEmailEngineDataSets;
				
				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length && inputObj.PostImage) {
					
					console.log('----------------------------- 2222222 --------------------------------');
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
					//var request_url = 'https://www.scrpt.com/journal/streamPage';
					axios.post(request_url, inputObj)
						.then(response => {
							response.data = response.data ? response.data : {};
							response.data.code = response.data.code ? response.data.code : null;
							console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
						});
				} else {
					//console.log("In else case --- ", inputObj);
					console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
				}
			
			} else {
				console.log('----------------------------- 3333333 --------------------------------');
				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets.length && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
					console.log('----------------------------- 4444444 --------------------------------');
					
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage';
					axios.post(request_url, inputObj)
						.then(response => {
							response.data = response.data ? response.data : {};
							response.data.code = response.data.code ? response.data.code : null;
							console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
						});
				} else {
					console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
				}
			}
		}
	}
	
	var EmailEngineDataSets_keyposts = __getEmailEngineDataSetsBasedOnMonthAndKeyPost (CapsuleData);
	if(!EmailEngineDataSets_keyposts.length) {
		EmailEngineDataSets_keyposts = null;
	}
	EmailEngineDataSets_keyposts = EmailEngineDataSets_keyposts ? EmailEngineDataSets_keyposts : [];
	
	PagePosts_keyposts = PagePosts_keyposts ? PagePosts_keyposts : [];
	
	for(var loop = 0; loop < PagePosts_keyposts.length; loop++) {
		var postObj = PagePosts_keyposts[loop];
		var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
		PostImage = PostImage ? PostImage : '';
		PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
		if(postObj.MediaType == 'Notes') {
			//PostImage = null;
		}
		var PostStatement = postObj.MediaType != 'Notes' ? postObj.PostStatement : (postObj.MediaType=='Link' ? '' : postObj.Content);
		PostStatement = PostStatement ? PostStatement : '';
		PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
		PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');
		
		var inputObj = {
			"CapsuleId" : CapsuleData._id ? CapsuleData._id : null,
			"PageId" : PageData._id ? PageData._id : null,
			"PostId": postObj._id,
			"PostOwnerId": postObj.PostedBy,
			"ReceiverEmails": req.session.user.Email ? [req.session.user.Email] : [],
			"PostImage": PostImage,
			"PostStatement": PostStatement,
			"IsSurpriseCase": true,
			"IsPageStreamCase": true,
			"EmailEngineDataSets": [],
			"SurpriseSelectedWords" : postObj.SurpriseSelectedWords ? postObj.SurpriseSelectedWords.split(',') : null,
			"SurpriseSelectedTags" : [],
			"SyncedBy" : req.session.user._id,
			"SyncedByName" : req.session.user.Name,
			"EmailTemplate" : CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'ImaginativeThinker',
			"IsStreamPaused" : CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0,
			"CreatedOn" : First_SyncedPosts.CreatedOn ? First_SyncedPosts.CreatedOn : Date.now(),
			EmailSubject : CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
			IsOnetimeStream : CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false,
			IsOnlyPostImage : CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false
		}
		
		inputObj.EmailEngineDataSets = [];
		
		if(!inputObj.EmailEngineDataSets.length) {
			inputObj.EmailEngineDataSets = EmailEngineDataSets ? EmailEngineDataSets : [];
		}
		
		console.log("------------ inputObj.EmailEngineDataSets.length = ", inputObj.EmailEngineDataSets.length);
		
		for( var i = 0; i < inputObj.EmailEngineDataSets.length; i++ ) {
			inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj.EmailEngineDataSets[i].TextAboveVisual ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(/\n/g,'<br />') : '';
			inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj.EmailEngineDataSets[i].TextBelowVisual ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(/\n/g,'<br />') : '';
		}
		
		//get the selected blend images of the post if there is any else use the default procedure.
		inputObj.EmailEngineDataSets = __getEmailEngineDataSetsForKeyPost (postObj, PagePosts_keyposts, inputObj.EmailEngineDataSets);
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(postObj.SelectedBlendImages.length) {
			console.log('----------------------------- 111111 --------------------------------');
			//inputObj.EmailEngineDataSets = NewEmailEngineDataSets;
			
			if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length && inputObj.PostImage) {
				
				console.log('----------------------------- 2222222 --------------------------------');
				//now call the api.
				var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
				//var request_url = 'https://www.scrpt.com/journal/streamPage';
				axios.post(request_url, inputObj)
					.then(response => {
						response.data = response.data ? response.data : {};
						response.data.code = response.data.code ? response.data.code : null;
						console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
					});
			} else {
				//console.log("In else case --- ", inputObj);
			}
		
		} else {
			console.log('----------------------------- 3333333 --------------------------------');
			if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets.length && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
				console.log('----------------------------- 4444444 --------------------------------');
				
				//now call the api.
				var request_url = 'https://www.scrpt.com/journal/streamPage';
				axios.post(request_url, inputObj)
					.then(response => {
						response.data = response.data ? response.data : {};
						response.data.code = response.data.code ? response.data.code : null;
						console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
					});
			} else {
				
			}
		}
		
	}
}

async function fetchKeywordsFromText (text) {
	var keywordResult = [];
	
	var response = {};
	var inputText = typeof text == 'string' ? text.substr(0, 200) : '';
	if(inputText) {
		var request_url = 'http://yake.inesctec.pt/yake/v2/extract_keywords?content='+encodeURI(inputText)+'&max_ngram_size=2&number_of_keywords=20&highlight=false';
		response = await axios.get(request_url);
	}
	
	response.data = response.data ? response.data : {};
	var keywords = response.data.keywords ? response.data.keywords : [];
	for(let i = 0; i < keywords.length; i++) {
		if(keywords[i].ngram) {
			keywordResult.push(keywords[i].ngram);
			if(keywordResult.length == 2) {
				break;
			}
		}
	}
	
	return keywordResult;
}

async function __streamPagePostNow_GroupStream(PagePosts, PageData, req, CapsuleData, First_SyncedPosts) {
	console.log("----------------- __streamPagePostNow_GroupStream called ----------------------------");
	//PagePosts = PagePosts.reverse();
	var PagePosts_sorted = PagePosts.sort(function(a,b){
	  return new Date(b.PostedOn) - new Date(a.PostedOn);
	});
	
	var PagePosts_keyposts = PagePosts_sorted.filter(function(obj) {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType == 'KeyPost') {
			return obj;
		}
	});
	
	var PagePosts2 = PagePosts_sorted.filter(function(obj) {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType != 'AdPost' && obj.PostType != 'BroadcastPost' && obj.PostType != 'KeyPost' && obj.PostType != 'InfoPost' && obj.PostType != 'InfoPostOwner') {
			return obj;
		}
	});
	console.log("PagePosts2.length ------------------- ", PagePosts2.length);
	var QuestionPostArr = PagePosts2.filter((obj) => {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType == 'QuestionPost') {
			return obj;
		}
	});
	QuestionPostArr = Array.isArray(QuestionPostArr) ? QuestionPostArr : [];
	var QuestionPostIds = [];
	var rootQuestionPostIds = [];
	for(var i = 0; i < QuestionPostArr.length; i++) {
		QuestionPostIds.push(mongoose.Types.ObjectId(String(QuestionPostArr[i]._id)));
		rootQuestionPostIds.push(mongoose.Types.ObjectId(String(QuestionPostArr[i].OriginatedFrom)));
	}
	
	var condAnswerPosts = {
		"$or" : [
			{ "Medias.QuestionPostId" : { $in : QuestionPostIds } }
		]
	};
	//get Celebrities
	var celebritiesResultObj = await getCelebrities(CapsuleData.OriginatedFrom);
	var CelebrityInstanceId = celebritiesResultObj.CelebrityInstanceId ? celebritiesResultObj.CelebrityInstanceId : null;
	var celebritiesResult = celebritiesResultObj.Celebrities ? celebritiesResultObj.Celebrities : [];
	//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! celebritiesResult ---------------- ", celebritiesResult);
	//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CelebrityInstanceId ---------------- ", CelebrityInstanceId);
	
	var celPostsMap = {};
	
	if(celebritiesResult.length && rootQuestionPostIds.length && CelebrityInstanceId) {
		var celebrityIds = [];
		for(var ci = 0; ci < celebritiesResult.length; ci++) {
			celebrityIds.push(ObjectId(celebritiesResult[ci]._id));
		}
		
		var PageData_cel = await getPagesByCapsuleId(CelebrityInstanceId);
		PageData_cel.Medias = PageData_cel.Medias ? PageData_cel.Medias : [];
		
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! PageData_cel.Medias.length ---------------- ", PageData_cel.Medias.length);
		var finalCelQuestionPostIds = [];
		for(var i = 0; i < PageData_cel.Medias.length; i++) {
			PageData_cel.Medias[i].PostType = PageData_cel.Medias[i].PostType ? PageData_cel.Medias[i].PostType : 'Post';
			if(PageData_cel.Medias[i].PostType == 'QuestionPost'/* && celebrityIds.indexOf(PageData_cel.Medias[i].PostedBy) >= 0*/) {
				finalCelQuestionPostIds.push(ObjectId(PageData_cel.Medias[i]._id));
				celPostsMap[PageData_cel.Medias[i]._id] = PageData_cel.Medias[i].OriginatedFrom;
			}
		}
		rootQuestionPostIds = finalCelQuestionPostIds;
		
		if(rootQuestionPostIds.length) {
			condAnswerPosts["$or"].push({
				"Medias.QuestionPostId" : { $in : rootQuestionPostIds },
				"Medias.PostedBy" : { $in : celebrityIds } 
			});
		}
	}
	
	//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! QuestionPostIds ---------------- ", QuestionPostIds);
	//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! rootQuestionPostIds ---------------- ", rootQuestionPostIds);
	//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! condAnswerPosts ---------------- ", condAnswerPosts);
	//console.log("PagePosts2.length ------------------- ", PagePosts2.length);
	var answerPosts = [];
	if(QuestionPostIds.length) {
		answerPosts = await Page.aggregate([
			{ $unwind : "$Medias" },
			{ $match :  condAnswerPosts },
			{
				$project : {
					"_id" : "$Medias._id",
					"PostedOn" : "$Medias.PostedOn",
					"UpdatedOn" : "$Medias.UpdatedOn",
					"Votes" : "$Medias.Votes",
					"Marks" : "$Medias.Marks",
					"IsOnlyForOwner" : "$Medias.IsOnlyForOwner",
					"IsAdminApproved" : "$Medias.IsAdminApproved",
					"PostPrivacySetting" : "$Medias.PostPrivacySetting",
					"Themes" : "$Medias.Themes",
					"TaggedUsers" : "$Medias.TaggedUsers",
					"IsUnsplashImage" : "$Medias.IsUnsplashImage",
					"IsAddedFromStream" : "$Medias.IsAddedFromStream",
					"IsPostForUser" : "$Medias.IsPostForUser",
					"IsPostForTeam" : "$Medias.IsPostForTeam",
					"IsEditorPicked" : "$Medias.IsEditorPicked",
					"Lightness" : "$Medias.Lightness",
					"DominantColors" : "$Medias.DominantColors",
					"PostType" : "$Medias.PostType",
					"KeyPostType" : "$Medias.KeyPostType",
					"MediaID" : "$Medias.MediaID",
					"MediaURL" : "$Medias.MediaURL",
					"Title" : "$Medias.Title",
					"Prompt" : "$Medias.Prompt",
					"Locator" : "$Medias.Locator",
					"PostedBy" : "$Medias.PostedBy",
					"ThemeID" : "$Medias.ThemeID",
					"ThemeTitle" : "$Medias.ThemeTitle",
					"MediaType" : "$Medias.MediaType",
					"ContentType" : "$Medias.ContentType",
					"Content" : "$Medias.Content",
					"OwnerId" : "$Medias.OwnerId",
					"thumbnail" : "$Medias.thumbnail",
					"PostStatement" : "$Medias.PostStatement",
					"StreamId" : "$Medias.StreamId",
					"QuestionPostId" : "$Medias.QuestionPostId",
					"SurpriseSelectedWords" : "$Medias.SurpriseSelectedWords"
				}
			}
		]);
	}
	answerPosts = Array.isArray(answerPosts) ? answerPosts : [];
	console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1 answerPosts.length ----------------- ", answerPosts.length);
	var postsForOwner = [];
	for(var i = 0; i < PagePosts2.length; i++) {
		console.log("PagePosts2[i].PostType ============ ", PagePosts2[i].PostType);
		if(PagePosts2[i].PostType == 'QuestionPost') {
			for(var j = 0; j < answerPosts.length; j++) {
				answerPosts[j].QuestionPostId = answerPosts[j].QuestionPostId ? answerPosts[j].QuestionPostId : '';
				
				celPostsMap[answerPosts[j].QuestionPostId] = celPostsMap[answerPosts[j].QuestionPostId] ? celPostsMap[answerPosts[j].QuestionPostId] : null;
				
				if(answerPosts[j].PostType == 'AnswerPost' && (String(answerPosts[j].QuestionPostId) == String(PagePosts2[i]._id) || String(celPostsMap[answerPosts[j].QuestionPostId]) == String(PagePosts2[i].OriginatedFrom))) {
					//var PostStatement_Qpost = PagePosts2[i].MediaType != 'Notes' ? PagePosts2[i].PostStatement : PagePosts2[i].Content;
					//var PostStatement_Apost = answerPosts[j].MediaType != 'Notes' ? answerPosts[j].PostStatement : answerPosts[j].Content;
					var PostStatement_Qpost = PagePosts2[i].PostStatement ? PagePosts2[i].PostStatement : PagePosts2[i].Content;
					var PostStatement_Apost = answerPosts[j].PostStatement ? answerPosts[j].PostStatement : answerPosts[j].Content;
					var PostStatement_Final = PostStatement_Qpost+'<br><br>'+PostStatement_Apost;
					
					answerPosts[j].PostStatement_Apost = PostStatement_Apost;
					answerPosts[j].PostStatement = PostStatement_Final;
					answerPosts[j].OriginatedFrom = answerPosts[j]._id;
					answerPosts[j].SurpriseSelectedWords = PagePosts2[i].SurpriseSelectedWords ? PagePosts2[i].SurpriseSelectedWords : null;
					postsForOwner.push(answerPosts[j]);
				} else {
					console.log("############################################################# ELSE -------------- "+ answerPosts[j].PostType+' -------------- '+String(answerPosts[j].QuestionPostId)+' ====== '+String(PagePosts2[i]._id));
				}
			}
		} else {
			console.log("ELSE ---------------- PagePosts2[i].PostType ============ ", PagePosts2[i].PostType);
			postsForOwner.push(PagePosts2[i]);
		}
	}
	console.log("FINAL $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$4--------------postsForOwner.length ----------------- ", postsForOwner.length);
	PagePosts2 = postsForOwner;
	
	console.log("----------------- __streamPagePostNow_GroupStream called 22222222222 ----------------------------");
	var EmailEngineDataSets = __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData);
	console.log("EmailEngineDataSets.length ----------- ", EmailEngineDataSets.length);
	if(!EmailEngineDataSets.length) {
		EmailEngineDataSets = null;
	}
	PageData.EmailEngineDataSets = PageData.EmailEngineDataSets ? PageData.EmailEngineDataSets : [];
	PageData.EmailEngineDataSets = EmailEngineDataSets ? EmailEngineDataSets : PageData.EmailEngineDataSets;
	console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>PagePosts2.length ----------- ", PagePosts2.length);
	//return;
	
	var afterDays = 0;
	
	for(var loop = 0; loop < PagePosts2.length; loop++) {
		var postObj = PagePosts2[loop];
		var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
		PostImage = PostImage ? PostImage : '';
		PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
		
		//var PostStatement = postObj.MediaType != 'Notes' ? postObj.PostStatement : postObj.Content;
		//var PostStatement = postObj.PostStatement ? postObj.PostStatement : postObj.Content;
		var PostStatement = postObj.PostStatement ? postObj.PostStatement : (postObj.MediaType=='Link' ? '' : postObj.Content);
		var PostStatement_Apost = postObj.PostStatement_Apost ? postObj.PostStatement_Apost : '';
		
		PostStatement = PostStatement ? PostStatement : '';
		PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
		PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');
		
		if(postObj.MediaType != 'Notes' && (postObj.PostType == 'QuestionPost' || postObj.PostType == 'AnswerPost')) {
			CapsuleData.IsOnetimeStream = true;
			CapsuleData.IsOnlyPostImage = true;
		}
		
		if(postObj.MediaType == 'Notes' && (postObj.PostType == 'QuestionPost' || postObj.PostType == 'AnswerPost')) {
			CapsuleData.IsOnetimeStream = false;
			CapsuleData.IsOnlyPostImage = false;
		}
		
		First_SyncedPosts = First_SyncedPosts ? First_SyncedPosts : {};
		var datenow = new Date();
		
		req.session.user.Birthdate = req.session.user.Birthdate ? req.session.user.Birthdate : null;
		if(req.session.user.Birthdate) {
			var birthday = new Date(req.session.user.Birthdate);
			//console.log("req.session.user.Birthdate --------------- @@@@@@@@@@@@@@@@@@@@@@@@@@@ ------------- ", req.session.user.Birthdate);
			//console.log("birthday ------------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@222--------------- ", birthday);
			var bDate = birthday.getDate();
			var bMonth = birthday.getMonth();
			
			var datenowDate = datenow.getDate();
			var datenowMonth = datenow.getMonth();
			var datenowYear = datenow.getFullYear();
			//console.log("datenowYear ---------------------&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&------------------ ", datenowYear);
			if(bMonth == datenowMonth) {
				if(bDate >= datenowDate) {
					birthday.setFullYear(parseInt(datenowYear));
					datenow = birthday;
				} else {
					birthday.setFullYear(parseInt(datenowYear)+1);
					datenow = birthday;
				}
			} else if(bMonth < datenowMonth) {
				birthday.setFullYear(parseInt(datenowYear)+1);
				datenow = birthday;
			} else {
				datenow.setDate(bDate);
			}
		} else {
			console.log("------------------------------------------------FLOW BREAKED----------------------------------------------------------------------");
			break;
		}
		//console.log("datenowDate ------------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@222--------------- ", datenowDate);
		//console.log("bDate ------------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@222--------------- ", bDate);
		//console.log("datenowMonth ------------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@222--------------- ", datenowMonth);
		//console.log("bMonth ------------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@222--------------- ", bMonth);
		//console.log("datenowYear ------------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@222--------------- ", datenowYear);
		//console.log("birthday.getFullYear() ----------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@22@@@@2----------------- ", birthday.getFullYear());
		//console.log("datenow.getTime() --------------------------- ", datenow.getTime());
		var text = PostStatement_Apost ? PostStatement_Apost : PostStatement;
		var inputObj = {
			"CapsuleId" : CapsuleData._id ? CapsuleData._id : null,
			"PageId" : PageData._id ? PageData._id : null,
			"PostId": postObj._id,
			"PostOwnerId": postObj.PostedBy,
			"ReceiverEmails": [req.session.user.Email],
			"PostImage": PostImage,
			"PostStatement": PostStatement,
			"IsSurpriseCase": true,
			"IsPageStreamCase": true,
			"EmailEngineDataSets": [],
			"SurpriseSelectedWords" : (postObj.PostType == 'AnswerPost') ? (await fetchKeywordsFromText(text)) : (postObj.SurpriseSelectedWords ? postObj.SurpriseSelectedWords.split(',') : (await fetchKeywordsFromText(text))),
			"SurpriseSelectedTags" : [],
			"SyncedBy" : req.session.user._id,
			"SyncedByName" : req.session.user.Name,
			"EmailTemplate" : CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'ImaginativeThinker',
			"IsStreamPaused" : CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0,
			"CreatedOn" : First_SyncedPosts.CreatedOn ? First_SyncedPosts.CreatedOn : new Date(datenow.getTime() - (1 * 24 * 60 * 60 * 1000)),
			EmailSubject : CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
			IsOnetimeStream : CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false,
			IsOnlyPostImage : CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false,
			StreamType : 'Group'
		}
		
		inputObj.EmailEngineDataSets = [];
		
		var LabelId = postObj.Label ? String(postObj.Label) : null;
		
		for(var i = 0; i < PageData.EmailEngineDataSets.length; i++) {
			var obj = PageData.EmailEngineDataSets[i];
			obj.LabelId = obj.LabelId ? String(obj.LabelId) : null;
			if(LabelId === obj.LabelId) {
				inputObj.EmailEngineDataSets.push(obj);
			}								
		}
		
		if(!inputObj.EmailEngineDataSets.length) {
			inputObj.EmailEngineDataSets = PageData.EmailEngineDataSets ? PageData.EmailEngineDataSets : [];
		}
		
		console.log("------------ inputObj.EmailEngineDataSets.length = ", inputObj.EmailEngineDataSets.length);
		
		for( var i = 0; i < inputObj.EmailEngineDataSets.length; i++ ) {
			inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj.EmailEngineDataSets[i].TextAboveVisual ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(/\n/g,'<br />') : '';
			inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj.EmailEngineDataSets[i].TextBelowVisual ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(/\n/g,'<br />') : '';
		}
		
		//get the selected blend images of the post if there is any else use the default procedure.
		if(postObj.PostType == 'GeneralPost' || postObj.PostType == 'KeyPost') {
			afterDays++;
			postObj.AfterDays = afterDays;
		}
		inputObj.EmailEngineDataSets = __getEmailEngineDataSetsFromSelectedBlendImages(postObj, PagePosts2, inputObj.EmailEngineDataSets, CapsuleData);
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		
		console.log("---->>>>>>>>>>>>>>>>>>>>>>>-------- inputObj.EmailEngineDataSets.length = ", inputObj.EmailEngineDataSets.length);
		//break;return;
		//console.log("inputObj -------------------------- ", inputObj);
		if(inputObj.IsOnetimeStream || postObj.PostType == 'GeneralPost') {
			if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length) {
				//now call the api.
				var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
				//var request_url = 'https://www.scrpt.com/journal/streamPage';
				axios.post(request_url, inputObj)
					.then(response => {
						response.data = response.data ? response.data : {};
						response.data.code = response.data.code ? response.data.code : null;
						console.log("------------ AXIOS (ONETIME - /journal/streamPage__WithSelectedBlendCase)---- Post has been streamed successfully using api call ---------------", response.data.code);
					});
			}
		} else {
			if(postObj.SelectedBlendImages.length) {
				//inputObj.EmailEngineDataSets = NewEmailEngineDataSets;
				
				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
					//var request_url = 'https://www.scrpt.com/journal/streamPage';
					axios.post(request_url, inputObj)
						.then(response => {
							response.data = response.data ? response.data : {};
							response.data.code = response.data.code ? response.data.code : null;
							console.log("------------ AXIOS (/journal/streamPage__WithSelectedBlendCase) ---- Post has been streamed successfully using api call ---------------", response.data.code);
						});
				}
			
			} else {
				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets.length && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage';
					axios.post(request_url, inputObj)
						.then(response => {
							response.data = response.data ? response.data : {};
							response.data.code = response.data.code ? response.data.code : null;
							console.log("------------ AXIOS (/journal/streamPage) ---- Post has been streamed successfully using api call ---------------", response.data.code);
						});
				}
			}
		}
		
	}
	
	
	var EmailEngineDataSets_keyposts = __getEmailEngineDataSetsBasedOnMonthAndKeyPost(CapsuleData);
	if(!EmailEngineDataSets_keyposts.length) {
		EmailEngineDataSets_keyposts = null;
	}
	EmailEngineDataSets_keyposts = EmailEngineDataSets_keyposts ? EmailEngineDataSets_keyposts : [];
	
	PagePosts_keyposts = PagePosts_keyposts ? PagePosts_keyposts : [];
	for(var loop = 0; loop < PagePosts_keyposts.length; loop++) {
		var postObj = PagePosts_keyposts[loop];
		var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
		PostImage = PostImage ? PostImage : '';
		PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;
		
		var PostStatement = postObj.MediaType != 'Notes' ? postObj.PostStatement : (postObj.MediaType=='Link' ? '' : postObj.Content);
		
		PostStatement = PostStatement ? PostStatement : '';
		PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
		PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');
		
		var inputObj = {
			"CapsuleId" : CapsuleData._id ? CapsuleData._id : null,
			"PageId" : PageData._id ? PageData._id : null,
			"PostId": postObj._id,
			"PostOwnerId": postObj.PostedBy,
			"ReceiverEmails": shareWithEmail ? [shareWithEmail] : [],
			"PostImage": PostImage,
			"PostStatement": PostStatement,
			"IsSurpriseCase": true,
			"IsPageStreamCase": true,
			"EmailEngineDataSets": [],
			"SurpriseSelectedWords" : postObj.SurpriseSelectedWords ? postObj.SurpriseSelectedWords.split(',') : (await fetchKeywordsFromText(PostStatement)),
			"SurpriseSelectedTags" : [],
			"SyncedBy" : req.session.user._id,
			"SyncedByName" : req.session.user.Name,
			"EmailTemplate" : CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'ImaginativeThinker',
			"IsStreamPaused" : CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0,
			"CreatedOn" : First_SyncedPosts.CreatedOn ? First_SyncedPosts.CreatedOn : Date.now(),
			EmailSubject : CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
			IsOnetimeStream : CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false,
			IsOnlyPostImage : CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false,
			StreamType : 'Group'
		}
		
		inputObj.EmailEngineDataSets = [];
		
		if(!inputObj.EmailEngineDataSets.length) {
			inputObj.EmailEngineDataSets = EmailEngineDataSets_keyposts ? EmailEngineDataSets_keyposts : [];
		}
		
		console.log("------------ inputObj.EmailEngineDataSets.length = ", inputObj.EmailEngineDataSets.length);
		
		for( var i = 0; i < inputObj.EmailEngineDataSets.length; i++ ) {
			inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj.EmailEngineDataSets[i].TextAboveVisual ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(/\n/g,'<br />') : '';
			inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj.EmailEngineDataSets[i].TextBelowVisual ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(/\n/g,'<br />') : '';
		}
		
		//get the selected blend images of the post if there is any else use the default procedure.
		inputObj.EmailEngineDataSets = __getEmailEngineDataSetsForKeyPost (postObj, PagePosts_keyposts, inputObj.EmailEngineDataSets, CapsuleData);
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		
		var KeyPost_case = true;	//inputObj.IsOnetimeStream
		if(KeyPost_case) {
			if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length) {
				//now call the api.
				var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
				//var request_url = 'https://www.scrpt.com/journal/streamPage';
				axios.post(request_url, inputObj)
					.then(response => {
						response.data = response.data ? response.data : {};
						response.data.code = response.data.code ? response.data.code : null;
						console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
					});
			}
		} else {
			if(postObj.SelectedBlendImages.length) {
				//inputObj.EmailEngineDataSets = NewEmailEngineDataSets;
				
				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
					//var request_url = 'https://www.scrpt.com/journal/streamPage';
					axios.post(request_url, inputObj)
						.then(response => {
							response.data = response.data ? response.data : {};
							response.data.code = response.data.code ? response.data.code : null;
							console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
						});
				}
			
			} else {
				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets.length && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage';
					axios.post(request_url, inputObj)
						.then(response => {
							response.data = response.data ? response.data : {};
							response.data.code = response.data.code ? response.data.code : null;
							console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
						});
				}
			}
		}
		
	}
}


async function getPagesByCapsuleId (CapsuleId) {
	var chapter = await Chapter.findOne({CapsuleId : String(CapsuleId)});
	var page = await Page.findOne({ChapterId : String(chapter._id)});
	return page;
}


var updateStreamSettings_ActiveCapsule = async function ( req , res ) {
	try {
		var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
   
		var conditions = {
			_id : CapsuleId
		};

		var doc = {
			$set: {
				MonthFor : req.body.MonthFor ? req.body.MonthFor : 'M12',
				Frequency : req.body.Frequency ? req.body.Frequency : 'high',
				EmailTemplate : req.body.EmailTemplate ? req.body.EmailTemplate : 'ImaginativeThinker',
				IsStreamPaused : req.body.IsStreamPaused ? true : false
			}
		}
		
		if(typeof req.body.EmailSubject != 'undefined') {
			doc.$set.EmailSubject = req.body.EmailSubject ? req.body.EmailSubject : '';
		}
		
		if(typeof req.body.IsOnetimeStream != 'undefined') {
			doc.$set.IsOnetimeStream = req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false;
		}
		
		if(typeof req.body.IsOnlyPostImage != 'undefined') {
			doc.$set.IsOnlyPostImage = req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false;
		}
		
		var CapsuleData_beforeUpdate = await Capsule.findOne(conditions);
		await Capsule.update(conditions, doc);
		
		var CapsuleData = await Capsule.findOne(conditions);
		var PageData = await getPagesByCapsuleId(CapsuleId);
		PageData.Medias = PageData.Medias ? PageData.Medias : [];
		
		//soft delete old stream posts of this page and reset again as per the settings changes if Month or Frequency is changed else simply update the records.
		var conditions_sp = {
			CapsuleId : CapsuleData._id,
			PageId : PageData._id,
			IsDeleted : 0
		};
		var First_SyncedPosts = await SyncedPost.findOne(conditions_sp).sort({_id : -1});
		First_SyncedPosts = First_SyncedPosts ? First_SyncedPosts : {};
		First_SyncedPosts.EmailTemplate = First_SyncedPosts.EmailTemplate ? First_SyncedPosts.EmailTemplate : 'ImaginativeThinker';
		First_SyncedPosts.Status = First_SyncedPosts.Status ? First_SyncedPosts.Status : false;
		First_SyncedPosts.MonthFor = CapsuleData_beforeUpdate.MonthFor ? CapsuleData_beforeUpdate.MonthFor : 'M12';
		First_SyncedPosts.Frequency = CapsuleData_beforeUpdate.Frequency ? CapsuleData_beforeUpdate.Frequency : 'high';
		
		var dataToUpdate = {
			Status : !doc.$set.IsStreamPaused,
			EmailTemplate : doc.$set.EmailTemplate ? doc.$set.EmailTemplate : 'ImaginativeThinker'
		}
		
		if(typeof req.body.EmailSubject != 'undefined') {
			dataToUpdate.EmailSubject = req.body.EmailSubject ? req.body.EmailSubject : '';
			First_SyncedPosts.EmailSubject = dataToUpdate.EmailSubject;
		}
		
		if(typeof req.body.IsOnetimeStream != 'undefined') {
			dataToUpdate.IsOnetimeStream = req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false;
			First_SyncedPosts.IsOnetimeStream = dataToUpdate.IsOnetimeStream;
		}
		
		if(typeof req.body.IsOnlyPostImage != 'undefined') {
			dataToUpdate.IsOnlyPostImage = req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false;
			First_SyncedPosts.IsOnlyPostImage = dataToUpdate.IsOnlyPostImage;
		}
		
		
		await SyncedPost.update(conditions_sp, {$set : dataToUpdate}, {multi : true});
		
		/*
		if(doc.$set.IsStreamPaused == First_SyncedPosts.Status) {
			var dataToUpdate = {
				Status : !First_SyncedPosts.Status,
				EmailTemplate : doc.$set.EmailTemplate ? doc.$set.EmailTemplate : 'ImaginativeThinker'
			}
			
			//need to toggle the status.
			await SyncedPost.update(conditions_sp, {$set : dataToUpdate}, {multi : true});
		}
		
		if(doc.$set.EmailTemplate != First_SyncedPosts.EmailTemplate) {
			var dataToUpdate2 = {
				EmailTemplate : doc.$set.EmailTemplate ? doc.$set.EmailTemplate : 'ImaginativeThinker'
			}
			await SyncedPost.update(conditions_sp, {$set : dataToUpdate2}, {multi : true});
		}
		*/
		
		if(doc.$set.MonthFor != First_SyncedPosts.MonthFor || doc.$set.Frequency != First_SyncedPosts.Frequency) {
			for(var i = 0; i < PageData.Medias.length; i++) {
				var cond = {
					PageId : PageData.OriginatedFrom,
					PostId : PageData.Medias[i].OriginatedFrom
				};
				
				if(PageData.Medias[i].PostType == 'AnswerPost' && PageData.Medias[i].QuestionPostId) {
					cond = {
						PostId : PageData.Medias[i]._id
					};
				}
				
				var f = {
					SelectedBlendImages : 1
				};
				var SelectedBlendImages = await PageStream.find(cond, f);
				if(SelectedBlendImages.length) {
					PageData.Medias[i].SelectedBlendImages = SelectedBlendImages[0].SelectedBlendImages ? SelectedBlendImages[0].SelectedBlendImages : [];
				}
				
				PageData.Medias[i].SelectedBlendImages = PageData.Medias[i].SelectedBlendImages ? PageData.Medias[i].SelectedBlendImages : [];
			}
			
			req.session.user.Birthdate = req.session.user.Birthdate ? req.session.user.Birthdate : null;
			if(CapsuleData.LaunchSettings.StreamType == 'Group' && !req.session.user.Birthdate) {
				console.log("-------------------------------------------HERE-------------------------", req.session.user.Birthdate);
				req.body.perPage = 25; 
				req.body.pageNo = 1;
				req.body.qc = "allPublished";
				return allDashboardCapsules(req, res);
			} else {
				var dataToUpdate2 = {
					IsDeleted : 1
				}
				await SyncedPost.update(conditions_sp, {$set : dataToUpdate2}, {multi : true});
				
				CapsuleData.LaunchSettings = CapsuleData.LaunchSettings ? CapsuleData.LaunchSettings : {};
				CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings.StreamType ? CapsuleData.LaunchSettings.StreamType : '';
				if(CapsuleData.LaunchSettings.StreamType != 'Group') {
					__streamPagePostNow(PageData.Medias, PageData, req, CapsuleData, First_SyncedPosts);
				} else {
					__streamPagePostNow_GroupStream(PageData.Medias, PageData, req, CapsuleData, First_SyncedPosts);
				}
			}
		}
	} catch (caughtError) {
		console.log("caughtError - ", caughtError);
	}	
	
	req.body.perPage = 25; 
	req.body.pageNo = 1;
	req.body.qc = "allPublished";
	allDashboardCapsules(req, res);
}

var updateStreamSettings_ActiveCapsule_GroupStream = async function ( req , res ) {
	try {
		var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
   
		var conditions = {
			_id : CapsuleId
		};

		var doc = {
			$set: {
				MonthFor : req.body.MonthFor ? req.body.MonthFor : 'M12',
				Frequency : 'medium', //req.body.Frequency ? req.body.Frequency
				EmailTemplate : req.body.EmailTemplate ? req.body.EmailTemplate : 'ImaginativeThinker',
				IsStreamPaused : req.body.IsStreamPaused ? true : false
			}
		}
		
		if(typeof req.body.EmailSubject != 'undefined') {
			doc.$set.EmailSubject = req.body.EmailSubject ? req.body.EmailSubject : '';
		}
		
		if(typeof req.body.IsOnetimeStream != 'undefined') {
			doc.$set.IsOnetimeStream = req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false;
		}
		
		if(typeof req.body.IsOnlyPostImage != 'undefined') {
			doc.$set.IsOnlyPostImage = req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false;
		}
		
		var CapsuleData_beforeUpdate = await Capsule.findOne(conditions);
		await Capsule.update(conditions, doc);
		
		var CapsuleData = await Capsule.findOne(conditions);
		var PageData = await getPagesByCapsuleId(CapsuleId);
		PageData.Medias = PageData.Medias ? PageData.Medias : [];
		
		//soft delete old stream posts of this page and reset again as per the settings changes if Month or Frequency is changed else simply update the records.
		var conditions_sp = {
			CapsuleId : CapsuleData._id,
			PageId : PageData._id,
			IsDeleted : 0
		};
		var First_SyncedPosts = await SyncedPost.findOne(conditions_sp).sort({_id : -1});
		First_SyncedPosts = First_SyncedPosts ? First_SyncedPosts : {};
		First_SyncedPosts.EmailTemplate = First_SyncedPosts.EmailTemplate ? First_SyncedPosts.EmailTemplate : 'ImaginativeThinker';
		First_SyncedPosts.Status = First_SyncedPosts.Status ? First_SyncedPosts.Status : false;
		First_SyncedPosts.MonthFor = CapsuleData_beforeUpdate.MonthFor ? CapsuleData_beforeUpdate.MonthFor : 'M12';
		First_SyncedPosts.Frequency = CapsuleData_beforeUpdate.Frequency ? CapsuleData_beforeUpdate.Frequency : 'high';
		
		var dataToUpdate = {
			Status : !doc.$set.IsStreamPaused,
			EmailTemplate : doc.$set.EmailTemplate ? doc.$set.EmailTemplate : 'ImaginativeThinker'
		}
		
		if(typeof req.body.EmailSubject != 'undefined') {
			dataToUpdate.EmailSubject = req.body.EmailSubject ? req.body.EmailSubject : '';
			First_SyncedPosts.EmailSubject = dataToUpdate.EmailSubject;
		}
		
		if(typeof req.body.IsOnetimeStream != 'undefined') {
			dataToUpdate.IsOnetimeStream = req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false;
			First_SyncedPosts.IsOnetimeStream = dataToUpdate.IsOnetimeStream;
		}
		
		if(typeof req.body.IsOnlyPostImage != 'undefined') {
			dataToUpdate.IsOnlyPostImage = req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false;
			First_SyncedPosts.IsOnlyPostImage = dataToUpdate.IsOnlyPostImage;
		}
		
		
		await SyncedPost.update(conditions_sp, {$set : dataToUpdate}, {multi : true});
		
		/*
		if(doc.$set.IsStreamPaused == First_SyncedPosts.Status) {
			var dataToUpdate = {
				Status : !First_SyncedPosts.Status,
				EmailTemplate : doc.$set.EmailTemplate ? doc.$set.EmailTemplate : 'ImaginativeThinker'
			}
			
			//need to toggle the status.
			await SyncedPost.update(conditions_sp, {$set : dataToUpdate}, {multi : true});
		}
		
		if(doc.$set.EmailTemplate != First_SyncedPosts.EmailTemplate) {
			var dataToUpdate2 = {
				EmailTemplate : doc.$set.EmailTemplate ? doc.$set.EmailTemplate : 'ImaginativeThinker'
			}
			await SyncedPost.update(conditions_sp, {$set : dataToUpdate2}, {multi : true});
		}
		*/
		
		//if(doc.$set.MonthFor != First_SyncedPosts.MonthFor || doc.$set.Frequency != First_SyncedPosts.Frequency) {
			for(var i = 0; i < PageData.Medias.length; i++) {
				var cond = {
					PageId : PageData.OriginatedFrom,
					PostId : PageData.Medias[i].OriginatedFrom
				};
				
				if(PageData.Medias[i].PostType == 'AnswerPost' && PageData.Medias[i].QuestionPostId) {
					cond = {
						PostId : PageData.Medias[i]._id
					};
				}
				
				var f = {
					SelectedBlendImages : 1
				};
				var SelectedBlendImages = await PageStream.find(cond, f);
				if(SelectedBlendImages.length) {
					PageData.Medias[i].SelectedBlendImages = SelectedBlendImages[0].SelectedBlendImages ? SelectedBlendImages[0].SelectedBlendImages : [];
				}
				
				PageData.Medias[i].SelectedBlendImages = PageData.Medias[i].SelectedBlendImages ? PageData.Medias[i].SelectedBlendImages : [];
			}
			
			req.session.user.Birthdate = req.session.user.Birthdate ? req.session.user.Birthdate : null;
			if(CapsuleData.LaunchSettings.StreamType == 'Group' && !req.session.user.Birthdate) {
				console.log("-------------------------------------------HERE-------------------------", req.session.user.Birthdate);
				req.body.perPage = 25; 
				req.body.pageNo = 1;
				req.body.qc = "allPublished";
				return allDashboardCapsules(req, res);
			} else {
				var dataToUpdate2 = {
					IsDeleted : 1
				}
				await SyncedPost.update(conditions_sp, {$set : dataToUpdate2}, {multi : true});
				
				CapsuleData.LaunchSettings = CapsuleData.LaunchSettings ? CapsuleData.LaunchSettings : {};
				CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings.StreamType ? CapsuleData.LaunchSettings.StreamType : '';
				if(CapsuleData.LaunchSettings.StreamType != 'Group') {
					__streamPagePostNow(PageData.Medias, PageData, req, CapsuleData, First_SyncedPosts);
				} else {
					//commenting so It doesn't schedule posts - Settings submit button no more needed for this purpose as it'd now done using cronjob
					/*
					//send announcement email to owner from here.
					var _OwnerName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : '';
					var _OwnerEmail = req.session.user.Email;
					var _cId = req.session.user.AllFoldersId ? req.session.user.AllFoldersId : '';
					var _pId = req.session.user.AllPagesId ? req.session.user.AllPagesId : '';
					var _StreamUrl = 'https://www.scrpt.com/streams/'+_cId+'/'+_pId+'?stream='+CapsuleData._id;
					__sendEventAnnouncementEmail(_OwnerEmail, _OwnerName, _StreamUrl);
					__streamPagePostNow_GroupStream(PageData.Medias, PageData, req, CapsuleData, First_SyncedPosts);
					*/
				}
			}
		//}
	} catch (caughtError) {
		console.log("caughtError - ", caughtError);
	}	
	
	req.body.perPage = 25; 
	req.body.pageNo = 1;
	req.body.qc = "allPublished";
	allDashboardCapsules(req, res);
}

var createPostsOnEventDay_INTERNAL_API = async function ( req , res ) {
	try {
		req.session = req.session ? req.session : {};
		req.session.user = req.body.SessionUser ? req.body.SessionUser : null;
		
		if(!req.session.user) {
			return;
		}
		
		var CapsuleId =  req.body.capsuleId ? req.body.capsuleId : 0;
		
		if(!CapsuleId) {
			return;
		}
		
		var conditions = {
			_id : CapsuleId
		};

		var doc = {
			$set: {
				MonthFor : req.body.MonthFor ? req.body.MonthFor : 'M12',
				Frequency : 'medium', //req.body.Frequency ? req.body.Frequency
				EmailTemplate : req.body.EmailTemplate ? req.body.EmailTemplate : 'ImaginativeThinker',
				IsStreamPaused : req.body.IsStreamPaused ? true : false
			}
		}
		
		if(typeof req.body.EmailSubject != 'undefined') {
			doc.$set.EmailSubject = req.body.EmailSubject ? req.body.EmailSubject : '';
		}
		
		if(typeof req.body.IsOnetimeStream != 'undefined') {
			doc.$set.IsOnetimeStream = req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false;
		}
		
		if(typeof req.body.IsOnlyPostImage != 'undefined') {
			doc.$set.IsOnlyPostImage = req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false;
		}
		
		var CapsuleData_beforeUpdate = await Capsule.findOne(conditions);
		await Capsule.update(conditions, doc);
		
		var CapsuleData = await Capsule.findOne(conditions);
		var PageData = await getPagesByCapsuleId(CapsuleId);
		PageData.Medias = PageData.Medias ? PageData.Medias : [];
		
		//soft delete old stream posts of this page and reset again as per the settings changes if Month or Frequency is changed else simply update the records.
		var conditions_sp = {
			CapsuleId : CapsuleData._id,
			PageId : PageData._id,
			IsDeleted : 0
		};
		var First_SyncedPosts = await SyncedPost.findOne(conditions_sp).sort({_id : -1});
		First_SyncedPosts = First_SyncedPosts ? First_SyncedPosts : {};
		
		First_SyncedPosts._id = First_SyncedPosts._id ? First_SyncedPosts._id : null;
		if(First_SyncedPosts._id) {
			//making sure that this does not hit by cron job on event day more than 1 time.
			//return;
		}
		
		First_SyncedPosts.EmailTemplate = First_SyncedPosts.EmailTemplate ? First_SyncedPosts.EmailTemplate : 'ImaginativeThinker';
		First_SyncedPosts.Status = First_SyncedPosts.Status ? First_SyncedPosts.Status : false;
		First_SyncedPosts.MonthFor = CapsuleData_beforeUpdate.MonthFor ? CapsuleData_beforeUpdate.MonthFor : 'M12';
		First_SyncedPosts.Frequency = CapsuleData_beforeUpdate.Frequency ? CapsuleData_beforeUpdate.Frequency : 'high';
		
		var dataToUpdate = {
			Status : !doc.$set.IsStreamPaused,
			EmailTemplate : doc.$set.EmailTemplate ? doc.$set.EmailTemplate : 'ImaginativeThinker'
		}
		
		if(typeof req.body.EmailSubject != 'undefined') {
			dataToUpdate.EmailSubject = req.body.EmailSubject ? req.body.EmailSubject : '';
			First_SyncedPosts.EmailSubject = dataToUpdate.EmailSubject;
		}
		
		if(typeof req.body.IsOnetimeStream != 'undefined') {
			dataToUpdate.IsOnetimeStream = req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false;
			First_SyncedPosts.IsOnetimeStream = dataToUpdate.IsOnetimeStream;
		}
		
		if(typeof req.body.IsOnlyPostImage != 'undefined') {
			dataToUpdate.IsOnlyPostImage = req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false;
			First_SyncedPosts.IsOnlyPostImage = dataToUpdate.IsOnlyPostImage;
		}
		
		
		await SyncedPost.update(conditions_sp, {$set : dataToUpdate}, {multi : true});
		
		//if(doc.$set.MonthFor != First_SyncedPosts.MonthFor || doc.$set.Frequency != First_SyncedPosts.Frequency) {
			for(var i = 0; i < PageData.Medias.length; i++) {
				var cond = {
					PageId : PageData.OriginatedFrom,
					PostId : PageData.Medias[i].OriginatedFrom
				};
				
				if(PageData.Medias[i].PostType == 'AnswerPost' && PageData.Medias[i].QuestionPostId) {
					cond = {
						PostId : PageData.Medias[i]._id
					};
				}
				
				var f = {
					SelectedBlendImages : 1
				};
				var SelectedBlendImages = await PageStream.find(cond, f);
				if(SelectedBlendImages.length) {
					PageData.Medias[i].SelectedBlendImages = SelectedBlendImages[0].SelectedBlendImages ? SelectedBlendImages[0].SelectedBlendImages : [];
				}
				
				PageData.Medias[i].SelectedBlendImages = PageData.Medias[i].SelectedBlendImages ? PageData.Medias[i].SelectedBlendImages : [];
			}
			
			req.session.user.Birthdate = req.session.user.Birthdate ? req.session.user.Birthdate : null;
			if(CapsuleData.LaunchSettings.StreamType == 'Group' && !req.session.user.Birthdate) {
				console.log("-------------------------------------------HERE-------------------------", req.session.user.Birthdate);
			} else {
				var dataToUpdate2 = {
					IsDeleted : 1
				};
				
				await SyncedPost.update(conditions_sp, {$set : dataToUpdate2}, {multi : true});
				
				CapsuleData.LaunchSettings = CapsuleData.LaunchSettings ? CapsuleData.LaunchSettings : {};
				CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings.StreamType ? CapsuleData.LaunchSettings.StreamType : '';
				if(CapsuleData.LaunchSettings.StreamType != 'Group') {
					__streamPagePostNow(PageData.Medias, PageData, req, CapsuleData, First_SyncedPosts);
				} else {
					CapsuleData.StreamFlow = CapsuleData.StreamFlow ? CapsuleData.StreamFlow : 'Birthday';
					
					if(CapsuleData.StreamFlow == 'Birthday') {
						//send announcement email to owner from here.
						var _OwnerName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : '';
						var _OwnerEmail = req.session.user.Email;
						var _cId = req.session.user.AllFoldersId ? req.session.user.AllFoldersId : '';
						var _pId = req.session.user.AllPagesId ? req.session.user.AllPagesId : '';
						var _StreamUrl = 'https://www.scrpt.com/streams/'+_cId+'/'+_pId+'?stream='+CapsuleData._id;
						
						__sendEventAnnouncementEmail(_OwnerEmail, _OwnerName, _StreamUrl);
					}
					
					__streamPagePostNow_GroupStream(PageData.Medias, PageData, req, CapsuleData, First_SyncedPosts);
				}
			}
		//}
	} catch (caughtError) {
		console.log("caughtError - ", caughtError);
	}
}

var checkPostStreams = async function (req, res) {
	var cond = {
		PageId : req.body.PageId ? req.body.PageId : null,
		PostId : req.body.PostId ? req.body.PostId : null
	};
	var f = {
		SelectedBlendImages : 1
	};
	var SelectedBlendImagesArr = await PageStream.find(cond, f);
	var SelectedBlendImages = [];
	
	var response = {
		status: "error",  
		message: "Stream is not enabled, Please set now.",
		results : SelectedBlendImages
	}
	
	if(SelectedBlendImagesArr.length) {
		SelectedBlendImages = SelectedBlendImagesArr[0].SelectedBlendImages ? SelectedBlendImagesArr[0].SelectedBlendImages : [];
		if(SelectedBlendImages.length) {
			response = {
				status: "success",  
				message: "Stream is already enabled for this post.",
				results : SelectedBlendImages
			}
		}
	}
	
	res.json(response);
	
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
exports.updateCartForSurpriseGift = updateCartForSurpriseGift;
exports.updateCartForMonth = updateCartForMonth;
exports.updateCartForFrequency = updateCartForFrequency;
exports.updateCartForEmailTemplate = updateCartForEmailTemplate;
exports.updateCartForMonth_ActiveCapsule = updateCartForMonth_ActiveCapsule;
exports.toggleStream = toggleStream;
exports.updateCartForFrequency_ActiveCapsule = updateCartForFrequency_ActiveCapsule;
exports.updateStreamSettings_ActiveCapsule = updateStreamSettings_ActiveCapsule;
exports.updateStreamSettings_ActiveCapsule_GroupStream = updateStreamSettings_ActiveCapsule_GroupStream;
exports.createPostsOnEventDay_INTERNAL_API = createPostsOnEventDay_INTERNAL_API;
//Buy Now From Public Gallery - Shoping Cart Apis

exports.getMyPurchases = getMyPurchases;
exports.getMySales = getMySales;
exports.getSalesExcel = getSalesExcel;

exports.saveBirthday = saveBirthday;
exports.checkPostStreams = checkPostStreams;