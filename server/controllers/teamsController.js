var Capsule = require('./../models/capsuleModel.js');
var Page = require('./../models/pageModel.js');
var User = require('./../models/userModel.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var EmailTemplate = require('./../models/emailTemplateModel.js');

var async = require('async');
var Teams = require('./../models/teamsModel.js');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var User = require('./../models/userModel.js');
var StreamEmailTracker = require('./../models/StreamEmailTrackerModel.js');
var StreamConversation = require('./../models/StreamConversationModel.js');

Array.prototype.contains = function (v) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] === v) return true;
	}
	return false;
};

Array.prototype.unique = function () {
	var arr = [];
	for (var i = 0; i < this.length; i++) {
		if (!arr.contains(this[i])) {
			arr.push(this[i]);
		}
	}
	return arr;
}

var __SendEmail = function(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject) {
	console.log("__SendEmail ---- RecipientName = ", RecipientName);
	var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
	var to = shareWithEmail;
	
	newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
	subject = subject.replace(/{RecipientName}/g, RecipientName);
	
	var mailOptions = {
		from: process.EMAIL_ENGINE.info.senderLine,
		to: to, // list of receivers
		subject: subject,
		text: process.HOST_URL + '/login',
		html: newHtml
	};
	//console.log("newHtml - ", newHtml);
	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error);
		} else {
			console.log('Message sent to: ' + to + info.response);
		}
	});
};

