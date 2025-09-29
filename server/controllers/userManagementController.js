var userManagement = require('./../models/userModel.js');
var Order = require('./../models/orderModel.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var bcrypt = require('bcryptjs');

var RequestInvitation = require('./../models/requestInvitationModel.js');

//updates for share and published cases
var __updateChapterCollection = function(registeredUserEmail , registeredUserId){
	if( registeredUserEmail && registeredUserId){
		var Capsule = require('./../models/capsuleModel.js');
		var Chapter = require('./../models/chapterModel.js');
		var Page = require('./../models/pageModel.js');
		var conditions = {
			OwnerEmail : registeredUserEmail,
			OwnerId : { $ne : registeredUserId}
		};
		
		var data = {
			OwnerId : registeredUserId
		};
		var options = { 
			multi: true 
		};		
		
		Capsule.update(conditions , {$set : data} , options , function(err , numAffected){
			if( !err ){
				console.log("Capsule : Total Number Of Affected Records = ",numAffected);
			}
			else{
				console.log("Capsule : ----09998887----ERROR : ",err);
			}
		});
		
		Chapter.update(conditions , {$set : data} , options , function(err , numAffected){
			if( !err ){
				console.log("Chapter : Total Number Of Affected Records = ",numAffected);
			}
			else{
				console.log("Chapter : ----09998887----ERROR : ",err);
			}
		})
		
		Page.update(conditions , {$set : data} , options , function(err , numAffected){
			if( !err ){
				console.log("Page : Total Number Of Affected Records = ",numAffected);
			}
			else{
				console.log("Page : ----09998887----ERROR : ",err);
			}
		})
	}
	else{
		console.log("----09998887----registeredUserEmail : "+registeredUserEmail+" -----registeredUserId : "+registeredUserId);
	}
}

//updates for invitations case
var __updateChapterCollection__invitationCase = function(registeredUserEmail , registeredUserId){
	if( registeredUserEmail && registeredUserId){
		var Chapter = require('./../models/chapterModel.js');
		
		var conditions = {
			"LaunchSettings.Invitees.UserEmail" : registeredUserEmail
		};
		
		var data = {
			"LaunchSettings.Invitees.$.UserID" : registeredUserId
		};
		var options = { 
			multi: true 
		};		
		
		Chapter.update(conditions , {$set : data} , options , function(err , numAffected){
			if( !err ){
				console.log("Chapter : Total Number Of Affected Records = ",numAffected);
			}
			else{
				console.log("Chapter : ----09998887----ERROR : ",err);
			}
		})
	}
	else{
		console.log("----09998887----registeredUserEmail : "+registeredUserEmail+" -----registeredUserId : "+registeredUserId);
	}
}

// To fetch all Users
var findAll = function (req, res) {
	var conditions = {
		IsDeleted:false
	};
	/*var fields = {
		Name : true,
		NickName : true,
		Email : true,
		Gender : true,
		FSGsArr2 : true,
		CreatedOn : true,
		ModifiedOn : true,
		Status : true,
		AllowCreate : true
	};*/
	var fields = {};
	
	var sortObj = {
		ModifiedOn:-1
	};
	
    userManagement.find(conditions , fields).sort(sortObj).exec(function (err, result) {
        if (err) {
            res.json(err);
        } else {
            if (result.length == 0) {
                res.json({"code": "404", "msg": "Not Found"})
            } else {
                res.json({"code": "200", "msg": "Success", "response": result})
            }
        }
    })
};
exports.findAll = findAll;

//For Add User
var add = function (req, res) {
console.log("Data form Frontend - - >",req.body);
   userManagement.find({Email: req.body.Email , IsDeleted : false}, function (err, result) {
       console.log("Resuklts ------------->",result)
        if (result.length == 0) {
            var newUser = new userManagement();
            newUser.Email = req.body.Email;
            newUser.Password = newUser.generateHash(req.body.Password);
            newUser.Name = req.body.Name
            newUser.FSGsArr2 = req.body.FSGsArr2;//typeof(req.body.FSGsArr2)!='undefined'?req.body.FSGsArr2:{};
            newUser.NickName = req.body.Name ? req.body.Name : "";

            newUser.save(function (err, numAffected) {
                if (err) {
                    res.json(err);
                } else {
						__updateChapterCollection(newUser.Email , numAffected._id);
						__updateChapterCollection__invitationCase(newUser.Email , numAffected._id);
						
                        var condition = {}
                        condition.name = "Admin__AddUser";
                        EmailTemplate.find(condition, {}, function (err, results) {
							if (!err) {
								if (results.length) {
									var newHtml = results[0].description.replace(/{Password}/g, req.body.Password);
									newHtml = newHtml.replace(/{RecipientName}/g, req.body.Name);
									console.log("**** New Html - - >*****",newHtml);
									/*
									var transporter = nodemailer.createTransport({
										service: 'Gmail',
										auth: {
											user: 'collabmedia.scrpt@gmail.com',
											pass: 'scrpt123_2014collabmedia#1909'
										}
									});	
									*/
									var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
									var mailOptions = {
										//from: "Scrpt <collabmedia.scrpt@gmail.com>",
										from: process.EMAIL_ENGINE.info.senderLine,
										to: req.body.Email,
										subject: results[0].subject ? results[0].subject : 'Thanks for your interest.',
										html:newHtml
										//html: '<h3>Thank you for registering with CollabMedia.</h3> <p>Your account has been activated and Please Go and Login into our website and enjoy the sevices we provide</p><h3>Thanks</h3><p>CollabMedia Team</p>'
									};
									// send mail with defined transport object
									transporter.sendMail(mailOptions, function (error, info) {
										if (error) {
											return console.log(error);
										}
										console.log('USER ADDED BY ADMIN---------Message sent: ' + info.response);
									});

								}
							}
						})
                   findAll(req, res);            
                }
            });
        } else {
            res.json({"code": "404", "msg": "Email already exists!"});
        }
    });
};
exports.add = add;

// Edit Email Template
var edit = function (req, res) {
    console.log("inside Edit Usr Backend - - >",req.body);
//    return;
    var fields = {
        Name: req.body.Name,
        Email: req.body.Email,
        NickName: req.body.NickName,
        FSGsArr2 : typeof(req.body.FSGsArr2)=='object'?req.body.FSGsArr2:{}

    };
    var query = {_id: req.body.id};
    var options = {multi: false};
    userManagement.update(query, {$set: fields}, options, callback)
    function callback(err, numAffected) {
        if (err) {
            res.json(err)
        } else {
            findAll(req, res)
        }
    }
};
exports.edit = edit;

//For Delete User

var deleteUser = function(req,res){
    console.log("***************",req.body);
	var fields={
		IsDeleted: true
	};
	var query={_id:req.body.id};
	var options = { multi: false };
	userManagement.update(query, { $set: fields}, options, function(err, numAffected){
		if(err){
			res.json(err)
		}
		else{
			findAll(req,res)
		}
	});
}

exports.deleteUser = deleteUser;



// For Activating User
var activateUser = function (req, res) {
    var fields = {
        Status: req.body.Status ? req.body.Status : 1
    };
    console.log("inside Backend Controller - -  - - - - ->",req.body);
    var query = {_id: req.body.id};
    var options = {multi: true};
    userManagement.update(query, {$set: fields}, options, callback)
    function callback(err, numAffected) {
        if (err) {
            res.json(err)
        } else {
            findAll(req, res)
        }
    }
};
exports.activateUser = activateUser;


// For Deactivating User
var deactivateUser = function (req, res) {
    var fields = {
        Status: req.body.Status ? req.body.Status : 0
    };
    console.log("inside Backend Controller - -  - - - - ->",req.body);
    var query = {_id: req.body.id};
    var options = {multi: true};
    userManagement.update(query, {$set: fields}, options, callback)
    function callback(err, numAffected) {
        if (err) {
            res.json(err)
        } else {
            findAll(req, res)
        }
    }
};
exports.deactivateUser = deactivateUser;

//To Search Specific Users
var searchQuery = function (req, res) {
	var searchparam = req.body.searchText ? req.body.searchText : "";
    var conditions = {
		IsDeleted:false,
		$or: [
			{Name: {$regex: new RegExp(searchparam, "i")}},
			{NickName: {$regex: new RegExp(searchparam, "i")}},
			{Email: {$regex: new RegExp(searchparam, "i")}}
		]
	};
	var fields = {
		Name : true,
		NickName : true,
		Email : true,
		Gender : true,
		FSGsArr2 : true,
		CreatedOn : true,
		ModifiedOn : true,
		Status : true,
		AllowCreate : true,
		ProfilePic: true
	};
	
	var sortObj = {
		ModifiedOn:-1
	};
	
	var offset = req.body.offset ? req.body.offset : 0;
	var limit = req.body.limit ? req.body.limit : 100;
	   
	userManagement.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, result) {
		if (err) {
			res.json(err);
		} else {
			if (result.length == 0) {
				res.json({"code": "404", "msg": "Not Found"})
			} else {
				userManagement.find(conditions , fields).count().exec(function (err, dataCount) {
					if (!err) {
						res.json({"code": "200", "msg": "Success", "response": result, "count": dataCount})
					} else {
						res.json({"code": "200", "msg": "Success", "response": result, "count": 0})
					}
				});
			}
		}
	});
};
exports.searchQuery = searchQuery;

