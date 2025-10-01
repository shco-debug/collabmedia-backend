var user = require('./../models/userModel.js');
var group = require('./../models/groupModel.js');
var friend = require('./../models/friendsModel.js');
var fs = require('fs');
var formidable = require('formidable');
var mediaController = require('./../controllers/mediaController.js');


function checkFriendship(req,email,name,relation,IsRegistered){
    console.log('🤝 checkFriendship called');
    console.log('   - Email:', email);
    console.log('   - Name:', name);
    console.log('   - Relation:', relation);
    console.log('   - IsRegistered:', IsRegistered);
    console.log('   - UserID from session:', req.session?.user?._id || 'undefined');
    
    if (!req.session || !req.session.user || !req.session.user._id) {
        console.error('❌ checkFriendship: req.session.user._id is missing!');
        return;
    }
    
    friend.find({'UserID': req.session.user._id,'Friend.Email':email,Status:1,IsDeleted:0})
        .then((data) => {
            console.log('here');
            if (data.length > 0) {
                console.log('already friends');
                return null; // Already friends, no need to add
            } else {
                console.log('adding a friend');
                return user.findOne({Email:{ $regex : new RegExp(email, "i") }});
            }
        })
        .then((frndData) => {
            if (frndData === null) return; // Already friends case
            
            var rel = relation ? relation.split('~') : ['Friend', 'default'];
            console.log('saving data');
            var newFriendData = {};
            if (IsRegistered && frndData) {
                newFriendData.ID = frndData._id;
                newFriendData.NickName = frndData.NickName;
                newFriendData.Pic = frndData.ProfilePic;
            }
            
            newFriendData.IsRegistered = IsRegistered;
            newFriendData.Email = email;
            newFriendData.Name = name;
            
            newFriendData.Relation = rel[0].trim();
            newFriendData.RelationID = rel[1].trim();
            console.log('--------------------------------------------------------');
            console.log(newFriendData);
            console.log('--------------------------------------------------------');
            
            var friendship = new friend();
            friendship.UserID = req.session.user._id;
            friendship.Friend = newFriendData;
            friendship.Status = 1;
            friendship.IsDeleted = 0;
            friendship.CreatedOn = Date.now();
            friendship.ModifiedOn = Date.now();
            
            return friendship.save();
        })
        .then((data) => {
            if (data) {
                console.log('data saved');
            }
        })
        .catch((err) => {
            console.log('Error in checkFriendship:', err);
        });
}


/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		getAll
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var getAll = function(req,res){
    group.find({OwnerID:req.session.user._id,IsDeleted:0})
        .then((data) => {
            res.json({'code':200,'groups':data});
        })
        .catch((err) => {
            res.json({'code':400,'error':err});
        });
}
exports.getAll = getAll;



