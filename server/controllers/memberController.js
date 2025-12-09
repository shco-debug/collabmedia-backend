var user = require('./../models/userModel.js');
var group = require('./../models/groupModel.js');
var friend = require('./../models/friendsModel.js');
var musicLibObj = require('./../models/musiclibraryModel.js');
var Relationship = require('./../models/relationshipModel.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');

var mongoose = require("mongoose");
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

var mp3Duration = require('mp3-duration');
var ffmetadata = require("ffmetadata");
/*
* the purpose of this function is to check if two person are friends already
*/

function checkFriendship(email){
    friend.find({'UserID': req.session.user._id,'Friend.Email':email,Status:1,IsDeleted:0},function(err,data){
        if (err) {
            res.json({'code':400,'error':err});
        }else{
            console.log('here');
            if (data.length>0) {
                return 'friends';
            }else{
                return 'not friends';
            }
        }
    })
}


/*
* the purpose of this function is to check if email provided by user is registered or not
*/

function checkUser(email){
    user.findOne({Email:email},function(err,data){
        if (err) {
            res.json({'code':400,'error':err});
        }else{
            console.log(data);
            return data;
        }
    })
}






/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		addFriend
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
___________________________________________________________________________
*/

const addFriend = async function(req, res) {
    console.log('='.repeat(80));
    console.log('📧 [addFriend] START - Friend invitation request received');
    console.log('📧 [addFriend] Request body:', {
        email: req.body.email,
        name: req.body.name,
        relation: req.body.relation
    });
    
    try {
        // Check if user is authenticated
        if (!req.session || !req.session.user || !req.session.user._id) {
            console.log('❌ [addFriend] User not authenticated');
            return res.json({'code': 401, 'error': 'User not authenticated. Please login first.'});
        }

        console.log('✅ [addFriend] User authenticated:', {
            userId: req.session.user._id,
            userName: req.session.user.Name,
            userEmail: req.session.user.Email
        });

        // Validate input
        if (!req.body.email || !req.body.name) {
            console.log('❌ [addFriend] Missing required fields:', {
                hasEmail: !!req.body.email,
                hasName: !!req.body.name
            });
            return res.json({'code': 400, 'error': 'Email and name are required'});
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(req.body.email)) {
            console.log('❌ [addFriend] Invalid email format:', req.body.email);
            return res.json({'code': 400, 'error': 'Invalid email format'});
        }
        
        console.log('✅ [addFriend] Input validation passed');

        // Check if user exists in database
        console.log('🔍 [addFriend] Checking if friend email exists in database:', req.body.email);
        let frndData = await user.findOne({
            Email: { $regex: new RegExp(req.body.email, "i") }, 
            IsDeleted: false
        }).exec();

        let IsRegistered = frndData != undefined && frndData != null;
        let userCreated = false;
        
        console.log('👤 [addFriend] Friend user lookup result:', {
            isRegistered: IsRegistered,
            foundUserId: frndData?._id,
            foundUserName: frndData?.Name
        });

        // If user doesn't exist, create a temporary user record
        if (!IsRegistered) {
            console.log(`📝 [addFriend] User ${req.body.email} not found. Creating temporary user record...`);
            
            // Create a temporary user with minimal data
            const tempUser = new user();
            tempUser.Email = req.body.email;
            tempUser.Name = req.body.name;
            tempUser.NickName = req.body.name;
            tempUser.UserName = req.body.email; // Use email as username to avoid null duplicate key error
            tempUser.Password = tempUser.generateHash('temp123'); // Generate temporary password
            tempUser.ProfileStatus = 0; // Not fully registered
            tempUser.IsDeleted = false;
            tempUser.CreatedOn = Date.now();
            tempUser.ModifiedOn = Date.now();
            
            try {
                frndData = await tempUser.save();
                IsRegistered = true;
                userCreated = true;
                console.log(`✅ [addFriend] Temporary user created with ID: ${frndData._id}`);
            } catch (createError) {
                console.error('❌ [addFriend] Error creating temporary user:', createError);
                return res.json({'code': 500, 'error': 'Failed to create user record'});
            }
        }

        // Check if friendship already exists
        console.log('🔍 [addFriend] Checking for existing friendship...');
        const existingFriendship = await friend.find({
            'UserID': req.session.user._id,
            'Friend.Email': { $regex: new RegExp(req.body.email, "i") },
            Status: { $in: [1, 0] }, // Both accepted and pending
            IsDeleted: 0
        }).exec();

        if (existingFriendship.length > 0) {
            const existingStatus = existingFriendship[0].Status;
            console.log('⚠️ [addFriend] Friendship already exists with status:', existingStatus);
            if (existingStatus === 1) {
                return res.json({'code': 400, 'msg': 'Already a friend'});
            } else {
                return res.json({'code': 400, 'msg': 'Friend request already sent'});
            }
        }
        
        console.log('✅ [addFriend] No existing friendship found, proceeding...');

        // Parse relationship - use relationship system instead of hardcoded IDs
        let rel = req.body.relation ? req.body.relation.split('~') : ['Friend', ''];
        
        // Get default relationship if no ID provided
        if (!rel[1] || rel[1].trim() === '') {
            try {
                const defaultRel = await Relationship.getDefault();
                if (defaultRel) {
                    rel = [defaultRel.RelationshipTitle, defaultRel._id.toString()];
                } else {
                    // Fallback to hardcoded default if no relationship system
                    rel = ['Friend', '57fc1357c51f7e980747f2ce'];
                }
            } catch (error) {
                console.error('Error getting default relationship:', error);
                // Fallback to hardcoded default
                rel = ['Friend', '57fc1357c51f7e980747f2ce'];
            }
        }
        
        // Validate that RelationID is not a user ID (should be a relationship type ID)
        if (rel[1] && rel[1].length === 24) { // MongoDB ObjectId length
            // Check if this is actually a relationship ID
            try {
                const relationship = await Relationship.findById(rel[1]);
                if (!relationship || !relationship.IsActive) {
                    // If not a valid relationship, use default
                    const defaultRel = await Relationship.getDefault();
                    if (defaultRel) {
                        rel = [defaultRel.RelationshipTitle, defaultRel._id.toString()];
                    } else {
                        rel = ['Friend', '57fc1357c51f7e980747f2ce'];
                    }
                    console.log('Warning: Invalid relationship ID, using default relationship type');
                }
            } catch (error) {
                console.error('Error validating relationship ID:', error);
                // Use hardcoded default as fallback
                rel = ['Friend', '57fc1357c51f7e980747f2ce'];
            }
        }
        
        // Create friend data object
        const newFriendData = {
            IsRegistered: IsRegistered,
            Email: req.body.email,
            Name: IsRegistered ? frndData.Name : req.body.name,
            Relation: rel[0].trim(),
            RelationID: rel[1].trim(),
            Pic: IsRegistered ? frndData.ProfilePic : '/assets/users/default.png',
            NickName: IsRegistered ? frndData.NickName : ''
        };

        // Add friend's user ID if registered
        if (IsRegistered) {
                            newFriendData.ID = frndData._id;
        }

        // Determine initial status
        let initialStatus = 1; // Default: accepted
        let message = 'Friend added successfully';

        console.log('📊 [addFriend] Determining friend request status...');
        console.log('📊 [addFriend] IsRegistered:', IsRegistered);
        console.log('📊 [addFriend] userCreated (was user just created?):', userCreated);
        
        // IMPORTANT: Use userCreated flag instead of IsRegistered
        // Because if we just created the user, IsRegistered will be true, but we still need to send email
        if (userCreated) {
            // For newly created (non-registered) users, set as pending and send invitation
            initialStatus = 0; // Pending
            message = 'Friend request sent. Invitation email will be sent.';
            
            console.log('📧 [addFriend] ========== EMAIL NOTIFICATION SECTION ==========');
            console.log('📧 [addFriend] Friend was JUST CREATED (not previously registered) - email SHOULD be sent');
            console.log('📧 [addFriend] Email recipient:', req.body.email);
            console.log('📧 [addFriend] Recipient name:', req.body.name);
            console.log('📧 [addFriend] Inviter name:', req.session.user.Name);
            console.log('📧 [addFriend] Inviter email:', req.session.user.Email);
            console.log('📧 [addFriend] Attempting to send invitation email...');
            
            // Send invitation email
            try {
                const emailResult = await sendInvitationEmail(req.body.email, req.body.name, req.session.user.Name, req.session.user.Email);
                if (emailResult.success) {
                    console.log('✅ [addFriend] Invitation email sent successfully!');
                    console.log('   - Message ID:', emailResult.messageId);
                } else {
                    console.log('⚠️ [addFriend] Failed to send invitation email:', emailResult.error);
                }
            } catch (emailError) {
                console.error('❌ [addFriend] Error sending invitation email:', emailError);
            }
            
            console.log('📧 [addFriend] ================================================');
        } else {
            console.log('📧 [addFriend] Friend WAS already registered - no email needed');
        }

        // Create and save friendship
        const friendship = new friend({
            UserID: req.session.user._id,
            Friend: newFriendData,
            Status: initialStatus,
            IsDeleted: 0,
            CreatedOn: Date.now(),
            ModifiedOn: Date.now()
        });

        console.log('💾 [addFriend] Saving friendship to database...');
        await friendship.save();
        console.log('✅ [addFriend] Friendship saved successfully');

        // Create reverse friendship if friend is registered
        if (IsRegistered) {
            console.log('🔄 [addFriend] Creating reverse friendship (friend is registered)...');
            const reverseFriendData = {
                IsRegistered: true,
                Email: req.session.user.Email,
                Name: req.session.user.Name,
                Relation: rel[0].trim(),
                RelationID: rel[1].trim(),
                Pic: req.session.user.ProfilePic || '/assets/users/default.png',
                NickName: req.session.user.NickName || '',
                ID: req.session.user._id
            };

            const reverseFriendship = new friend({
                UserID: frndData._id,
                Friend: reverseFriendData,
                Status: initialStatus,
                IsDeleted: 0,
                CreatedOn: Date.now(),
                ModifiedOn: Date.now()
            });

            await reverseFriendship.save();
            console.log('✅ [addFriend] Reverse friendship saved successfully');
        }
        
        console.log('✅ [addFriend] SUCCESS - Returning response');
        console.log('📊 [addFriend] Response data:', {
            code: 200,
            msg: message,
            isRegistered: IsRegistered,
            userCreated: userCreated,
            status: initialStatus,
            friendId: frndData._id
        });
        console.log('='.repeat(80));
        
        res.json({
            'code': 200, 
            'msg': message,
            'isRegistered': IsRegistered,
            'userCreated': userCreated,
            'status': initialStatus,
            'friendId': frndData._id
        });
        
    } catch (error) {
        console.error('❌ [addFriend] ERROR:', error);
        console.error('❌ [addFriend] Error stack:', error.stack);
        console.log('='.repeat(80));
        res.json({'code': 400, 'error': error.message});
    }
}

