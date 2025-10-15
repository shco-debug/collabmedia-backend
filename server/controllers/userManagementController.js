var userManagement = require('./../models/userModel.js');
var Order = require('./../models/orderModel.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var bcrypt = require('bcryptjs');

var RequestInvitation = require('./../models/requestInvitationModel.js');

//updates for share and published cases
var __updateChapterCollection = async function(registeredUserEmail , registeredUserId){
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
		
		try {
			const capsuleResult = await Capsule.updateMany(conditions, {$set : data}).exec();
			console.log("Capsule : Total Number Of Affected Records = ", capsuleResult.modifiedCount || 0);
		} catch(err) {
			console.log("Capsule : ----09998887----ERROR : ", err);
		}
		
		try {
			const chapterResult = await Chapter.updateMany(conditions, {$set : data}).exec();
			console.log("Chapter : Total Number Of Affected Records = ", chapterResult.modifiedCount || 0);
		} catch(err) {
			console.log("Chapter : ----09998887----ERROR : ", err);
		}
		
		try {
			const pageResult = await Page.updateMany(conditions, {$set : data}).exec();
			console.log("Page : Total Number Of Affected Records = ", pageResult.modifiedCount || 0);
		} catch(err) {
			console.log("Page : ----09998887----ERROR : ", err);
		}
	}
	else{
		console.log("----09998887----registeredUserEmail : "+registeredUserEmail+" -----registeredUserId : "+registeredUserId);
	}
}

//updates for invitations case
var __updateChapterCollection__invitationCase = async function(registeredUserEmail , registeredUserId){
	if( registeredUserEmail && registeredUserId){
		var Chapter = require('./../models/chapterModel.js');
		
		var conditions = {
			"LaunchSettings.Invitees.UserEmail" : registeredUserEmail
		};
		
		var data = {
			"LaunchSettings.Invitees.$.UserID" : registeredUserId
		};
		
		try {
			const result = await Chapter.updateMany(conditions, {$set : data}).exec();
			console.log("Chapter Invitations : Total Number Of Affected Records = ", result.modifiedCount || 0);
		} catch(err) {
			console.log("Chapter Invitations : ----09998887----ERROR : ", err);
		}
	}
	else{
		console.log("----09998887----registeredUserEmail : "+registeredUserEmail+" -----registeredUserId : "+registeredUserId);
	}
}

// To fetch all Users
var findAll = async function (req, res) {
	try {
		// Check authorization - only admin and subadmin can view all users
		// Support both JWT (req.user) and session (req.session.user) authentication
		const user = req.session?.user || req.user;
		
		if (!user) {
			return res.status(401).json({
				"code": "401",
				"msg": "Unauthorized. Please login to continue.",
				"success": false
			});
		}
		
		const userRole = user.Role || user.role;
		if (userRole !== 'admin' && userRole !== 'subadmin') {
			return res.status(403).json({
				"code": "403",
				"msg": "Access denied. Only admins and subadmins can view all users.",
				"success": false,
				"yourRole": userRole
			});
		}
		
		var conditions = {
			IsDeleted: false
		};
		
		// Exclude sensitive fields from response
		var fields = {
			Password: 0,
			resetPasswordToken: 0,
			resetPasswordExpires: 0
		};
		
		var sortObj = {
			ModifiedOn: -1
		};
		
		const result = await userManagement.find(conditions, fields).sort(sortObj).exec();
		
		if (result.length == 0) {
			res.json({"code": "404", "msg": "Not Found", "success": false});
		} else {
			res.json({
				"code": "200", 
				"msg": "Success", 
				"success": true,
				"count": result.length,
				"response": result
			});
		}
	} catch (err) {
		console.error('Error in findAll:', err);
		res.status(500).json({"code": "500", "msg": "Error fetching users", "error": err.message});
	}
};
exports.findAll = findAll;