//To Search Specific Users
var searchRequestInvitation = function (req, res) {
	var searchparam = req.body.searchText ? req.body.searchText : "";
    var conditions = {
		IsDeleted:false,
		$or: [
			{Name: {$regex: new RegExp(searchparam, "i")}},
			{NickName: {$regex: new RegExp(searchparam, "i")}},
			{Email: {$regex: new RegExp(searchparam, "i")}}
		]
	};
	var fields = {
		Name : true,
		NickName : true,
		Email : true,
		Gender : true,
		FSGsArr2 : true,
		CreatedOn : true,
		ModifiedOn : true,
		Status : true,
		AllowCreate : true
	};
	
	var sortObj = {
		ModifiedOn:-1
	};
	
	var offset = req.body.offset ? req.body.offset : 0;
	var limit = req.body.limit ? req.body.limit : 100;
	   
	RequestInvitation.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, result) {
		if (err) {
			res.json(err);
		} else {
			if (result.length == 0) {
				res.json({"code": "404", "msg": "Not Found"})
			} else {
				RequestInvitation.find(conditions , fields).count().exec(function (err, dataCount) {
					if (!err) {
						res.json({"code": "200", "msg": "Success", "response": result, "count": dataCount})
					} else {
						res.json({"code": "200", "msg": "Success", "response": result, "count": 0})
					}
				});
			}
		}
	});
};
exports.searchRequestInvitation = searchRequestInvitation;