/*
var addFriend_old = function(req,res){
    //var email = new regex
    user.findOne({Email:{ $regex : new RegExp(req.body.email, "i") }},function(err,frndData){
        if (err) {
            res.json({'code':400,'error':err});
        }else{

            if (frndData != undefined && frndData != null) {
                friend.find({'UserID': req.session.user._id,'Friend.Email':{ $regex : new RegExp(req.body.email, "i") },Status:1,IsDeleted:0},function(err,data){
                    if (err) {
                        res.json({'code':404,'error':err});
                    }else{
                        console.log(data);
                        if (data.length == 0) {
                            console.log('saving data');
                            var rel = req.body.relation;
                            rel = rel.split('~');
                            var newFriendData = {};
                            newFriendData.ID = frndData._id;
                            newFriendData.Email = frndData.Email;
                            newFriendData.Name = frndData.Name;
                            newFriendData.NickName =  frndData.NickName;
                            newFriendData.Pic =  frndData.ProfilePic;
                            newFriendData.Relation =  rel[0].trim();
                            newFriendData.RelationID =  rel[1].trim();

                            var friendship = new friend();
                            friendship.UserID = req.session.user._id;
                            friendship.Friend = newFriendData;
                            friendship.Status = 1;
                            friendship.IsDeleted = 0;
                            friendship.CreatedOn = Date.now();
                            friendship.ModifiedOn = Date.now();
                            friendship.save(function(err,data){
                                if (err) {
                                    res.json(err);
                                }else{
                                    res.json({'code':200,msg:'data saved'});
                                }
                            });
                        }else{
                            console.log('already friend');
                            res.json({'code':400,msg:'Already a friend'});
                        }
                    }
                });
            }else{
                console.log('not registered');
                res.json({'code':401,msg:'user not registered'});
            }
        }
    })
}
*/
exports.addFriend = addFriend;