//For Add User
var add = async function (req, res) {
	try {
		
		// Check authorization - only admin and subadmin can add users
		// Support both JWT (req.user) and session (req.session.user) authentication
		const user = req.session?.user || req.user;
		
		if (!user) {
			return res.status(401).json({
				"code": "401",
				"msg": "Unauthorized. Please login to continue.",
				"success": false
			});
		}
		
		const userRole = user.Role || user.role;
		if (userRole !== 'admin' && userRole !== 'subadmin') {
			return res.status(403).json({
				"code": "403",
				"msg": "Access denied. Only admins and subadmins can add users.",
				"yourRole": userRole
			});
		}
		
		// Validate required fields
		if (!req.body.Email) {
			return res.status(400).json({
				"code": "400",
				"msg": "Missing required field: Email is required"
			});
		}
		if (!req.body.Password) {
			return res.status(400).json({
				"code": "400",
				"msg": "Missing required field: Password is required"
			});
		}
		if (!req.body.Name) {
			return res.status(400).json({
				"code": "400",
				"msg": "Missing required field: Name is required"
			});
		}
		
		const result = await userManagement.find({Email: req.body.Email, IsDeleted: false}).exec();
		
		if (result.length == 0) {
			var newUser = new userManagement();
			newUser.Email = req.body.Email;
			newUser.Password = newUser.generateHash(req.body.Password);
			newUser.Name = req.body.Name;
			newUser.FSGsArr2 = req.body.FSGsArr2;//typeof(req.body.FSGsArr2)!='undefined'?req.body.FSGsArr2:{};
			
			// Set NickName: use provided value, otherwise generate random
			if (req.body.NickName) {
				newUser.NickName = req.body.NickName;
			} else {
				// Generate random nickname: User + random 6-digit number
				const randomNum = Math.floor(100000 + Math.random() * 900000);
				newUser.NickName = `User${randomNum}`;
			}
			
			// Set role (default to 'user')
			const userRole = req.body.Role || 'user';
			newUser.Role = userRole;
			
			// Auto-assign permissions based on role
			if (userRole === 'admin') {
				newUser.Permissions = [
					'user_management',
					'content_moderation',
					'system_settings',
					'analytics',
					'billing',
					'content_editing'
				];
				newUser.AllowCreate = true; // Admins can always create
			} else if (userRole === 'subadmin') {
				// SubAdmin gets limited permissions (can be customized via req.body.Permissions if needed)
				newUser.Permissions = req.body.Permissions && Array.isArray(req.body.Permissions) 
					? req.body.Permissions 
					: ['content_moderation', 'basic_analytics', 'content_editing'];
				newUser.AllowCreate = req.body.AllowCreate !== undefined ? req.body.AllowCreate : true;
				
				// Auto-set supervisor to the user creating this subadmin (mapped from JWT via sessionCompatibility)
				if (req.session && req.session.user && req.session.user._id) {
					newUser.Supervisor = req.session.user._id;
				}
			} else {
				// Regular user - no special permissions
				newUser.Permissions = [];
				newUser.AllowCreate = req.body.AllowCreate !== undefined ? req.body.AllowCreate : false;
			}
			
			// Set username if provided
			if (req.body.UserName) {
				newUser.UserName = req.body.UserName;
			}

			const savedUser = await newUser.save();
			
			// Send email notification
			try {
				var condition = { name: "Admin__AddUser" };
				const emailResults = await EmailTemplate.find(condition, {}).exec();
				
				if (emailResults.length) {
					var newHtml = emailResults[0].description.replace(/{Password}/g, req.body.Password);
					newHtml = newHtml.replace(/{RecipientName}/g, req.body.Name);
					
					var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
					var mailOptions = {
						from: process.EMAIL_ENGINE.info.senderLine,
						to: req.body.Email,
						subject: emailResults[0].subject ? emailResults[0].subject : 'Thanks for your interest.',
						html: newHtml
					};
					
					// Send mail asynchronously (don't await)
					transporter.sendMail(mailOptions, function (error, info) {
						if (error) {
							return console.log('Email send error:', error);
						}
						console.log('USER ADDED BY ADMIN---------Message sent: ' + info.response);
					});
				}
			} catch (emailErr) {
				console.error('Email template error:', emailErr);
				// Continue even if email fails
			}
			
			// Return only the newly created user (exclude password)
			const userResponse = savedUser.toObject();
			delete userResponse.Password;
			
			res.json({
				"code": "200", 
				"msg": "User created successfully", 
				"user": userResponse
			});
		} else {
			res.json({"code": "404", "msg": "Email already exists!"});
		}
	} catch (err) {
		console.error('Error in add user:', err);
		res.status(500).json({"code": "500", "msg": "Error adding user", "error": err.message});
	}
};
exports.add = add;