/*________________________________________________________________________
   * @Date:      		29 sep 2015
   * @Method :   		getAllPaginated
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var getAllPaginated = function(req,res){
    var perPage = req.body.perPage ? req.body.perPage : 40 ;
    var pageNo = req.body.pageNo ? req.body.pageNo : 1 ;
    var offset = perPage * ( pageNo-1 );
    
    group.find({OwnerID:req.session.user._id,IsDeleted:0}).sort({CreatedOn: 'desc'}).skip(offset).limit(perPage).exec()
        .then((data1) => {
            return group.find({OwnerID:req.session.user._id,IsDeleted:0}).then((data2) => {
                return { data1, data2 };
            });
        })
        .then(({ data1, data2 }) => {
            res.json({'code':200,'groups':data1 ,'total' : data2.length});
        })
        .catch((err) => {
            res.json({'code':400,'error':err});
        });
}
exports.getAllPaginated = getAllPaginated;





/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		addGroup
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

const addGroup = async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.title || !req.body.title.trim()) {
            return res.status(400).json({
                code: 400,
                message: 'Group title is required'
            });
        }

        // Check if user is authenticated
        if (!req.session.user || !req.session.user._id) {
            return res.status(401).json({
                code: 401,
                message: 'User authentication required'
            });
        }

        const { title } = req.body;
        const ownerId = req.session.user._id;

        // Check if group with same name already exists (case-insensitive)
        const existingGroup = await group.findOne({
            OwnerID: ownerId,
            Title: { $regex: new RegExp(`^${title.trim()}$`, 'i') },
            IsDeleted: 0
        });

        if (existingGroup) {
            return res.status(409).json({
                code: 409,
                message: 'A group with the same name already exists'
            });
        }

        // Create new group
        const newGroup = new group({
            Title: title.trim(),
            OwnerID: ownerId,
            Status: 1,
            IsDeleted: 0,
            CreatedOn: new Date(),
            ModifiedOn: new Date(),
            Members: []
        });

        // Save the group
        const savedGroup = await newGroup.save();

        res.status(201).json({
            code: 200,
            message: 'Group created successfully',
            data: savedGroup
        });

    } catch (error) {
        console.error('Error in addGroup:', error);
        res.status(500).json({
            code: 500,
            message: 'Internal server error',
            error: error.message
        });
    }
};
exports.addGroup = addGroup;


/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		removeGroup
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var removeGroup = function(req,res){
    group.findOne({_id:req.body.id})
        .then((data) => {
            if (data) {
                data.IsDeleted = 1;
                return data.save();
            } else {
                res.json({'code':404,'error':'group not found'});
                return null;
            }
        })
        .then((data1) => {
            if (data1) {
                res.json({'code':200,'msg':'group deleted .'});
            }
        })
        .catch((err) => {
            res.json({'code':400,'error':err});
        });
}
exports.removeGroup = removeGroup;


/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		addMember
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var addMember = function(req,res){
    console.log('🔍 addMember called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 req.session:', req.session ? 'exists' : 'undefined');
    console.log('👤 req.session.user:', req.session?.user ? JSON.stringify(req.session.user) : 'undefined');
    console.log('👤 req.user:', req.user ? JSON.stringify(req.user) : 'undefined');
    
    let IsRegistered = false;
    let member = {};
    let responseAlreadySent = false;
    
    console.log('🔍 Searching for group with ID:', req.body.id);
    group.findOne({_id:req.body.id})
        .then((data) => {
            console.log('✅ Group found:', data ? 'Yes' : 'No');
            if (data) {
                console.log('📊 Group details:', { _id: data._id, Title: data.Title, Members: data.Members.length });
                console.log('🔍 Searching for user with email:', req.body.email);
                return user.findOne({Email:{ $regex : new RegExp(req.body.email, "i") }});
            } else {
                console.log('❌ Group not found with ID:', req.body.id);
                responseAlreadySent = true;
                res.json({'code':402,'error':"group not found"});
                throw new Error('GROUP_NOT_FOUND'); // Stop promise chain
            }
        })
        .then((user1) => {
            console.log('📥 Received user1:', user1 === null ? 'null' : (user1 === undefined ? 'undefined' : 'exists'));
            
            console.log('✅ User search result:', user1 ? 'Found - User is registered' : 'Not found - User not registered');
            if (user1) {
                console.log('📊 User details:', { _id: user1._id, Email: user1.Email, Name: user1.Name });
                IsRegistered = true;
            } else {
                console.log('⚠️ User not registered in system - will add as unregistered member');
                IsRegistered = false;
            }
            
            console.log('🔍 Checking if already a member...');
            return group.find({_id:req.body.id,Members:{$elemMatch:{MemberEmail:{$regex: new RegExp(req.body.email,"i")}}}});
        })
        .then((data) => {
            console.log('📥 Received member check data:', data ? `Array with ${data.length} results` : 'undefined');
            
            if (data === undefined) {
                console.log('❌ Member check returned undefined - should not happen');
                responseAlreadySent = true;
                res.json({'code':500,'error':"Unexpected error in member check"});
                throw new Error('MEMBER_CHECK_UNDEFINED');
            }
            
            console.log('📊 Member check result:', data.length === 0 ? 'Not a member' : 'Already a member');
            
            if (data.length == 0) {
                console.log('✅ User is not a member, proceeding to add...');
                
                // Build relation string for checkFriendship
                var relationForFriend = req.body.relationshipId 
                    ? `Friend~${req.body.relationshipId}`
                    : (req.body.relation || 'Friend~default');
                
                console.log('🤝 Calling checkFriendship with relation:', relationForFriend);
                
                // Call checkFriendship asynchronously (don't block)
                checkFriendship(req, req.body.email, req.body.name, relationForFriend, IsRegistered);
                
                console.log('🔍 Fetching user data again for member creation...');
                return user.findOne({Email:{ $regex : new RegExp(req.body.email, "i") }});
            } else {
                console.log('❌ User is already a member of this group');
                responseAlreadySent = true;
                res.json({'code':401,'error':"Already a member"});
                throw new Error('ALREADY_MEMBER');
            }
        })
        .then((frndData) => {
            console.log('📥 Received frndData for member creation:', frndData ? 'exists' : (frndData === null ? 'null' : 'undefined'));
            
            // Handle both old format (relation: "Name~ID") and new format (relationshipId)
            var relationName = "Friend";
            var relationID = "default";
            
            if (req.body.relationshipId) {
                // New format: use relationshipId directly
                relationID = req.body.relationshipId;
                relationName = req.body.relationshipTitle || "Friend";
                console.log('📋 Using new format - relationshipId:', relationID, 'title:', relationName);
            } else if (req.body.relation) {
                // Old format: parse "Name~ID"
                var rel = req.body.relation.split('~');
                relationName = rel[0].trim();
                relationID = rel[1].trim();
                console.log('📋 Using old format - relation:', relationName, 'ID:', relationID);
            }
            
            member.IsRegistered = IsRegistered;
            if (IsRegistered && frndData) {
                member.MemberID = frndData._id;
                member.MemberNickName = frndData.NickName;
                member.MemberPic = frndData.ProfilePic;
            }
            member.MemberEmail = IsRegistered && frndData ? frndData.Email : req.body.email;
            member.MemberName = IsRegistered && frndData ? frndData.Name : req.body.name;
            member.MemberRelation = relationName;
            member.MemberRelationID = relationID;
            
            console.log('👥 Member object to add:', JSON.stringify(member, null, 2));
            console.log('🚀 Updating group with new member...');
            
            return group.updateOne({_id:req.body.id},{$push:{Members:member}});
        })
        .then((data) => {
            if (data !== undefined && data !== null) {
                console.log('✅ Member added successfully:', data);
                data.member = member;
                res.json({'code':200,'data':data});
            } else {
                console.log('⚠️ Update result was null or undefined');
                if (!responseAlreadySent) {
                    res.json({'code':500,'error':"Failed to update group"});
                }
            }
        })
        .catch((err) => {
            console.error('❌ Error in addMember:', err);
            console.error('Error stack:', err.stack);
            
            // Only send response if not already sent
            if (!responseAlreadySent) {
                // Check for specific error types
                if (err.message === 'GROUP_NOT_FOUND' || err.message === 'ALREADY_MEMBER' || err.message === 'MEMBER_CHECK_UNDEFINED') {
                    // Response already sent in .then() blocks
                    return;
                }
                res.json({'code':400,'error':"mongo error", 'details': err.message});
            }
        });
}
/*
var addMember = function(req,res){
    group.findOne({_id:req.body.id},function(err,data){
        if (err) {
            res.json({'code':400,'error':"mongo error1"});
        }else{
            if (data) {
                user.findOne({Email:{ $regex : new RegExp(req.body.email, "i") }},function(err,user1){
                    if (err ) {
                        res.json({'code':400,'error':"mongo error4"});
                    }else{
                        if (user1) {
                            group.find({_id:req.body.id,Members:{$elemMatch:{MemberEmail:{$regex: new RegExp(req.body.email,"i")}}}},function(err,data){
                                if (err) {
                                    throw err;
                                    res.json({'code':400,'error':err});
                                }else{
                                    if (data.length == 0) {
                                        checkFriendship(req,req.body.email,req.body.name,req.body.relation);
                                        user.findOne({Email:{ $regex : new RegExp(req.body.email, "i") }},function(err,frndData){
                                            var rel = req.body.relation;
                                            rel = rel.split('~');
                                            var member = {};
                                            member.MemberID = frndData._id;
                                            member.MemberEmail = frndData.Email;
                                            member.MemberName = req.body.name;
                                            member.MemberNickName = frndData.NickName;
                                            member.MemberPic = frndData.ProfilePic;
                                            member.MemberRelation = rel[0].trim();
                                            member.MemberRelationID = rel[1].trim();
                                            
                                            group.update({_id:req.body.id},{$push:{Members:member}},{multi:false},function(err,data){
                                                if (err) {
                                                    res.json({'code':400,'error':"mongo error3"});
                                                }else{
                                                    res.json({'code':200,'data':data});
                                                }
                                            })
                                        })
                                    }else{
                                        res.json({'code':401,'error':"Already a member"});
                                    }
                                }
                            })
                        }else{
                            console.log('not a member case ');
                            res.json({'code':403,'error':"user not registered with scrpt"});
                        }
                    }
                })
            }else{
                res.json({'code':402,'error':"group not found"});
            }
        }
    })
}

*/
exports.addMember = addMember;