var addFriend_INTERNAL_API = function(req,res){
    var userId = req.body.userId ? req.body.userId : null;
    var email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    var name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    var relation = typeof req.body.relation === 'string' ? req.body.relation : 'Friend~57fc1357c51f7e980747f2ce';

    user.findOne({Email:{ $regex : new RegExp(email, "i") }, IsDeleted : false},function(err,frndData){
        if (err) {
            res.json({'code':400,'error':err});
        }else{
            var IsRegistered = false;
            if (frndData != undefined && frndData != null) {
                IsRegistered = true;
            }else{
                IsRegistered = false;
                //console.log('not registered');
                //res.json({'code':401,msg:'user not registered'});
            }
            friend.find({'UserID': userId,'Friend.Email':{ $regex : new RegExp(email, "i") },Status:1,IsDeleted:0},function(err,data){
                if (err) {
                    res.json({'code':404,'error':err});
                }else{
                    console.log(data);
                    if (data.length == 0) {
                        console.log('saving data');
                        var rel = relation;
                        rel = rel.split('~');
                        var newFriendData = {};
                        newFriendData.IsRegistered = IsRegistered;
                        if ( IsRegistered ) {
                            newFriendData.ID = frndData._id;
                            newFriendData.Pic =  frndData.ProfilePic;
                            newFriendData.NickName =  frndData.NickName;
                        }

                        newFriendData.Email = email;
                        newFriendData.Name = IsRegistered ? frndData.Name : name;
                        newFriendData.Relation =  rel[0].trim();
                        newFriendData.RelationID =  rel[1].trim();

                        var friendship = new friend();
                        friendship.UserID = req.session.user._id;
                        friendship.Friend = newFriendData;
                        friendship.Status = 1;
                        friendship.IsDeleted = 0;
                        friendship.CreatedOn = Date.now();
                        friendship.ModifiedOn = Date.now();
                        friendship.save(function(err,data){
                            if (err) {
                                res.json(err);
                            }else{
                                res.json({'code':200,msg:'data saved'});
                            }
                        });
                    }else{
                        console.log('already friend');
                        res.json({'code':400,msg:'Already a friend'});
                    }
                }
            });

        }
    })
};
exports.addFriend_INTERNAL_API = addFriend_INTERNAL_API;