// Edit User
var edit = async function (req, res) {
	try {
		
		// Check authorization - only admin and subadmin can edit users
		// Support both JWT (req.user) and session (req.session.user) authentication
		const user = req.session?.user || req.user;
		
		if (!user) {
			return res.status(401).json({
				"code": "401",
				"msg": "Unauthorized. Please login to continue.",
				"success": false
			});
		}
		
		const userRole = user.Role || user.role;
		if (userRole !== 'admin' && userRole !== 'subadmin') {
			return res.status(403).json({
				"code": "403",
				"msg": "Access denied. Only admins and subadmins can edit users.",
				"yourRole": userRole
			});
		}
		
		// Validate required fields
		const userId = req.body._id || req.body.id;
		if (!userId && !req.body.Email) {
			return res.status(400).json({
				"code": "400",
				"msg": "Missing required field: _id, id, or Email is required to identify the user"
			});
		}
		
		// Build initial fields (only add if provided)
		var fields = {};
		if (req.body.Name) fields.Name = req.body.Name;
		if (req.body.Email && req.body.Email !== userId) fields.Email = req.body.Email; // Don't update email if it's the identifier
		if (req.body.NickName) fields.NickName = req.body.NickName;
		if (req.body.FSGsArr2 && typeof(req.body.FSGsArr2) == 'object') fields.FSGsArr2 = req.body.FSGsArr2;
		
		// Add optional fields if provided
		if (req.body.UserName) fields.UserName = req.body.UserName;
		if (req.body.ProfilePic) fields.ProfilePic = req.body.ProfilePic;
		if (req.body.Gender) fields.Gender = req.body.Gender;
		if (req.body.AllowCreate !== undefined) fields.AllowCreate = req.body.AllowCreate;
		
		// Handle Role changes
		if (req.body.Role) {
			fields.Role = req.body.Role;
			
			// Auto-assign permissions based on new role
			if (req.body.Role === 'admin') {
				fields.Permissions = [
					'user_management',
					'content_moderation',
					'system_settings',
					'analytics',
					'billing',
					'content_editing'
				];
			} else if (req.body.Role === 'subadmin') {
				// Use custom permissions if provided, otherwise use defaults
				fields.Permissions = req.body.Permissions && Array.isArray(req.body.Permissions)
					? req.body.Permissions
					: ['content_moderation', 'basic_analytics', 'content_editing'];
				
				// Auto-set supervisor to the logged-in user if not provided
				if (!req.body.Supervisor && req.session && req.session.user && req.session.user._id) {
					fields.Supervisor = req.session.user._id;
				} else if (req.body.Supervisor) {
					fields.Supervisor = req.body.Supervisor;
				}
			} else if (req.body.Role === 'user') {
				// Reset to regular user
				fields.Permissions = [];
				fields.Supervisor = null;
			}
		} else if (req.body.Permissions && Array.isArray(req.body.Permissions)) {
			// Allow manual permission updates without changing role
			fields.Permissions = req.body.Permissions;
		}
		
		// Build query - support finding by _id, id, or Email
		let query;
		
		// Check if userId is a valid ObjectId (24 character hex string)
		if (userId && /^[a-fA-F0-9]{24}$/.test(userId)) {
			query = { _id: userId };
		} else if (userId) {
			// If not a valid ObjectId, assume it's an email
			query = { Email: userId };
		} else if (req.body.Email) {
			// Fallback to Email field
			query = { Email: req.body.Email };
		}
		
		// First, fetch the current user to check existing role
		const currentUser = await userManagement.findOne(query).exec();
		
		if (!currentUser) {
			return res.status(404).json({ "code": "404", "msg": "User not found" });
		}
		
		// Check if there are any actual changes
		if (Object.keys(fields).length === 0) {
			return res.status(400).json({
				"code": "400",
				"msg": "No fields to update. Please provide at least one field to modify.",
				"success": false
			});
		}
		
		// If only changing role and it's the same, skip the role change but allow other updates
		if (req.body.Role && currentUser.Role === req.body.Role) {
			// Remove role from fields if it's the same - but continue with other updates
			delete fields.Role;
			
			// If role was the ONLY thing being changed, return error
			if (Object.keys(fields).length === 0) {
				return res.status(400).json({
					"code": "400",
					"msg": `User is already a ${req.body.Role}. No other fields were modified.`,
					"success": false,
					"currentRole": currentUser.Role
				});
			}
		}
		
		const updatedUser = await userManagement.findOneAndUpdate(
			query,
			{ $set: fields },
			{ new: true } // Return updated document
		).exec();
		
		if (!updatedUser) {
			return res.status(404).json({ "code": "404", "msg": "User not found" });
		}
		
		// Return updated user (exclude password)
		const userResponse = updatedUser.toObject();
		delete userResponse.Password;
		
		res.json({
			"code": "200",
			"msg": "User updated successfully",
			"user": userResponse
		});
	} catch (err) {
		console.error('Error in edit user:', err);
		res.status(500).json({ "code": "500", "msg": "Error updating user", "error": err.message });
	}
};
exports.edit = edit;

