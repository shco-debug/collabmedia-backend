var user = require('./../models/userModel.js');
var board = require('./../models/boardModel.js');
var Referral = require('./../models/referralModel.js');
var boardInvitees = require('./../models/boardInviteesModel.js');
var bcrypt = require('bcryptjs');
var generator = require('generate-password');
var fs = require('fs');
var formidable = require('formidable');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var crypto = require('crypto');
var request = require('request');
var jwt = require('jsonwebtoken');

var mediaController = require('./../controllers/mediaController.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');

var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var friend = require('./../models/friendsModel.js');

var RequestInvitation = require('./../models/requestInvitationModel.js');
var UserActionLogs = require('./../models/userActionLogs.js');
var UserFeedback = require('./../models/userFeedback.js');
var NotificationSeenLogs = require('./../models/notificationSeenLogs.js');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var async_lib = require('async');

var __updateChapterCollection = async function (registeredUserEmail, registeredUserId) {
    if (registeredUserEmail && registeredUserId) {
        var conditions = {
            OwnerEmail: registeredUserEmail,
            OwnerId: { $ne: registeredUserId }
        };

        var data = {
            OwnerId: registeredUserId
        };
        var options = {
            multi: true
        };

        try {
            const capsuleResult = await Capsule.update(conditions, { $set: data }, options).exec();
            console.log("Capsule : Total Number Of Affected Records = ", capsuleResult);

            const chapterResult = await Chapter.update(conditions, { $set: data }, options).exec();
            console.log("Chapter : Total Number Of Affected Records = ", chapterResult);

            const pageResult = await Page.update(conditions, { $set: data }, options).exec();
            console.log("Page : Total Number Of Affected Records = ", pageResult);

		var conditions_2 = {
			OwnerEmail: registeredUserEmail,
            OwnerId: { $ne: registeredUserId }
            };

            const pageResults = await Page.find(conditions, { CreaterId: 1 }).populate('CreaterId').exec();
            if (pageResults) {
				var allCreaters = [];
                for (var i = 0; i < pageResults.length; i++) {
                    var pageDataObj = pageResults[i];
					pageDataObj.CreaterId = typeof pageDataObj.CreaterId == 'object' ? pageDataObj.CreaterId : null;
                    if (pageDataObj.CreaterId) {
						allCreaters.push(pageDataObj.CreaterId);
					}
				}
				for (var j = 0; j < allCreaters.length; j++) {
					var createrObj = allCreaters[j];

					var newFriendData2 = {};
					newFriendData2.ID = createrObj._id;
					newFriendData2.Email = createrObj.Email;
					newFriendData2.Name = createrObj.Name;
					newFriendData2.NickName = createrObj.NickName;
					newFriendData2.Pic = createrObj.ProfilePic;
					newFriendData2.Relation = "Friend";
					newFriendData2.RelationID = "57fc1357c51f7e980747f2ce";
					newFriendData2.IsRegistered = true;

					var friendship2 = new friend();
					friendship2.UserID = registeredUserId;
					friendship2.Friend = newFriendData2;
					friendship2.Status = 1;
					friendship2.IsDeleted = 0;
					friendship2.CreatedOn = Date.now();
					friendship2.ModifiedOn = Date.now();
                    
                    try {
                        await friendship2.save();
                    } catch (err4) {
                        console.log(err4);
                    }
                }
            }
        } catch (error) {
            console.log("----09998887----ERROR : ", error);
        }
    } else {
        console.log("----09998887----registeredUserEmail : " + registeredUserEmail + " -----registeredUserId : " + registeredUserId);
    }
}

// Update pending friend requests when user registers
var __updatePendingFriendRequests = async function (registeredUserEmail, registeredUserId) {
    try {
        if (registeredUserEmail && registeredUserId) {
            // Find all pending friend requests for this email
            const pendingRequests = await friend.find({
                'Friend.Email': { $regex: new RegExp(registeredUserEmail, "i") },
                'Friend.IsRegistered': false,
                Status: 0, // Pending
                IsDeleted: 0
            }).exec();

            console.log(`Found ${pendingRequests.length} pending friend requests for ${registeredUserEmail}`);

            // Update each pending request
            for (const request of pendingRequests) {
                // Update the friend record to mark as registered
                await friend.updateOne(
                    { _id: request._id },
                    { 
                        $set: { 
                            'Friend.ID': registeredUserId,
                            'Friend.IsRegistered': true,
                            'Friend.Name': registeredUserEmail, // Could get actual name from registration
                            ModifiedOn: Date.now()
                        }
                    }
                );

                // Create reverse friendship (bidirectional)
                const reverseFriendship = new friend({
                    UserID: registeredUserId, // New registered user
                    Friend: {
                        ID: request.UserID, // Original sender's ID
                        Email: '', // Would need to get from users collection
                        Name: '', // Would need to get from users collection
                        Relation: request.Friend.Relation,
                        RelationID: request.Friend.RelationID,
                        IsRegistered: true,
                        Pic: '/assets/users/default.png',
                        NickName: ''
                    },
                    Status: 0, // Still pending until accepted
                    IsDeleted: 0,
                    CreatedOn: Date.now(),
                    ModifiedOn: Date.now()
                });

                await reverseFriendship.save();
                console.log(`Created reverse friendship for newly registered user: ${registeredUserEmail}`);
            }
        }
    } catch (error) {
        console.log("Error updating pending friend requests:", error);
    }
}

//updates for invitations case
var __updateChapterCollection__invitationCase = async function (registeredUserEmail, registeredUserId) {
    if (registeredUserEmail && registeredUserId) {
        var conditions = {
            "LaunchSettings.Invitees.UserEmail": registeredUserEmail
        };

        var data = {
            "LaunchSettings.Invitees.$.UserID": registeredUserId
        };
        var options = {
            multi: true
        };

        try {
            const result = await Chapter.update(conditions, { $set: data }, options).exec();
            console.log("Chapter : Total Number Of Affected Records = ", result);
        } catch (error) {
            console.log("Chapter : ----09998887----ERROR : ", error);
        }
    } else {
        console.log("----09998887----registeredUserEmail : " + registeredUserEmail + " -----registeredUserId : " + registeredUserId);
    }
}

// parul 27022015
/*
var login = function(req, res){
	//updated by manishp on 01102014 session issue
    if( !req.body.email || !req.body.password ){
		res.json({"code":"404","msg":"Failed"});
		return;
	}

	var fields = {
		Email: req.body.email
    };

	console.log("fields----",fields);

	user.find(fields,function(err,result){
		if(err){
			res.json(err);
		}
		else{
			console.log("result-----" , result);	//by manishp on 01102014 testing session
			if(result.length==0){
				res.json({"code":"404","msg":"Wrong Email"});
			}
			else if(!result[0].validPassword(req.body.password,result[0].Password)){
				res.json({"code":"404","msg":"Wrong Password"});
			}
			else if(result[0].validPassword(req.body.password,result[0].Password)){
				var userid=result[0].id;
				username=result[0].Name;
				req.session.user = result[0];

				console.log("body-------" ,req.body.board);	//by manishp on 01102014 testing session
				if (req.body.board) {
					boardInvitees.find({UserId:userid,BoardId:req.body.board},function(err,resl){
						if (resl.length) {
							board.findOne({_id:req.body.board,'Invitees.UserID':userid},function(err,result){
								if(!err){
									res.json({"code":"200","msg":"Success","url":req.body.board});
								}
								else{
									res.json({"code":"200","msg":"Success"});
								}
							})
						}
						else{
							res.json({"code":"200","msg":"Success"});
						}
					})
				}
				else{
					console.log("body-------m here");			//by manishp on 01102014 testing session
					res.json({"code":"200","msg":"Success"});
				}
			}
		}
    });

};

exports.login = login;
*/
const login = async (req, res) => {
    try {
        // Input validation
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({ 
                "code": "400", 
                "msg": "Email and password are required" 
            });
        }

        // Sanitize email for regex (escape special characters)
        const sanitizedEmail = req.body.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const fields = {
            Email: { $regex: new RegExp(`^${sanitizedEmail}$`, "i") },
        IsDeleted: false
    };

        // Find user with modern Mongoose syntax
        const userResult = await user.find(fields).exec();
        
        if (!userResult || userResult.length === 0) {
            return res.status(404).json({ 
                "code": "404", 
                "msg": "Wrong Email" 
            });
        }

        const userData = userResult[0];

        // Validate password
        if (!userData.validPassword(req.body.password, userData.Password)) {
            return res.status(401).json({ 
                "code": "401", 
                "msg": "Wrong Password" 
            });
        }

        // Check account status
        if (!userData.Status) {
            return res.status(403).json({ 
                "code": "406", 
                "msg": "Your account has been blocked by site admin. Please contact at info@scrpt.com." 
            });
        }

        // Check email confirmation
        if (!userData.EmailConfirmationStatus) {
            return res.status(403).json({ 
                "code": "405", 
                "msg": "Please verify your e-mail address to login" 
            });
        }

        // Create JWT token with all user data
        const userId = userData._id;
        const username = userData.Name;
        
        // Create JWT payload with all necessary user data
        const jwtPayload = {
            userId: userId,
            email: userData.Email,
            name: userData.Name,
            role: userData.Role || "user",
            status: userData.Status,
            emailConfirmationStatus: userData.EmailConfirmationStatus,
            allowCreate: userData.AllowCreate,
            profilePic: userData.ProfilePic,
            gender: userData.Gender,
            createdOn: userData.CreatedOn,
            modifiedOn: userData.ModifiedOn,
            lastActiveTime: userData.LastActiveTime,
            iat: Math.floor(Date.now() / 1000)
        };

        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
        const token = jwt.sign(jwtPayload, jwtSecret, { 
            expiresIn: '7d' 
        });

        console.log('🔑 JWT token generated for user:', userData.Email);
        console.log('🔑 Token expires in 7 days');

        // Get complete user data from database (excluding password)
        const completeUserData = userData.toObject();
        delete completeUserData.Password; // Remove password from response for security

        // Handle board-specific logic
                if (req.body.board) {
            try {
                // Check board invitees
                const inviteeResult = await boardInvitees.find({ 
                    UserId: userId, 
                    BoardId: req.body.board 
                }).exec();

                if (inviteeResult && inviteeResult.length > 0) {
                    // Check if user is in board invitees
                    const boardResult = await board.findOne({ 
                        _id: req.body.board, 
                        'Invitees.UserID': userId 
                    }).exec();

                    if (boardResult) {
                        return res.status(200).json({ 
                            "code": "200", 
                            "msg": "Success", 
                            "url": req.body.board, 
                            usersession: jwtPayload, // JWT payload as usersession
                            userData: completeUserData, // Complete user data from database
                            role: userData.Role || "user", // Explicitly include user role
                            token: token, // JWT token
                            message: "Login successful. Token will expire in 7 days."
                        });
                    }
                }
                
                // Default success response for board
                return res.status(200).json({ 
                    "code": "200", 
                    "msg": "Success", 
                    usersession: jwtPayload, // JWT payload as usersession
                    userData: completeUserData, // Complete user data from database
                    role: userData.Role || "user", // Explicitly include user role
                    token: token, // JWT token
                    message: "Login successful. Token will expire in 7 days."
                });

            } catch (boardError) {
                console.error('Board validation error:', boardError);
                // Fallback to default success response
                return res.status(200).json({ 
                    "code": "200", 
                    "msg": "Success", 
                    usersession: jwtPayload, // JWT payload as usersession
                    userData: completeUserData, // Complete user data from database
                    role: userData.Role || "user", // Explicitly include user role
                    token: token, // JWT token
                    message: "Login successful. Token will expire in 7 days."
                });
            }
                } else {
            // No board specified - return success
            return res.status(200).json({ 
                "code": "200", 
                "msg": "Success", 
                usersession: jwtPayload, // JWT payload as usersession
                userData: completeUserData, // Complete user data from database
                role: userData.Role || "user", // Explicitly include user role
                token: token, // JWT token
                message: "Login successful. Token will expire in 7 days."
            });
        }

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            "code": "500", 
            "msg": "Internal server error during login" 
        });
    }
};
exports.login = login;