/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		removeFriend
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var removeFriend = function(req,res){
    friend.find({'UserID': req.session.user._id,'Friend.Email':{ $regex : new RegExp(req.body.email, "i") },Status:1,IsDeleted:0},function(err,data){
        if (err) {
            res.json({'code':400,'error':err});
        }else{
            console.log('here');
            if (data.length>0) {
                //return 'friends';
                friend.update({UserID: req.session.user._id , 'Friend.Email':{ $regex : new RegExp(req.body.email, "i") },IsDeleted:0},{$set:{IsDeleted:1,ModifiedOn:Date.now()}},{upsert:false},function(err,numAffected){
                    if (err) {
                        res.json({'code':400,'error':err});
                    }else{
                        group.update({OwnerID:req.session.user._id},{$pull:{Members:{MemberEmail:{$regex: new RegExp(req.body.email,"i")}}}},{multi:true},function(err,numAffected){
                            if (err) {
                                res.json({'code':400,'error1':err});
                            }else{
                                res.json({'code':200,msg:'friend removed sucessfully!!', num:numAffected});
                                /*
                                if (numAffected>0) {
                                    res.json({'code':200,msg:'friend removed sucessfully!!', num:numAffected});
                                }else{
                                    res.json({'code':401,msg:'Opps!! Something went wrong', num:numAffected});
                                }
                                */
                            }
                        });
                    }
                })
            }else{
                //return 'not friends';
                res.json({'code':401,msg:'Opps!! Something went wrong'});
            }
        }
    })
}
exports.removeFriend = removeFriend;




/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		addNewMember
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var addNewMember = function(req,res){
    if (checkFriendship(req.body.email) != 'friends') {

    }
}
exports.addNewMember = addNewMember;


/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		allFriends
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

const allFriends = async function(req,res){
    try {
        // Validate session
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.json({'code': 401, 'error': 'User not authenticated'});
        }

        const data = await friend.find({
            UserID: req.session.user._id,
            Status: 1,
            IsDeleted: 0
        }).exec();

        res.json({'code': 200, 'friends': data});
        
    } catch (error) {
        console.error('Error in allFriends:', error);
        res.json({'code': 400, 'error': error.message});
    }
}
exports.allFriends = allFriends;



/*________________________________________________________________________
   * @Date:      		29 Sep 2015
   * @Method :   		allFriendsPaginated
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
/*
var allFriendsPaginated = function(req,res){
    var perPage = req.body.perPage ? req.body.perPage : 40 ;
    var pageNo = req.body.pageNo ? req.body.pageNo : 1 ;
    var offset = perPage * ( pageNo-1 );
    console.log('Offset ---------' + offset);
    friend.find({UserID:req.session.user._id,Status:1,IsDeleted:0}).skip(offset).limit(perPage).exec(function(err,data1){
        if (err) {
                res.json({'code':400,'error':err});
            }else{
                console.log('---------------------------------------------------------');
                console.log('data1 outside');
                console.log('---------------------------------------------------------');
                console.log(data1.length);
                console.log('---------------------------------------------------------');
                friend.find({UserID:req.session.user._id,Status:1,IsDeleted:0},function(err,data2){
                    if (err) {
                        res.json({'code':400,'error':err});
                    }else{
                        res.json({'code':200,'friends':data1 , total : data2.length});
                    }
                })
            }
    })
}
*/
const allFriendsPaginated = async function(req, res) {
    try {
        // Validate session
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.json({'code': 401, 'error': 'User not authenticated'});
        }

        const perPage = req.body.perPage ? req.body.perPage : 40;
        const pageNo = req.body.pageNo ? req.body.pageNo : 1;
        const offset = perPage * (pageNo - 1);
        
        const conditions = {
            UserID: req.session.user._id,
            Status: 1,
            IsDeleted: 0
        };

        if (req.body.startsWith != undefined && req.body.startsWith != "") {
            conditions['Friend.Name'] = new RegExp("^" + req.body.startsWith, 'i');
        }

        // Get paginated friends and total count in parallel
        const [data1, data2Length] = await Promise.all([
            friend.find(conditions).skip(offset).limit(perPage).exec(),
            friend.countDocuments(conditions).exec()
        ]);

        console.log('---------------------------------------------------------');
        console.log('data1 outside');
        console.log('---------------------------------------------------------');
        console.log(data1.length);
        console.log('---------------------------------------------------------');

        res.json({'code': 200, 'friends': data1, total: data2Length});

    } catch (error) {
        console.error('Error in allFriendsPaginated:', error);
        res.json({'code': 400, 'error': error.message});
    }
}
exports.allFriendsPaginated = allFriendsPaginated;