//For Delete User
var deleteUser = async function(req, res){
	try {
		
		// Check authorization - only admin and subadmin can delete users
		// Support both JWT (req.user) and session (req.session.user) authentication
		const user = req.session?.user || req.user;
		
		if (!user) {
			return res.status(401).json({
				"code": "401",
				"msg": "Unauthorized. Please login to continue.",
				"success": false
			});
		}
		
		const userRole = user.Role || user.role;
		if (userRole !== 'admin' && userRole !== 'subadmin') {
			return res.status(403).json({
				"code": "403",
				"msg": "Access denied. Only admins and subadmins can delete users.",
				"yourRole": userRole
			});
		}
		
		// Validate required fields
		const userId = req.body._id || req.body.id;
		if (!userId) {
			return res.status(400).json({ 
				"code": "400", 
				"msg": "Missing required field: _id or id is required to identify the user to delete" 
			});
		}
		
		const fields = {
			IsDeleted: true
		};
		
		// Build query - support finding by _id, id, or Email
		let query;
		if (userId && /^[a-fA-F0-9]{24}$/.test(userId)) {
			query = { _id: userId };
		} else {
			query = { Email: userId };
		}
		
		// First, fetch the current user to check if already deleted
		const currentUser = await userManagement.findOne(query).exec();
		
		if (!currentUser) {
			return res.status(404).json({ "code": "404", "msg": "User not found" });
		}
		
		// Check if user is already deleted
		if (currentUser.IsDeleted === true) {
			return res.status(400).json({
				"code": "400",
				"msg": "User is already deleted",
				"userId": currentUser._id
			});
		}
		
		const deletedUser = await userManagement.findOneAndUpdate(
			query,
			{ $set: fields },
			{ new: true }
		).exec();
		
		if (!deletedUser) {
			return res.status(404).json({ "code": "404", "msg": "User not found" });
		}
		
		res.json({
			"code": "200",
			"msg": "User deleted successfully",
			"userId": deletedUser._id
		});
	} catch (err) {
		console.error('Error in delete user:', err);
		res.status(500).json({ "code": "500", "msg": "Error deleting user", "error": err.message });
	}
}