/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		current
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var current = function(req,res){
    group.findOne({_id:req.body.id})
        .then((data) => {
            res.json({'code':200,'group':data});
        })
        .catch((err) => {
            res.json({'code':400,'error':err});
        });
}
exports.current = current;

/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		removeMember
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var removeMember = function(req,res){
    group.findOne({_id:req.body.id})
        .then((data) => {
            if (data) {
                return group.updateOne({_id:req.body.id},{$pull:{Members:{MemberEmail:{$regex: new RegExp(req.body.email,"i")}}}});
            } else {
                res.json({'code':401,'error':'group not found'});
                return null;
            }
        })
        .then((data) => {
            if (data !== null) {
                res.json({'code':200,'data':data});
            }
        })
        .catch((err) => {
            res.json({'code':400,'error':err});
        });
}
exports.removeMember = removeMember;

/*________________________________________________________________________
   * @Date:      		31 July 2015
   * @Method :   		iconUpload
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var iconUpload = function(req,res){
    var form = new formidable.IncomingForm();
    console.log(form);
    form.keepExtensions = true;     //keep file extension
    form.uploadDir = (__dirname+"/../../public/assets/users/");       //set upload directory
    form.keepExtensions = true;     //keep file extension
    form.parse(req, function(err, fields, files) {
        console.log("form.bytesReceived");
        console.log("file path: "+JSON.stringify(files.file.path));
        console.log("file name: "+JSON.stringify(files.file.name));
        console.log("fields: "+fields);
        console.log("fields: "+JSON.stringify(fields));
        //Formidable changes the name of the uploaded file
        //Rename the file to its original name
        var dateTime = new Date().toISOString().replace(/T/,'').replace(/\..+/, '').split(" ");
        fs.rename(files.file.path, __dirname+"/../../public/assets/groups/"+  fields.groupID+'_'+Date.now()+ files.file.name, function(err) {
            if (err){
                throw err;
            }
            else {
                var imgUrl = fields.groupID+'_'+Date.now()+ files.file.name;
                var mediaCenterPath = "/../../public/assets/groups/";
                var srcPath = __dirname + mediaCenterPath + imgUrl;
                if (fs.existsSync(srcPath)) {
                    var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+ imgUrl;
                    //var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail+"/"+ imgUrl;
                    var dstPathCrop_MEDIUM = __dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl;
                    //var dstPathCrop_LARGE = __dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl;
                    //var dstPathCrop_ORIGNAL = __dirname+ mediaCenterPath +process.urls.aspectfit__thumbnail+"/"+imgUrl;
                    mediaController.crop_image(srcPath,dstPathCrop_SMALL,100,100);
                    mediaController.crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
                    //mediaController.resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);
                }
                setTimeout(function(){
                    group.findOne({_id:fields.groupID})
                        .then((group1) => {
                            if (group1) {
                                group1.Icon = '/assets/groups/100/'+imgUrl;
                                return group1.save();
                            } else {
                                res.json({code:404,'msg':'group not found'});
                                return null;
                            }
                        })
                        .then((data) => {
                            if (data) {
                                res.json({'code':200,'msg':'file uploaded successfully'});
                            }
                        })
                        .catch((err) => {
                            res.json({code:400,'msg':err});
                        });
                },2000)
            }
            console.log('renamed complete');  
        });
    });
}
exports.iconUpload = iconUpload;

/*________________________________________________________________________
   * @Date:      		October 1, 2025
   * @Method :   		updateGroup
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Update group title and icon
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

const updateGroup = async function(req, res) {
    try {
        console.log('🔍 updateGroup called');
        console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
        
        const { id, title, icon } = req.body;
        
        if (!id) {
            return res.json({'code': 400, 'error': 'Group ID is required'});
        }
        
        if (!title || !title.trim()) {
            return res.json({'code': 400, 'error': 'Group title is required'});
        }
        
        // Check if user is authenticated
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.json({'code': 401, 'error': 'User authentication required'});
        }
        
        // Find the group
        const existingGroup = await group.findOne({
            _id: id,
            OwnerID: req.session.user._id,  // Only owner can edit
            IsDeleted: 0
        });
        
        if (!existingGroup) {
            return res.json({'code': 404, 'error': 'Group not found or you do not have permission to edit'});
        }
        
        // Check if another group with same name exists (case-insensitive, excluding current group)
        const duplicateGroup = await group.findOne({
            _id: { $ne: id },  // Exclude current group
            OwnerID: req.session.user._id,
            Title: { $regex: new RegExp(`^${title.trim()}$`, 'i') },
            IsDeleted: 0
        });
        
        if (duplicateGroup) {
            return res.json({'code': 409, 'error': 'A group with the same name already exists'});
        }
        
        // Update the group
        const updateData = {
            Title: title.trim(),
            ModifiedOn: new Date()
        };
        
        if (icon !== undefined) {
            updateData.Icon = icon;
        }
        
        const updatedGroup = await group.findOneAndUpdate(
            { _id: id },
            { $set: updateData },
            { new: true }  // Return updated document
        );
        
        console.log('✅ Group updated successfully:', updatedGroup.Title);
        
        res.json({
            'code': 200,
            'message': 'Group updated successfully',
            'data': updatedGroup
        });
        
    } catch (error) {
        console.error('❌ Error in updateGroup:', error);
        res.json({
            'code': 500,
            'error': 'Internal server error',
            'details': error.message
        });
    }
};
exports.updateGroup = updateGroup;