/*________________________________________________________________________
   * @Date:      		29 Sep 2015
   * @Method :   		excludeMembers
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var excludeMembers = function(req,res){
    var perPage = req.body.perPage ? req.body.perPage : 40 ;
    var pageNo = req.body.pageNo ? req.body.pageNo : 1 ;
    var offset = perPage * ( pageNo-1 );
    var emails = req.body.emails ? req.body.emails : [] ;
    var emailRegEx = [];
    for(var i = 0 ; i< emails.length ; i++){
        emailRegEx.push( new RegExp('^'+emails[i]+'$' , 'i'))
    }
    console.log('emailRegEx ---------' + emailRegEx);
    friend.find({ UserID : req.session.user._id , Status : 1 , IsDeleted : 0 , 'Friend.Email' :{$nin:emailRegEx}}).skip(offset).limit(perPage).exec(function(err,data1){
        if (err) {
                res.json({'code':400,'error':err});
            }else{
                console.log('---------------------------------------------------------');
                console.log('data1 outside');
                console.log('---------------------------------------------------------');
                console.log(data1.length);
                console.log('---------------------------------------------------------');
                friend.find({ UserID : req.session.user._id , Status : 1 , IsDeleted : 0 , 'Friend.Email' :{$nin:emailRegEx}},function(err,data2){
                    if (err) {
                        res.json({'code':400,'error':err});
                    }else{
                        res.json({'code':200,'friends':data1 , total : data2.length});
                    }
                })
            }
    })
}
exports.excludeMembers = excludeMembers;

/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		allFriendsStartingWith
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var allFriendsStartingWith = function(req,res){
    var regex = new RegExp('\s*\s*^\s*\s*'+req.body.startsWith,'i');
	console.log(regex);

    friend.find( { UserID : req.session.user._id, Status : 1, IsDeleted : 0 , 'Friend.Name' : regex} ,function(err,data){
        if (err) {
            res.json({'code':400,'error':err});
        }else{
            res.json({'code':200,'friends':data});
        }
    })
}
exports.allFriendsStartingWith = allFriendsStartingWith;

var editFriend = function (req, res) {
    console.log("Inside Edit Friend Function - - - >", req.body);
//    return;
    var UserID = req.session.user._id;
    var Name = req.body.name ? req.body.name : "";
	var loggedInUserEmail = req.session.user.Email ? req.session.user.Email : "";

    friend.find({'UserID': req.session.user._id, 'Friend.Email': {$regex: new RegExp(req.body.email, "i")}, Status: true, IsDeleted: false}, function (err, data) {
        if (err) {
            res.json({'code': 400, 'error': err});
        } else {
            friend.find({_id: req.body._id, IsDeleted: false}, function (err, frienddata) {
                if (!err) {
                    var oldEmail = "";
                    var newEmail = req.body.email ? req.body.email : "";
                    if (frienddata.length) {
                        frienddata[0].Friend = frienddata[0].Friend ? frienddata[0].Friend : {};
                        oldEmail = frienddata[0].Friend.Email ? frienddata[0].Friend.Email : "";
                    } else {

                    }

                    console.log("Find Query Data = = = >", data, oldEmail, data.length, newEmail)
                    if (oldEmail != newEmail && data.length > 0) {
                        console.log("* * * inside match email * * * ")
                        res.json({'code': 401, msg: 'Opps!! Email id already exists'});
                    }
					else if(newEmail == loggedInUserEmail){
						res.json({'code': 402, msg: 'You can not add yourself as your friend.'});
					}
					else {
                        console.log("* * * else * * * ")

                        var rel = req.body.relation;
                        rel = rel.split('~');

                        console.log("Frnd Data 3 = = = >", oldEmail);

                        var Relation = rel[0].trim();
                        var RelationID = rel[1].trim();

                        friend.update({UserID: req.session.user._id, _id: req.body._id, IsDeleted: false}, {$set: {'Friend.Name': Name, 'Friend.Email': newEmail, 'Friend.Relation': Relation, 'Friend.RelationID': RelationID}}, {upsert: false}, function (err, numAffected) {
                            if (err) {
                                res.json({'code': 400, 'error': err});
                            } else {
                                SyncFriendsData__InMyGroups(UserID, oldEmail, newEmail, Name, Relation, RelationID);
                                res.json({'code': 200, msg: 'Friend edited sucessfully!!'});
                            }
                        })
                    }

                } else {
                    res.json({'code': 400, 'error': err});
                }
            })
        }
    })
}
exports.editFriend = editFriend;

function SyncFriendsData__InMyGroups(OwnerID, currentemail, newemail, Name, Relation, RelationID) {
    group.update({"OwnerID": OwnerID, "Members.MemberEmail": currentemail}, {$set: {"Members.$.MemberEmail": newemail, 'Members.$.MemberName': Name, 'Members.$.MemberRelation': Relation, 'Members.$.MemberRelationID': RelationID}}, function (err, numAffected) {
        if (err) {
			console.log("ERROR.....",err);
            //return false;
        } else {
            console.log("----------------------Group updated.....",numAffected);
			//return true;
        }
    });
}

function addFolder(req, res){
        var fs = require('fs');
        var dir = './playList_'+req.session.user._id;

        if (!fs.existsSync(dir)){

            if(fs.mkdirSync(dir)){

                 res.json({'code': 200, msg: 'FolderCreated!!'});
            }else{
                 console.log('---------------------No');
                res.json({'code': 400, msg: 'Error occured!!'});
            }

        }else{
            res.json({'code': 200, msg: 'Folder Already Created!!'});
        }
}

exports.addFolder = addFolder;

function addAudioFile(req,res,fileType){

    fs = require('fs'),
    sys = require('sys'),
    exec = require('child_process').exec;

    var dir = process.urls.__MUSIC_LIB_DIR;

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    var formidable = require('formidable');
    console.log('========================================= here =========================================')
    var form = new formidable.IncomingForm();
    form.keepExtensions = true;     //keep file extension
    //form.uploadDir = (__dirname+"/../../playList_"+req.session.user._id);       //set upload directory

    //var path = './playList_'+req.session.user._id;
    var path = process.urls.__MUSIC_LIB_DIR;

    form.keepExtensions = true;     //keep file extension
    // var isLimitReached = checkLimitReached(req.session.user._id);
    var totalBytes = 0;


    var conditions = {
       UserId : req.session.user._id,
       IsDeleted:0
    }

    musicLibObj.find(conditions,function(err,data) {
		if (err) {
			res.json({"code": "404", "message": err});
		}
		else {
			console.log(data);
			data.forEach(function(item) {
				totalBytes += parseInt(item.Bytes);
			});
			if(totalBytes < process.perUserSpace){
				form.parse(req, function(err, fields, files) {
					var temp = files.file.name.split('.');
					var ext = temp.pop();
					var fileName = "Track_" +Date.now()+"." + ext;

					fs.rename(files.file.path, path+"/"+ fileName, function(err) {
						if (err){
								res.json(err);
						}
						else {
							var track = temp[0];
							var stats = fs.statSync(path+'/'+fileName);
							var size = stats["size"];

							var musicLibSaveObj = {};
							mp3Duration(path+'/'+fileName, function (err, duration) {
								if (err) {
								   console.log(err.message);
								}else{
									var duration = duration;
									musicLibSaveObj.Duration = duration;
									musicLibSaveObj.Filename = fileName;
									musicLibSaveObj.UserId = req.session.user._id;
									musicLibSaveObj.Bytes = size;
									musicLibSaveObj.Track = track;

									musicLibObj(musicLibSaveObj).save(function(err,data) {
										if (err) {
											res.json({"code": "404", "message": err});
										}
										else {
											res.json({'code': 200, msg: 'Audio file has been added successfully.'});
										}
									})
								}
							});
							Audio__ConvertToMP3_N_OGG(fileName , path)
						}
					});
				});
			}else{
				res.json({'code': 200, msg: 'User audio storage limit reached.'});
			}
		}
    });
}

exports.addAudioFile = addAudioFile;


function fetchAudioFiles(req,res){
    var offset = req.body.offset ? req.body.offset : 0;
    var limit = req.body.limit ? req.body.limit : 10;

	var totalBytes = 0;
    var conditions = {
       UserId : req.session.user._id,
       IsDeleted:0
    }
    var sortObj = {CreatedOn : 1};

	musicLibObj.find(conditions , {}).sort(sortObj).skip(offset).limit(limit).exec(function(err,data) {
		if (err) {
			res.json({"code": "404", "message": err});
		}
		else {
			musicLibObj.aggregate([
				{$match : {UserId : mongoose.Types.ObjectId(req.session.user._id) , IsDeleted : 0}},
				{$group : {_id:null, count : {$sum : 1}, BytesCount : {$sum : "$Bytes"}}}
			],function(err,dataAgg){
				if (err) {
					res.json({"code": "404", "message": err});
				}
				else {
					if(dataAgg.length){
						res.json(
							{
								code: 200,
								msg: 'Audio listing...',
								totalBytes : parseInt(dataAgg[0].BytesCount),
								count : parseInt(dataAgg[0].count),
								result : data
							}
						);
					}
					else{
						res.json(
							{
								code: 200,
								msg: 'Audio listing...',
								totalBytes : 0,
								count : 0,
								result : data
							}
						);
					}
				}
			});
		}
    });
}

exports.fetchAudioFiles = fetchAudioFiles;


function fetchAllAudioFiles(req,res){
    //var offset = req.body.offset ? req.body.offset : 0;
    //var limit = req.body.limit ? req.body.limit : 10;

	var totalBytes = 0;
    var conditions = {
       UserId : req.session.user._id,
       IsDeleted:0
    }
    var sortObj = {CreatedOn : 1};

	musicLibObj.find(conditions , {}).sort(sortObj).exec(function(err,data) {
		if (err) {
			res.json({"code": "404", "message": err});
		}
		else {
			musicLibObj.aggregate([
				{$match : {UserId : mongoose.Types.ObjectId(req.session.user._id) , IsDeleted : 0}},
				{$group : {_id:null, count : {$sum : 1}, BytesCount : {$sum : "$Bytes"}}}
			],function(err,dataAgg){
				if (err) {
					res.json({"code": "404", "message": err});
				}
				else {
					if(dataAgg.length){
						res.json(
							{
								code: 200,
								msg: 'Audio listing...',
								totalBytes : parseInt(dataAgg[0].BytesCount),
								count : parseInt(dataAgg[0].count),
								result : data
							}
						);
					}
					else{
						res.json(
							{
								code: 200,
								msg: 'Audio listing...',
								totalBytes : 0,
								count : 0,
								result : data
							}
						);
					}
				}
			});
		}
    });
}
exports.fetchAllAudioFiles = fetchAllAudioFiles;

function delAudio(req,res){
    var id = req.body.id;
    var fs = require('fs');

	musicLibObj.update({'_id':id},{$set:{'IsDeleted':1, ModifiedOn : Date.now()}},function(err,data) {
		if (err) {
			res.json({"code": "404", "message": err});
		}
		else {
			 res.json({'code': 200, msg: 'Deleted!!'});

		}
    });
}
exports.delAudio = delAudio;


function Audio__ConvertToMP3_N_OGG(inputFile , path){
	if(inputFile){
		var outputFile = '';
		var extension = '';
		extension = inputFile.split('.').pop();
		extensionUpper = extension.toUpperCase();

		switch( extensionUpper ){
			case 'OGG':
				outputFile = inputFile.replace('.'+extension,'.mp3');
				__convertAudio( inputFile , outputFile , path);
				break;

			case 'MP3':
				//no need to convert
				outputFile = inputFile.replace('.'+extension,'.ogg');
				__convertAudio( inputFile , outputFile , path);
				break;

			default:
				console.log("------Unknown extension found = ",extension);
				if( extension != '' && extension != null  ){
					outputFile = inputFile.replace('.'+extension,'.ogg');
					__convertAudio( inputFile , outputFile , path);
				}
				break;
		}
	}
	return;
}


function __convertAudio(inputFile , outputFile , path){

	var util = require('util'),
	exec = require('child_process').exec;

	var command = "ffmpeg -fflags +genpts -i " + path+'/'+inputFile + " -r 24 "+path+'/'+ outputFile;

	exec(command, function (error, stdout, stderr) {
		if (stdout) console.log(stdout);
		if (stderr) console.log(stderr);

		if (error) {
			console.log('exec error: ' + error);
		} else {
			console.log("==========Successfully converted from "+inputFile+" to "+outputFile);
		}
	});

}

function updateTrackName(req,res){
    var fs = require('fs');
    var ffmetadata = require("ffmetadata");
    var audioName = req.body.audioName;
    var id = req.body.id;

	musicLibObj.update({'_id':id},{$set:{'Track':audioName, ModifiedOn : Date.now()}},function(err,data) {
		if (err) {
			res.json({"code": "404", "message": err});
		}
		else {
		   res.json({'code': 200, msg: 'Track name has been changes successfully'});

		}
	});
}
exports.updateTrackName = updateTrackName;

var searchUsers = function(req, res) {
    var perPage = req.body.perPage ? req.body.perPage : 50;
    var pageNo = req.body.pageNo ? req.body.pageNo : 1;
    var offset = perPage * (pageNo - 1);
    var startWith = req.body.startsWith ? req.body.startsWith : null;
    var conditions = {
        //Status: 1,
        IsDeleted: 0
    }

	var fields = {
		Name : 1,
		Email : 1,
		ProfilePic : 1
	};

    if (startWith) {	//this is for auto-complete-members & auto-complete-owner directive search.
        conditions['Name'] = new RegExp("^" + startWith, 'i');
    }

    user.find(conditions, fields).skip(offset).limit(perPage).lean().exec(function(err, users) {
        if (err) {
            res.json({'code': 400, 'error': err});
        } else {
			users = users ? users : [];
			var results = [];
			for(var i = 0; i < users.length; i++) {
				results.push(
					{
						Name : users[i].Name,
						Email : users[i].Email,
						Pic : users[i].ProfilePic,
					}
				)
			}
            res.json({'code': 200, 'friends': results});
        }
    })
}
exports.searchUsers = searchUsers;

// Accept friend request from non-registered user
const acceptFriendRequest = async function(req, res) {
    try {
        // Validate session
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.json({'code': 401, 'error': 'User not authenticated'});
        }

        const { friendEmail } = req.body;
        
        if (!friendEmail) {
            return res.json({'code': 400, 'error': 'Friend email is required'});
        }

        // Find pending friend request
        const pendingRequest = await friend.findOne({
            'UserID': req.session.user._id,
            'Friend.Email': { $regex: new RegExp(friendEmail, "i") },
            Status: 0, // Pending
            IsDeleted: 0
        }).exec();

        if (!pendingRequest) {
            return res.json({'code': 404, 'error': 'No pending friend request found'});
        }

        // Update status to accepted
        await friend.updateOne(
            { _id: pendingRequest._id },
            { 
                $set: { 
                    Status: 1, // Accepted
                    ModifiedOn: Date.now()
                }
            }
        );

        res.json({'code': 200, 'msg': 'Friend request accepted'});
        
    } catch (error) {
        console.error('Error in acceptFriendRequest:', error);
        res.json({'code': 400, 'error': error.message});
    }
};

// Decline friend request
const declineFriendRequest = async function(req, res) {
    try {
        // Validate session
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.json({'code': 401, 'error': 'User not authenticated'});
        }

        const { friendEmail } = req.body;
        
        if (!friendEmail) {
            return res.json({'code': 400, 'error': 'Friend email is required'});
        }

        // Find pending friend request
        const pendingRequest = await friend.findOne({
            'UserID': req.session.user._id,
            'Friend.Email': { $regex: new RegExp(friendEmail, "i") },
            Status: 0, // Pending
            IsDeleted: 0
        }).exec();

        if (!pendingRequest) {
            return res.json({'code': 404, 'error': 'No pending friend request found'});
        }

        // Soft delete the request
        await friend.updateOne(
            { _id: pendingRequest._id },
            { 
                $set: { 
                    IsDeleted: 1,
                    ModifiedOn: Date.now()
                }
            }
        );

        res.json({'code': 200, 'msg': 'Friend request declined'});
        
    } catch (error) {
        console.error('Error in declineFriendRequest:', error);
        res.json({'code': 400, 'error': error.message});
    }
};

// Get pending friend requests
const getPendingFriendRequests = async function(req, res) {
    try {
        // Validate session
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.json({'code': 401, 'error': 'User not authenticated'});
        }

        const pendingRequests = await friend.find({
            'UserID': req.session.user._id,
            Status: 0, // Pending
            IsDeleted: 0
        }).exec();

        res.json({
            'code': 200, 
            'msg': 'Pending friend requests retrieved',
            'requests': pendingRequests
        });
        
    } catch (error) {
        console.error('Error in getPendingFriendRequests:', error);
        res.json({'code': 400, 'error': error.message});
    }
};

// Send invitation email (placeholder function)
const sendInvitationEmail = async function(recipientEmail, recipientName, inviterName, inviterEmail) {
    console.log('📧 [sendInvitationEmail] START');
    console.log('📧 [sendInvitationEmail] Recipient:', recipientEmail);
    console.log('📧 [sendInvitationEmail] Recipient Name:', recipientName);
    console.log('📧 [sendInvitationEmail] Inviter:', inviterName, inviterEmail);
    
    try {
        // Get email template from database
        const emailTemplateCondition = { name: "Friend__Invitation" };
        const emailTemplates = await EmailTemplate.find(emailTemplateCondition, {}).exec();
        
        if (!emailTemplates || emailTemplates.length === 0) {
            console.log('⚠️ [sendInvitationEmail] No email template found for "Friend__Invitation"');
            console.log('📧 [sendInvitationEmail] Using default email content');
            
            // Use default email if template not found
            const defaultSubject = `${inviterName} wants to connect with you on CollabMedia`;
            const defaultHtml = `
                <html>
                <body>
                    <p>Hi ${recipientName || 'there'}!</p>
                    <p>${inviterName} has added you as a friend on CollabMedia and would like to connect with you.</p>
                    <p>To accept this friend request and join CollabMedia, please sign up using this email address.</p>
                    <p>Best regards,<br>The CollabMedia Team</p>
                </body>
                </html>
            `;
            
            return await sendEmailDirectly(recipientEmail, defaultSubject, defaultHtml, inviterEmail);
        }
        
        // Use template from database
        const template = emailTemplates[0];
        let emailSubject = template.subject || `${inviterName} wants to connect with you`;
        let emailHtml = template.description || '';
        
        // Replace template variables
        emailSubject = emailSubject
            .replace(/{InviterName}/g, inviterName)
            .replace(/{RecipientName}/g, recipientName || 'there');
        
        emailHtml = emailHtml
            .replace(/{InviterName}/g, inviterName)
            .replace(/{RecipientName}/g, recipientName || 'there')
            .replace(/{InviterEmail}/g, inviterEmail);
        
        console.log('📧 [sendInvitationEmail] Using email template from database');
        return await sendEmailDirectly(recipientEmail, emailSubject, emailHtml, inviterEmail);
        
    } catch (error) {
        console.error('❌ [sendInvitationEmail] Error:', error);
        console.error('❌ [sendInvitationEmail] Error stack:', error.stack);
        return { 
            success: false, 
            error: error.message 
        };
    }
};

const sendEmailDirectly = async function(toEmail, subject, htmlContent, replyToEmail) {
    console.log('📧 [sendEmailDirectly] Preparing to send email...');
    
    try {
        // Get SMTP configuration
        const smtpConfig = process.EMAIL_ENGINE?.info?.smtpOptions;
        const senderLine = process.EMAIL_ENGINE?.info?.senderLine;
        
        if (!smtpConfig) {
            console.error('❌ [sendEmailDirectly] SMTP configuration not found');
            console.error('❌ [sendEmailDirectly] process.EMAIL_ENGINE:', !!process.EMAIL_ENGINE);
            return { 
                success: false, 
                error: 'SMTP configuration missing. Please check EMAIL_ENGINE configuration.' 
            };
        }
        
        console.log('✅ [sendEmailDirectly] SMTP config found');
        console.log('📧 [sendEmailDirectly] Sender:', senderLine);
        
        // Create transporter
        const transporter = nodemailer.createTransport({
            ...smtpConfig,
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            logger: false,
            debug: process.env.NODE_ENV === 'development'
        });
        
        // Verify SMTP connection
        try {
            await transporter.verify();
            console.log('✅ [sendEmailDirectly] SMTP connection verified');
        } catch (verifyError) {
            console.error('⚠️ [sendEmailDirectly] SMTP verification failed, proceeding anyway:', verifyError.message);
        }
        
        // Prepare email
        const mailOptions = {
            from: senderLine,
            to: toEmail,
            replyTo: replyToEmail,
            subject: subject,
            html: htmlContent,
            text: htmlContent.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n') // Simple HTML to text conversion
        };
        
        console.log('📧 [sendEmailDirectly] Sending email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ [sendEmailDirectly] Email sent successfully!');
        console.log('   - To:', toEmail);
        console.log('   - Message ID:', info.messageId);
        console.log('   - Response:', info.response);
        
        // Close transporter
        transporter.close();
        
        return { 
            success: true, 
            messageId: info.messageId,
            recipient: toEmail 
        };
        
    } catch (error) {
        console.error('❌ [sendEmailDirectly] Error sending email:', error);
        console.error('   - Recipient:', toEmail);
        console.error('   - Error message:', error.message);
        console.error('   - Error stack:', error.stack);
        
        return { 
            success: false, 
            error: error.message,
            recipient: toEmail 
        };
    }
};

// Export all functions at the end
exports.acceptFriendRequest = acceptFriendRequest;
exports.declineFriendRequest = declineFriendRequest;
exports.getPendingFriendRequests = getPendingFriendRequests;