exports.deleteUser = deleteUser;



// For Activating User
var activateUser = async function (req, res) {
	try {
		
		// Check authorization - only admin and subadmin can activate users
		// Support both JWT (req.user) and session (req.session.user) authentication
		const user = req.session?.user || req.user;
		
		if (!user) {
			return res.status(401).json({
				"code": "401",
				"msg": "Unauthorized. Please login to continue.",
				"success": false
			});
		}
		
		const userRole = user.Role || user.role;
		if (userRole !== 'admin' && userRole !== 'subadmin') {
			return res.status(403).json({
				"code": "403",
				"msg": "Access denied. Only admins and subadmins can activate users.",
				"yourRole": userRole
			});
		}
		
		// Validate required fields
		const userId = req.body._id || req.body.id;
		if (!userId) {
			return res.status(400).json({ 
				"code": "400", 
				"msg": "Missing required field: _id or id is required to identify the user to activate" 
			});
		}
		
		const fields = {
			Status: req.body.Status ? req.body.Status : true
		};
		
		// Build query - support finding by _id, id, or Email
		let query;
		if (userId && /^[a-fA-F0-9]{24}$/.test(userId)) {
			query = { _id: userId };
		} else {
			query = { Email: userId };
		}
		
		// First, fetch the current user to check existing status
		const currentUser = await userManagement.findOne(query).exec();
		
		if (!currentUser) {
			return res.status(404).json({ "code": "404", "msg": "User not found" });
		}
		
		// Check if user is already active
		if (currentUser.Status === true || currentUser.Status === 1) {
			return res.status(400).json({
				"code": "400",
				"msg": "User is already active",
				"currentStatus": currentUser.Status
			});
		}
		
		const activatedUser = await userManagement.findOneAndUpdate(
			query,
			{ $set: fields },
			{ new: true }
		).exec();
		
		if (!activatedUser) {
			return res.status(404).json({ "code": "404", "msg": "User not found" });
		}
		
		res.json({
			"code": "200",
			"msg": "User activated successfully",
			"userId": activatedUser._id,
			"status": activatedUser.Status
		});
	} catch (err) {
		console.error('Error in activate user:', err);
		res.status(500).json({ "code": "500", "msg": "Error activating user", "error": err.message });
	}
};
exports.activateUser = activateUser;


// For Deactivating User
var deactivateUser = async function (req, res) {
	try {
		
		// Check authorization - only admin and subadmin can deactivate users
		// Support both JWT (req.user) and session (req.session.user) authentication
		const user = req.session?.user || req.user;
		
		if (!user) {
			return res.status(401).json({
				"code": "401",
				"msg": "Unauthorized. Please login to continue.",
				"success": false
			});
		}
		
		const userRole = user.Role || user.role;
		if (userRole !== 'admin' && userRole !== 'subadmin') {
			return res.status(403).json({
				"code": "403",
				"msg": "Access denied. Only admins and subadmins can deactivate users.",
				"yourRole": userRole
			});
		}
		
		// Validate required fields
		const userId = req.body._id || req.body.id;
		if (!userId) {
			return res.status(400).json({ 
				"code": "400", 
				"msg": "Missing required field: _id or id is required to identify the user to deactivate" 
			});
		}
		
		const fields = {
			Status: req.body.Status !== undefined ? req.body.Status : false
		};
		
		// Build query - support finding by _id, id, or Email
		let query;
		if (userId && /^[a-fA-F0-9]{24}$/.test(userId)) {
			query = { _id: userId };
		} else {
			query = { Email: userId };
		}
		
		// First, fetch the current user to check existing status
		const currentUser = await userManagement.findOne(query).exec();
		
		if (!currentUser) {
			return res.status(404).json({ "code": "404", "msg": "User not found" });
		}
		
		// Check if user is already inactive/deactivated
		if (currentUser.Status === false || currentUser.Status === 0) {
			return res.status(400).json({
				"code": "400",
				"msg": "User is already inactive/deactivated",
				"currentStatus": currentUser.Status
			});
		}
		
		const deactivatedUser = await userManagement.findOneAndUpdate(
			query,
			{ $set: fields },
			{ new: true }
		).exec();
		
		if (!deactivatedUser) {
			return res.status(404).json({ "code": "404", "msg": "User not found" });
		}
		
		res.json({
			"code": "200",
			"msg": "User deactivated successfully",
			"userId": deactivatedUser._id,
			"status": deactivatedUser.Status
		});
	} catch (err) {
		console.error('Error in deactivate user:', err);
		res.status(500).json({ "code": "500", "msg": "Error deactivating user", "error": err.message });
	}
};
exports.deactivateUser = deactivateUser;