//file upload profile page parul ==> starts
var fileUpload = function (req, res) {

    var form = new formidable.IncomingForm();
    form.keepExtensions = true;     //keep file extension

    form.uploadDir = (__dirname + "/../../public/assets/users/");       //set upload directory
    form.keepExtensions = true;     //keep file extension
    form.parse(req, function (err, fields, files) {
        //res.writeHead(200, {'content-type': 'text/plain'});
        //res.write('received upload:\n\n');
        console.log("form.bytesReceived");
        //TESTING
        console.log("file size: " + JSON.stringify(files.file.size));
        console.log("file path: " + JSON.stringify(files.file.path));
        console.log("file name: " + JSON.stringify(files.file.name));
        console.log("file type: " + JSON.stringify(files.file.type));
        console.log("lastModifiedDate: " + JSON.stringify(files.file.lastModifiedDate));
        //Formidable changes the name of the uploaded file
        //Rename the file to its original name
        var dateTime = new Date().toISOString().replace(/T/, '').replace(/\..+/, '').split(" ");
        
        // Use Promise wrapper for fs.rename
        new Promise((resolve, reject) => {
            fs.rename(files.file.path, __dirname + "/../../public/assets/users/" + req.session.user._id + files.file.name, (err) => {
                if (err) reject(err);
                else resolve();
            });
        }).then(() => {
                var imgUrl = req.session.user._id + files.file.name;
                var mediaCenterPath = "/../../public/assets/users/";
                var srcPath = __dirname + mediaCenterPath + imgUrl;
                if (fs.existsSync(srcPath)) {
                    var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
                    //var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail+"/"+ imgUrl;
                    var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
                    //var dstPathCrop_LARGE = __dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl;
                    var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;
                    mediaController.crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
                    mediaController.crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
                    mediaController.resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
                }
                setTimeout(function () {
                    res.json({ 'filename': "../assets/users/" + process.urls.small__thumbnail + "/" + req.session.user._id + files.file.name });
            }, 2000);

            console.log('renamed complete');
        }).catch((err) => {
            console.error('File rename error:', err);
            res.status(500).json({ error: 'File upload failed' });
        });
    });
};
exports.fileUpload = fileUpload;
//file upload profile page parul ==> ends

// save file parul ==> starts

var saveFile = async function (req, res) {
    try {
    console.log("user=" + req.session.user.Email);
    var img1 = ((req.body.data) ? req.body.data : "");
    var query = { Email: req.session.user.Email };
    // console.log(a);
        
        const updateResult = await user.update(
        query,
            { $set: { ProfilePic: img1 } }, 
            { upsert: true }
        ).exec();
        
        console.log("docs=" + updateResult);
                req.session.user.ProfilePic = img1;
        
        const userData = await user.findOne(query).exec();
        res.json({ "data": userData });
        
    } catch (error) {
        console.error('Save file error:', error);
        res.status(500).send('error');
    }
};
exports.saveFile = saveFile;

//edited by parul on-24012015 mutiple searchapi case
var addFsg = async function (req, res) {

    try {
    var fields = {
        //FSGs:{}
        FSGsArr2: {}   //edited by parul
    };

    console.log(req.body.fsg);
    //commented and modified by parul
    //for(i in req.body.fsg){
    //	if(req.body.fsg[i]!=null){
    //		var keyval = req.body.fsg[i].split('~')
    //		fields.FSGs[keyval[0]]=keyval[1];
    //	}
    //}

    for (i in req.body.fsg) {
        if (req.body.fsg[i] != null) {
            var valuesD = '';
            var temp = {}
            for (j in req.body.fsg[i]) {
                if (req.body.fsg[i][j] != null && typeof req.body.fsg[i][j] === 'string') {
                    if (j == 0) {
                        keyvalD = req.body.fsg[i][j].split('~');
                        valuesD = keyvalD[1];
                    } else {
                        keyvalD = req.body.fsg[i][j].split('~');
                        valuesD = valuesD + ',' + keyvalD[1];

                    }
                }
            }
            fields.FSGsArr2[keyvalD[0]] = valuesD;
            //fields.FSGsArr2.keyvalD[0]=valuesD;
            //	subFsg.push({
            //		keyval:keyvalD[0],
            //		values:valuesD
            //    });
        }
    }
    console.log(fields);
    //return;
    //return;
    //fields.FSGsArr=subFsg;
    //end
    if (req.body.NickName)
        fields.NickName = req.body.NickName;

    if (req.body.ProfilePic) {
        //fields.ProfilePic = req.body.ProfilePic;
        //upload pic
    }

    console.log("fields = ", fields);

    var query = { _id: req.session.user._id };
    var options = { multi: true };
        
        await user.updateOne(query, { $set: fields }, options).exec();
        
        const result = await user.find({ '_id': req.session.user._id }).exec();
                req.session.user = result[0];
                res.json({ "code": 200, "msg": "Success" });
        
    } catch (error) {
        console.error('Add FSG error:', error);
        res.status(500).json(error);
    }
};
exports.addFsg = addFsg;

async function generateUniqueRefcode(callback) {
    try {
    var referralCode = generator.generate({
        length: 5,
        numbers: true
    });
        
        const refcodes = await user.find({ referralCode: referralCode }).exec();
        
        if (refcodes.length == 0) {
            callback(referralCode);
        } else {
            return generateUniqueRefcode(callback);
        }
    } catch (error) {
        console.error('Generate unique refcode error:', error);
        callback(null);
    }
}

const register = async (req, res) => {
    try {
        const inputUsername = req.body.username ? req.body.username : "";
        const generatedUsername = inputUsername || req.body.email.split('@')[0];
        let conditions = {};
        
        if (inputUsername) {
		conditions = {
                $or: [
                    { Email: { $regex: new RegExp("^" + req.body.email + "$", "i") } },
                    { UserName: { $regex: new RegExp("^" + inputUsername + "$", "i") } }
			],
			IsDeleted: false
		};
	} else {
		conditions = {
                $or: [
                    { Email: { $regex: new RegExp("^" + req.body.email + "$", "i") } },
                    { UserName: { $regex: new RegExp("^" + generatedUsername + "$", "i") } }
                ],
			IsDeleted: false
		};
	}

        const result = await user.find(conditions).exec();

            if (result.length === 0) {
                // Generate unique referral code - handle the callback-based function
                const referCode = await new Promise((resolve, reject) => {
                    try {
                        generateUniqueRefcode((referCode) => {
                            if (referCode) {
                                resolve(referCode);
                            } else {
                                reject(new Error('Failed to generate referral code'));
                            }
                        });
                    } catch (error) {
                        reject(error);
                    }
                });

                // Generate crypto token
                const token = await new Promise((resolve, reject) => {
                    crypto.randomBytes(20, (err, buf) => {
                        if (err) reject(err);
                        else resolve(buf.toString('hex'));
                    });
                });

            const newUser = new user();
                    newUser.Email = req.body.email;
                    newUser.Password = newUser.generateHash(req.body.password);
                    newUser.Name = req.body.name;
                    newUser.Gender = req.body.gender;
                    newUser.NickName = req.body.name;
                    newUser.referralCode = referCode;
                    newUser.resetPasswordToken = token;
                    newUser.ProfileStatus = 0;
					newUser.UserName = generatedUsername;

            const numAffected = await newUser.save();

            // Create default journal instances
            __createDefaultJournal_BackgroundCall(numAffected._id, numAffected.Email);

                            if (req.body.referralLink) {
                const referralData = {
                                    referralLink: req.body.referralLink,
                                    referradByUserId: req.body.userId,
                                    referradToUserId: numAffected._id,
                                    referradToEmail: numAffected.Email,
                                    referradByEmail: req.body.referralByEmail,
                                    referradCapsuleId: req.body.referCapsuleId
                };
                                __updateReferralCollacton(referralData);
                            }

                            sendmail(newUser.Email, "register", newUser, res);
                            __updateChapterCollection(newUser.Email, numAffected._id);
                            __updatePendingFriendRequests(newUser.Email, numAffected._id);

                            if (req.body.board) {
                try {
                    const emailInvite = Buffer.from(req.body.emailInvite, 'base64').toString('ascii');
                    const inviteeResult = await boardInvitees.findOne({
                        UserEmail: emailInvite,
                        BoardId: req.body.board,
                        AcceptedOn: null
                    }).exec();

                    if (inviteeResult && typeof inviteeResult.UserEmail !== 'undefined') {
                        inviteeResult.UserId = numAffected._id;
                        inviteeResult.UserEmail = req.body.email;
                        inviteeResult.AcceptedOn = Date.now();
                        await inviteeResult.save();

                        const boardResult = await board.findOne({ _id: req.body.board }).exec();
                        if (boardResult) {
                            if (!boardResult.Invitees) {
                                boardResult.Invitees = [];
                            }

                            boardResult.Invitees.push({
                                                    UserID: numAffected._id,
                                                    UserEmail: req.body.email,
                                                    UserName: req.body.name
                            });

                            await boardResult.save();
                        }
                    }
                } catch (boardError) {
                    console.error('Board invitation error:', boardError);
                    // Continue with registration even if board invitation fails
                }
            }

            return res.json({ "code": "200", "msg": "Success" });

        } else {
            let msg = "This email is already registered. please try again with different email.";
            let code = "404";
            
            if (result[0].Email.toUpperCase() === req.body.email.toUpperCase()) {
                msg = "This email is already registered. please try again with different email.";
			} else if (result[0].UserName && result[0].UserName === generatedUsername) {
				msg = "This username is already registered. please try again with different username.";
				code = "405";
			}

            return res.json({ "code": code, "msg": msg });
        }

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ "code": "500", "msg": "Internal server error during registration" });
    }
};

exports.register = register;

var requestInvitation = async function (req, res) {
    try {
    //console.log("RequestInvitation-------", req.body);
        const userResult = await user.find({ Email: req.body.email, IsDeleted: false }).exec();
        
        if (userResult.length == 0) {
            const invitationResult = await RequestInvitation.find({ Email: req.body.email, IsDeleted: false }).exec();
            
            if (invitationResult.length == 0) {
						var newUser = new RequestInvitation();
						newUser.Email = req.body.email;
						newUser.Name = req.body.name;
                if (req.body.gender) {
							newUser.Gender = req.body.gender;
						}
                
                const numAffected = await newUser.save();
								/*
								if (req.body.referralLink) {
									var referralData = {
										referralLink: req.body.referralLink,
										referradByUserId: req.body.userId,
										referradToUserId: numAffected._id,
										referradToEmail: numAffected.Email,
										referradByEmail: req.body.referralByEmail,
										referradCapsuleId: req.body.referCapsuleId
									}
									__updateReferralCollacton(referralData);
								}
								*/
								//sendmail(newUser.Email, "register", newUser, res);
							//sendmail__requestInvitation(newUser.Email, "register", newUser, res);
								//__updateChapterCollection(newUser.Email, numAffected._id);
								res.json({ "code": "200", "msg": "Success" });

					} else {
						res.json({ "code": "404", "msg": "Email already exists!" });
					}
        } else {
				res.json({ "code": "405", "msg": "Email already exists!" });
			}
    } catch (error) {
        console.error('Request invitation error:', error);
        res.status(500).json(error);
		}
};
exports.requestInvitation = requestInvitation;


var __updateReferralCollacton = async function (referralData) {
    try {
    //console.log("__updateReferralCollacton-------------------", referralData);
    var newReferral = new Referral();
    newReferral.ReferredById = referralData.referradByUserId;
    newReferral.ReferredToId = referralData.referradToUserId;
    newReferral.ReferredByEmail = referralData.referradByEmail;
    newReferral.ReferredToEmail = referralData.referradToEmail;
    newReferral.ReferralCode = referralData.referralLink;
        if (referralData.referradCapsuleId != '') {
        newReferral.ReferradCapsuleId = referralData.referradCapsuleId;
    }
        
        const updateReferralData = await newReferral.save();
            console.log("success", updateReferralData);
    } catch (error) {
        console.log("err", error);
        }
};
exports.__updateReferralCollacton = __updateReferralCollacton;

var chklogin = async function (req, res) {
    if (req.user) {
        try {
		//update user's LastActiveTime
		var dataToUpdate = { LastActiveTime: Date.now() };
		var query = { _id: ObjectId(String(req.user.userId)) };
        var options = { multi: false };

            await user.update(query, { $set: dataToUpdate }, options).exec();

        res.json({ "code": "200", "msg": "Success", "usersession": req.user });
        } catch (error) {
            console.error('Check login error:', error);
            res.status(500).json({ "code": "500", "msg": "Internal server error" });
    }
    } else {
        res.json({ "code": "404", "msg": "Failed" });
    }
};
exports.chklogin = chklogin;