//To Get Data Per Page
var findPerPage = async function (req, res) {
    var conditions = {
		IsDeleted:false
	};
	var fields = {};
	
	var sortObj = {
		LastActiveTime : -1,
		ModifiedOn:-1
	};
	
	var offset = req.body.offset ? req.body.offset : 0;
	var limit = req.body.limit ? req.body.limit : 100;
	
	userManagement.aggregate([
		{ $match : conditions }, 
		{ $sort : sortObj },
		{ $skip: offset },
		{ $limit: limit },
		{ 
			$lookup: {     
					"from": "StreamEmailTracker",     
					"localField": "Email",     
					"foreignField": "UserEmail",     
					"as": "StreamEmailTrackerData"
			}
		},
		{
		  $project: {
			 "_id" : "$_id",
			"UserName" : "$UserName",
			"referralCode" : "HFG4d",
			"NickName" : "$NickName",
			"Name" : "$Name",
			"Email" : "$Email",
			"MarketingEmail" : "$MarketingEmail",
			"Subdomain_profilePic" : "$Subdomain_profilePic",
			"Subdomain_description" : "$Subdomain_description",
			"Subdomain_title" : "$Subdomain_title",
			"Subdomain_name" : "$Subdomain_name",
			"Subdomain" : "$Subdomain",
			"ApplicationPolicyAccepted" : "$ApplicationPolicyAccepted",
			"BrowserPolicyAccepted" : "$BrowserPolicyAccepted",
			"EmailConfirmationStatus" : "$EmailConfirmationStatus",
			"Status" : "$Status",
			"ModifiedOn" : "$ModifiedOn",
			"CreatedOn" : "$CreatedOn",
			"AllowCreate" : "$AllowCreate",
			"Gender" : "$Gender",
			"Settings" : "$Settings",
			"FSGsArr" : "$FSGsArr",
			"ProfilePic" : "$ProfilePic",
			"CreditAmount" : "$CreditAmount",
			"IsCredit" : "$IsCredit",
			"JournalId" : "$JournalId",
			"AllFoldersId" : "$AllFoldersId",
			"AllPagesId" : "$AllPagesId",
			"Birthdate" : "$Birthdate",
			"LastActiveTime" : "$LastActiveTime",
			"FSGsArr2" : "$FSGsArr2",
			 "StreamEmailTrackerCount": { $cond: { if: { $isArray: "$StreamEmailTrackerData" }, then: { $size: "$StreamEmailTrackerData" }, else: 0} }
		  }
		}
	]).exec(function (err, result) {
        if (err) {
            res.json(err);
        } else {
            if (result.length == 0) {
                res.json({"code": "404", "msg": "Not Found"})
            } else {
                userManagement.find(conditions , fields).count().exec(function (err, dataCount) {
                    if (!err) {
                        res.json({"code": "200", "msg": "Success", "response": result, "count": dataCount})
                    } else {
                        res.json({"code": "200", "msg": "Success", "response": result, "count": 0})
                    }
                });
			}
        }
    });
	
	/*
	userManagement.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, result) {
        if (err) {
            res.json(err);
        } else {
            if (result.length == 0) {
                res.json({"code": "404", "msg": "Not Found"})
            } else {
                userManagement.find(conditions , fields).count().exec(function (err, dataCount) {
                    if (!err) {
                        res.json({"code": "200", "msg": "Success", "response": result, "count": dataCount})
                    } else {
                        res.json({"code": "200", "msg": "Success", "response": result, "count": 0})
                    }
                });
			}
        }
    });
	*/
}
exports.findPerPage = findPerPage;