//To Search Specific Users
var searchQuery = async function (req, res) {
	try {
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
			ProfilePic: true,
			UserName: true,
			LastActiveTime: true,
			Role: true
		};
		
		var sortObj = {
			ModifiedOn:-1
		};
		
		var offset = req.body.offset ? req.body.offset : 0;
		var limit = req.body.limit ? req.body.limit : 100;
		
		const result = await userManagement.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec();
		
		if (result.length == 0) {
			res.json({"code": "404", "msg": "Not Found", "success": false});
		} else {
			const dataCount = await userManagement.countDocuments(conditions).exec();
			res.json({
				"code": "200", 
				"msg": "Success", 
				"success": true,
				"response": result, 
				"count": dataCount
			});
		}
	} catch (err) {
		console.error('Error in searchQuery:', err);
		res.status(500).json({
			"code": "500", 
			"msg": "Error searching users", 
			"success": false,
			"error": err.message
		});
	}
};
exports.searchQuery = searchQuery;

//To Search Specific Users
var searchRequestInvitation = async function (req, res) {
	try {
		var searchparam = req.body.searchText ? req.body.searchText : "";
		var conditions = {
			IsDeleted:false,
			$or: [
				{Name: {$regex: new RegExp(searchparam, "i")}},
				{Email: {$regex: new RegExp(searchparam, "i")}}
			]
		};
		var fields = {
			Name : true,
			Email : true,
			Gender : true,
			CreatedOn : true,
			ModifiedOn : true,
			Status : true,
			RequestedAt: true
		};
		
		var sortObj = {
			ModifiedOn:-1
		};
		
		var offset = req.body.offset ? req.body.offset : 0;
		var limit = req.body.limit ? req.body.limit : 100;
		
		const result = await RequestInvitation.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec();
		
		if (result.length == 0) {
			res.json({"code": "404", "msg": "Not Found", "success": false});
		} else {
			const dataCount = await RequestInvitation.countDocuments(conditions).exec();
			res.json({
				"code": "200", 
				"msg": "Success", 
				"success": true,
				"response": result, 
				"count": dataCount
			});
		}
	} catch (err) {
		console.error('Error in searchRequestInvitation:', err);
		res.status(500).json({
			"code": "500", 
			"msg": "Error searching invitations", 
			"success": false,
			"error": err.message
		});
	}
};
exports.searchRequestInvitation = searchRequestInvitation;