var listTeams = async function (req, res) {
	try {
		// Validate session exists
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.status(401).json({
				status: 401,
				message: "User session not found. Please login.",
				result: [],
				TeamRequests: []
			});
		}

		var conditions = {};
		conditions.$or = [
			{ UserId : ObjectId(req.session.user._id) },
			{ "MemberEmails.Email" : req.session.user.Email }
		];
		conditions.Status = true;
		conditions.IsDeleted = false;
		
		const result = await Teams.find(conditions).populate('UserId').exec();
		
		var TeamRequests = [];
		for(var i = 0; i < result.length; i++) {
			result[i].MemberEmails = result[i].MemberEmails ? result[i].MemberEmails : [];
			
			result[i].MemberEmails.push({
				Name : result[i].UserId.Name, 
				Email : result[i].UserId.Email,
				StreamIds : result[i].StreamIds,
				Status : 1
			});
			
			for(var j = 0; j < result[i].MemberEmails.length; j++) {
				var MemberEmail = result[i].MemberEmails[j].Email ? result[i].MemberEmails[j].Email : null;
				var MemberStatus = result[i].MemberEmails[j].Status ? result[i].MemberEmails[j].Status : 0;
				var MemberStreamIds = result[i].MemberEmails[j].StreamIds ? result[i].MemberEmails[j].StreamIds : 0;
				
				var Total_StreamOpenedEmailCount = 0;
				var Total_ConversationCount = 0;
				
				var StreamTitles = [];
				if(MemberStatus) {
					var UserRecord = await User.findOne({Email : MemberEmail, IsDeleted : false});
					UserRecord = UserRecord ? UserRecord : {};
					UserRecord._id = UserRecord._id ? UserRecord._id : null;
					if(!UserRecord._id) {
						continue;
					}
					
					result[i].MemberEmails[j].Name = UserRecord.Name ? UserRecord.Name : '';
					result[i].MemberEmails[j].UserId = UserRecord._id ? UserRecord._id : '';
					result[i].MemberEmails[j].ProfilePic = UserRecord.ProfilePic ? UserRecord.ProfilePic : '';
					
					if(!MemberStreamIds.length) {
						continue;
					}
					
					for(var lp = 0; lp < MemberStreamIds.length; lp++) {
						MemberStreamIds[lp] = ObjectId(MemberStreamIds[lp]);
					}
					var streamConditions = {
						_id : {$in : MemberStreamIds},
						OwnerId : UserRecord._id,
						Origin : "published",
						IsPublished : true,
						"LaunchSettings.Audience":"ME",
						"LaunchSettings.CapsuleFor" : "Stream",
						Status : true,
						IsDeleted : false
					};
					var fields = {}; 
					var sortObj = {
						_id : 1,
						Order: 1,
						ModifiedOn: -1
					};
					var results = await Capsule.find(streamConditions , fields).sort(sortObj).lean();
					results = results ? results : [];
					
					if( results.length ){
						console.log("results.length ------------- ", results.length);
						for( var loop = 0; loop < results.length; loop++ ){
							StreamTitles.push(results[loop].Title);
							var CapsuleId = results[loop]._id;
							var UserEmail = MemberEmail ? MemberEmail : null;
							var StreamOpenedEmailCount = 0;
							var ConversationCount = 0;
							if(CapsuleId && UserEmail) {
								var trackerConditions = {
									CapsuleId : CapsuleId,
									UserEmail : UserEmail
								};
								
								// Use countDocuments() instead of deprecated count()
								StreamOpenedEmailCount = await StreamEmailTracker.countDocuments(trackerConditions);
								StreamOpenedEmailCount = StreamOpenedEmailCount ? StreamOpenedEmailCount : 0;
								
								var StreamConversation_conditions = {
									CapsuleId : CapsuleId ? CapsuleId : null,
									UserId : req.session.user._id ? req.session.user._id : null
								};
								var ConversationResult = await StreamConversation.findOne(StreamConversation_conditions, {});
								ConversationResult = ConversationResult ? ConversationResult : {};
								ConversationResult.ConversationCount = ConversationResult.ConversationCount ? ConversationResult.ConversationCount : 0;
								if(ConversationResult.ConversationCount) {
									ConversationCount = ConversationResult.ConversationCount ? ConversationResult.ConversationCount : 0;
								}
							}
							results[loop].StreamOpenedEmailCount = StreamOpenedEmailCount;
							results[loop].ConversationCount = ConversationCount;
							
							Total_StreamOpenedEmailCount += StreamOpenedEmailCount;
							Total_ConversationCount += ConversationCount;
						}
					}
				} else {
					if(MemberEmail == req.session.user.Email && String(result[i].UserId._id) != String(req.session.user._id)) {
						TeamRequests.push({
							_id: result[i]._id,
							OwnerName : result[i].UserId.Name ? result[i].UserId.Name : '',
							TeamName : result[i].TeamName ? result[i].TeamName : ''
						});
					}
				}
				result[i].MemberEmails[j].StreamOpenedEmailCount = Total_StreamOpenedEmailCount;
				result[i].MemberEmails[j].ConversationCount = Total_ConversationCount;
				result[i].MemberEmails[j].StreamTitles = StreamTitles ? StreamTitles : [];
			}				
		}
		
		var response = {
			status: 200,
			message: "Team listing.",
			result: result,
			TeamRequests: TeamRequests
		}
		return res.json(response);
	} catch (err) {
		console.error("Error in listTeams:", err);
		var response = {
			status: 501,
			message: "Error retrieving teams. Please try again.",
			result: [],
			TeamRequests: []
		}
		return res.json(response);
	}
};