//To Get Data Per Page
var viewRequestInvitation = function (req, res) {
    var conditions = {
		IsDeleted:false
	};
	var fields = {};
	
	var sortObj = {
		ModifiedOn:-1
	};
	
	var offset = req.body.offset ? req.body.offset : 0;
	var limit = req.body.limit ? req.body.limit : 100;
	
	RequestInvitation.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, result) {
        if (err) {
            res.json(err);
        } else {
            if (result.length == 0) {
                res.json({"code": "404", "msg": "Not Found"})
            } else {
                RequestInvitation.find(conditions , fields).count().exec(function (err, dataCount) {
                    if (!err) {
                        res.json({"code": "200", "msg": "Success", "response": result, "count": dataCount})
                    } else {
                        res.json({"code": "200", "msg": "Success", "response": result, "count": 0})
                    }
                });
			}
        }
    });
}
exports.viewRequestInvitation = viewRequestInvitation;

// For setUnsetCreate User
var setUnsetCreate = function (req, res) {
    var fields = {
        AllowCreate: req.body.AllowCreate
    };
    console.log("inside Backend Controller - -  - - - - ->",req.body);
    var query = {_id: req.body.UserId};
    var options = {multi: true};
    userManagement.update(query, {$set: fields}, options, callback)
    function callback(err, numAffected) {
        if (err) {
            res.json(err)
        } else {
            findAll(req, res)
        }
    }
};
exports.setUnsetCreate = setUnsetCreate;

var getMySales_V1 = function ( req , res ){
    var textSearch = req.query.text ? req.query.text : "";
    if(textSearch == ""){
		Order.aggregate([ 
            { $match : { TransactionState : "Completed" } },
			{ $unwind : "$CartItems" }, 
			{ $group : {_id:'$CartItems.CapsuleId', numberOfOrders: {$sum:1}, TotalPayments : {$sum:"$CartItems.TotalPayment"} , TotalCommission: {$sum:"$CartItems.PlatformCommission"}, PayoutAmount: {$sum:{$subtract:["$CartItems.TotalPayment","$CartItems.PlatformCommission"]}}}}, 
            { $lookup: {     
				"from": "Capsules",     
				"localField": "_id",     
				"foreignField": "_id",     
				"as": "capsuleData"   
            }}, 
        ]).exec(function (err, data) {
            var response = {status: 200,  message: "Sales has been retrieved successfully.",results : data}
			res.json(response);
        });
    }else{
		Order.aggregate([ 
            { $match : { TransactionState : "Completed" } },
			{ $unwind : "$CartItems" }, 
            { $group : {_id:'$CartItems.CapsuleId', numberOfOrders: {$sum:1}, TotalPayments : {$sum:"$CartItems.TotalPayment"} , TotalCommission: {$sum:"$CartItems.PlatformCommission"}, PayoutAmount: {$sum:{$subtract:["$CartItems.TotalPayment","$CartItems.PlatformCommission"]}}}}, 
            { $lookup: {     
				"from": "Capsules",     
				"localField": "_id",     
				"foreignField": "_id",     
				"as": "capsuleData"   
            }},
            { $unwind : "$capsuleData" },
            { $match : { "capsuleData.Title" :new RegExp("^" + textSearch, 'i')} }
        ]).exec(function (err, data) {
            var response = {status: 200,  message: "Sales has been retrieved successfully.",results : data}
			res.json(response);
        });
    }
    
}