//To Get Data Per Page
var findPerPage = async function (req, res) {
    var conditions = {
		IsDeleted:false
	};
	
	var sortObj = {
		LastActiveTime : -1,
		ModifiedOn:-1
	};
	
	var offset = req.body.offset ? req.body.offset : 0;
	var limit = req.body.limit ? req.body.limit : 100;
	
	try {
		const result = await userManagement.aggregate([
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
				"StreamEmailTrackerCount": { $cond: { if: { $isArray: "$StreamEmailTrackerData" }, then: { $size: "$StreamEmailTrackerData" }, else: 0} },
				// Exclude password from final result (double safety)
				Password: "$$REMOVE",
				resetPasswordToken: "$$REMOVE",
				resetPasswordExpires: "$$REMOVE"
			  }
			}
		]).exec();
		
		if (result.length == 0) {
			res.json({"code": "404", "msg": "Not Found", "success": false});
		} else {
			const dataCount = await userManagement.countDocuments(conditions).exec();
			res.json({
				"code": "200", 
				"msg": "Success", 
				"success": true,
				"response": result, 
				"count": dataCount
			});
		}
	} catch (err) {
		console.error('Error in findPerPage:', err);
		res.status(500).json({
			"code": "500", 
			"msg": "Error fetching users", 
			"success": false,
			"error": err.message
		});
	}
	
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
var viewRequestInvitation = async function (req, res) {
	try {
		var conditions = {
			IsDeleted:false
		};
		var fields = {};
		
		var sortObj = {
			ModifiedOn:-1
		};
		
		var offset = req.body.offset ? req.body.offset : 0;
		var limit = req.body.limit ? req.body.limit : 100;
		
		const result = await RequestInvitation.find(conditions , fields).sort(sortObj).skip(offset).limit(limit).exec();
		
		if (result.length == 0) {
			res.json({"code": "404", "msg": "Not Found", "success": false});
		} else {
			const dataCount = await RequestInvitation.countDocuments(conditions).exec();
			res.json({
				"code": "200", 
				"msg": "Success", 
				"success": true,
				"response": result, 
				"count": dataCount
			});
		}
	} catch (err) {
		console.error('Error in viewRequestInvitation:', err);
		res.status(500).json({
			"code": "500", 
			"msg": "Error fetching invitations", 
			"success": false,
			"error": err.message
		});
	}
}
exports.viewRequestInvitation = viewRequestInvitation;

// For setUnsetCreate User
var setUnsetCreate = async function (req, res) {
	try {
		// Check authorization
		const user = req.session?.user || req.user;
		
		if (!user) {
			return res.status(401).json({
				"code": "401",
				"msg": "Unauthorized. Please login to continue.",
				"success": false
			});
		}
		
		const userRole = user.Role || user.role;
		if (userRole !== 'admin' && userRole !== 'subadmin') {
			return res.status(403).json({
				"code": "403",
				"msg": "Access denied. Only admins and subadmins can modify permissions.",
				"success": false
			});
		}
		
		// Validate required fields
		if (!req.body.UserId) {
			return res.status(400).json({
				"code": "400",
				"msg": "Missing required field: UserId is required",
				"success": false
			});
		}
		
		if (req.body.AllowCreate === undefined) {
			return res.status(400).json({
				"code": "400",
				"msg": "Missing required field: AllowCreate is required",
				"success": false
			});
		}
		
		var fields = {
			AllowCreate: req.body.AllowCreate
		};
		var query = {_id: req.body.UserId};
		
		const result = await userManagement.updateOne(query, {$set: fields}).exec();
		
		if (result.matchedCount === 0) {
			return res.status(404).json({
				"code": "404",
				"msg": "User not found",
				"success": false,
				"userId": req.body.UserId
			});
		}
		
		if (result.modifiedCount === 0) {
			return res.status(200).json({
				"code": "200",
				"msg": "No changes made - AllowCreate was already set to this value",
				"success": true,
				"currentValue": req.body.AllowCreate
			});
		}
		
		// Fetch the updated user to confirm
		const updatedUser = await userManagement.findById(req.body.UserId).exec();
		
		res.json({
			"code": "200",
			"msg": "AllowCreate permission updated successfully",
			"success": true,
			"user": {
				"_id": updatedUser._id,
				"Name": updatedUser.Name,
				"Email": updatedUser.Email,
				"AllowCreate": updatedUser.AllowCreate
			}
		});
	} catch (err) {
		console.error('Error in setUnsetCreate:', err);
		res.status(500).json({
			"code": "500",
			"msg": "Error updating create permission",
			"success": false,
			"error": err.message
		});
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