var uploadDP = async function (req, res) {

    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var file_name = "";

        if (files.myFile.name) {
            uploadDir = __dirname + "/../../public/assets/users";
        } else {
            res.json({ "code": "404", "message": "No File" });
            return;
        }
        file_name = files.myFile.name;
        file_name = file_name.split('.');
        ext = file_name[file_name.length - 1];
        name = Date.now();
        file_name = name + '.' + ext;

        fs.rename(files.myFile.path, uploadDir + "/" + file_name);

        var dataToUpload = {
            ProfilePic: file_name
        };

        var query = { _id: req.session.user._id };
        var options = { multi: false };
        
        // Use Promise wrapper for the update operation
        new Promise(async (resolve, reject) => {
            try {
                const result = await user.update(query, { $set: dataToUpload }, options).exec();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }).then((result) => {
                res.json({ "code": "200", "message": "Success", "result": dataToUpload });
        }).catch((error) => {
            res.json({ "code": "404", "message": error });
        });
    });
};
exports.uploadDP = uploadDP;

/*________________________________________________________________________
	* @Date:      	21 dec 2014
	* @Method :   	fsgArrUpdate
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to save users serch prefrences to the filed fsgArr.
	* @Param:     	2
	* @Return:    	yes
_________________________________________________________________________
*/

var fsgArrUpdate = async function (req, res) {
    try {
    //console.log(req.body);
    var query = { _id: req.session.user._id };
        const userData = await user.findOne(query).exec();
        
        if (userData) {
            //console.log('---------------------no error');
            //console.log('userData.FSGsArr--');
            var fields = {};
            var found = false;
            for (tempKey in userData.FSGsArr2) {
                //console.log("tempKey = ", tempKey);
                if (tempKey == req.body.title) {
                    //code
                    found = true;
                    fields[tempKey] = req.body.value;

                } else {
                    fields[tempKey] = userData.FSGsArr2[tempKey];
                }

            }
            if (!found) {
                fields[req.body.title] = req.body.value;
            }
            
            await user.update(query, { $set: { FSGsArr2: fields } }, { upsert: false }).exec();
            
            const result = await user.find({ '_id': req.session.user._id }).exec();
                        req.session.user = result[0];
                        res.json({ "code": 200, "msg": "Success" });
                    //res.json({"code":200,"msg":"Success"});
                } else {
            //console.log('---------------------Error---------------');
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        console.error('FSG array update error:', error);
        res.status(500).json(error);
    }
};
exports.fsgArrUpdate = fsgArrUpdate;


//
var saveSettings = async function (req, res) {
    try {
    var query = { _id: req.session.user._id };
        await user.update(query, { $set: { Settings: req.body } }, { upsert: false }).exec();
        
        const result = await user.find({ '_id': req.session.user._id }).exec();
                req.session.user = result[0];
                res.json({ "code": 200, "msg": "Success" });
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json(error);
        }
};
exports.saveSettings = saveSettings;

var saveUserMilestone = async function (req, res) {
    try {
	var milestone = req.body.milestone || req.body.Milestone || "";
    var query = { _id: req.session.user._id };
        await user.updateOne(query, { $set: { Milestone: milestone } }, { upsert: false }).exec();
        
        const result = await user.find(query).exec();
                req.session.user = result[0];
                res.json({ "code": 200, "msg": "Success" });
    } catch (error) {
        console.error('Save user milestone error:', error);
        res.status(500).json(error);
        }
};
exports.saveUserMilestone = saveUserMilestone;

var saveUserMetrics = async function (req, res) {
    try {
	var Metrics = req.body.metrics || req.body.Metrics || "";
    var query = { _id: req.session.user._id };
        await user.updateOne(query, { $set: { Metrics: Metrics } }, { upsert: false }).exec();
        
        const result = await user.find(query).exec();
                req.session.user = result[0];
                res.json({ "code": 200, "msg": "Success" });
    } catch (error) {
        console.error('Save user metrics error:', error);
        res.status(500).json(error);
        }
};
exports.saveUserMetrics = saveUserMetrics;

const saveUserKeyshifts = async (req, res) => {
    try {
        const keyshifts = req.body.keyshifts || req.body.Keyshifts || "";
        const query = { _id: req.session.user._id };
        
        await user.updateOne(query, { $set: { Keyshifts: keyshifts } }, { upsert: false }).exec();
        
        const result = await user.find(query).exec();
                req.session.user = result[0];
        
        res.json({ code: 200, msg: "Success" });
    } catch (error) {
        console.error('Save user keyshifts error:', error);
        res.status(500).json({ code: 500, msg: "Internal server error" });
    }
};
exports.saveUserKeyshifts = saveUserKeyshifts;

var saveGoal = async function (req, res) {
    try {
	var goal = req.body.goal || req.body.Goal || "";
    var query = { _id: req.session.user._id };
        await user.updateOne(query, { $set: { Goal: goal } }, { upsert: false }).exec();
        
        const result = await user.find(query).exec();
                req.session.user = result[0];
                res.json({ "code": 200, "msg": "Success" });
    } catch (error) {
        console.error('Save goal error:', error);
        res.status(500).json(error);
        }
};
exports.saveGoal = saveGoal;

async function addLaunchDateOnAllMyBirthdayStreams (UserId, Birthdate) {
	console.log("--------------- addLaunchDateOnAllMyBirthdayStreams ----------------------", UserId, Birthdate);
	Birthdate = Birthdate || '';
	var birthdateArr = Birthdate.split('/');
	if(birthdateArr.length === 3 && UserId) {
		var t = new Date();
		var ty = t.getFullYear();
		var tm = t.getMonth() + 1;
		var td = t.getDate();
		td = parseInt(td) < 10 ? "0"+td : td;
		tm = parseInt(tm) < 10 ? "0"+tm : tm;
		var todayDate = new Date(ty + '-' + tm + '-' + td);
		var todayTS = todayDate.getTime();

		var thisYearBdayStr = ty + '-' + birthdateArr[0] + '-' + birthdateArr[1];
		var thisYearBday = new Date(thisYearBdayStr);
		var thisYearBdayTS = thisYearBday.getTime();

		var lDate = birthdateArr[0] + '/' + birthdateArr[1] + '/' + ty;
		if(thisYearBdayTS < todayTS) {
			thisYearBdayStr = birthdateArr[0] + '/' + birthdateArr[1] + '/' + (ty+1);
			lDate = thisYearBdayStr;
		}

		var conditions = {
			OwnerId: String(UserId),
			"LaunchSettings.Audience": "ME",
			"LaunchSettings.CapsuleFor": "Stream",
			"LaunchSettings.StreamType": "Group",
			"StreamFlow" : "Birthday",
			$or : [
				{"LaunchDate": null},
				{"LaunchDate": ""},
				{"LaunchDate": {$exists: false}}
			],
			IsDeleted: false,
			IsAllowedForSales: false
		};
		var setObj = {
			"LaunchDate": lDate
		};
		console.log("conditions - ", conditions);
		console.log("setObj - ", setObj);
		var results = await Capsule.update(conditions, {$set: setObj});
		console.log("All Birthday type streams are updated - ", results)
	} else {
		console.log("------- addLaunchDateOnAllMyBirthdayStreams ----- ELSE CASE");
	}
}

const saveUserBirthdate = async (req, res) => {
    try {
        const birthdate = req.body.birthdate || req.body.Birthdate || "";
        const query = { _id: req.session.user._id };

        if (!birthdate) {
            return res.status(400).json({ code: 400, msg: "Birthdate is required" });
        }

        await user.updateOne(query, { $set: { Birthdate: birthdate } }, { upsert: false }).exec();
        
        // Once saved - we need to set LaunchDate of all Owned birthday stream's where LaunchDate is null
        await addLaunchDateOnAllMyBirthdayStreams(query._id, birthdate);
        
        const result = await user.find(query).exec();
                req.session.user = result[0];
        
        return res.json({ code: 200, msg: "Success" });
        
    } catch (error) {
        console.error('Save user birthdate error:', error);
        res.status(500).json({ code: 500, msg: "Internal server error" });
    }
};
exports.saveUserBirthdate = saveUserBirthdate;

const saveOwnerBirthdate = async (req, res) => {
    try {
        const birthdate = req.body.birthdate || req.body.Birthdate || "";
        const userId = req.body.userId || req.body.UserId || null;

        if (!userId || !birthdate) {
            return res.status(400).json({ code: 400, msg: "User ID and birthdate are required" });
        }

        const query = { _id: ObjectId(userId) };

        await user.updateOne(query, { $set: { Birthdate: birthdate } }, { upsert: false }).exec();
        
        // Once saved - we need to set LaunchDate of all Owned birthday stream's where LaunchDate is null
        await addLaunchDateOnAllMyBirthdayStreams(userId, birthdate);
        
        return res.json({ code: 200, msg: "Success" });
        
    } catch (error) {
        console.error('Save owner birthdate error:', error);
        res.status(500).json({ code: 500, msg: "Internal server error" });
    }
};
exports.saveOwnerBirthdate = saveOwnerBirthdate;

var confirmOwnerBirthday = async function (req, res) {
    try {
	var UserId = req.body.UserId ? req.body.UserId : "";

        if (!UserId) {
		return res.json({ "code": 501, "msg": "Something went wrong." });
	}

	var query = { _id: ObjectId(UserId) };
	var fields = {
            _id: 1,
            Name: 1,
            Email: 1,
            ProfilePic: 1,
            Birthdate: 1
        };
        
        const result = await user.findOne(query, fields).exec();
            return res.json({ "code": 200, "UserDetails": result });
        
    } catch (error) {
        console.error('Confirm owner birthday error:', error);
        res.status(500).json(error);
        }
};
exports.confirmOwnerBirthday = confirmOwnerBirthday;

/*________________________________________________________________________
	* @Date:      	23 Jan 2015
	* @Method :   	resetPswrd
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to reset user password.
	* @Param:     	2
	* @Return:    	yes
_________________________________________________________________________
*/
//addded by parul
var resetPassword = function (req, res) {
    sendmail(req.body.email, "reset", req, res);
    //console.log('send email called');
}
exports.resetPassword = resetPassword;

/*________________________________________________________________________
	* @Date:      	23 Jan 2015
	* @Method :   	sendmail
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to send email to user in case of password reset request and password reset successful.
	* @Param:     	4
	* @Return:    	no
_________________________________________________________________________
*/
function sendmail(to, type, req, res) {
    //    if (type=='register') {
    //		type=type+'/'+new Buffer(to).toString('base64');
    //    }
    var salt = bcrypt.genSaltSync(10); //setting salt for bcrypt
    //console.log(type);

    // Use Promise wrapper for the user.findOne call
    new Promise(async (resolve, reject) => {
        try {
            const data = await user.findOne({ 'Email': to, IsDeleted: false }).exec();
            if (data) {
                resolve(data);
            } else {
                reject(new Error('User not found'));
            }
        } catch (error) {
            reject(error);
        }
    }).then(async (data) => {
                var userToHash = data._id + '_' + Date.now();
                var condition = {};
                if (type == "reset") {
                    condition.name = "ChangePassword__ResetLink"
                }
                //else if(type == "ChangePassword__Success") {
                else if (type == "pswrdChanged") {
                    condition.name = "ChangePassword__Success";
                }
                else if (type == "register") {
                    condition.name = "Signup__ConfirmYourEmailId";
                }
                else {
                    //console.log("#*#*#*#*#inside Sign up Condition in sendmail");
                    condition.name = "Signup__Success";
                }
        
        // Use Promise wrapper for EmailTemplate.find
        new Promise(async (resolve, reject) => {
            try {
                const results = await EmailTemplate.find(condition, {}).exec();
                if (results && results.length) {
                    resolve(results);
                } else {
                    reject(new Error('Email template not found'));
                }
            } catch (error) {
                reject(error);
            }
        }).then((results) => {
                            var newHtml;
                            var name = data.Name ? data.Name.split(' ') : "";
                            RecipientName = name[0];

                            if (type == "reset") {
                                var userHash = new Buffer(userToHash).toString('base64');
                                var urlString = process.HOST_URL + '/changePassword/' + userHash;
                                newHtml = results[0].description.replace(/{RecipientName}/g, RecipientName);
                                newHtml = newHtml.replace(/{UrlString}/g, urlString);
                                //console.log("Inside Send Mail function 1 = = == >", RecipientName, newHtml);

                                var mailOptions = {
                                    //from: 'Scrpt  <collabmedia.scrpt@gmail.com>', // sender address
                                    from: process.EMAIL_ENGINE.info.senderLine,
                                    to: to, // list of receivers
                                    subject: results[0].subject ? results[0].subject : 'Scrpt - Reset password!',
                                    text: process.HOST_URL + '/changePassword/' + userHash,
                                    html: newHtml
                                    //html: 'We have recieved a request to reset the password of your Scrpt account. If you made this request, click on the link below. If you did not make this request you can ignore this mail.<br /><a href="http://203.100.79.94:8888/#/changePassword/' + userHash + '">http://203.100.79.94:8888/#/changePassword/' + userHash + '</a><br /><br />Regards<br />collabmedia.scrpt@gmail.com'
                                };
                            }
                            else if (type == "pswrdChanged") {
                                //console.log(" * % * % * % * inside password Changed * % * %  * % * ", data)
                                //var urlString = process.HOST_URL + '/#/forgotPassword';
                                var userHash = new Buffer(userToHash).toString('base64');
                                var urlString = process.HOST_URL + '/changePassword/' + userHash;
                                newHtml = results[0].description.replace(/{RecipientName}/g, RecipientName);
                                newHtml = newHtml.replace(/{UrlString}/g, urlString);
                                //console.log("Inside Send Mail function = 2= == >", RecipientName, newHtml);

                                var mailOptions = {
                                    //from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
                                    from: process.EMAIL_ENGINE.info.senderLine,
                                    to: to, // list of receivers
                                    subject: results[0].subject ? results[0].subject : 'Scrpt - Password changed successfully!',
                                    text: process.HOST_URL + '/login',
                                    html: newHtml
                                };
                            }
                            else if (type == "register") {
                                //console.log(" * % * % * % * inside register * % * %  * % * ", data)

                                var urlString = process.HOST_URL + '/confirm-email/' + data.resetPasswordToken;
                                newHtml = results[0].description.replace(/{RecipientName}/g, RecipientName);
                                newHtml = newHtml.replace(/{ConfirmEmailid}/g, urlString);
                                //console.log("Inside Send Mail function = 3= == >", RecipientName, newHtml);

                                var mailOptions = {
                                    //from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
                                    from: process.EMAIL_ENGINE.info.senderLine,
                                    to: to, // list of receivers
                                    subject: results[0].subject ? results[0].subject : 'Scrpt - Your have successfully signed up',
                                    text: process.HOST_URL + '/login',
                                    html: newHtml
                                };
                            }
                            else {
                                //console.log(" * % * % * % * inside type = confirm_token else * % * %  * % * ", data)

                                newHtml = results[0].description.replace(/{RecipientName}/g, RecipientName);

                                var mailOptions = {
                                    //from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
                                    from: process.EMAIL_ENGINE.info.senderLine,
                                    to: to, // list of receivers
                                    subject: results[0].subject ? results[0].subject : 'Scrpt - Your account has been verified',
                                    text: process.HOST_URL + '/login',
                                    html: newHtml
                                };
                            }
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
                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    //console.log(error);
                    res.json(error);
                                } else {
                                    console.log('Message sent to: ' + to + info.response);
                                    //res.json({'msg': 'done', 'code': '200'});
                                    if (type == "reset" || type == "pswrdChanged") {
                                        res.json({ 'msg': 'done', 'code': '200' });
                                    }
                                }
                            });

        }).catch((error) => {
            console.error('Email template error:', error);
            res.status(500).json({ 'code': '500', 'msg': 'Email template not found' });
        });

    }).catch((error) => {
        console.error('Sendmail error:', error);
        if (error.message === 'User not found') {
            res.json({ 'code': '400' });
        } else {
            res.status(500).json(error);
        }
    });
}