var getMySales = function ( req , res ){
    var textSearch = req.body.searchText?req.body.searchText:"";
    var offset = req.body.offset ? req.body.offset : 0;
    var limit = req.body.limit ? req.body.limit : 10;
    if(textSearch == ""){
        Order.aggregate([ 
            { $match : { TransactionState : "Completed" } },
			{ $sort: { CreatedOn: 1 } },
			{ $unwind : "$CartItems" }, 
            { $group : 
				{
					_id:'$CartItems.CapsuleId', 
					numberOfOrders: {$sum:1},
					NoOfSoldCopies : {$sum: {$size :"$CartItems.Owners"}}, 
					TotalPayments : {$sum:"$CartItems.TotalPayment"}, 
					TotalCommission: {$sum:"$CartItems.PlatformCommission"}, 
					PayoutAmount: {$sum:{$subtract:["$CartItems.TotalPayment","$CartItems.PlatformCommission"]}}, 
					SalesGraphData : {$push : {CreatedOn : { $subtract: [ "$CreatedOn", new Date("1970-01-01") ] },NoOfSoldCopies : {$size :"$CartItems.Owners"}}}
				}
			},
			/*
			{ $unwind : "$SalesGraphData" },
			{ $group : 
				{
					_id:'$_id', 
					numberOfOrders: '$numberOfOrders',
					NoOfSoldCopies : '$NoOfSoldCopies', 
					TotalPayments : '$TotalPayments', 
					TotalCommission: '$TotalCommission', 
					PayoutAmount: '$PayoutAmount', 
					SalesGraphData : {$push : {CreatedOn : "$CreatedOn",NoOfSoldCopies : {$size :"$CartItems.Owners"}}}
				}
			}, 
			*/
            { $limit: offset + limit },
            { $skip: offset },
            { $lookup: {     
                "from": "Capsules",     
                "localField": "_id",     
                "foreignField": "_id",     
                "as": "capsuleData"   
            }}
            
        ]).exec(function (err, data) {
			Order.aggregate([ 
				{ $match : { TransactionState : "Completed" } },
				{ $unwind : "$CartItems" },
				{ $group : {_id:'$CartItems.CapsuleId'}}, 
			]).exec(function (err, total) {
				var response = {status: 200,  message: "Sales has been retrieved successfully.",results : data,count:total.length?total.length:0}
				res.json(response);
			});
        });
    }else{
		Order.aggregate([ 
			{ $match : { TransactionState : "Completed" } },
			{ $sort: { CreatedOn: 1 } },
			{ $unwind : "$CartItems" },
			{ $group : 
				{
					_id:'$CartItems.CapsuleId', 
					numberOfOrders: {$sum:1},
					NoOfSoldCopies : {$sum: {$size :"$CartItems.Owners"}}, 
					TotalPayments : {$sum:"$CartItems.TotalPayment"}, 
					TotalCommission: {$sum:"$CartItems.PlatformCommission"}, 
					PayoutAmount: {$sum:{$subtract:["$CartItems.TotalPayment","$CartItems.PlatformCommission"]}},
					SalesGraphData : {$push : {CreatedOn : { $subtract: [ "$CreatedOn", new Date("1970-01-01") ] },NoOfSoldCopies : {$size :"$CartItems.Owners"}}}
				}
			},  
			{ $limit: offset + limit },
			{ $skip: offset },
			{ $lookup: {     
					"from": "Capsules",     
					"localField": "_id",     
					"foreignField": "_id",     
					"as": "capsuleData"   
			}},
			{ $match : { "capsuleData.Title" :new RegExp("^" + textSearch, 'i')} }
        ]).exec(function (err, data) {
            Order.aggregate([ 
				{ $match : { TransactionState : "Completed" } },
				{ $unwind : "$CartItems" },
				{ $group : {_id:'$CartItems.CapsuleId'}}, 
				{ $lookup: {     
					"from": "Capsules",     
					"localField": "_id",     
					"foreignField": "_id",     
					"as": "capsuleData"   
				}},
				{$unwind : "$capsuleData" },
				{ $match : { "capsuleData.Title" :new RegExp("^" + textSearch, 'i')} }
			]).exec(function (err, total) {
                var response = {status: 200,  message: "Sales has been retrieved successfully.",results : data,count:total.length?total.length:0}
				res.json(response);
			});
        });
    }
    
}
exports.getMySales = getMySales;