var createTeam = async function (req, res) {
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	var data = {};
	var teamId = req.body.teamIdForEditCase ? ObjectId(req.body.teamIdForEditCase) : null;
	data.UserId = req.session.user._id;
	data.TeamName = req.body.TeamName ? req.body.TeamName : null;
	data.StreamIds = req.body.StreamIds ? req.body.StreamIds : [];
	var MemberEmails = req.body.MemberEmails ? req.body.MemberEmails : [];
	data.MemberEmails = [];
	var ReceiverEmails = [];
	var ReceiverEmails_NameMap = {};
	for(var i = 0; i < MemberEmails.length; i++) {
		var member = MemberEmails[i];
		if(!member.Name && !member.Email) {
			continue;
		}
		ReceiverEmails.push(member.Email);
		ReceiverEmails_NameMap[member.Email] = member.Name;
		
		data.MemberEmails.push({
			Name : member.Name,
			Email : member.Email,
			Status : 0,
			StreamIds : []
		});
	}
	
	if(!data.TeamName) {
		var response = {
			status: 204,
			message: "Please enter Team name."
		}
		return res.json(response);
	}
	
	if(!teamId) {
		Teams(data).save(function (err, result) {
			if (!err) {
				//send email first and then save teams
				var condition = {};
				condition.name = "Team__Invite";
				
				var SignupURL = 'https://www.scrpt.com/backdoor';
				
				EmailTemplate.find(condition, {}, function (err, results) {
					if (!err) {
						if (results.length) {
							var OwnerName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";
							var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
							newHtml = newHtml.replace(/{SignupURL}/g, SignupURL);
							results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
							var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
											
							User.find({ 'Email': {$in : ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, async function (err, UserData) {
								if (!err) {
									UserData = UserData ? UserData : [];
									var emails = [];
									for(var i = 0; i < UserData.length; i++) {
										var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
										var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
										emails.push(shareWithEmail);
										if(shareWithEmail) {
											__SendEmail(shareWithEmail, RecipientName, OwnerName, newHtml, subject);
										}
									}
									//console.log("ReceiverEmails_NameMap - ", ReceiverEmails_NameMap);
									if(emails.length != ReceiverEmails.length) {
										var difference = ReceiverEmails.filter(x => emails.indexOf(x) === -1);
										for(var i = 0; i < difference.length; i++) {
											var RecipientName = difference[i] ? ReceiverEmails_NameMap[difference[i]].split(' ')[0] : "";
											var shareWithEmail = difference[i] ? difference[i] : null;
											
											if(shareWithEmail) {
												__SendEmail(shareWithEmail, RecipientName, OwnerName, newHtml, subject);
											}
										}
									}
								}
							})
						}
					}
				});
		
				var response = {
					status: 200,
					message: "Team created successfully.",
					result: result
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
		})
	} else {
		var response = {
			status: 200,
			message: "Team updated successfully.",
			result: result
		}
		res.json(response);
	}
};

var updateTeam = function (req, res) {
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	conditions._id = req.body._id ? ObjectId(req.body._id) : null;
	conditions.UserId = req.session.user._id;
	
	var data = {};
	//data.UserId = req.session.user._id;
	data.TeamName = req.body.TeamName ? req.body.TeamName : null;
	data.MemberEmails = req.body.MemberEmails ? req.body.MemberEmails : [];
	data.StreamIds = req.body.StreamIds ? req.body.StreamIds : [];
	
	Teams.update(conditions, {$set : data}, function (err, result) {
		if (!err) {
			var response = {
				status: 200,
				message: "Team updated successfully.",
				result: result
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
	})
};

var deleteTeam = function (req, res) {
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	conditions._id = req.body._id ? ObjectId(req.body._id) : null;
	conditions.UserId = req.session.user._id;
	
	Teams.update(conditions, {$set : {IsDeleted : true}}, function (err, result) {
		if (!err) {
			var response = {
				status: 200,
				message: "Team deleted successfully.",
				result: result
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
	})
};

var leaveTeam = function (req, res) {
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	conditions._id = req.body._id ? ObjectId(req.body._id) : null;
	var memberEmail = req.session.user.Email;
	
	Teams.update(conditions, { $pull: { MemberEmails : {Email : memberEmail} } }, function (err, result) {
		if (!err) {
			var response = {
				status: 200,
				message: "Team left successfully.",
				result: result
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
	})
};

var approveTeam = function (req, res) {
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	conditions["_id"] = req.body._id ? req.body._id : null;
	conditions["MemberEmails.Email"] = req.session.user.Email;
	var StreamIds = req.body.StreamIds ? req.body.StreamIds : [];
	
	Teams.update(conditions, { $set: { "MemberEmails.$.Status" : 1, "MemberEmails.$.StreamIds" : StreamIds } }, function (err, result) {
		if (!err) {
			var response = {
				status: 200,
				message: "Record updated successfully.",
				result: result
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
	})
};

//Page library Apis - common
exports.createTeam = createTeam;
exports.updateTeam = updateTeam;
exports.deleteTeam = deleteTeam;
exports.leaveTeam = leaveTeam;
exports.approveTeam = approveTeam;
exports.listTeams = listTeams;