function sendmail__requestInvitation(to, type, req, res) {
    // Use Promise wrapper for RequestInvitation.findOne
    new Promise(async (resolve, reject) => {
        try {
            const data = await RequestInvitation.findOne({ 'Email': to, IsDeleted: false }).exec();
            if (data) {
                resolve(data);
            } else {
                reject(new Error('Request invitation not found'));
            }
        } catch (error) {
            reject(error);
        }
    }).then(async (data) => {
                var condition = {};

				condition.name = "Signup__ConfirmYourEmailId";

        // Use Promise wrapper for EmailTemplate.find
        new Promise(async (resolve, reject) => {
            try {
                const results = await EmailTemplate.find(condition, {}).exec();
                if (results && results.length) {
                    resolve(results);
                } else {
                    reject(new Error('Email template not found'));
                }
            } catch (error) {
                reject(error);
            }
        }).then((results) => {
                            var newHtml;
                            var name = data.Name ? data.Name.split(' ') : "";
                            RecipientName = name[0];
							data.resetPasswordToken = "mptest";

							var urlString = process.HOST_URL + '/confirm-email/' + data.resetPasswordToken;
							newHtml = results[0].description.replace(/{RecipientName}/g, RecipientName);
							newHtml = newHtml.replace(/{ConfirmEmailid}/g, urlString);
							//console.log("Inside Send Mail function = 3= == >", RecipientName, newHtml);

							var mailOptions = {
								//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
								from: process.EMAIL_ENGINE.info.senderLine,
								to: to, // list of receivers
								subject: results[0].subject ? results[0].subject : 'Scrpt - Your have successfully signed up',
								text: process.HOST_URL + '/login',
								html: newHtml
							};

                            var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    //console.log(error);
                    res.json(error);
                                } else {
                                    console.log('Message sent to: ' + to + info.response);

                                    if (type == "reset" || type == "pswrdChanged") {
                                        res.json({ 'msg': 'done', 'code': '200' });
                                    }
                                }
                            });

        }).catch((error) => {
            console.error('Email template error:', error);
            res.status(500).json({ 'code': '500', 'msg': 'Email template not found' });
        });

    }).catch((error) => {
        console.error('Request invitation error:', error);
        if (error.message === 'Request invitation not found') {
                res.json({ 'code': '400' });
		} else {
            res.status(500).json(error);
        }
    });
}

var newPassword = async function (req, res) {
    try {
    var idAndTime = new Buffer(req.body.id, 'base64').toString('ascii');
    if (req.body.id) {
        var userData = (idAndTime).split('_');
        //console.log('userData[0]=' + userData[0]);
            const data = await user.findOne({ _id: userData[0] }).exec();
            
            if (data) {
                //data.Password=req.body.password;
                data.Password = data.generateHash(req.body.password);
                await data.save();
                        //res.json({'code':'200','message':'password changed succesfully'});
                        sendmail(data.Email, "pswrdChanged", data, res);
                    } else {
                res.status(404).json({ error: "User not found" });
            }
    } else {
            res.status(400).json({ error: "Invalid request" });
    }
    } catch (error) {
        console.error('New password error:', error);
        res.status(500).json(error);
}
};
exports.newPassword = newPassword;


/*________________________________________________________________________
	* @Date:      	23 Jan 2015
	* @Method :   	updateAllPassword
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-27 02 2015-
	* @Purpose:   	This function is used to Update all un.
	* @Param:     	2
	* @Return:    	no
	_________________________________________________________________________
*/
var updateAllPassword = function (req, res) {
    //user.find({},function(err,userData){
    //	if (err) {
    //		res.send(err);
    //	}else{
    //		for (i in userData){
    //			fields={Password:userData[i].generateHash(userData[i].Password)}
    //			user.update({_id:userData[i]._id},{$set:fields},{upsert:false},function(err2,num){
    //				if(err2){
    //					res.send(err2)
    //				}
    //			})
    //		}
    //
    //	}
    //})
    res.send("working api----------------code commented for security reason--!");
}
exports.updateAllPassword = updateAllPassword;


/** 12-January-Changes Start **/


// To Fetch Specific User Account Details
var getAccountDetails = async function (req, res) {
    try {
    var conditions = {
        IsDeleted: false,
        _id: req.session.user._id
    };
    var fields = {
        Name: true,
        UserName: true,
        Email: true,
        Gender: true,
        ProfilePic: true,
        FSGsArr2: true,
        CreditAmount: true,
            Subdomain: true,
            Subdomain_name: true,
            Subdomain_title: true,
            Subdomain_description: true,
            Subdomain_profilePic: true,
            AllowCreate: true
        };
        
        const result = await user.find(conditions, fields).exec();
        
            if (result.length == 0) {
            res.json({ "code": "404", "msg": "Not Found" });
            } else {
            res.json({ "code": "200", "msg": "Success", "response": result });
            }
    } catch (error) {
        console.error('Get account details error:', error);
        res.status(500).json(error);
        }
};
exports.getAccountDetails = getAccountDetails;


//Save Account Details
var saveAccountDetails = async function (req, res) {
    try {
    var fields = {
        Name: req.body.Name,
        Email: req.body.Email,
        //UserName: req.body.UserName,
        Gender: req.body.Gender ? req.body.Gender : "male",
        FSGsArr2: typeof (req.body.FSGsArr2) == 'object' ? req.body.FSGsArr2 : {}
    };
    var query = { _id: req.session.user._id };
        
        await user.updateOne(query, { $set: fields }).exec();
        res.json({ "code": "200", "msg": "Success", "response": "Updated successfully" });
        
    } catch (error) {
        console.error('Save account details error:', error);
        res.status(500).json(error);
    }
};
exports.saveAccountDetails = saveAccountDetails;


var saveUserPassword = async function (req, res) {
    try {
    req.body.Password = req.body.Password ? req.body.Password : '';
    if (req.body.Password != '') {
            const data = await user.find({ _id: req.session.user._id }, { Password: true }).exec();
            
            if (data && data.length > 0) {
                if (bcrypt.compareSync(req.body.Password, data[0].Password)) {
                    //console.log("* * Inside if password Match* *");
                    var newUser1 = new user();
                    newUser1.Password = newUser1.generateHash(req.body.NewPassword);
                    var setObj = {
                        Password: newUser1.Password
                    };
                    var conditions = { _id: req.session.user._id };
                    var options = { multi: false };

                    await user.update(conditions, { $set: setObj }, options).exec();
                    res.json({ "code": "200", "msg": "Password has been updated succesfully.", "response": "Updated successfully" });
                } else {
                    //console.log("* * Inside else password Match* *");
                    res.json({ 'code': '201', 'message': 'You have entered wrong current password.' });
                }
            } else {
                res.status(404).json({ error: "User not found" });
            }
        } else {
            res.json({ "code": "501", "msg": "Something went wrong." });
    }
    } catch (error) {
        console.error('Save user password error:', error);
        res.status(500).json(error);
    }
};
exports.saveUserPassword = saveUserPassword;

