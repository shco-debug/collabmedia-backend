var user = require('./../models/userModel.js');
var group = require('./../models/groupModel.js');
var friend = require('./../models/friendsModel.js');
var fs = require('fs');
var formidable = require('formidable');
var mediaController = require('./../controllers/mediaController.js');


function checkFriendship(req,email,name,relation,IsRegistered){
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
    let IsRegistered = false;
    let member = {};
    
    group.findOne({_id:req.body.id})
        .then((data) => {
            if (data) {
                return user.findOne({Email:{ $regex : new RegExp(req.body.email, "i") }});
            } else {
                res.json({'code':402,'error':"group not found"});
                return null;
            }
        })
        .then((user1) => {
            if (user1 === null) return; // Group not found case already handled
            
            console.log('user1');
            console.log(user1);
            if (user1) {
                IsRegistered = true;
            } else {
                IsRegistered = false;
            }
            
            return group.find({_id:req.body.id,Members:{$elemMatch:{MemberEmail:{$regex: new RegExp(req.body.email,"i")}}}});
        })
        .then((data) => {
            if (data === undefined) return; // Group not found case
            
            if (data.length == 0) {
                checkFriendship(req,req.body.email,req.body.name,req.body.relation, IsRegistered);
                return user.findOne({Email:{ $regex : new RegExp(req.body.email, "i") }});
            } else {
                res.json({'code':401,'error':"Already a member"});
                return null;
            }
        })
        .then((frndData) => {
            if (frndData === undefined || frndData === null) return; // Already handled cases
            
            var rel = req.body.relation;
            rel = rel.split('~');
            member.IsRegistered = IsRegistered;
            if (IsRegistered && frndData) {
                member.MemberID = frndData._id;
                member.MemberNickName = frndData.NickName;
                member.MemberPic = frndData.ProfilePic;
            }
            member.MemberEmail = IsRegistered && frndData ? frndData.Email : req.body.email;
            member.MemberName = IsRegistered && frndData ? frndData.Name : req.body.name;
            member.MemberRelation = rel[0].trim();
            member.MemberRelationID = rel[1].trim();
            
            return group.updateOne({_id:req.body.id},{$push:{Members:member}});
        })
        .then((data) => {
            if (data !== undefined && data !== null) {
                data.member = member;
                res.json({'code':200,'data':data});
            }
        })
        .catch((err) => {
            console.error('Error in addMember:', err);
            res.json({'code':400,'error':"mongo error"});
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