// For Uploading Avatar - Updated to use file upload with Sharp and S3
var saveUserAvatar = async function (req, res) {
    try {
        // Import required modules
        const sharp = require('sharp');
        const { uploadToS3 } = require('../utilities/awsS3Utils');
        const multer = require('multer');
        const path = require('path');

        // Configure multer for memory storage
        const storage = multer.memoryStorage();
        const upload = multer({ 
            storage: storage,
            limits: {
                fileSize: 10 * 1024 * 1024 // 10MB limit
            },
            fileFilter: function (req, file, cb) {
                // Allow only images
                const allowedTypes = /jpeg|jpg|png|gif|webp/;
                const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
                const mimetype = allowedTypes.test(file.mimetype);

                if (mimetype && extname) {
                    return cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed!'));
                }
            }
        });

        // Use multer to handle file upload
        upload.single('avatar')(req, res, async function (err) {
            if (err) {
                return res.status(400).json({ 
                    code: "400", 
                    msg: err.message 
                });
            }

            if (!req.file) {
                return res.status(400).json({ 
                    code: "400", 
                    msg: "No file uploaded. Please select an image file." 
                });
            }

            try {
                const userId = req.body.userId || null;
                const userEmail = req.body.email || null;

                // Generate unique filename
                const timestamp = Date.now();
                const randomId = Math.floor(Math.random() * 1000000);
                const baseFileName = `profile_${timestamp}_${randomId}`;

                // Process image with Sharp
                console.log('Processing image with Sharp...');
                const processedImageBuffer = await sharp(req.file.buffer)
                    .resize(300, 300, { 
                        fit: 'cover',
                        position: 'center'
                    })
                    .webp({ 
                        quality: 85,
                        effort: 6
                    })
                    .toBuffer();

                console.log('Image processed successfully. Size:', processedImageBuffer.length);

                // Create a temporary file object for S3 upload
                const tempFile = {
                    path: null, // Not needed for buffer upload
                    originalname: `${baseFileName}.webp`,
                    mimetype: 'image/webp',
                    size: processedImageBuffer.length,
                    buffer: processedImageBuffer
                };

                // Upload to S3
                console.log('Uploading to S3...');
                const s3Result = await uploadToS3(tempFile, 'scrptMedia/profilePics');

                if (!s3Result.success) {
                    console.error('S3 upload failed:', s3Result.error);
                    return res.status(500).json({ 
                        code: "500", 
                        msg: "Failed to upload image to cloud storage", 
                        error: s3Result.error 
                    });
                }

                console.log('S3 upload successful:', s3Result.fileUrl);

                // Update user profile in database
                const fields = {
                    ProfilePic: s3Result.fileUrl
                };
                const query = { 
                    _id: userId ? ObjectId(userId) : req.session.user._id 
                };

                await user.updateOne(query, { $set: fields }).exec();

                // Update related collections if email is provided
                if (userEmail) {
                    const conditions = {
                        "LaunchSettings.Invitees.UserEmail": userEmail
                    };
                    const data = {
                        "LaunchSettings.Invitees.$.UserPic": s3Result.fileUrl
                    };
                    const conditionsCaps = {
                        "LaunchSettings.OthersData.UserEmail": userEmail
                    };
                    const dataCaps = {
                        "LaunchSettings.OthersData.$.UserPic": s3Result.fileUrl
                    };
                    const conditionsFrnd = {
                        "Friend.Email": userEmail
                    };
                    const dataFrnd = {
                        "Friend.Pic": s3Result.fileUrl
                    };
                    const options = {
                        multi: true
                    };

                    // Update all related collections
                    await Promise.all([
                        Chapter.updateOne(conditions, { $set: data }, options).exec(),
                        Page.updateOne(conditions, { $set: data }, options).exec(),
                        Capsule.updateOne(conditionsCaps, { $set: dataCaps }, options).exec(),
                        friend.updateOne(conditionsFrnd, { $set: dataFrnd }, options).exec()
                    ]);
                }

                // Update session if it's the current user
                if (!userId) {
                    req.session.user.ProfilePic = s3Result.fileUrl;
                }

                res.json({ 
                    code: "200", 
                    msg: "Profile picture updated successfully!", 
                    ProfilePic: s3Result.fileUrl,
                    fileInfo: {
                        originalName: req.file.originalname,
                        processedSize: processedImageBuffer.length,
                        s3Url: s3Result.fileUrl,
                        format: 'webp',
                        dimensions: '300x300'
                    }
                });

            } catch (processingError) {
                console.error('Image processing error:', processingError);
                res.status(500).json({ 
                    code: "500", 
                    msg: "Error processing image", 
                    error: processingError.message 
                });
            }
        });

    } catch (error) {
        console.error('Save user avatar error:', error);
        res.status(500).json({ 
            code: "500", 
            msg: "Error processing avatar upload", 
            error: error.message 
        });
    }
};
exports.saveUserAvatar = saveUserAvatar;

var saveUserAvatar_Subdomain = async function (req, res) {
    try {
    var data = req.body.image;
    var cropedImgMediaCenterPath = "/../../public/assets/users/croped/";
    var imgMediaCenterPath = "/../../public/assets/users/";
    var name = data.imageName + Date.now() + '_' + Math.floor((Math.random() * 3333333) + 1);
    var cropImgUrl = name + ".png";
    var imgUrl = Date.now() + '_' + Math.floor((Math.random() * 3333333) + 1) + data.imageName;
    var croppedImgSrcPath = __dirname + cropedImgMediaCenterPath + cropImgUrl;
    var ImgSrcPath = __dirname + imgMediaCenterPath + imgUrl;
    var croppedImagePath = "/assets/users/croped/" + cropImgUrl; //To Save Into Profile Pic Field

    //For Saving Crooped Image in Croped Folder
    var croppedBase64Data = data.croppedImageBase64.replace(/^data:image\/png;base64,/, "");
        
        // Use Promise wrapper for fs.writeFile
        await new Promise((resolve, reject) => {
            fs.writeFile(croppedImgSrcPath, croppedBase64Data, 'base64', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

            if (fs.existsSync(croppedImgSrcPath)) {
                var fields = {
                    Subdomain_profilePic: croppedImagePath
                };
                var query = { _id: req.session.user._id };
                var options = { multi: false };
            
            await user.update(query, { $set: fields }, options).exec();
            
                        req.session.user.Subdomain_profilePic = croppedImagePath;
                        res.json({ code: "200", msg: "Successfully Saved!", ProfilePic: croppedImagePath });
            } else {
                res.json({ 'code': 404, 'msg': 'file not found' });
            }
        
    //For Saving Original Image in User Folder
    var imgBase64Data = data.imageBase64.replace(/^data:image\/[^;]+;base64,/, "");
        await new Promise((resolve, reject) => {
            fs.writeFile(ImgSrcPath, imgBase64Data, 'base64', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!fs.existsSync(ImgSrcPath)) {
            console.error('Original image file not found after writing');
        }
        
    } catch (error) {
        console.error('Save user avatar subdomain error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
};
exports.saveUserAvatar_Subdomain = saveUserAvatar_Subdomain;

//To Save User Password From Account Settings
/*
var saveUsername = function (req, res) {
    //console.log("inside saveUsername - -- >", req.body)
    req.body = req.body ? req.body : {};
    var inputUsername = req.body.UserName ? req.body.UserName : null;
    var conditions = {
        UserName: inputUsername
    };
    var fields = {
        _id: true
    };
    if (inputUsername == null) {
        res.json({"code": "501", "msg": "Input Error."});
    } else {
        user.find(conditions, fields, function (err, data) {
            if (!err) {
                var setObj = {
                    UserName: req.body.UserName,
                };
                var conditions = {_id: req.session.user._id};
                var options = {multi: false};

                if (data.length) {
                    if (String(data[0]._id) == String(req.session.user._id)) {
                        //just ignore
                        res.json({"code": "304", "msg": "Not Modified.", "response": {username: inputUsername}})
                    } else {
                        user.update(conditions, {$set: setObj}, options, callback)
                        function callback(err, result) {
                            if (err) {
                                console.log(err)
                                res.json({"code": "501", "msg": "Something went wrong."})
                            } else {
                                res.json({"code": "200", "msg": "Username has been updated succesfully", "response": result})
                            }
                        }
                    }

                } else {
                    user.update(conditions, {$set: setObj}, options, callback)
                    function callback(err, result) {
                        if (err) {
                            console.log(err)
                            res.json({"code": "501", "msg": "Something went wrong."})
                        } else {
                            res.json({"code": "200", "msg": "Username has been updated succesfully", "response": result})
                        }
                    }

                }

            } else {
                res.json({"code": "200", "msg": "Username Already Exist"})
            }
        });
    }
}
*/
var saveUsername = async function (req, res) {
    try {
    //console.log("inside saveUsername - -- >", req.body)
    req.body = req.body ? req.body : {};
    var inputUsername = req.body.UserName ? req.body.UserName : null;
    var conditions = {
            UserName: { $regex: new RegExp("^" + inputUsername + "$", "i") },
		IsDeleted: false
    };
    var fields = {
        _id: true
    };
    if (inputUsername == null) {
        res.json({ "code": "501", "msg": "Input Error." });
    } else {
            const data = await user.find(conditions, fields).exec();
            
                //console.log("* * * *Inside Username already Exist* * * *", data, data.length);
                var setObj = {
                    UserName: req.body.UserName,
                };
                var conditions = { _id: req.session.user._id };
                var options = { multi: false };

                if (data.length) {
                res.json({ "code": "201", "msg": "Username already exist" });
                } else {
                await user.update(conditions, { $set: setObj }, options).exec();
                res.json({ "code": "200", "msg": "Username has been updated succesfully", "response": "Updated successfully" });
            }
        }
    } catch (error) {
        console.error('Save username error:', error);
        res.status(500).json(error);
    }
};
exports.saveUsername = saveUsername;


//To Save User Password From Account Settings
/*
var saveUserEmail = function (req, res) {
    console.log("inside saveUserEmail - -- >", req.body)
    req.body = req.body ? req.body : {};
    var inputEmail = req.body.Email ? req.body.Email : null;
    var conditions = {
        Email: inputEmail
    };
    var fields = {
        _id: true
    };
    if (inputEmail == null) {
        res.json({"code": "501", "msg": "Input Error."});
    } else {
        user.find(conditions, fields, function (err, data) {
            if (!err) {
                var setObj = {
                    Email: req.body.Email,
                };
                var conditions = {_id: req.session.user._id};
                var options = {multi: false};

                if (data.length) {
                    if (String(data[0]._id) == String(req.session.user._id)) {
                        //just ignore
                        res.json({"code": "304", "msg": "Not Modified.", "response": {Email: inputEmail}})
                    } else {
                        user.update(conditions, {$set: setObj}, options, callback)
                        function callback(err, result) {
                            if (err) {
                                console.log(err)
                                res.json({"code": "501", "msg": "Something went wrong."})
                            } else {
                                console.log("Result - - >",result);
                                res.json({"code": "200", "msg": "Email has been updated succesfully", "response": result})
                            }
                        }
                    }

                } else {
                    user.update(conditions, {$set: setObj}, options, callback)
                    function callback(err, result) {
                        if (err) {
                            console.log(err)
                            res.json({"code": "501", "msg": "Something went wrong."})
                        } else {
                            res.json({"code": "200", "msg": "Email has been updated succesfully", "response": result})
                        }
                    }

                }

            } else {
                res.json({"code": "200", "msg": "Email Already Exist"})
            }
        });
    }
}
*/
var saveUserEmail = async function (req, res) {
    try {
    console.log("inside saveUserEmail - -- >", req.body)
    req.body = req.body ? req.body : {};
    var inputEmail = req.body.Email ? req.body.Email : null;
    var conditions = {
        Email: inputEmail
    };
    var fields = {
        _id: true
    };
    if (inputEmail == null) {
        res.json({ "code": "501", "msg": "Input Error." });
    } else {
            const data = await user.find(conditions, fields).exec();
            console.log("* * * *Inside find Email* * * *", data[0]);
                console.log("* * * *Inside Email already Exist Exist* * * *", data.length);
                var setObj = {
                    Email: req.body.Email,
                };
                var conditions = { _id: req.session.user._id };
                var options = { multi: false };

                if (data.length) {
                    console.log("If Data.length is there ")
                res.json({ "code": "201", "msg": "Email already exist" });
                } else {
                    console.log("If Data.length is not there ")
                await user.update(conditions, { $set: setObj }, options).exec();
                res.json({ "code": "200", "msg": "Email has been updated succesfully", "response": "Updated successfully" });
            }
        }
    } catch (error) {
        console.error('Save user email error:', error);
        res.status(500).json(error);
    }
};
exports.saveUserEmail = saveUserEmail;

var confirm_token = async function (req, res) {
    try {
        const data = await user.find({ resetPasswordToken: req.body.token }).exec();
        
        if (data && data.length) {
                data = data[0];
                console.log("* * Inside confirm Token else= = >* * ", data);
                var Email = data.Email;
                var query = { Email: Email, IsDeleted: false };

            await user.update(query, { $set: { EmailConfirmationStatus: true } }).exec();
                        console.log("* * Inside !err  now sending mail from here on success= = >* * ", data);
                        sendmail(Email, "confirm_token", data, res);
                        console.log(data);
                        //res.json({"code":200,"msg":"Success"});
            res.json({ "code": "200", "msg": "Email confirmed successfully" });
                    } else {
            res.json({ "code": "404", "msg": "Confirmation token doesn't matched." });
        }
    } catch (error) {
        console.error('Confirm token error:', error);
        res.status(500).json({ "code": "501", "msg": "Something went wrong." });
    }
};
exports.confirm_token = confirm_token;
var updateTour = async function (req, res) {
    try {
    var conditions = {};
    conditions._id = req.session.user._id;
    var updateData = {};
    if (req.body.pageName == 'CapsuleDashboard') {
        updateData = { 'TourView.CapsuleDashboard': true };
    } else if (req.body.pageName == 'DashboardChapters') {
        updateData = { 'TourView.DashboardChapters': true };
    } else if (req.body.pageName == 'QAView') {
        updateData = { 'TourView.QAView': true };
    } else if (req.body.pageName == 'SearchList') {
        updateData = { 'TourView.SearchList': true };
    } else if (req.body.pageName == 'SearchView') {
        updateData = { 'TourView.SearchView': true };
    } else if (req.body.pageName == 'DiscussList') {
        updateData = { 'TourView.DiscussList': true };
    } else if (req.body.pageName == 'DiscussView') {
        updateData = { 'TourView.DiscussView': true };
    }

    // return
        const updateResult = await user.update(conditions, { $set: updateData }).exec();
        const userData = await user.findOne(conditions).exec();
        
            var response = {
                status: 200,
                message: "UpdateResponse",
                userId: updateData,
            update: updateResult,
            user: userData
        };
            res.json(response);
        //res.json(response);
    } catch (error) {
        console.error('Update tour error:', error);
        res.status(500).json({ status: 500, message: "Error updating tour", error: error.message });
    }
};
exports.updateTour = updateTour;
var getUserData = async function (req, res) {
    try {
        // Validate session exists
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.status(401).json({
                status: 401,
                message: "User session not found. Please login."
            });
        }

        var conditions = {};
        conditions._id = req.session.user._id;
        
        // Exclude only the Password field, return all other fields
        var fields = {
            Password: 0
        };

        // Fetch user data excluding password
        const userData = await user.findOne(conditions, fields).exec();
        
        if (!userData) {
            return res.status(404).json({
                status: 404,
                message: "User not found"
            });
        }
        
        var response = {
            status: 200,
            message: "User Data retrieved successfully",
            user: userData
        };
        res.json(response);
    } catch (error) {
        console.error('Get user data error:', error);
        res.status(500).json({ 
            status: 500, 
            message: "Error retrieving user data", 
            error: error.message 
        });
    }
};
exports.getUserData = getUserData;


var stripeConnect = async function (req, res) {
    try {
    var code = req.query.code ? req.query.code : null;
    var user_id = req.session.user._id ? req.session.user._id : null;

    if (user_id && code) {
            // Use Promise wrapper for request.post
            const response = await new Promise((resolve, reject) => {
        request.post({
            url: process.STRIPE_CONFIG.DEV.token_api,
            form: {
                grant_type: 'authorization_code',
                client_id: process.STRIPE_CONFIG.DEV.stripe_client_id,
                code: code,
                client_secret: process.STRIPE_CONFIG.DEV.secret_key
            }
                }, (err, response, body) => {
                    if (err) reject(err);
                    else resolve({ response, body });
                });
            });

            var isInvalid = JSON.parse(response.body).error;
                // Checks whether Stripe has granted authorization code or not

                console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@----------------------isInvalid----------------", isInvalid);

                if (!isInvalid) {
                    var outputJSON = "";
                    var setObj = {
                        StripeStatus: true,
                    StripeObject: JSON.parse(response.body)
                    };
                    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@------------------------------------**************UPDATING-----------");
                
                const resp = await user.update({ _id: user_id }, { $set: setObj }).exec();
                console.log("@@@@@@@@@@@@@@@@@@@@@############-----------------ERROR-------------------", resp);
                        console.log("@@@@@@@@@@@@@@@@@@@@@############-----------------response-------------------", resp);
                
                            //update the session object immediately.
                            req.session.user.StripeStatus = setObj.StripeStatus;
                            req.session.user.StripeStatus = setObj.StripeObject;

                outputJSON = { 'status': 'success', 'messageId': 200, 'message': 'Stripe account connected sucessfully!' };
                        res.redirect('https://' + req.headers.host + '/account-settings');
                } else {
                    //error
                    res.redirect('https://' + req.headers.host + '/account-settings');
                }
        } else {
        console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@--------------NO RIGHT INPUT----------------------**************");
        res.redirect('https://' + req.headers.host + '/account-settings');
    }
    } catch (error) {
        console.error('Stripe connect error:', error);
        res.redirect('https://' + req.headers.host + '/account-settings');
}
};
exports.stripeConnect = stripeConnect;

var __createDefaultJournal_BackgroundCall = async function (user_id, user_email) {
    try {
	var data = {};
	//set required field of the CapsuleModel
	data = {
            Origin: "journal",
            CreaterId: user_id,
            OwnerId: user_id,
            Title: 'Space',
            IsPublished: true
        };

        const capsuleResult = await Capsule(data).save();

        if (capsuleResult) {
			//create 3 Folders now
			var data = {};
			//set required field of the chapterModel
			data = {
                Origin: "journal",
                CapsuleId: capsuleResult._id ? capsuleResult._id : 0,
				CreaterId: user_id,
				OwnerId: user_id,
				IsPublished: true,
				IsLaunched: true
            };

			//save JournalId in users collection...
			var updateCond = {
                _id: user_id
			};
			var dataToSet = {
                JournalId: String(capsuleResult._id)
            };
            
            await user.update(updateCond, dataToSet).exec();
            console.log("Journal ID saved to user");

			//update if there is any transfer ownership chapter
            await Chapter.update({
					"OwnerEmail": user_email,
                "Origin": "journal",
                "CapsuleId": { $exists: false }
            }, {
                $set: {
                    CapsuleId: data.CapsuleId,
                    OwnerId: String(user_id)
                }
            }).exec();

            var myDefaultFolders = ["General", "Work", "Relation", "Play"];

            for (var loop = 0; loop < myDefaultFolders.length; loop++) {
				data.Title = myDefaultFolders[loop] ? myDefaultFolders[loop] : "Untitled Folder";

                const chapterResult = await Chapter(data).save();
                
                if (chapterResult) {
						//save All Folders - id in users collection...
                    if (result.Title == 'General') {
							var updateCond = {
                            _id: user_id
							};
							var dataToSet = {
                            AllFoldersId: String(result._id)
                        };
                        
                        await user.update(updateCond, dataToSet).exec();

							var data = {};
							data.Title = "General";
							data.Origin = "journal";
							data.CreaterId = user_id;
							data.OwnerId = user_id;

							data.ChapterId = result._id ? result._id : null;
							data.PageType = "gallery";

                        data.CommonParams = {};
                        data.CommonParams.Background = {};
							data.ViewportDesktopSections = {};
							data.ViewportDesktopSections.Background = {};
							data.ViewportDesktopSections.Widgets = [];

							data.ViewportTabletSections = {};
							data.ViewportTabletSections.Background = {};
							data.ViewportTabletSections.Widgets = [];

							data.ViewportMobileSections = {};
							data.ViewportMobileSections.Background = {};
							data.ViewportMobileSections.Widgets = [];

							data.IsLabelAllowed = true;
							data.Labels = [
								{
                                "LabelId": ObjectId("5ff179065a0a9a452c791f54"),
                                "Label": "Goal",
                                "Icon": "Goal.png",
                                "AddedBy": "Admin"
                            },
                            {
                                "LabelId": ObjectId("5ff179255a0a9a452c791f56"),
                                "Label": "Old story",
                                "Icon": "Old_story.png",
                                "AddedBy": "Admin"
                            },
                            {
                                "LabelId": ObjectId("5ff179465a0a9a452c791f58"),
                                "Label": "New story",
                                "Icon": "New_story.png",
                                "AddedBy": "Admin"
                            },
                            {
                                "LabelId": ObjectId("5ff179555a0a9a452c791f59"),
                                "Label": "Actions",
                                "Icon": "Skillful_action.png",
                                "AddedBy": "Admin"
                            },
                            {
                                "LabelId": ObjectId("5ff1797f5a0a9a452c791f5d"),
                                "Label": "Wins",
                                "Icon": "Victory.png",
                                "AddedBy": "Admin"
                            }
                        ];

                        const pageResult = await Page(data).save();
                        
                        if (pageResult) {
									//save General page - id in users collection...
                            if (result.Title == 'General') {
										var updateCond = {
                                    _id: user_id
										};
										var dataToSet = {
                                    AllPagesId: String(result._id)
                                };
                                
                                await user.update(updateCond, dataToSet).exec();
									}
									//save General page - id in users collection...

									var response = {
										status: 200,
										message: "Page created successfully.",
                                result: result
                            };
									console.log(response);
                        } else {
                            console.log("Page creation failed");
                        }
                    } else {
                        var myDefaultFoldersPages = ["Page 1", "Page 2", "Page 3"];

							var data = {};
							data.Origin = "journal";
							data.CreaterId = user_id;
							data.OwnerId = user_id;

							data.ChapterId = result._id ? result._id : null;
							data.PageType = "gallery";

                        data.CommonParams = {};
                        data.CommonParams.Background = {};
							data.ViewportDesktopSections = {};
							data.ViewportDesktopSections.Background = {};
							data.ViewportDesktopSections.Widgets = [];

							data.ViewportTabletSections = {};
							data.ViewportTabletSections.Background = {};
							data.ViewportTabletSections.Widgets = [];

							data.ViewportMobileSections = {};
							data.ViewportMobileSections.Background = {};
							data.ViewportMobileSections.Widgets = [];

							data.IsLabelAllowed = true;
							data.Labels = [
								{
                                "LabelId": ObjectId("5ff179065a0a9a452c791f54"),
                                "Label": "Goal",
                                "Icon": "Goal.png",
                                "AddedBy": "Admin"
                            },
                            {
                                "LabelId": ObjectId("5ff179255a0a9a452c791f56"),
                                "Label": "Old story",
                                "Icon": "Old_story.png",
                                "AddedBy": "Admin"
                            },
                            {
                                "LabelId": ObjectId("5ff179465a0a9a452c791f58"),
                                "Label": "New story",
                                "Icon": "New_story.png",
                                "AddedBy": "Admin"
                            },
                            {
                                "LabelId": ObjectId("5ff179555a0a9a452c791f59"),
                                "Label": "Actions",
                                "Icon": "Skillful_action.png",
                                "AddedBy": "Admin"
                            },
                            {
                                "LabelId": ObjectId("5ff1797f5a0a9a452c791f5d"),
                                "Label": "Wins",
                                "Icon": "Victory.png",
                                "AddedBy": "Admin"
                            }
                        ];

                        for (var loop2 = 0; loop2 < myDefaultFoldersPages.length; loop2++) {
								data.Title = myDefaultFoldersPages[loop2] ? myDefaultFoldersPages[loop2] : "Untitled Page";
                            const pageResult = await Page(data).save();
                            
                            if (pageResult) {
										var response = {
											status: 200,
											message: "Page created successfully.",
                                    result: result
                                };
										console.log(response);
                            } else {
                                console.log("Page creation failed");
									}
									}
							}
                } else {
                    console.log("Chapter creation failed");
						}
			}

			var response = {
				status: 200,
				message: "Journal created successfully.",
                result: capsuleResult
            };
			//res.json(response);
        } else {
            console.log("Capsule creation failed");
			var response = {
				status: 501,
				message: "Something went wrong."
            };
			//res.json(response);
		}

	//transfer ownership of posts to the newly registered user.
	var conditions = {
		"OwnerEmail": user_email,
            "Origin": "journal",
		"IsDeleted": false
	};
	var fields = {};
        
        const pageResults = await Page.find(conditions, fields).exec();
        
        if (pageResults) {
			var nowDate = Date.now();
            for (var i = 0; i < pageResults.length; i++) {
                var result = pageResults[i];
				result.OwnerId = user_id;
				result.CreatedOn = nowDate;
				result.UpdatedOn = nowDate;

				result.Medias = result.Medias ? result.Medias : [];
                for (var i = 0; i < result.Medias.length; i++) {
					result.Medias[i].OwnerId = user_id;
					result.Medias[i].PostedBy = ObjectId(user_id);
				}

                const newPageResult = await Page(result).save();
                
                if (newPageResult) {
                    console.log("----new page instance created..", newPageResult);
                } else {
                    console.log("Page creation failed");
                }
            }
        }
	//transfer ownership of posts to the newly registered user.
        
    } catch (error) {
        console.error('Create default journal error:', error);
    }
};

var AcceptBrowserPolicy = async function (req, res) {
    try {
    var query = { _id: req.session.user._id };
    // console.log(a);
        await user.update(query, { $set: { BrowserPolicyAccepted: true } }).exec();
        
			req.session.user.BrowserPolicyAccepted = true;
        res.json({ code: 200, message: 'done' });
    } catch (error) {
        console.error('Accept browser policy error:', error);
        res.status(500).json({ code: 501, message: 'error' });
		}
};
exports.AcceptBrowserPolicy = AcceptBrowserPolicy;

var acceptAppPolicy = async function (req, res) {
    try {
    var query = { _id: req.session.user._id };
    // console.log(a);
        await user.update(query, { $set: { ApplicationPolicyAccepted: true } }).exec();
        
			req.session.user.ApplicationPolicyAccepted = true;
        res.json({ code: 200, message: 'done' });
    } catch (error) {
        console.error('Accept app policy error:', error);
        res.status(500).json({ code: 501, message: 'error' });
		}
};
exports.acceptAppPolicy = acceptAppPolicy;


var getOwnerDetails = async function (req, res) {
    try {
	var conditions = {
            _id: req.body.OwnerId ? req.body.OwnerId : null
	};
	var fields = {
            Name: 1,
            Email: 1,
            ProfilePic: 1
        };
        
        const result = await user.find(conditions, fields).exec();
        
        if (result && result.length) {
            res.json({ code: 200, result: result[0] });
        } else {
            res.json({ code: 404, result: {} });
        }
    } catch (error) {
        console.error('Get owner details error:', error);
        res.status(500).json({ code: 501, result: {} });
    }
};
exports.getOwnerDetails = getOwnerDetails;

//To Search Specific Users
var tagging_users_list_allregisteredusers = async function (req, res) {
    try {
	var searchparam = req.body.searchText ? req.body.searchText : "";
    var conditions = {
            IsDeleted: false,
		Status: 1,
		$or: [
                { UserName: { $regex: new RegExp("^" + searchparam, "i") } },
                { Name: { $regex: new RegExp("^" + searchparam, "i") } },
			//{NickName: {$regex: new RegExp("^"+searchparam, "i")}},
			//{Email: {$regex: new RegExp("^"+searchparam, "i")}}
		]
	};
	var fields = {
            _id: true,
            Name: true,
            NickName: true,
            Email: true,
            UserName: true,
            ProfilePic: true
	};

	var sortObj = {
		Name: 1,
		Email: 1
	};

	var offset = req.body.offset ? req.body.offset : 0;
	var limit = req.body.limit ? req.body.limit : 20;

        const result = await user.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec();
        
			var usersList = [];
        for (var loop = 0; loop < result.length; loop++) {
				usersList.push({
                key: result[loop].Name + (result[loop].UserName ? ' - (' + result[loop].UserName + ')' : ''),
                value: result[loop].Name,
                id: result[loop].Email
            });
        }
        res.json({ "code": "200", "msg": "Success", "response": usersList });
        
    } catch (error) {
        console.error('Tagging users list error:', error);
        res.status(500).json(error);
    }
};
exports.tagging_users_list_allregisteredusers = tagging_users_list_allregisteredusers;

var tagging_users_list = async function (req, res) {
    try {
        const results = await async_lib.parallel({
            getRegisteredUsers: async function (callback) {
                try {
			var searchparam = req.body.searchText ? req.body.searchText : "";
			var conditions = {
                        IsDeleted: false,
				Status: 1,
				$or: [
                            { UserName: { $regex: new RegExp("^" + searchparam, "i") } },
                            { Name: { $regex: new RegExp("^" + searchparam, "i") } },
					//{NickName: {$regex: new RegExp("^"+searchparam, "i")}},
					//{Email: {$regex: new RegExp("^"+searchparam, "i")}}
				]
			};
			var fields = {
                        _id: true,
                        Name: true,
                        NickName: true,
                        Email: true,
                        UserName: true,
                        ProfilePic: true
			};

			var sortObj = {
				Name: 1,
				Email: 1
			};

			var offset = req.body.offset ? req.body.offset : 0;
			var limit = req.body.limit ? req.body.limit : 20;

                    const result = await user.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec();
                    
					var usersList = [];
                    for (var loop = 0; loop < result.length; loop++) {
						usersList.push({
                            key: result[loop].Name + (result[loop].UserName ? ' - (' + result[loop].UserName + ')' : ''),
                            value: result[loop].Name.split(' ')[0],
                            id: result[loop].Email
                        });
                    }
                    callback(null, usersList);
					//res.json({"code": "200", "msg": "Success", "response": usersList})
                } catch (error) {
                    callback(error, []);
				}
		},
            getMyFriends: async function (callback) {
                try {
			var searchparam = req.body.searchText ? req.body.searchText : "";
			var conditions = {
                        UserID: String(req.session.user._id),
                        $or: [
                            { 'Friend.Name': { $regex: new RegExp("^" + searchparam, "i") } },
                            { 'Friend.Email': { $regex: new RegExp("^" + searchparam, "i") } }
                        ],
                        Status: true,
                        IsDeleted: false
			};

			var fields = {};

			var sortObj = {
                        'Friend.Name': 1
                    };

                    const data = await friend.find(conditions).exec();
                    callback(null, data);
                } catch (error) {
                    callback(error, []);
                }
            }
        });

        if (!results.error) {
			var getRegisteredUsers = results.getRegisteredUsers.length ? results.getRegisteredUsers : [];
			var getMyFriends = results.getMyFriends.length ? results.getMyFriends : [];

			var allFriendsEmails = [];
			var allRegisteredEmails = [];
			var notRegisteredFriendEmails = [];

            for (var i = 0; i < getRegisteredUsers.length; i++) {
				allRegisteredEmails.push(getRegisteredUsers[i].id);
			}

            for (var i = 0; i < getMyFriends.length; i++) {
				allFriendsEmails.push(getMyFriends[i].Friend.Email);
			}

			notRegisteredFriendEmails = allFriendsEmails.filter(x => allRegisteredEmails.indexOf(x) === -1);
			//console.log("allRegisteredEmails =================== ", allRegisteredEmails);
			//console.log("allFriendsEmails =================== ", allFriendsEmails);
			//console.log("notRegisteredFriendEmails =================== ", notRegisteredFriendEmails);
            if (notRegisteredFriendEmails.length) {
				var conditions = {
                    IsDeleted: false,
                    Status: 1,
                    Email: { $in: notRegisteredFriendEmails }
				};

				var fields = {
                    _id: true,
                    Name: true,
                    NickName: true,
                    Email: true,
                    UserName: true,
                    ProfilePic: true
				};

				var sortObj = {
					Name: 1,
					Email: 1
				};

                const result = await user.find(conditions, fields).sort(sortObj).exec();
                
						var usersList = [];
						var emails = [];
                for (var loop = 0; loop < result.length; loop++) {
							emails.push(result[loop].Email);
							usersList.push({
                        key: result[loop].Name + (result[loop].UserName ? ' - (' + result[loop].UserName + ')' : ''),
                        value: result[loop].Name.split(' ')[0],
                        id: result[loop].Email
                    });
                }

                if (usersList.length) {
                    if (getRegisteredUsers.length) {
                        res.json({ "code": "200", "msg": "Success", "response": usersList.concat(getRegisteredUsers) });
							} else {
                        res.json({ "code": "200", "msg": "Success", "response": usersList });
							}
						} else {
                    res.json({ "code": "200", "msg": "Success", "response": usersList });
						}

			} else {
                res.json({ "code": "200", "msg": "Success", "response": getRegisteredUsers });
			}
        } else {
			var response = {
				status: 501,
				message: "Something went wrong."
            };
            res.json(response);
        }
    } catch (error) {
        console.error('Tagging users list error:', error);
        var response = {
            status: 501,
            message: "Something went wrong."
        };
			res.json(response);
		}
};
exports.tagging_users_list = tagging_users_list;

var bulkAPI__createJournalInstances_oneTime = async function (req, res) {
    try {
    var conditions = {
		/*
		$or : [
			{JournalId : {$exists:false}},
			{AllFoldersId : {$exists:false}},
			{AllPagesId : {$exists:false}}
		],
		*/
            IsDeleted: false
	};

        var fields = {};

        const users = await user.find(conditions, fields).exec();

        if (users) {
            for (var loop = 0; loop < users.length; loop++) {
				__createDefaultJournal_BackgroundCall(users[loop]._id);
			}

            setTimeout(function () {
                res.json({ code: 200, message: "DONE" });
            }, 5000);
        }
    } catch (error) {
        console.error('Bulk API create journal instances error:', error);
        res.status(500).json({ code: 500, message: "Error occurred" });
    }
};
exports.bulkAPI__createJournalInstances_oneTime = bulkAPI__createJournalInstances_oneTime;

var getDataBySubdomain = async function (req, res) {
	var publicProfileData = {
		name : '',
		profilePic : '',
		profileData : {
			name : '',
			title : '',
			description : '',
			profilePic : ''
		},
		streams : []
	};

	var Subdomain = req.query.Subdomain ? req.query.Subdomain : null;
	if(Subdomain) {
		var IsCoverPageAvailable = false;
		var introPagePath = __dirname + '/../../public/subdomaincovers/'+Subdomain+'/index.html';
		if (fs.existsSync(introPagePath)) {
			IsCoverPageAvailable = true;
		}

		var conditions = {
			Subdomain : Subdomain,
			AllowCreate : 1,
			Status : 1,
			IsDeleted : 0
		};
		var UserData = await user.findOne(conditions, {});
		UserData = UserData ? UserData : null;
		if(UserData) {
			publicProfileData = {
				name : UserData.Name ? UserData.Name : 'N/A',
				//profilePic : UserData.ProfilePic ? UserData.ProfilePic : '',
				profilePic : UserData.Subdomain_profilePic ? UserData.Subdomain_profilePic : '',
				profileData : {
					name : UserData.Subdomain_name ? UserData.Subdomain_name : 'N/A',
					title : UserData.Subdomain_title ? UserData.Subdomain_title : 'N/A',
					description : '<p style="margin-top: 25px;font-weight: bold;">'+UserData.Subdomain_description ? UserData.Subdomain_description : 'N/A'+'</p>',
					profilePic : UserData.Subdomain_profilePic ? UserData.Subdomain_profilePic : '',
				},
				streams : [],
				IsCoverPageAvailable: IsCoverPageAvailable || false
			};

			//get stream available in Store
			var Streams_conditions = {
				CreaterId : String(UserData._id),
				//Origin : "published",
				IsPublished : true,
				"LaunchSettings.Audience":"BUYERS",
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
			var results = await Capsule.find(Streams_conditions , fields).sort(sortObj).lean();
			results = results ? results : [];
			if( results.length ){
				for( var loop = 0; loop < results.length; loop++ ){
					var CapsuleObj = results[loop];
					CapsuleObj.LaunchSettings = CapsuleObj.LaunchSettings ? CapsuleObj.LaunchSettings : {};
					CapsuleObj.MetaData = CapsuleObj.MetaData ? CapsuleObj.MetaData : {};
					var streamObj = {
						_id : CapsuleObj._id,
						title : CapsuleObj.Title ? CapsuleObj.Title : 'Untitled Capsule',
						description : CapsuleObj.MetaData.StoreDescription ? '<p>'+CapsuleObj.MetaData.StoreDescription+'</p>' : '<p></p>',
						cover : 'https://cdn.jsdelivr.net/gh/froala/design-blocks@master/dist/imgs/draws/chatting.svg',
						price : CapsuleObj.Price ? CapsuleObj.Price : "",
						DiscountPrice : CapsuleObj.DiscountPrice ? CapsuleObj.DiscountPrice : "",
						ExploreColorCode : CapsuleObj.MetaData.ExploreColor ? CapsuleObj.MetaData.ExploreColor : "#C16614"
					};
					publicProfileData.profileData.name = CapsuleObj.MetaData.author ? CapsuleObj.MetaData.author : publicProfileData.profileData.name,
					publicProfileData.streams.push(streamObj);
				}
			}
		}
	}
	res.json({
		code  : "200",
		result : publicProfileData
	});
};
exports.getDataBySubdomain = getDataBySubdomain;

const saveSubdomainSettings = async (req, res) => {
    try {
        const query = { _id: req.session.user._id };
        const subdomainName = req.body.subdomain_name || req.body.Subdomain_name || null;
        const subdomainTitle = req.body.subdomain_title || req.body.Subdomain_title || null;
        const subdomainDescription = req.body.subdomain_description || req.body.Subdomain_description || null;

        const setObj = {};
        if (subdomainName) {
            setObj.Subdomain_name = subdomainName;
        }

        if (subdomainTitle) {
            setObj.Subdomain_title = subdomainTitle;
        }

        if (subdomainDescription) {
            setObj.Subdomain_description = subdomainDescription;
        }

        if (!Object.keys(setObj).length) {
            return res.status(400).json({ code: 400, msg: "At least one subdomain setting is required" });
        }

        await user.updateOne(query, { $set: setObj }, { upsert: false }).exec();
        
        const result = await user.find({ '_id': req.session.user._id }).exec();
                req.session.user = result[0];
        
        res.json({ code: 200, msg: "Success" });
        
    } catch (error) {
        console.error('Save subdomain settings error:', error);
        res.status(500).json({ code: 500, msg: "Internal server error" });
    }
};
exports.saveSubdomainSettings = saveSubdomainSettings;

var logUserAction = async function (req, res) {
    try {
	var actionLog = req.body ? req.body : {};
	actionLog.CreatedOn = Date.now();
	actionLog.UpdatedOn = Date.now();

        if (!actionLog.UserId || !actionLog.Action || !actionLog.ActionPostType) {
            return res.json({ code: 501, message: "input error." });
	}

	await UserActionLogs(actionLog).save();
        return res.json({ code: 200, message: "log added." });

    } catch (error) {
        console.error('Log user action error:', error);
        res.status(500).json({ code: 500, message: "Error occurred" });
    }
};
exports.logUserAction = logUserAction;

var updateNotificationSeenStatus = async function (req, res) {
    try {
	var inputObj = req.body ? req.body : {};
	inputObj.UserId = inputObj.UserId ? inputObj.UserId : null;
	inputObj.SeenBy = req.session.user._id;

        if (!inputObj.UserId || !inputObj.SeenBy) {
            return res.status(400).json({ code: 400, message: "Missing required fields" });
        }

        // Add your notification update logic here
        // Example: await NotificationSeenLogs.updateOne({...}, {...}).exec();
        
        return res.json({ code: 200, message: "Notification status updated." });
        
    } catch (error) {
        console.error('Update notification seen status error:', error);
        res.status(500).json({ code: 500, message: "Error occurred" });
    }
};
exports.updateNotificationSeenStatus = updateNotificationSeenStatus;

var getUserNotificationsCount = async function(req, res) {
	var loginUserId = req.session.user._id;

	var inputObj = req.body ? req.body : {};
	inputObj.teamMembers = inputObj.teamMembers ? inputObj.teamMembers : [];

	var teamMembersIds = [];
	for(var i = 0; i < inputObj.teamMembers.length; i++) {
		var teamMember = inputObj.teamMembers[i];
		teamMember.UserId = teamMember.UserId ? ObjectId(teamMember.UserId) : null;
		if(teamMember.UserId) {
			teamMembersIds.push(teamMember.UserId);
		}
	}

	if(!teamMembersIds.length) {
		return res.json({code : 501, result : {}});
	}

	var seenLogConditions = {
		UserId : {$in : teamMembersIds},
		SeenBy : ObjectId(loginUserId)
	};

	var results = await NotificationSeenLogs.aggregate([
		{ $match : seenLogConditions},
		{ $sort : {UpdatedOn : -1} },
		{ $group : {_id : "$UserId", SeenAt : {$first : "$UpdatedOn"}} }
	]);

	results = results ? results : [];

	var lastSeenMap = {};
	for(var i = 0; i < results.length; i++) {
		var result = results[i];
		var UserId = result._id;
		var lastSeenAt = result.SeenAt ? result.SeenAt : null;
		if(UserId && lastSeenAt) {
			lastSeenMap[UserId] = new Date(lastSeenAt);
		}
	}

	var conditions = {};
	conditions.$or = [];
	for(var i = 0; i < inputObj.teamMembers.length; i++) {
		var teamMember = inputObj.teamMembers[i];
		teamMember.UserId = teamMember.UserId ? ObjectId(teamMember.UserId) : null;
		teamMember.StreamIds = teamMember.StreamIds ? teamMember.StreamIds : [];
		for(var j = 0; j < teamMember.StreamIds.length; j++) {
			teamMember.StreamIds[j] = ObjectId(teamMember.StreamIds[j]);
		}

		if(teamMember.UserId) {
			var condition1 = {
				UserId : teamMember.UserId,
				FriendId : ObjectId(loginUserId),
				ActionPostType : {$in : ['PostForFriend']},
				Action : {$in : ['Post']}
			};

			if(lastSeenMap[String(teamMember.UserId)]) {
				condition1.CreatedOn = {$gt : lastSeenMap[String(teamMember.UserId)]};
			}

			conditions.$or.push(condition1);

			if(teamMember.StreamIds.length) {
				var condition2 = {
					UserId : teamMember.UserId,
					StreamId : {$in : teamMember.StreamIds},
					ActionPostType : {$in : ['UserPost', 'StreamPost']},
					Action : {$in : ['PostLike','CommentLike', 'Comment', 'PrivateComment', 'Post']}
				};

				if(lastSeenMap[String(teamMember.UserId)]) {
					condition2.CreatedOn = {$gt : lastSeenMap[String(teamMember.UserId)]};
				}

				conditions.$or.push(condition2);
			}
		}
	}

	if(!conditions.$or.length) {
		return res.json({code : 501});
	}
	//console.log("conditions -------- ", conditions);
	var finalResults = await UserActionLogs.aggregate([
		{ $match : conditions},
		{ $group : {_id : "$UserId", NotificationCount : {$sum : 1}} },
		{
			$lookup: {
				from: "users",
				localField: "_id",
				foreignField: "_id",
				as: "UserData"
			}
		}
	]);
	finalResults = finalResults ? finalResults : [];
	nCountObj = {};
	for(var i = 0; i < finalResults.length; i++) {
		finalResults[i].UserData = finalResults[i].UserData ? finalResults[i].UserData : [];
		var email = finalResults[i].UserData.length ? finalResults[i].UserData[0].Email : null;
		if(email) {
			nCountObj[email] = finalResults[i].NotificationCount ? finalResults[i].NotificationCount : 0;
		}
	}
	return res.json({code : 200, result : nCountObj});
}
exports.getUserNotificationsCount = getUserNotificationsCount;

var logUserFeedback = async function(req, res) {
	var inputObj = req.body ? req.body : {};
	inputObj.CreatedOn = Date.now();
	inputObj.UpdatedOn = Date.now();

	inputObj.UserId = req.session.user._id;

	if(!inputObj.UserId || !inputObj.WhatWorks || !inputObj.WhatPromise) {
		return res.json({code : 501, message : "input error."});
	}

	await UserFeedback(inputObj).save();
	return res.json({code : 200, message : "feedback added."});
}

exports.logUserFeedback = logUserFeedback;

var view = async function(req, res) {
    try {
        // Check if user is logged in (support both JWT and session)
        const userFromSession = req.session?.user;
        const userFromJWT = req.user;
        
        if (!userFromSession && !userFromJWT) {
            return res.status(401).json({ 
                code: 401, 
                msg: "User not authenticated" 
            });
        }

        // Get user ID from session or JWT
        const userId = userFromSession?._id || userFromJWT?.userId;
        
        // Find user data with essential profile fields
        const userData = await user.findOne({ 
            _id: userId,
            IsDeleted: false 
        }).select({
            _id: 1,
            Name: 1,
            Email: 1,
            UserName: 1,
            Gender: 1,
            NickName: 1,
            ProfileStatus: 1,
            EmailConfirmationStatus: 1,
            Status: 1,
            CreatedOn: 1,
            ProfilePicture: 1,
            Bio: 1,
            Location: 1,
            Website: 1,
            JournalId: 1,
            referralCode: 1
        }).exec();

        if (!userData) {
            return res.status(404).json({ 
                code: 404, 
                msg: "User not found" 
            });
        }

        // Return user profile data
        res.json({
            code: 200,
            msg: "Success",
            user: userData
        });

    } catch (error) {
        console.error('View user profile error:', error);
        res.status(500).json({ 
            code: 500, 
            msg: "Internal server error" 
        });
    }
};

exports.view = view;

// Get user by ID
var getUserById = async function(req, res) {
    try {
        // Check if user is logged in (support both JWT and session)
        const userFromSession = req.session?.user;
        const userFromJWT = req.user;
        
        if (!userFromSession && !userFromJWT) {
            return res.status(401).json({ 
                code: 401, 
                msg: "User not authenticated" 
            });
        }

        const userId = req.params.id;
        
        // Validate user ID format
        if (!userId || !ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                code: 400, 
                msg: "Invalid user ID" 
            });
        }
        
        // Find user data with essential profile fields
        const userData = await user.findOne({ 
            _id: userId,
            IsDeleted: false 
        }).select({
            _id: 1,
            Name: 1,
            Email: 1,
            UserName: 1,
            Gender: 1,
            NickName: 1,
            ProfileStatus: 1,
            EmailConfirmationStatus: 1,
            Status: 1,
            CreatedOn: 1,
            ProfilePicture: 1,
            Bio: 1,
            Location: 1,
            Website: 1,
            JournalId: 1,
            referralCode: 1
        }).exec();

        if (!userData) {
            return res.status(404).json({ 
                code: 404, 
                msg: "User not found" 
            });
        }

        // Return user profile data
        res.json({
            code: 200,
            msg: "Success",
            user: userData
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ 
            code: 500, 
            msg: "Internal server error" 
        });
    }
};

exports.getUserById = getUserById;

// Create Admin User
var createAdmin = async function(req, res) {
    try {
        // Input validation
        if (!req.body.name || !req.body.email || !req.body.password) {
            return res.status(400).json({ 
                code: 400, 
                msg: "Name, email, and password are required" 
            });
        }

        // Check if admin already exists
        const admin = require('./../models/adminModel.js');
        const existingAdmin = await admin.find({ email: req.body.email }).exec();
        
        if (existingAdmin && existingAdmin.length > 0) {
            return res.status(409).json({ 
                code: 409, 
                msg: "Admin with this email already exists" 
            });
        }

        // Create new admin
        const newAdmin = new admin({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        });

        await newAdmin.save();

        res.status(201).json({
            code: 201,
            msg: "Admin user created successfully",
            admin: {
                _id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email
            }
        });

    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ 
            code: 500, 
            msg: "Internal server error during admin creation" 
        });
    }
};

exports.createAdmin = createAdmin;

// Create SubAdmin User
var createSubAdmin = async function(req, res) {
    try {
        // Input validation
        if (!req.body.name || !req.body.email || !req.body.password) {
            return res.status(400).json({ 
                code: 400, 
                msg: "Name, email, and password are required" 
            });
        }

        // Check if subadmin already exists
        const subAdmin = require('./../models/subAdminModel.js');
        const existingSubAdmin = await subAdmin.find({ email: req.body.email }).exec();
        
        if (existingSubAdmin && existingSubAdmin.length > 0) {
            return res.status(409).json({ 
                code: 409, 
                msg: "SubAdmin with this email already exists" 
            });
        }

        // Create new subadmin
        const newSubAdmin = new subAdmin({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        });

        await newSubAdmin.save();

        res.status(201).json({
            code: 201,
            msg: "SubAdmin user created successfully",
            subAdmin: {
                _id: newSubAdmin._id,
                name: newSubAdmin.name,
                email: newSubAdmin.email
            }
        });

    } catch (error) {
        console.error('Create subadmin error:', error);
        res.status(500).json({ 
            code: 500, 
            msg: "Internal server error during subadmin creation" 
        });
    }
};

exports.createSubAdmin = createSubAdmin;

// Promote regular user to subadmin by updating their role
var promoteUserToSubAdmin = async function(req, res) {
    try {
        const User = require('./../models/userModel.js');
        const { userId, password } = req.body;

        // Input validation
        if (!userId) {
            return res.status(400).json({ 
                code: 400, 
                msg: "User ID is required" 
            });
        }

        // Find the user
        const user = await User.findById(userId).exec();
        if (!user) {
            return res.status(404).json({ 
                code: 404, 
                msg: "User not found" 
            });
        }

        // Check if user is already a subadmin or admin
        if (user.Role === 'subadmin' || user.Role === 'admin') {
            return res.status(409).json({ 
                code: 409, 
                msg: `User is already a ${user.Role}` 
            });
        }

        // Update user role to subadmin
        user.Role = 'subadmin';
        if (password) {
            user.Password = user.generateHash(password);
        }
        
        await user.save();

        // Return success response
        res.status(200).json({ 
            code: 200, 
            msg: "User promoted to subadmin successfully",
            data: {
                userId: user._id,
                name: user.Name,
                email: user.Email,
                role: user.Role,
                profilePic: user.ProfilePic
            }
        });

    } catch (error) {
        console.error('Promote user to subadmin error:', error);
        res.status(500).json({ 
            code: 500, 
            msg: "Internal server error during promotion" 
        });
    }
};

exports.promoteUserToSubAdmin = promoteUserToSubAdmin;