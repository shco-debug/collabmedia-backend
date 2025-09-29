var board = require('./../models/boardModel.js');
//var board = require('./../models/pageModel.js');
var media = require('./../models/mediaModel.js');
var mediaAction = require('../models/mediaActionLogModel.js');
var mediaActionCtrl = require('../controllers/mediaActionLogsController.js');
var user = require('./../models/userModel.js');
var boardInvitees = require('./../models/boardInviteesModel.js');
var groupTags = require('./../models/groupTagsModel.js');
var project = require('./../models/projectModel.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var counters=require('./../models/countersModel.js');
var fs = require('fs');
var formidable = require('formidable');
var mongoose = require("mongoose");
var im   = require('imagemagick');
var path = require('path');
var EmailTemplate = require('./../models/emailTemplateModel.js');
const axios = require('axios');
const PageStream = require('../models/pageStreamModel.js');
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
// To fetch all boards ///modified by parul 02 july 2015
var findAll = function(req, res){
    var fields={};
	var perpage = 0;
	var offset = 0;
	var pageNo = 0;
    if(typeof(req.body.pageNo)!='undefined'){
		pageNo = parseInt(req.body.pageNo);
    }
    if(typeof(req.body.perPage)!='undefined'){
		perpage = parseInt(req.body.perPage);
    }
    if(typeof(req.body.perPage)!='undefined' && typeof(req.body.pageNo)!='undefined'){
		console.log('here');
		offset = pageNo*perpage;
    }
    if(typeof(req.body.project)!='undefined'){
		fields['ProjectID']=req.body.project;	
    }
    if(typeof(req.body.id)!='undefined') {
		fields['_id']=req.body.id;
    }
    if (typeof(req.body.gt)!='undefined' && typeof(req.body.gt)=='String') {
		fields['Medias.ThemeID']=req.body.gt;
    }
    //fields['PageType']={$in : ["gallery" , "content"]};
    fields['isDeleted']=0;
	//setTimeout(function(){
	//	console.log('============================================================');
	//	console.log(fields);
	//	console.log('============================================================');
	//	//console.log(page);
	//	console.log('============================================================');
	//	console.log(offset)	
	//},7000)
    board.find(fields)
	.populate('Domain Collection ProjectID OwnerID Medias.PostedBy Invitees.UserID Comments.CommentedBy')
	.exec().then(function(result){
		var hasMore = false;
		if(result.length==0){
		res.json({"code":"404","msg":"Not Found"})
		}
		else{
		console.log('---------------------------------------------------------');
		console.log(result[0].Medias);
		console.log('---------------------------------------------------------');
		result[0].Medias = result[0].Medias == null ? [] : result[0].Medias; 
		console.log(result[0].Medias);
		console.log('---------------------------------------------------------');
		if (req.session.user) {
			if (result[0].PrivacySetting[0].BoardType=='FriendsSolo' && result[0].OwnerID._id!=req.session.user._id) {
				var showMedias=result;			
				var medias=[];
				
				//for(i=0;i<result[0].Medias.length;i++){
				//	
				//	if (String(result[0].Medias[i].PostedBy._id)==String(result[0].OwnerID._id) || String(result[0].Medias[i].PostedBy._id)==String(req.session.user._id)) {			    
				//	medias.push(result[0].Medias[i]);
				//	}
				//}
				for(i = 1; i <= result[0].Medias.length; i++){
					
					if (String(result[0].Medias[i].PostedBy._id)==String(result[0].OwnerID._id) || String(result[0].Medias[i].PostedBy._id)==String(req.session.user._id)) {			    
					medias.push(result[0].Medias[(result[0].Medias.length-i)]);
					}
				}
				result[0].Medias=[];
				result[0].Medias=medias;
				
				
			}else{
				var showMedias=result;			
				var medias=[];
				for(i = 1; i <= result[0].Medias.length; i++){
					//if (String(result[0].Medias[i].PostedBy._id)==String(result[0].OwnerID._id) || String(result[0].Medias[i].PostedBy._id)==String(req.session.user._id)) {			    
					medias.push(result[0].Medias[(result[0].Medias.length-i)]);
					//}
				}
				result[0].Medias=[];
				result[0].Medias=medias;
			}
		}else{
			var showMedias=result;			
			var medias=[];
			for(i = 1; i <= result[0].Medias.length; i++){
				//if (String(result[0].Medias[i].PostedBy._id)==String(result[0].OwnerID._id) || String(result[0].Medias[i].PostedBy._id)==String(req.session.user._id)) {			    
				medias.push(result[0].Medias[(result[0].Medias.length-i)]);
				///}
			}
			result[0].Medias=[];
			result[0].Medias=medias;
		}
		if (result[0].Medias.length>offset) {
			result[0].Medias.splice((offset),(result[0].Medias.length-(offset)));
			hasMore = true;
		}
		res.json({"code":"200","msg":"Success","response":result,'hasMore':hasMore});
		
		}
	}).catch(function(err) {
		res.json(err);
	});
    
};

exports.findAll = findAll;


var userBoards = async function(req, res){
    try {
        const userId = req.session.user._id;
        
        // Find boards where user is either owner OR invitee, and not deleted
        const result = await board.find({
            $or: [
                {"Invitees.UserID": userId},
                {OwnerID: userId}
            ],
            isDeleted: {$ne: 1}
        }).populate('Domain Collection ProjectID OwnerID').exec();
        
	    if(result.length==0){
		res.json({"code":"404","msg":"Not Found"})
	    }
	    else{				
		res.json({"code":"200","msg":"Success","response":result})
	    }
    } catch(err) {
        res.json(err);
	}
};

exports.userBoards = userBoards;



var addMediaToBoard = async function(req,res){
    try {
        fields = {	
            Medias: []
        };
        
        const result = await board.find({_id: req.body.id}).populate('Domain Collection ProjectID OwnerID').exec();
        
        if (result.length == 0) {
            return res.json({"code": "404", "msg": "Not Found"});
        }
        
        if (result[0].Medias == null) {
            fields.Medias = [];
        } else {
		    fields.Medias = result[0].Medias;
		}
		
		fields.Medias.push({
            MediaID: req.body.media,
            MediaURL: req.body.url,
            Title: req.body.title,
            Prompt: req.body.prompt,
            Locator: req.body.locator,
            PostedBy: req.session.user._id,
            PostedOn: Date.now(),
            ThemeID: req.body.themeId,
            ThemeTitle: req.body.theme,
            MediaType: req.body.data.value.MediaType,
            ContentType: req.body.data.value.ContentType,
            Content: req.body.data.value.Content,
            Votes: [],
            Marks: [],
            OwnerId: req.body.owner
        });
        
        const query = {_id: req.body.id};
        const options = { multi: true };
        await board.updateOne(query, { $set: fields }, options);
        
        const datafield = {
            Posts: {}
        };
        
        datafield.Posts.Users = [];    
        datafield.Posts.Users.push({UserFSGs: req.session.user.FSGs});
        
        const mediaQuery = {_id: req.body.media};
        const mediaOptions = {multi: false};
        await media.updateOne(mediaQuery, datafield, mediaOptions);
        
        postMedia(req, res);
        
    } catch(err) {
        res.json({"code": "500", "message": "Error adding media to board", "error": err.message});
    }
}

exports.addMediaToBoard = addMediaToBoard;

function sendAtPostEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject) {
	var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
	var to = shareWithEmail;
	
	newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
	
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

//16092014
var addMediaToBoard_2 = function(req,res){
    console.log("In addMediaToBoard_2...", req.body.TaggedUsers);//return;
	fields={	
		Medias:[]
    };
    
    board.find({_id:req.body.id},function(err,result){
		if(err){ 		
			//res.json(err);
			console.log("-------->err");
			return 0;
		}
		else{
			if(result.length==0){
				console.log("-------->result.length==0",req.body.id);
				//res.json({"code":"404","msg":"Not Found"})
				return 0;
			}
			else{
				if (result[0].Medias==null) {
					fields.Medias=[];
				}
				else{
					fields.Medias = result[0].Medias;
				}
				
				var thumbnail = '';
				if( req.body.thumbnail ){
					thumbnail = req.body.thumbnail;
				}
				
				var thisPostId = mongoose.Types.ObjectId();
				var postData = {
					_id:thisPostId,	//added on 01 sep 2017 by manishp for edit latest post feature.
					MediaID:req.body.media,
					MediaURL:req.body.url,
					Title:req.body.title,
					Prompt:req.body.prompt,
					Locator:req.body.locator,
					PostedBy:req.session.user._id,
					PostedOn:Date.now(),
					ThemeID:req.body.themeId ? req.body.themeId : null,
					ThemeTitle:req.body.theme ? req.body.theme : "No Theme",
					MediaType:req.body.data.value.MediaType,
					ContentType:req.body.data.value.ContentType,
					Content:req.body.Content,
					Votes:[],
					Marks:[],
					OwnerId:req.body.owner,
					thumbnail:thumbnail,	//added by manishp on 23122014
					PostStatement:req.body.Statement, //added by manishp on 23042015
					IsOnlyForOwner:req.body.IsOnlyForOwner ? req.body.IsOnlyForOwner : false,
					PostPrivacySetting:req.body.PostPrivacySetting ? req.body.PostPrivacySetting : "PublicWithoutName",
					IsUnsplashImage : req.body.IsUnsplashImage ? req.body.IsUnsplashImage : false,
					Themes : req.body.Themes ? req.body.Themes : [],
					TaggedUsers : req.body.TaggedUsers ? req.body.TaggedUsers : [],
					IsAddedFromStream: req.body.IsAddedFromStream ? req.body.IsAddedFromStream : false,
					StreamId: req.body.StreamId ? mongoose.Types.ObjectId(req.body.StreamId) : null,
					IsPostForUser: req.body.IsPostForUser ? req.body.IsPostForUser : false,
					IsPostForTeam: req.body.IsPostForTeam ? req.body.IsPostForTeam : false,
					QuestionPostId: req.body.QuestionPostId ? mongoose.Types.ObjectId(req.body.QuestionPostId) : null,
					PostType: req.body.QuestionPostId ? 'AnswerPost' : null
				};
				
				if(req.body.Label) {
					postData.Label = req.body.Label;
				}
				
				fields.Medias.push(postData);				
				//console.log("fields.Medias =  ",fields.Medias);//return;
				/*
				postData.Themes = postData.Themes ? postData.Themes : [];
				if(postData.Themes.length){
					function __mapUserSuggestedThemes (themesArr) {
						
					}
					
					var themesArr1 = [];
					for(var loop = 0; loop < postData.Themes.length; loop++){
						if(typeof(postData.Themes[loop].id) == 'undefined'){
							themesArr1.push(postData.Themes[loop]);
						}
					}
					if(themesArr1.length){
						__mapUserSuggestedThemes(themesArr1);
					}
				}
				*/
				
				var query={_id:req.body.id};
				var options = { multi: true };
				board.update(query, { $set: fields}, options, callback)
				
				function callback (err, numAffected) {
					if(err){
						//res.json(err)
						console.log("-------->board.update callback-------------------@@@@@@@@@@@");
						return 0;
					}
					else{
						//call api to map SelectedBlendImages and SurpriseSelectedKeywords
						if(postData.PostType == 'AnswerPost' && postData.MediaType == 'Notes') {
							postData.Content = postData.Content ? postData.Content : '';
							var axios_reqObj = {
								PageId : query._id ? query._id : null,
								PostId : postData._id ? postData._id : null,
								PostType : postData.PostType,
								MediaType : postData.MediaType,
								PostText : postData.PostStatement ? postData.PostStatement : postData.Content
							};
							
							if(axios_reqObj.PostText && axios_reqObj.PostId) {
								console.log("Calling addKeywordAndCallAddBlendImagesApi_INTERNAL_API --------------------------------- ", axios_reqObj);
								var request_url = 'https://www.scrpt.com/journal/addKeywordAndCallAddBlendImagesApi_INTERNAL_API';
								axios.post(request_url, axios_reqObj)
									.then(response => {
										response.data = response.data ? response.data : {};
										response.data.code = response.data.code ? response.data.code : null;
										console.log("------------ AXIOS (/journal/addKeywordAndCallAddBlendImagesApi_INTERNAL_API) ---------------", response.data.code);
									});
							}
						}
						
						
						//------------------------------------@post notification------------------------------------
						var condition = {};
						condition.name = "At__Post";
						if(!postData.IsPostForTeam) {	
							EmailTemplate.find(condition, {}, function (err, results) {
								if (!err) {
									var PostImage = postData.MediaURL || postData.thumbnail || '';
									
									if(PostImage && PostImage.indexOf('unsplash.com') == -1){
										PostImage = 'https://www.scrpt.com/assets/Media/img/600/'+PostImage;
									} else if(PostImage && PostImage.indexOf('unsplash.com') >= 0){
										PostImage = PostImage.split('&')[0]+'&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=600&h=600&fit=crop&ixid=eyJhcHBfaWQiOjEyMDd9';
									} else {
										PostImage = '';
									}
									
									if(PostImage) {
										PostImage = '<img height="500" align="center" src="'+PostImage+'" width="500" style="background-color: initial; border-radius: 20px; text-align: left;object-fit:cover;align-self:center;" class="fr-fic fr-dii"><p style="display: block;"><br></p>';
									}
									var PostStatement = postData.PostStatement || postData.Content || "";
									PostStatement = PostStatement.replace(/style=/g, '');
									if (results.length && postData.TaggedUsers.length) {
										/*
										var taggedUsers = [];
										for (var i = 0; i < postData.TaggedUsers.length; i++) {
											taggedUsers.push(mongoose.Types.ObjectId(postData.TaggedUsers[i]));
										}
										*/
										var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";
																	
										var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
										newHtml = newHtml.replace(/{PostImage}/g, PostImage);
										newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
										
										results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
										var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);
														
										//user.find({ '_id': {$in : taggedUsers}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
										user.find({ 'Email': {$in : postData.TaggedUsers}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
											if (!err) {
												UserData = UserData ? UserData : [];
												var emails = [];
												for(var i = 0; i < UserData.length; i++) {
													var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
													var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
													if(shareWithEmail) {
														emails.push(shareWithEmail);
														sendAtPostEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
													}
												}
												
												if(emails.length != postData.TaggedUsers.length) {
													var difference = postData.TaggedUsers.filter(x => emails.indexOf(x) === -1);
													for(var i = 0; i < difference.length; i++) {
														var RecipientName = difference[i] ? difference[i].split('@')[0] : "";
														var shareWithEmail = difference[i] ? difference[i] : null;
														
														if(shareWithEmail) {
															sendAtPostEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
														}
													}
												}
											}
										})
									}
								}
							});
						}
						//------------------------------------@post notification------------------------------------
						
						//update PostId in mediaActionLogs collection
						var mediaActionId = req.body.mediaActionId ? req.body.mediaActionId : null;
						if( mediaActionId ){
							mediaAction.update({_id:mediaActionId} , {$set:{PostId : thisPostId}} , function(err , numAffected){
								if(err){
									console.log(err);
								}
								else{
									console.log(numAffected);
								}
							})
						}
						//update PostId in mediaActionLogs collection
						
						console.log("-------->board.update callback success-------------------@@@@@@@@@@@",numAffected);
						media.findById(req.body.media,function(err , mediaData){
							if(err){
								
							}
							else{
								
								var getLoginU__fsgs = {};
								
								if( req.session.user.FSGsArr2 ){
									getLoginU__fsgs = req.session.user.FSGsArr2;
								}
								
								
								if(!mediaData.Posts)
									mediaData.Posts = {};
									
								if(mediaData.Posts.Users && mediaData.Posts.Users.length){
									//mediaData.Posts.Users.push({UserFSGs:req.session.user.FSGs});
									mediaData.Posts.Users.push({UserFSGs:getLoginU__fsgs});
								}
								else{
									mediaData.Posts.Users=[];
									//mediaData.Posts.Users.push({UserFSGs:req.session.user.FSGs});
									mediaData.Posts.Users.push({UserFSGs:getLoginU__fsgs});
								}
								console.log("mediaData.Posts.Users = ",mediaData.Posts.Users);
								/*
								mediaData.save(function(err){
									if (err) {
										//res.json(err);
										return 0;
									}
									else{
										return 1;
										//postMedia(req,res);
									}
								});
								*/
								//use update command
								var query={_id:req.body.media};
								var options = { multi: false };
								var fields = {};
								var fields  = {"Posts":mediaData.Posts,"Status":1}; //parul 06042015
								
								media.update(query, { $set: fields}, options, ActionUpdateCallback)
								function ActionUpdateCallback (err, numAffected) {
									if(err){
										console.log("-------->ActionUpdateCallback");
										//return 0;
										res.json({"status":"failed","message":"Error!"});
									}
									else{
										//console.log();
										res.json({"status":"success","message":"Success!","affected":numAffected,postData:postData});
										//return 1;
									}
								}
							}
						});
					}
				}
			}
		}
	
    }).populate('Domain Collection ProjectID OwnerID')
}

exports.addMediaToBoard_2 = addMediaToBoard_2;

//16092014
var postMedia = async function(req,res){
    try {
        var fields = {
            MediaId: req.body.media,
            Title: req.body.data.value.Title,
            Prompt: req.body.data.value.Prompt,
            Locator: req.body.data.value.Locator,
            OwnerId: req.body.owner,
            BoardId: req.body.id,
            Action: 'Post',
            MediaType: req.body.data.value.MediaType,
            ContentType: req.body.data.value.ContentType,
            UserFsg: req.session.user.FSGs,
            CreatedOn: Date.now(),
            UserId: req.session.user._id
        };
        
        await mediaAction(fields).save();
        findAll(req, res);
        
    } catch(err) {
        res.json({"code": "500", "message": "Error posting media", "error": err.message});
    }
}

exports.postMedia = postMedia;



// Add a new project
/*
var add = function(req,res){
    
    
  fields={
    Title:req.body.name,
    OwnerID:req.session.user._id,
    Domain:req.body.domain,
    Collection:req.body.collection,
    PrivacySetting:[],
    ProjectID:req.body.project,
    Themes:[],
    Medias:null,
    Invitees:null,
    Comments:null,
    isDeleted:0
  };
  fields.PrivacySetting.push({
    BoardType:req.body.boardType,
    DisplayNames:req.body.displayName    
  });
  for(i in req.body.gt){
    gt=req.body.gt[i].split('~');
    fields.Themes.push({
	ThemeID:gt[0],
	ThemeTitle:gt[1],
	SuggestedBy:req.session.user._id,
	SuggestedOn:Date.now()
    });
  }
  
  console.log(fields);
  
  board(fields).save(function(err){
    if(err){
      res.json(err);
    }
    else{
      findAll(req,res)
    }
  });
  
};
*/
//Default domain and collection case on 07012015
var add = async function(req,res){
  try {
    // Validate boardType enum
    const validBoardTypes = ['OnlyYou', 'FriendsSolo', 'FriendsGroup', 'Public'];
    const validDisplayNames = ['RealNames', 'NickName'];
    
    if (!validBoardTypes.includes(req.body.boardType)) {
      return res.json({
        "code": "400", 
        "message": "Invalid boardType. Must be one of: " + validBoardTypes.join(', ')
      });
    }
    
    if (!validDisplayNames.includes(req.body.displayName)) {
      return res.json({
        "code": "400", 
        "message": "Invalid displayName. Must be one of: " + validDisplayNames.join(', ')
      });
    }
    
  fields={
    Title:req.body.name,
    OwnerID:req.session.user._id,
    //Domain:req.body.domain,
	Domain:"53ad6993f222ef325c05039c",
    //Collection:req.body.collection,
	Collection:["53ceaf933aceabbe5d573db4","53ceaf9d3aceabbe5d573db6","549323f9610706c30a70679e"],
    PrivacySetting:[],
    ProjectID:req.body.project,
    Themes:[],
    Medias:null,
    Invitees:null,
    Comments:null,
    isDeleted:0
  };
  fields.PrivacySetting.push({
    BoardType:req.body.boardType,
    DisplayNames:req.body.displayName    
  });
  for(i in req.body.gt){
    gt=req.body.gt[i].split('~');
    fields.Themes.push({
	ThemeID:gt[0],
	ThemeTitle:gt[1],
	SuggestedBy:req.session.user._id,
	SuggestedOn:Date.now()
    });
  }
  
  console.log(fields);
  
    // Save the board
    await board(fields).save();
    
    // Increment boardsCount in the project
    if (req.body.project) {
      // First, ensure boardsCount is a number
      const projectDoc = await project.findById(req.body.project);
      if (projectDoc) {
        const currentCount = typeof projectDoc.boardsCount === 'string' 
          ? parseInt(projectDoc.boardsCount) || 0 
          : projectDoc.boardsCount || 0;
        
        await project.updateOne(
          { _id: req.body.project },
          { $set: { boardsCount: currentCount + 1 } }
        );
      }
    }
    
    findAll(req,res);
  } catch(err) {
      res.json(err);
    }
};
exports.add = add;


/*
var edit = function(req,res){
    
    fields={
	Title:req.body.name,
	OwnerID:req.session.user._id,
	Domain:req.body.domain,
	Collection:req.body.collection,
	PrivacySetting:[],
	ProjectID:req.body.project,
	ModifiedDate:Date.now(),
	Themes:[],
	isDeleted:0
    };
    fields.PrivacySetting.push({
	BoardType:req.body.boardType,
	DisplayNames:req.body.displayName    
    });
    
    for(i in req.body.gt){
	gt=req.body.gt[i].split('~');
	fields.Themes.push({
	    ThemeID:gt[0],
	    ThemeTitle:gt[1],
	    SuggestedBy:req.session.user._id,
	    SuggestedOn:Date.now()
	});
    }
    
    console.log(fields);
    
    var query={_id:req.body.id};
    var options = { multi: true };
    board.update(query, { $set: fields}, options, callback)
    function callback (err, numAffected) {
	    if(err){
		    res.json(err)
	    }
	    else{
		    delete req.body.gt;
		    findAll(req,res)
	    }
    }
    
};
*/
var edit = async function(req,res){
    try {
        // Validate boardType enum
        const validBoardTypes = ['OnlyYou', 'FriendsSolo', 'FriendsGroup', 'Public'];
        const validDisplayNames = ['RealNames', 'NickName'];
        
        if (!validBoardTypes.includes(req.body.boardType)) {
            return res.json({
                "code": "400", 
                "message": "Invalid boardType. Must be one of: " + validBoardTypes.join(', ')
            });
        }
        
        if (!validDisplayNames.includes(req.body.displayName)) {
            return res.json({
                "code": "400", 
                "message": "Invalid displayName. Must be one of: " + validDisplayNames.join(', ')
            });
        }
    
    fields={
	Title:req.body.name,
	OwnerID:req.session.user._id,
	//Domain:req.body.domain,
	Domain:"53ad6993f222ef325c05039c",
	//Collection:req.body.collection,
	Collection:["53ceaf933aceabbe5d573db4","53ceaf9d3aceabbe5d573db6","549323f9610706c30a70679e"],
	PrivacySetting:[],
	ProjectID:req.body.project,
	ModifiedDate:Date.now(),
	Themes:[],
	isDeleted:0
    };
    fields.PrivacySetting.push({
	BoardType:req.body.boardType,
	DisplayNames:req.body.displayName    
    });
    
    for(i in req.body.gt){
	gt=req.body.gt[i].split('~');
	fields.Themes.push({
	    ThemeID:gt[0],
	    ThemeTitle:gt[1],
	    SuggestedBy:req.session.user._id,
	    SuggestedOn:Date.now()
	});
    }
    
    console.log(fields);
    
    var query={_id:req.body.id};
    var options = { multi: true };
        await board.updateOne(query, { $set: fields}, options);
		    delete req.body.gt;
        findAll(req,res);
    
    } catch(err) {
        res.json(err);
    }
};


exports.edit = edit;

/*
var uploadMedia = function(req,res){
    
    
    var form = new formidable.IncomingForm();
    
	
    form.parse(req, function(err, fields, files) {
	var file_name="";
	console.log("Fields",fields);
	if(files.myFile.name){	  
	    uploadDir = __dirname + "/../../public/assets/Media/img";
	    file_name=files.myFile.name;
	    file_name=file_name.split('.');
	    ext=file_name[file_name.length-1];
	    name=Date.now();
	    file_name=name+'.'+ext;
	    
	    fs.rename(files.myFile.path, uploadDir + "/" + file_name)
	    
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
	    }
	    
	    if (req.session.user.FSGs) {
		
	    }
	    else{
		req.session.user.FSGs={};
	    }
	    
	    dataToUpload={
		Location:[],
		UploadedBy:"user",
		UploadedOn:Date.now(),
		UploaderID:req.session.user._id,
		Source:"Thinkstock",
		SourceUniqueID:null,
		Domains:fields.domain,
		GroupTags:[],
		Collection:fields.collection,
		Status:2, 
		MetaMetaTags:null,
		MetaTags:null,
		AddedWhere:"hardDrive", //directToPf,hardDrive,dragDrop
		IsDeleted:1,
		TagType:"",
		ContentType:files.myFile.type,
		MediaType:media_type,
		AddedHow:'hardDrive',
		OwnerFSGs:req.session.user.FSGs
	    }
	     
	    dataToUpload.GroupTags.push({
		GroupTagID:fields.gt
	    })
	      
	    dataToUpload.Location.push({
		Size:files.myFile.size,
		URL:file_name
	    })
	    
	    
	    media(dataToUpload).save(function(err,model){
		if(err){		    
		    res.json(err);
		}
		else{
		    console.log("Data",model)
		    dataToUpload._id=model._id
		    res.json(dataToUpload);
		}
	    });
	}
    })
    
}
exports.uploadMedia = uploadMedia;
*/
//updated on 06012015
var uploadMedia = function(req,res){
	var RecordLocator = "";
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
		if (!err) {
			//console.log('=========================')
			//console.log(data);
			//data.seq=(data.seq)+1;
			//console.log(data.seq);
			incNum=data.seq;
			//data.save();
			//console.log("incNum="+incNum);
    
    
			var form = new formidable.IncomingForm();
			
			
			form.parse(req, function(err, fields, files) {
			var file_name="";
			//console.log("Fields",fields);
			if(files.myFile.name){	  
				uploadDir = __dirname + "/../../public/assets/Media/img";
				file_name=files.myFile.name;
				file_name=file_name.split('.');
				ext=file_name[file_name.length-1];
				RecordLocator = file_name[0];
				var name = '';
				name = dateFormat()+'_'+incNum;
				file_name=name+'.'+ext;
				
				fs.renameSync(files.myFile.path, uploadDir + "/" + file_name)
				
				/*
				fs.rename(files.myFile.path, uploadDir + "/" + file_name, function (err) {
					if (err) throw err;
					  console.log('renamed complete');
					}
					else{
					}
				);
				*/
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
					//var mediaCenterPath = path.join("/../../public/assets/Media/img/");
					//var srcPath = path.join(__dirname + mediaCenterPath + imgUrl);
					var mediaCenterPath = "/../../public/assets/Media/img/";
					var srcPath = __dirname + mediaCenterPath + imgUrl;

					if (fs.existsSync(srcPath)) {
						var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+ imgUrl;
						var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail+"/"+ imgUrl;
						var dstPathCrop_MEDIUM = __dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl;
						var dstPathCrop_LARGE = __dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl;
						var dstPathCrop_ORIGNAL = __dirname+ mediaCenterPath +process.urls.aspectfit__thumbnail+"/"+imgUrl;
						var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

						try{
							crop_image(srcPath,dstPathCrop_SMALL,100,100);
							crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
							crop_image(srcPath,dstPathCrop_SG,300,300);
							//crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
							resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);
							resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

						}
						catch(err){
							console.log("Error Caught : ",err)
						}
					}
				}
				
				if (req.session.user.FSGs) {
				
				}
				else{
				req.session.user.FSGs={};
				}
				//console.log('-------------------------------------------------------------------------------');
				
				dataToUpload={
				Location:[],
				UploadedBy:"user",
				UploadedOn:Date.now(),
				UploaderID:req.session.user._id,
				AutoId:incNum,
				Source:"Thinkstock",
				//SourceUniqueID:null,
				SourceUniqueID:"53ceb02d3aceabbe5d573dba", //updated on 06012015
				//Domains:fields.domain,
				Domains:"53ad6993f222ef325c05039c",
				GroupTags:[],
				//Collection:fields.collection,
				Collection:["53ceaf933aceabbe5d573db4","53ceaf9d3aceabbe5d573db6","549323f9610706c30a70679e"],
				Status:2, 
				MetaMetaTags:null,
				MetaTags:null,
				//AddedWhere:"hardDrive", //directToPf,hardDrive,dragDrop
				AddedWhere:"board", //directToPf,board,capsule
				IsDeleted:0,
				TagType:"",
				ContentType:files.myFile.type,
				MediaType:media_type,
				AddedHow:'hardDrive',
				//OwnerFSGs:req.session.user.FSGs,
				OwnerFSGs:req.session.user.FSGsArr2,
				Locator:RecordLocator+"_"+incNum
				}
				if(fields.gt){ 
					dataToUpload.GroupTags.push({
					GroupTagID:fields.gt
					})
				}
				  
				dataToUpload.Location.push({
					Size:files.myFile.size,
					URL:file_name
				})
				
				//console.log('===========================================================================')
				//console.log(dataToUpload)
				//console.log('===========================================================================')
		
				media(dataToUpload).save(function(err,model){
					if(err){		    
						res.json(err);
					}
					else{
						//console.log("Data",model)
						dataToUpload._id=model._id
						setTimeout(function() {
							res.json(dataToUpload);
						},5000);
					}
				});
			}			
		});
	}
    });    
}
exports.uploadMedia = uploadMedia;

var postDrawingImage = function(req,res){
	var fields = req.body.inputData ? req.body.inputData : {};
	var RecordLocator = "";
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
		if (!err) {
			console.log('=========== postDrawingImage ==============')
			incNum = data.seq;
			console.log("incNum="+incNum);
    
			uploadDir = __dirname + "/../../public/assets/Media/img";
			ext = 'png';
			RecordLocator = dateFormat();
			var name = '';
			name = dateFormat()+'_'+incNum;
			file_name = name+'.'+ext;
			
			fs.writeFileSync(uploadDir + "/" + file_name, fields.image, 'base64');
			
			var media_type = 'Image';
			var content_type = "image/png";

			//add thumbnail code
			var imgUrl = file_name;
			var mediaCenterPath = "/../../public/assets/Media/img/";
			var srcPath = __dirname + mediaCenterPath + imgUrl;

			if (fs.existsSync(srcPath)) {
				var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+ imgUrl;
				var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail+"/"+ imgUrl;
				var dstPathCrop_MEDIUM = __dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl;
				var dstPathCrop_LARGE = __dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl;
				var dstPathCrop_ORIGNAL = __dirname+ mediaCenterPath +process.urls.aspectfit__thumbnail+"/"+imgUrl;
				var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;
				
				try{
					crop_image(srcPath,dstPathCrop_SMALL,100,100);
					crop_image(srcPath,dstPathCrop_SG,300,300);
					crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
					//crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
					resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);
					resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

				}
				catch(err){
					console.log("Error Caught : ",err)
				}
			}
			
			if (req.session.user.FSGs) {
			
			}
			else{
				req.session.user.FSGs={};
			}
						
			dataToUpload={
				Location:[],
				UploadedBy:"user",
				UploadedOn:Date.now(),
				UploaderID:req.session.user._id,
				AutoId:incNum,
				Source:"Thinkstock",
				SourceUniqueID:"53ceb02d3aceabbe5d573dba", //updated on 06012015
				//Domains:fields.domain,
				Domains:"53ad6993f222ef325c05039c",
				GroupTags:[],
				//Collection:fields.collection,
				Collection:["53ceaf933aceabbe5d573db4","53ceaf9d3aceabbe5d573db6","549323f9610706c30a70679e"],
				Status:2, 
				MetaMetaTags:null,
				MetaTags:null,
				//AddedWhere:"hardDrive", //directToPf,hardDrive,dragDrop
				AddedWhere:"board", //directToPf,board,capsule
				IsDeleted:0,
				TagType:"",
				ContentType:content_type,
				MediaType:media_type,
				AddedHow:'drawing',
				//OwnerFSGs:req.session.user.FSGs,
				OwnerFSGs:req.session.user.FSGsArr2,
				Locator:RecordLocator+"_"+incNum
			}
			if(fields.gt){ 
				dataToUpload.GroupTags.push({
					GroupTagID:fields.gt
				})
			}
			  
			dataToUpload.Location.push({
				Size:null,
				URL:file_name
			})
			
			console.log('===========================================================================')
			console.log(dataToUpload)
			console.log('===========================================================================')
	
			media(dataToUpload).save(function(err,model){
				if(err){		    
					console.log("error",err);
					res.json({code : 501, data : {}});
				}
				else{
					console.log("Data",model)
					dataToUpload._id = model._id;
					res.json({code : 200, data : dataToUpload});
				}
			});
		}
    })
    
}
exports.postDrawingImage = postDrawingImage;
var postBlendingImage__OLD = function(req,res){
	var fields = req.body.inputData ? req.body.inputData : {};
	var RecordLocator = "";
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
		if (!err) {
			console.log('=========== postDrawingImage ==============')
			incNum = data.seq;
			console.log("incNum="+incNum);
    
			uploadDir = __dirname + "/../../public/assets/Media/img";
			ext = 'png';
			RecordLocator = dateFormat();
			var name = '';
			name = dateFormat()+'_'+incNum;
			file_name = name+'.'+ext;
			
			fs.writeFileSync(uploadDir + "/" + file_name, fields.image, 'base64');
			
			var media_type = 'Image';
			var content_type = "image/png";

			//add thumbnail code
			var imgUrl = file_name;
			var mediaCenterPath = "/../../public/assets/Media/img/";
			var srcPath = __dirname + mediaCenterPath + imgUrl;

			if (fs.existsSync(srcPath)) {
				var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+ imgUrl;
				var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail+"/"+ imgUrl;
				var dstPathCrop_MEDIUM = __dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl;
				var dstPathCrop_LARGE = __dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl;
				var dstPathCrop_ORIGNAL = __dirname+ mediaCenterPath +process.urls.aspectfit__thumbnail+"/"+imgUrl;
				var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;
				
				try{
					crop_image(srcPath,dstPathCrop_SMALL,100,100);
					crop_image(srcPath,dstPathCrop_SG,300,300);
					crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
					//crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
					resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);
					resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

				}
				catch(err){
					console.log("Error Caught : ",err)
				}
			}
			
			if (req.session.user.FSGs) {
			
			}
			else{
				req.session.user.FSGs={};
			}
						
			dataToUpload={
				Location:[],
				UploadedBy:"user",
				UploadedOn:Date.now(),
				UploaderID:req.session.user._id,
				AutoId:incNum,
				Source:"Thinkstock",
				SourceUniqueID:"53ceb02d3aceabbe5d573dba", //updated on 06012015
				//Domains:fields.domain,
				Domains:"53ad6993f222ef325c05039c",
				GroupTags:[],
				//Collection:fields.collection,
				Collection:["53ceaf933aceabbe5d573db4","53ceaf9d3aceabbe5d573db6","549323f9610706c30a70679e"],
				Status:2, 
				MetaMetaTags:null,
				MetaTags:null,
				//AddedWhere:"hardDrive", //directToPf,hardDrive,dragDrop
				AddedWhere:"board", //directToPf,board,capsule
				IsDeleted:0,
				TagType:"",
				ContentType:content_type,
				MediaType:media_type,
				AddedHow:'blending',
				//OwnerFSGs:req.session.user.FSGs,
				OwnerFSGs:req.session.user.FSGsArr2,
				Locator:RecordLocator+"_"+incNum
			}
			if(fields.gt){ 
				dataToUpload.GroupTags.push({
					GroupTagID:fields.gt
				})
			}
			  
			dataToUpload.Location.push({
				Size:null,
				URL:file_name
			})
			
			console.log('===========================================================================')
			console.log(dataToUpload)
			console.log('===========================================================================')
	
			media(dataToUpload).save(function(err,model){
				if(err){		    
					console.log("error",err);
					res.json({code : 501, data : {}});
				}
				else{
					console.log("Data",model)
					dataToUpload._id = model._id;
					res.json({code : 200, data : dataToUpload});
				}
			});
		}
    })
    
}

var postBlendingImage = function(req,res){
	var fields = req.body.inputData ? req.body.inputData : {};
	var RecordLocator = "";
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
		if (!err) {
			console.log('=========== postBlendingImage ==============')
			incNum = data.seq;
			console.log("incNum="+incNum);
    
			uploadDir = __dirname + "/../../public/assets/Media/img";
			ext = 'png';
			RecordLocator = dateFormat();
			var name = '';
			name = dateFormat()+'_'+incNum;
			file_name = name+'.'+ext;
			
			var blendImage1 = fields.blendImage1 ? fields.blendImage1 : null;
			var blendImage2 = fields.blendImage2 ? fields.blendImage2 : null;
			
			var blendOption = fields.blendOption ? fields.blendOption : null;
			
			const download = require('image-downloader')
			
			var util = require('util'),
			exec = require('child_process').exec;
			
			var downloadFileSrc1 = null;
			var downloadFileSrc2 = null;
			
			if(blendImage1 && blendImage2 && blendOption){
				if(blendImage1.indexOf('unsplash.com') == -1){
					blendImage1 = blendImage1.replace('../','');
					blendImage1 = blendImage1.replace('/100/','/600/');
					blendImage1 = blendImage1.replace('/300/','/600/');
					blendImage1 = blendImage1.replace('/aspectfit/','/600/');
					blendImage1 = blendImage1.replace('/aspectfit_small/','/600/');
					blendImage1 = __dirname + "/../../public/"+blendImage1;
					nextStep_1();
				}
				else{
					blendImage1 = blendImage1.split('&')[0]+'&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=600&h=600&fit=crop&ixid=eyJhcHBfaWQiOjEyMDd9';
					
					downloadFileSrc1 = __dirname+'/../../media-assets/unsplash_store/'+"blendImage1_"+file_name.replace('png' , 'jpg');
					
					var commandToDownload = "curl -o "+downloadFileSrc1+" "+blendImage1;
					commandToDownload = commandToDownload.replace('https://','http://');
					//console.log("commandToDownload 1 = ",commandToDownload);
					exec(commandToDownload, function (error, stdout, stderr) {
						if (stdout) console.log(stdout);
						if (stderr) console.log(stderr);

						if (error) {
							console.log('exec error: ' + error);
						} else {
							im.crop({
								srcPath: downloadFileSrc1,
								dstPath: downloadFileSrc1,
								width: 600,
								height: 600,
								quality: 1,
								gravity: "Center"
							}, function(err, stdout, stderr){
								if (err){
									throw err;
								}else{
									blendImage1 = downloadFileSrc1;
									nextStep_1();
								}
							});
						}
					});
					 
				}
				
				function nextStep_1() {
					if(blendImage2.indexOf('unsplash.com') == -1){
						blendImage2 = blendImage2.replace('../','');
						blendImage2 = blendImage2.replace('/100/','/600/');
						blendImage2 = blendImage2.replace('/300/','/600/');
						blendImage2 = blendImage2.replace('/aspectfit/','/600/');
						blendImage2 = blendImage2.replace('/aspectfit_small/','/600/');
						blendImage2 = __dirname + "/../../public/"+blendImage2;
						nextStep_2();
					}
					else{
						
						blendImage2 = blendImage2.split('&')[0]+'&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=600&h=600&fit=crop&ixid=eyJhcHBfaWQiOjEyMDd9';
						
						downloadFileSrc2 = __dirname+'/../../media-assets/unsplash_store/'+"blendImage2_"+file_name.replace('png' , 'jpg');
					
						var commandToDownload = "curl -o "+downloadFileSrc2+" "+blendImage2;
						commandToDownload = commandToDownload.replace('https://','http://');
						//console.log("commandToDownload 2 = ",commandToDownload);
						exec(commandToDownload, function (error, stdout, stderr) {
							if (stdout) console.log(stdout);
							if (stderr) console.log(stderr);

							if (error) {
								console.log('exec error: ' + error);
							} else {
								im.crop({
									srcPath: downloadFileSrc2,
									dstPath: downloadFileSrc2,
									width: 600,
									height: 600,
									quality: 1,
									gravity: "Center"
								}, function(err, stdout, stderr){
									if (err){
										throw err;
									}else{
										blendImage2 = downloadFileSrc2;
										nextStep_2();
									}
								});
							}
						}); 
					}
				}
				
				function nextStep_2() {
					//console.log("In nextStep_2 -------------------------------");
					var command = "convert "+blendImage1+" "+blendImage2+" -compose difference -composite "+uploadDir+"/"+file_name;
					
					switch(blendOption) {
						case "difference":
							command = "convert "+blendImage1+" "+blendImage2+" -compose difference -composite "+uploadDir+"/"+file_name;
							break;
						case "soft-light":
							command = "convert "+blendImage2+" "+blendImage1+" -compose softlight -composite "+uploadDir+"/"+file_name;
							break;
						case "hard-light":
							command = "convert "+blendImage2+" "+blendImage1+" -compose hardlight -composite "+uploadDir+"/"+file_name;
							break;
						case "multiply":
							command = "composite "+blendImage1+" -compose Multiply "+blendImage2+" \ "+uploadDir+"/"+file_name;
							break;
						case "screen":
							command = "convert "+blendImage1+" "+blendImage2+" -compose screen -composite "+uploadDir+"/"+file_name;
							break;
						case "lighten":
							command = "convert "+blendImage1+" "+blendImage2+" -compose lighten -composite "+uploadDir+"/"+file_name;
							break;
						case "overlay":
							command = "convert "+blendImage1+" "+blendImage2+" -compose Overlay -composite "+uploadDir+"/"+file_name;
							break;
						case "darken":
							command = "convert "+blendImage1+" "+blendImage2+" -compose darken -composite "+uploadDir+"/"+file_name;
							break;
						default:
							console.log("-----Wrong Input for blendOption-----");
					}
					
					
					exec(command, function (error, stdout, stderr) {
						if (stdout) console.log(stdout);
						if (stderr) console.log(stderr);

						if (error) {
							console.log('exec error: ' + error);
							//response.statusCode = 404;
							//response.end();

						} else {
							if (fs.existsSync(downloadFileSrc1)) {
								fs.unlink(downloadFileSrc1, function(err, result) {
									if(err) console.log('error', err);
								});
							}
							
							if (fs.existsSync(downloadFileSrc2)) {
								fs.unlink(downloadFileSrc2, function(err, result) {
									if(err) console.log('error', err);
								});
							}
							
							//console.log("==========Successfully converted to "+uploadDir+"/"+file_name);
							
							
							var media_type = 'Image';
							var content_type = "image/png";

							//add thumbnail code
							var imgUrl = file_name;
							var mediaCenterPath = "/../../public/assets/Media/img/";
							var srcPath = __dirname + mediaCenterPath + imgUrl;

							if (fs.existsSync(srcPath)) {
								var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+ imgUrl;
								var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail+"/"+ imgUrl;
								var dstPathCrop_MEDIUM = __dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl;
								var dstPathCrop_LARGE = __dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl;
								var dstPathCrop_ORIGNAL = __dirname+ mediaCenterPath +process.urls.aspectfit__thumbnail+"/"+imgUrl;
								var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;
								
								try{
									crop_image(srcPath,dstPathCrop_SMALL,100,100);
									crop_image(srcPath,dstPathCrop_SG,300,300);
									crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
									//crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
									resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);
									resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

								}
								catch(err){
									console.log("Error Caught : ",err)
								}
							}
							
							if (req.session.user.FSGs) {
							
							}
							else{
								req.session.user.FSGs={};
							}
										
							dataToUpload={
								Location:[],
								UploadedBy:"user",
								UploadedOn:Date.now(),
								UploaderID:req.session.user._id,
								AutoId:incNum,
								Source:"Thinkstock",
								SourceUniqueID:"53ceb02d3aceabbe5d573dba", //updated on 06012015
								//Domains:fields.domain,
								Domains:"53ad6993f222ef325c05039c",
								GroupTags:[],
								//Collection:fields.collection,
								Collection:["53ceaf933aceabbe5d573db4","53ceaf9d3aceabbe5d573db6","549323f9610706c30a70679e"],
								Status:2, 
								MetaMetaTags:null,
								MetaTags:null,
								//AddedWhere:"hardDrive", //directToPf,hardDrive,dragDrop
								AddedWhere:"board", //directToPf,board,capsule
								IsDeleted:0,
								TagType:"",
								ContentType:content_type,
								MediaType:media_type,
								AddedHow:'blending',
								//OwnerFSGs:req.session.user.FSGs,
								OwnerFSGs:req.session.user.FSGsArr2,
								Locator:RecordLocator+"_"+incNum
							}
							if(fields.gt){ 
								dataToUpload.GroupTags.push({
									GroupTagID:fields.gt
								})
							}
							  
							dataToUpload.Location.push({
								Size:null,
								URL:file_name
							})
							
							//console.log('===========================================================================')
							//console.log(dataToUpload)
							//console.log('===========================================================================')
					
							media(dataToUpload).save(function(err,model){
								if(err){		    
									console.log("error",err);
									res.json({code : 501, data : {}});
								}
								else{
									console.log("Data",model)
									dataToUpload._id = model._id;
									res.json({code : 200, data : dataToUpload});
								}
							});
						}
					});
				}
			}
			else{
			
			}
		}
    })
    
}
exports.postBlendingImage = postBlendingImage;

/*
var uploadHeader_old = function(req,res){
    
    var form = new formidable.IncomingForm();        	
	
	form.parse(req, function(err, fields, files) {
	  var file_name="";
	  
	    if(files.myFile.name){
			if (typeof(req.query.type)!='undefined') {
				uploadDir = __dirname + "/../../public/assets/board/backgroundAudio";
			}else{
				uploadDir = __dirname + "/../../public/assets/board/headerImg";
				//uploadDir = __dirname + "/../../public/assets/Media/headers/orignal";   
			}		
			file_name=files.myFile.name;
			file_name=file_name.split('.');
			ext=file_name[file_name.length-1];
			name=Date.now();
			file_name=name+'.'+ext;
			
			fs.rename(files.myFile.path, uploadDir + "/" + file_name);
			if (typeof(req.query.type)!='undefined') {
				var dataToUpload = {
					BackgroundMusic:file_name
				};
			}
			else{
				var dataToUpload = {
					HeaderImage:file_name
				};
			}
			
			var media_type='Image';
			var query={_id:req.query.id};
			var options = { multi: true };		
			board.update(query, { $set: dataToUpload}, options, callback)
	    }
	    
	    function callback (err, numAffected) {
			if(err){
				res.json({"code":"404","message":err});
			}
			else{
				res.json({"code":"200","message":"Success","result":dataToUpload});		    
			}
	    }	  
	})
    
}
*/
var uploadHeader = async function(req,res){
    try {
        const formidable = require('formidable');
        const sharp = require('sharp');
        const { uploadBufferToS3, s3UriToHttps } = require('../utilities/awsS3Utils');
        
        const form = new formidable.IncomingForm();
        
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        });
        
        if (!files.myFile) {
            return res.json({"code":"400","message":"No file uploaded"});
        }
        
        const file = files.myFile;
        
        // Handle case where file is an array (formidable sometimes returns arrays)
        const actualFile = Array.isArray(file) ? file[0] : file;
        
        if (!actualFile) {
            return res.json({"code":"400","message":"No file uploaded"});
        }
        
        // Validate file type - allow all common image formats
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'image/bmp', 'image/tiff', 'image/svg+xml', 'image/ico', 'image/heic',
            'image/avif', 'image/jxl', 'image/tga', 'image/psd'
        ];
        
        // Check if mimetype is valid or if it's a common image extension
        const fileName = actualFile.originalFilename || actualFile.name || '';
        const fileExtension = fileName ? fileName.toLowerCase().split('.').pop() : '';
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'ico', 'heic', 'avif', 'jxl', 'tga', 'psd'];
        
        const fileMimetype = actualFile.mimetype || actualFile.type || '';
        const isValidImage = allowedTypes.includes(fileMimetype) || imageExtensions.includes(fileExtension);
        
        if (!isValidImage) {
            return res.json({"code":"400","message":"Invalid file type. Only images are allowed."});
        }
        
        const timestamp = Date.now();
        const baseName = `board-header-${timestamp}`;
        
        // Process image with Sharp
        let processedImageBuffer;
        try {
            // Check if file exists and is readable
            const fs = require('fs');
            const filePath = actualFile.filepath || actualFile.path;
            
            if (!filePath || !fs.existsSync(filePath)) {
                throw new Error(`File not found at path: ${filePath}`);
            }
            
            // Convert to WebP and optimize
            processedImageBuffer = await sharp(filePath)
                .webp({ quality: 85, effort: 6 })
                .resize(1200, 630, { 
                    fit: 'cover',
                    position: 'center'
                })
                .toBuffer();
                
        } catch (sharpError) {
            // Clean up temporary file
            const fs = require('fs');
            const filePath = actualFile.filepath || actualFile.path;
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return res.json({"code":"500","message":"Image processing failed", "error": sharpError.message});
        }
        
        // Upload to S3
        const s3Key = `scrptMedia/board-headers/${baseName}.webp`;
        const uploadResult = await uploadBufferToS3(
            processedImageBuffer, 
            s3Key, 
            'image/webp'
        );
        
        // Clean up temporary file after processing
        const fs = require('fs');
        const filePath = actualFile.filepath || actualFile.path;
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        if (!uploadResult.success) {
            return res.json({"code":"500","message":"S3 upload failed"});
        }
        
        // Generate HTTPS URL
        const s3Uri = `s3://${uploadResult.bucket}/${s3Key}`;
        const httpsUrl = s3UriToHttps(s3Uri);
        
        // Update board with header image URL
        const boardId = req.query.id || (fields.id && Array.isArray(fields.id) ? fields.id[0] : fields.id);
        if (!boardId) {
            return res.json({"code":"400","message":"Board ID is required"});
        }
        
        const dataToUpload = req.query.type ? 
            { BackgroundMusic: httpsUrl } : 
            { HeaderImage: httpsUrl };
            
        const query = { _id: boardId };
        const options = { multi: true };
        
        await board.updateOne(query, { $set: dataToUpload }, options);
        
        res.json({
            "code": "200",
            "message": "Header uploaded successfully",
            "result": {
                ...dataToUpload,
                s3Key: s3Key,
                fileSize: processedImageBuffer.length,
                originalSize: actualFile.size,
                compressionRatio: ((actualFile.size - processedImageBuffer.length) / actualFile.size * 100).toFixed(2) + '%'
            }
        });
        
    } catch(err) {
        res.json({"code":"500","message":"Upload failed", "error": err.message});
    }
}
exports.uploadHeader = uploadHeader;


var duplicate = async function(req,res){
    try {
    console.log(req.body)
        const result = await board.find({_id:req.body.id}).exec();
        
        if (result.length === 0) {
            res.json({"code":"404","message":"Board not found"});
            return;
        }
        
	    //delete result[0].Comments;
	    //delete result[0].Medias;
	    //delete result[0].Invitees;
	    // Convert Mongoose document to plain object
	    var fields = result[0].toObject();
	    
	    // Clean up fields for duplication
	    fields.Comments = null;
	    fields.Medias = null;
	    fields.Invitees = null;
	    fields.TotalVoteCount = 0;
	    fields.Title = req.body.title;
	    fields._id = null;
	    fields.CreatedDate = new Date();
	    fields.ModifiedDate = new Date();
	    
        await board(fields).save();
        
        // Increment boardsCount in the project
        if (result[0].ProjectID) {
            // First, ensure boardsCount is a number
            const projectDoc = await project.findById(result[0].ProjectID);
            if (projectDoc) {
                const currentCount = typeof projectDoc.boardsCount === 'string' 
                    ? parseInt(projectDoc.boardsCount) || 0 
                    : projectDoc.boardsCount || 0;
                
                await project.updateOne(
                    { _id: result[0].ProjectID },
                    { $set: { boardsCount: currentCount + 1 } }
                );
            }
        }
        
		    res.json({"code":"200","message":result[0].ProjectID});
    } catch(err) {
        res.json({"code":"404","message":err});
		}	
}
exports.duplicate = duplicate;


var addComment = function(req,res){
    board.find({_id:req.body.id}).then(function(result){
	var fields={};
	fields.Comments=[];
	
	//added by manishp on 22012015, will use this for real-time notification
	fields.CommentObjModifiedOn = Date.now();
	//added by manishp on 22012015, will use this for real-time notification

	
	if (typeof(result[0].Comments)!='undefined') {
	    if(result[0].Comments!=null) {
		fields.Comments=result[0].Comments;
	    }    
	}
	
	fields.Comments.push({
	    CommentText:req.body.comment,
	    CommentedBy:req.session.user._id,
	    CommentedOn:Date.now(),
	    CommentStatus:0
	})
	var query={_id:req.body.id};
	var options = { multi: false };
	board.update(query, { $set: fields}, options).then(function(numAffected) {
		findAll(req,res)
	}).catch(function(err) {
		res.json(err)
	})
    }).catch(function(err) {
	res.json(err)
    })
}
exports.addComment = addComment;

var deleteOne = async function(req,res){
	try {
	console.log("Request Body : ",req.body);
		
		// First, get the board to find its ProjectID before deletion
		const boardToDelete = await board.findOne({_id: req.body.boardId});
		
	var fields={
	    isDeleted:1
	};
	var query={_id:req.body.boardId};
	var options = { multi: false };
		
		// Mark board as deleted
		await board.updateOne(query, { $set: fields}, options);
		
		// Decrement boardsCount in the project
		if (boardToDelete && boardToDelete.ProjectID) {
			// First, ensure boardsCount is a number
			const projectDoc = await project.findById(boardToDelete.ProjectID);
			if (projectDoc) {
				const currentCount = typeof projectDoc.boardsCount === 'string' 
					? parseInt(projectDoc.boardsCount) || 0 
					: projectDoc.boardsCount || 0;
				
				const newCount = Math.max(0, currentCount - 1); // Ensure count doesn't go below 0
				
				await project.updateOne(
					{ _id: boardToDelete.ProjectID },
					{ $set: { boardsCount: newCount } }
				);
			}
		}
		
		var fields={};
		if(typeof(req.body.projId)!='undefined'){
		    fields['ProjectID']=req.body.projId;	
		}
		if(typeof(req.body.id)!='undefined') {
		    fields['_id']=req.body.id;
		}
		if (typeof(req.body.gt)!='undefined' && typeof(req.body.gt)=='String') {
		    fields['Medias.ThemeID']=req.body.gt;
		}
		
		fields['isDeleted']=0;
		const result = await board.find(fields).populate('Domain Collection ProjectID OwnerID Medias.PostedBy Invitees.UserID').exec();
		
		    if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
			}
			else{
				if (req.session.user) {
					if (result[0].PrivacySetting[0].BoardType=='FriendsSolo' && result[0].OwnerID._id!=req.session.user._id) {
						var showMedias=result;			
						var medias=[];
						
						for(i=0;i<result[0].Medias.length;i++){
						
						if (String(result[0].Medias[i].PostedBy._id)==String(result[0].OwnerID._id) || String(result[0].Medias[i].PostedBy._id)==String(req.session.user._id)) {			    
							medias.push(result[0].Medias[i]);
						}
						}
						result[0].Medias=[];
						result[0].Medias=medias;
						
						
					}
				}
				res.json({"code":"200","msg":"Success","response":result})
			}
	} catch(err) {
			res.json(err);
	}
}
exports.deleteOne = deleteOne;

/*
var addMembers = function(req,res){
    var members = req.body.emails;
    members=members.split(',');
    var boardId = req.body.id;
    user.find({Email:{$in:members}},function(err,result){
	if(!err){
	    ///For existing users of the system
	    for(i in result){
		var key = members.indexOf(result[i].Email);
		members.splice(key,1);
		findUser(result[i].Email,result[i]._id,boardId,result[i])		
	    }
	    
	    ///For non-existing users of the system
	    for(j in members){
		findUser(members[j],"",boardId)				       
	    }
	    
	    function findUser(email,id,boardIds,userDetail){
		if (id!="") {		    
		    sendmail(email,"login");
		    addUser(id,email,boardIds,userDetail);		    		    
		}
		else{
		    sendmail(email,"register");		    
		    addUserEmail(email,boardIds);		    
		}
	    }
	    
	    function addUserEmail(email,boardId1){		
		
		boardInvitees({UserId:null,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:null}).save();
		
	    }
	    
	    function addUser(user,email,boardId1,userDetail){
		
		boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:null}).save();
		
		board.findOne({_id:boardId1},function(err,result){
		    if(!err){
			if(result.Invitees){
			    var flag=0;
			    for(i in result.Invitees){
				if (result.Invitees[i].UserID==userDetail._id) {
				    flag=1;
				}				
			    }
			    if (flag==0) {
				result.Invitees.push({UserID:userDetail._id,UserEmail:userDetail.Email,UserName:userDetail.Name,UserNickName:userDetail.NickName})
			    }
			    
			}
			else{
			    result.Invitees=[];
			    result.Invitees.push({UserID:userDetail._id,UserEmail:userDetail.Email,UserName:userDetail.Name,UserNickName:userDetail.NickName})
			}
			result.save();
		    }    
		})
				
	    }
	    
	    /////send board invitational mail to all members
	    function sendmail(to,type){
		if (type=='register') {
		    type=type+'/'+new Buffer(to).toString('base64');
		}
		console.log(type);
		var transporter = nodemailer.createTransport({
		    service: 'Gmail',
		    auth: {
			user: 'chhangani.amit@gmail.com',
			pass: 'mohinidevi'
		    }
		});		
		
		// setup e-mail data with unicode symbols
		var mailOptions = {
		    from: 'Amit Chhangani  <chhangani.amit@gmail.com>', // sender address
		    to: to, // list of receivers
		    subject: 'You are invited to join my board on Scrpt',
		    text: 'http://203.100.79.94:8101/#/'+type+'/'+boardId, 
		    html: '<a href="http://203.100.79.94:8101/#/'+type+'/'+boardId+'">http://203.100.79.94:8101/#/'+type+'/'+boardId+'</a>'
		};
		
		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
		    if(error){
			console.log(error);
		    }else{
			console.log('Message sent to: '+to + info.response);
		    }
		});
		
	    }
	    /////send board invitational mail to all members ENDS
	}
    })
    
    res.json({"code":"200","message":"success"});
}

exports.addMembers = addMembers;
*/
/*
var addMember = function(req,res){
    var member = req.body.email;
    var name = req.body.name;
    var relation = req.body.relation;
    
    var boardId = req.body.id;
    
    ///Search if User exists
    user.find({Email:member},function(err,resul){
	if(!err){
	    
	    ///For existing users of the system
	    if (resul.length) {
			//sendmail(resul[0].Email,"login",boardId);
			sendmail(resul[0].Email,"login",boardId,req.session.user.Email);
			addUser(resul[0].Email,boardId,resul[0]._id,resul[0]);
	    }
	    ///For non-existing users of the system
	    else{
			//sendmail(member,"register",boardId)
			sendmail(member,"register",boardId,req.session.user.Email);		    
			addUser(member,boardId);
	    }
	   
	    
	    
	    function addUser(email,boardId1,user,userDetail){
		
			if (user) {
				board.findOne({_id:boardId1},function(err,result){
					if(!err){
						if(result.Invitees){
							var flag=0;
							for(var i=0;i<result.Invitees.length;i++){
								
								if (String(result.Invitees[i].UserID)==String(userDetail._id)) {
									flag=1;
								}				
							}
							if (flag==0) {
								result.Invitees.push({UserID:userDetail._id,UserEmail:userDetail.Email,UserName:userDetail.Name,UserNickName:userDetail.NickName})
								//boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:null,UserName:name,Relation:relation,SenderId:req.session.user._id}).save();
								boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:Date.now(),UserName:name,Relation:relation,SenderId:req.session.user._id}).save();
								result.save();
							}
						}
						else{
							result.Invitees=[];
							result.Invitees.push({UserID:userDetail._id,UserEmail:userDetail.Email,UserName:userDetail.Name,UserNickName:userDetail.NickName})
							result.save();
							//boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:null,UserName:name,Relation:relation,SenderId:req.session.user._id}).save(); //updated on 12012015
							boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:Date.now(),UserName:name,Relation:relation,SenderId:req.session.user._id}).save(); //updated on 12012015
						}
						
					}    
				})
			}else{
				console.log(" else User :", user)
				boardInvitees({UserId:null,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:null,UserName:name,Relation:relation,SenderId:req.session.user._id}).save();
			}
		}
	}
    })
    
    res.json({"code":"200","message":"success"});
}
*/


var addMember = function(req,res){
    var member = req.body.email;
    var name = req.body.name;
    var relation = req.body.relation;
    
    var boardId = req.body.id;
    
    ///Search if User exists
    user.find({Email:member},function(err,resul){
	if(!err){
	    
	    ///For existing users of the system
	    if (resul.length) {
			if (resul[0].Email == req.session.user.Email) {
				res.json({"code":"400","message":"can not invite yourself"});
			}else{
				//sendmail(resul[0].Email,"login",boardId);
				sendmail(resul[0].Email,"login",boardId,req.session.user.Email);
				addUser(resul[0].Email,boardId,resul[0]._id,resul[0]);
				res.json({"code":"200","message":"success"});
			}
	    }
	    ///For non-existing users of the system
	    else{
			//sendmail(member,"register",boardId)
			sendmail(member,"register",boardId,req.session.user.Email);		    
			addUser(member,boardId);
			res.json({"code":"200","message":"success"});
	    }
	   
	    
	    
	    function addUser(email,boardId1,user,userDetail){
		
			if (user) {
				board.findOne({_id:boardId1},function(err,result){
					if(!err){
						if(result.Invitees){
							var flag=0;
							for(var i=0;i<result.Invitees.length;i++){
								
								if (String(result.Invitees[i].UserID)==String(userDetail._id)) {
									flag=1;
								}				
							}
							if (flag==0) {
								result.Invitees.push({UserID:userDetail._id,UserEmail:userDetail.Email,UserName:userDetail.Name,UserNickName:userDetail.NickName})
								//boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:null,UserName:name,Relation:relation,SenderId:req.session.user._id}).save();
								boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:Date.now(),UserName:name,Relation:relation,SenderId:req.session.user._id}).save();
								result.save();
							}
						}
						else{
							result.Invitees=[];
							result.Invitees.push({UserID:userDetail._id,UserEmail:userDetail.Email,UserName:userDetail.Name,UserNickName:userDetail.NickName})
							result.save();
							//boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:null,UserName:name,Relation:relation,SenderId:req.session.user._id}).save(); //updated on 12012015
							boardInvitees({UserId:user,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:Date.now(),UserName:name,Relation:relation,SenderId:req.session.user._id}).save(); //updated on 12012015
						}
						
					}    
				})
			}else{
				console.log(" else User :", user)
				boardInvitees({UserId:null,BoardId:boardId1,UserEmail:email,InvitationSent:Date.now(),AcceptedOn:null,UserName:name,Relation:relation,SenderId:req.session.user._id}).save();
			}
		}
	}
    })
    
    
}

exports.addMember = addMember;


/////send board invitational mail to all members
function sendmail(to,type,boardId,senderEmailId){
    if (type=='register') {
	type=type+'/'+new Buffer(to).toString('base64');
    }
    console.log(type);
    var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
	    //user: 'chhangani.amit@gmail.com',
	    //pass: 'mohinidevi'
	    user: 'collabmedia.scrpt@gmail.com',
	    pass: 'scrpt123_2014collabmedia#1909'
	}
    });		
    
    // setup e-mail data with unicode symbols
    var mailOptions = {
	from: 'collabmedia support  <collabmedia.scrpt@gmail.com>', // sender address
	to: to, // list of receivers
	subject: 'You are invited to join my board on Scrpt',
	text: 'http://203.100.79.94:8888/#/'+type+'/'+boardId, 
	html: 'You are invited by '+senderEmailId+' to join his/her board on Scrpt.<br />click the below link to join this board<br /><a href="http://203.100.79.94:8888/#/'+type+'/'+boardId+'">http://203.100.79.94:8888/#/'+type+'/'+boardId+'</a><br /><br />Regards<br />collabmedia.scrpt@gmail.com'
    };
    
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
	if(error){
	    console.log(error);
	}else{
	    console.log('Message sent to: '+to + info.response);
	}
    });
    
}
/////send board invitational mail to all members ENDS


var createGroupTag = function(req,res){
    
    gtfields={
	GroupTagTitle:req.body.gtsa,
	Notes:req.body.gtNotes,
	DateAdded:Date.now(),
	MetaMetaTagID:null,
	MetaTagID:null,
	status:2
    };
    
    groupTags(gtfields).save(function(err,data){
	if(err){
	    res.json(err);
	}
	else{
	    req.body.themeid=data.id;
	    addGroupTag(req,res);
	}
    });
}

exports.createGroupTag = createGroupTag;

var addGroupTag = async function(req,res){
    try {
        const result = await board.find({_id:req.body.id}).exec();
        
        if (result.length === 0) {
            res.json({"code":"404","message":"Board not found"});
            return;
        }
        
	var fields={};
	if (result[0].Themes==null) {
	    fields.Themes=[];
	}
	else{
	    fields.Themes = result[0].Themes;
	}
	var isApproved=0;
	if (req.body.isapproved) {
	    isApproved=req.body.isapproved;
	}
	fields.Themes.push({
            ThemeID:req.body.themeId, 
            ThemeTitle:req.body.themeTitle,
	    SuggestedBy:req.session.user._id,
	    SuggestedOn:Date.now(),
	    isApproved:isApproved
	});
	
	
	var query={_id:req.body.id};
	var options = { multi: true };
	
        await board.updateOne(query, { $set: fields}, options);
	    findAll(req,res);
    } catch(err) {
        res.json(err);
    }
}

exports.addGroupTag = addGroupTag;

var deleteGroupTag = function(req,res){
    board.findById(req.body.id,function(err,result){
		var key="";
		console.log("Theme to delete: "+req.body.themeid)
		for(i in result.Themes){
			//if (result.Themes[i].ThemeID==req.body.themeid && result.Themes[i].ThemeTitle==req.body.gtsa) {
			if (result.Themes[i].ThemeID==req.body.themeid) {
				key=result.Themes[i]._id;
			}
		}
		console.log("Key: "+key)
		if( key ){
			result.Themes.id(key).remove();
		}
		
		result.save(function(err){
			//res.json({"code":"200","message":"Theme deleted successfully!"});    
			//req.body.id = req.body.board;
			findAll(req,res);
		});
	
	
    });
    
}

exports.deleteGroupTag = deleteGroupTag;

var deleteInvitee = function(req,res){
    console.log("called");
    board.findById(req.body.id,function(err,result){
	var key="";
	for(i in result.Invitees){
	    if (result.Invitees[i].UserID==req.body.user) {
		key=result.Invitees[i]._id;
	    }
	}
	result.Invitees.id(key).remove();
	result.save(function(err){
	    res.json({"code":"200","message":"User deleted successfully!"});    
	});
	
	
    });
    
}

exports.deleteInvitee = deleteInvitee;

var moveBoard = function(req,res){
    var query={_id:req.body.board};
    var options = { multi: true };
    var fields={};
    fields.ProjectID=req.body.project;
    fields.ProjectTitle=req.body.projectTitle;
    board.update(query, { $set: fields}, options, function(err,numAffected){
	if(err){
	    res.json({"code":"404","msg":err})
	}
	else{
	    res.json({"code":"200","message":"Board Moved successfully!"});    
	}
    });
}

exports.moveBoard=moveBoard;


var deleteMedia = function(req,res){
	console.log("----deleteMedia-----");
	var boardId = req.body.id ? req.body.id : null;
	var postId = req.body.post_id ? req.body.post_id : null;
	var conditions = {
		"Medias._id" : postId
	};
	var pullObj = {
		 $pull : { "Medias" : {"_id":postId} }
	};
	
	//delete the post stream as well
	PageStream.remove({PostId: new mongoose.Types.ObjectId(postId)}, function (err, result) {
		console.log("err - ", err);
		//console.log("result - ", result);
	});

	board.update(conditions,pullObj,function(err,result){
		if(!err){
			res.json({"code":"200","message":"Media deleted successfully!"});
		}
		else{
			res.json({"code":"501","message":"Error!"});
		}
	});
}

exports.deleteMedia = deleteMedia;

var renameBoard = function(req,res){
    var query={_id:req.body.id};
    var options = { multi: true };
    var fields={};
    fields.Title=req.body.title;
    board.update(query, { $set: fields}, options, function(err,numAffected){
	if(err){
	    res.json({"code":"404","msg":err})
	}
	else{
	    res.json({"code":"200","message":"Board Title Changed successfully!"});    
	}
    });
}

exports.renameBoard=renameBoard;

var renameTheme = function(req,res){
    board.findById(req.body.board,function(err,result){
	var key="";
	for(i in result.Themes){
	    if (result.Themes[i].ThemeID==req.body.id) {
		key=result.Themes[i]._id;
	    }
	}
	var theme=result.Themes.id(key);
	theme.ThemeID=req.body.id;
	theme.ThemeTitle=req.body.title;	
	
	result.save(function(err){
		req.body.id = req.body.board;
		findAll(req,res);
	    //res.json({"code":"200","message":"Theme renamed successfully!"});    
	});
	
	
    });
    
}


exports.renameTheme=renameTheme;

var myInvitees=function(req,res){
    if(req.session.user) {
	boardInvitees.find({SenderId:req.session.user._id},function(err,result){
	    if (err) {
		res.json({"code":"404","message":err})
	    }
	    else{
		res.json({"code":"200","message":"success","response":result})
	    }
	    
	    
	});
    }
    else{
	res.json({"code":"404","message":"Not authorised"})
    }
}
exports.myInvitees=myInvitees;


var myBoards__old=function(req,res){
    if(req.session.user) {
	board.find({$or:[{"Invitees.UserID":req.session.user._id},{OwnerId:req.session.user._id}],IsDeleted:{'$ne':1}},{Medias:0},function(err,result){	    
	    if (err) {
		res.json({"code":"404","message":err})
	    }
	    else{
		res.json({"code":"200","message":"success","response":result})
	    }
	});
    }
    else{
	res.json({"code":"503","message":"Not authorised"})
    }
}
var myBoards=function(req,res){
	var limit = req.body.perPage ? req.body.perPage : 0 ;
	var offset = req.body.offset ? req.body.offset : 0 ;
    if(req.session.user) {
		var conditions = {
			$or : [
				{PageType : 'gallery'},
				{PageType : 'qaw-gallery'}
			],
			OwnerId:req.session.user._id,
			/*$or:[
				//{"Invitees.UserID":req.session.user._id},
				{OwnerId:req.session.user._id}
			],*/
			//IsLaunched : 1,
			IsDasheditpage : false,
			IsDeleted:0
		};
		var fields = {
			Medias:0,
			CommonParams : 0,
			ViewportDesktopSections : 0,
			ViewportTabletSections : 0,
			ViewportMobileSections : 0
		};
		var sortObj = {
			CreatedOn : -1
		};
		if(req.body.sortBy){
			var sortObjBy = req.body.sortBy;
			if(sortObjBy == "Title"){
				sortObj = {
					//Order : 1,
					Title : -1
				};  
			}else if(sortObjBy == "CreatedOn"){
				sortObj = {
					//Order : 1,
					CreatedOn : -1
				};  
			}else if(sortObjBy == "UpdatedOn"){
				sortObj = {
					//Order : 1,
					UpdatedOn : -1
				};  
			}else if(sortObjBy == "CreatedOnAsc"){
				sortObj = {
					//Order : 1,
					CreatedOn : 1
				};  
			}else if(sortObjBy == "UpdatedOnAsc"){
				sortObj = {
					//Order : 1,
					UpdatedOn : 1
				};  
			}else if(sortObjBy == "TitleAsc"){
				sortObj = {
					//Order : 1,
					Title : 1
				};  
			}
		}
		
		board.find(conditions,fields).sort(sortObj).skip(offset).limit(limit).exec(function(err,result){	    
			if (err) {
				res.json({"code":"404","message":err})
			}
			else{
				board.find(conditions,fields).count().exec(function(err,dataLength){
					if (err) {
					   res.json({"code":"404","message":err})
					}else{
						console.log('--------------------------');
						console.log(dataLength);
						console.log('--------------------------');
						if (dataLength > ( offset + limit )) {
							var more = true ; 
						}else{
							var more = false ; 
						}
						res.json({"code":"200","message":"success","response":result, "hasMore" : more});				
					}
				})
			
			}
		});
    }
    else{
		res.json({"code":"503","message":"Not authorised"})
    }
}
exports.myBoards=myBoards;

var addBoardMediaToBoard = function(req,res){
    var ix=0;
    var flag=0;
    var mediaArray=[];
    board.find({_id:req.body.board},function(err,resul){
	if (!err) {
	    for(var i=0;i<req.body.media.length;i++){
			for(var j=0;j<resul[0].Medias.length;j++){
				if (resul[0].Medias[j]._id==req.body.media[i]) {
				flag++;
				//console.log("Before : ",resul[0].Medias[j])
				delete resul[0].Medias[j]._id;
				
				delete resul[0].Medias[j].Locator;
				var obj = { MediaID: resul[0].Medias[j].MediaID,
					MediaURL:  resul[0].Medias[j].MediaURL,
					Title:  resul[0].Medias[j].Title,
					Prompt:  resul[0].Medias[j].Prompt,
					Locator:  resul[0].Medias[j].Locator,
					PostedBy:  req.session.user._id,
					PostedOn:  resul[0].Medias[j].PostedOn,
					ThemeID:  req.body.gt,
					ThemeTitle:  resul[0].Medias[j].ThemeTitle,
					MediaType:  resul[0].Medias[j].MediaType,
					ContentType:  resul[0].Medias[j].ContentType,
					OwnerId:  resul[0].Medias[j].OwnerId,
					Marks:  resul[0].Medias[j].Marks,
					Votes:  resul[0].Medias[j].Votes,
					Content:  resul[0].Medias[j].Content
				}
				
				mediaArray.push(obj)
					if (flag==req.body.media.length) {
						callback(mediaArray)    
					}			
				}
			}
	    }
	}
	
	function callback(mediaArr){		
	    board.findOne({_id:req.body.id},function(err,result){
		ix++;
		if (result.Medias) {
		    
		}
		else{
		    result.Medias=[];
		}
		for(i in mediaArr){
		    result.Medias.push(mediaArr[i]);
		}
		result.save(function(err,resutl){
		    if (!err) {
			mediaActionCtrl.logMediaAction_RepostArr(req,res,mediaArr)
		    }
		});
	    });	
	}
	
	
    })
    
}
exports.addBoardMediaToBoard = addBoardMediaToBoard;



//parul 14012015
var cmntVote=function(req,res){
	//console.log(req.body);
	board.findOne({_id:req.body.boardId},function(err,data){
		if(!err){
			if (data) {
				//console.log(data);
				//console.log('found data');
				if (data.Comments.length!=0) {
					for (i in data.Comments) {
						
						//console.log('here2');
						if (data.Comments[i]._id==req.body.cmntId) {
							//console.log('found comment');
							if (data.Comments[i].Votes.length!=0) {
								var alreadyCmntd=false;
								for (j in data.Comments[i].Votes) {
									if (data.Comments[i].Votes[j].VotedBy==req.body.voterId) {
										alreadyCmntd=true;
									}
								}
								if (alreadyCmntd!=true) {
									//console.log('new vote');
									var newVote={};
									newVote.VotedBy=req.body.voterId;
									data.Comments[i].Votes.push(newVote);
									data.save();
									//console.log('data saved');
									res.json({"code":"200","message":"success"})
								}
								else{
									//console.log('already voted');
									res.json({"code":"400","message":"already commented"})
								}
							}
							else{
								//console.log('new vote');
								var newVote={};
								newVote.VotedBy=req.body.voterId;
								data.Comments[i].Votes.push(newVote);
								data.save();
								//console.log('data saved');
								res.json({"code":"200","message":"success"})
							}
						}
					}
					
				}
				
			}else
			{
				res.json({"code":"404","message":"board not found"})
			}
			
		}else{
			res.json({"code":"400","message":"err"})
		}	
	})
	
}
exports.cmntVote=cmntVote;

//end parul 14012015
/*________________________________________________________________________
	* @Date:      	19 Jan 2015
	* @Method :   	cmntDelete
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to delete comments from overpass.
	* @Param:     	
	* @Return:    	Yes
_________________________________________________________________________
*/ 
var cmntDelete=function(req,res){
	board.findOne({_id:req.body.boardId},function(err,data){
	if (!err) {
		for (i in data.Comments) {
			if (data.Comments[i]._id==req.body.cmntId) {
				var index=i;
			}
		}
		data.Comments.splice(index,1);
		data.save();
		res.json({"code":"200","message":"Deleted successfully","data":data});
	}
	else{
		res.json(err);
	}
	})
}
exports.cmntDelete=cmntDelete;

//common functions
/***
 * npm install imagemagick 
 * Image resize..
 * srcPath, dstPath and (at least one of) width and height are required. 
***/
//function resize_image(srcPath,dstPath,img_wh,flag){
//    var strtxt = srcPath+'|'+dstPath+'|'+img_wh+'|'+flag+'| _thumb';
//    console.log(strtxt);
//    var im   = require('imagemagick');
//    if(flag=='height'){
//        im.resize({
//        srcPath: srcPath,
//        dstPath: dstPath,
//        height:   img_wh,
//        quality: 0.8,
//        sharpening: 0.5,
//        }, function(err, stdout, stderr){
//            if (err) throw err;
//            console.log('Success.');
//        });    
//    }else{
//        im.resize({
//        srcPath: srcPath,
//        dstPath: dstPath,
//        width:   img_wh,
//        quality: 0.8,
//        sharpening: 0.5,
//        }, function(err, stdout, stderr){
//            if (err) throw err;
//            console.log('Success thumb.');
//        });    
//    }
//}

/***
 * Image crop..
 * Available gravity options are [NorthWest, North, NorthEast, West, Center, East, SouthWest, South, SouthEast]
***/

function crop_image_old(srcPath,dstPath,width,height){
    var strtxt = srcPath+'|'+dstPath+'|'+width+'|'+height+'| _crop';
    console.log(strtxt);
    
    var im   = require('imagemagick');
   
    im.crop({
        srcPath: srcPath,
        dstPath: dstPath,
        width: width,
        height: height+"^",
        quality: 1,
        gravity: "Center"
    }, function(err, stdout, stderr){
        if (err) throw err;
        console.log('Success crop.');
    });
}

function crop_image(srcPath, dstPath, width, height) {
	console.log("crop_image source : ", srcPath + " ---- destination : " + dstPath);
	var im = require('imagemagick');
	//var im = require('imagemagick').subClass({ imageMagick: true });
	if (srcPath.split('.').pop().toUpperCase() == 'GIF') {
		var easyimg = require('easyimage');
		try {
			easyimg.rescrop({
				src: srcPath,
				dst: dstPath,
				width: parseInt(width),
				height: parseInt(height),
				cropwidth: parseInt(width),
				cropheight: parseInt(height),
				background: "black",
				quality: 100,
				gravity: "Center"
			}).then(
				function (image) {
					console.log('Resized and cropped: ' + image.width + ' x ' + image.height);
				},
				function (err) {
					console.log("easyimg.crop-----------------------------", err);
				}
				);
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}
	else {
		try {
			im.crop({
				srcPath: srcPath,
				dstPath: dstPath,
				width: width,
				height: height,
				quality: 1,
				gravity: "Center"
			}, function (err, stdout, stderr) {
				if (err) throw err;
				console.log('success..');
			});
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}

}
//common functions

/*________________________________________________________________________
	* @Date:      	13 March 2015
	* @Method :   	resize_image
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to resize orignal media.
	* @Param:     	4
	* @Return:    	no
_________________________________________________________________________
*/
 //BY Parul 20022015
 
function resize_image_old(srcPath,dstPath,w,h){
	console.log("source : ",srcPath+" ---- destination : "+dstPath);
	var im   = require('imagemagick');
	
	try{
	im.identify(srcPath,function(err,features){
		if (err) {
			console.log(err);
		}else{
			console.log(features.width+"======================"+features.height);
			if (features.height >= 1440) {
				console.log('========================================================================== here');
				im.resize({
					srcPath: srcPath,
					dstPath: dstPath,
					//width: w,
					height: h,
					//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
					//gravity: 'Center' // optional: position crop area when using 'aspectfill'
				});
			}
			else if (features.width >= 2300) {
				console.log('========================================================================== here');
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
				console.log('========================================================================== here');
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
 
 var resize_image = function (srcPath, dstPath, w, h) {
	console.log("resize_image source : ", srcPath + " ---- destination : " + dstPath);
	var im = require('imagemagick');

	if (srcPath.split('.').pop().toUpperCase() == 'GIF') {
		var easyimg = require('easyimage');
		try {
			easyimg.info(srcPath).then(
				function (file) {
					var features = file;
					console.log("easyimg.info---------------", features);
					console.log(features.width + "======================" + features.height);
					if (parseInt(features.height) >= parseInt(h)) {
						console.log('========================================================================== here1');
						easyimg.resize({
							src: srcPath,
							dst: dstPath,
							width: parseInt(w),
							height: parseInt(h)
						}).then(
							function (data) {
								console.log("data----------------easyimg.resize-------", data);
							},
							function (err) {
								console.log("-----------------1231easyimg.resize-------", err);
							}
							);
					}
					else if (parseInt(features.width) >= parseInt(w)) {
						console.log('========================================================================== here2');
						easyimg.resize({
							src: srcPath,
							dst: dstPath,
							width: parseInt(w),
							height: parseInt(h)
						}).then(
							function (data) {
								console.log("data----------------easyimg.resize-------", data);
							},
							function (err) {
								console.log("-----------------1231easyimg.resize-------", err);
							}
							);
					}
					else {
						console.log('========================================================================== here3');
						easyimg.resize({
							src: srcPath,
							dst: dstPath,
							width: parseInt(features.width),
							height: parseInt(features.height)
						}).then(
							function (data) {
								console.log("data----------------easyimg.resize-------", data);
							},
							function (err) {
								console.log("-----------------1231easyimg.resize-------", err);
							}
							);
					}
				}, function (err) {
					console.log("-------------resize_image ERROR on easyimg.info---------------", err);
				}
			);
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}
	else {
		try {
			im.identify(srcPath, function (err, features) {
				if (err) {
					console.log("-------------resize_image ERROR on im.identify---------------", err);
				} else {
					console.log(features.width + "======================" + features.height);
					if (parseInt(features.height) >= parseInt(h)) {
						console.log('========================================================================== here1');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							//width: w,
							height: h
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
					else if (parseInt(features.width) >= parseInt(w)) {
						console.log('========================================================================== here2');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							width: w
							//height: 1440,
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
					else {
						console.log('========================================================================== here3');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							width: features.width,
							height: features.height
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
				}
			})
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}

	}
}
 
 /**************************** END IMAGE RESIZE ***************************************/
 
 
  
/*________________________________________________________________________
   * @Date:      	30 March 2015
   * @Method :   	board_Invitees
   * Created By: 	smartData Enterprises Ltd
   * Modified On:	-
   * @Purpose:   	gets invitaion sent by user for a specific board
   * @Param:     	2
   * @Return:    	yes
_________________________________________________________________________
*/
 //BY Parul 20022015
  
var board_Invitees = function(req,res){
    if(req.session.user) {
	boardInvitees.find({SenderId:req.session.user._id,BoardId:req.body.boardId, AcceptedOn:null},function(err,result){
	    if (err) {
		res.json({"code":"404","message":err})
	    }
	    else{
		res.json({"code":"200","message":"success","response":result})
	    }
	    
	    
	});
    }
    else{
	res.json({"code":"404","message":"Not authorised"})
    }
}
exports.board_Invitees = board_Invitees; 
  
/*________________________________________________________________________
   * @Date:      	07 July 2015
   * @Method :   	addFromBoards
   * Created By: 	smartData Enterprises Ltd
   * Modified On:	-
   * @Purpose:   	for add media from board section pagination
   * @Param:     	2
   * @Return:    	yes
_________________________________________________________________________
*/
 //BY Parul 20022015
 
 var addFromBoards = function(req,res){
    var perpage = 0;
    var offset = 0;
    var pageNo = 0;
    if(typeof(req.body.pageNo)!='undefined'){
        pageNo = parseInt(req.body.pageNo);
    }
    if(typeof(req.body.perPage)!='undefined'){
        perpage = parseInt(req.body.perPage);
    }
    if(typeof(req.body.perPage)!='undefined' && typeof(req.body.pageNo)!='undefined'){
        offset = (pageNo-1) * perpage;
    }
    console.log('-----  addFromBoards  starts  ------');
    var id = req.body.id;
    board.aggregate(
        [
            {'$match':{_id:new mongoose.Types.ObjectId(id)}},
            {'$unwind':'$Medias'},
            {'$match':{$or:[{'Medias.MediaType':'Image'},{'Medias.MediaType':'Link'},{'Medias.MediaType':'Montage'}]}},
            {'$project':{'Medias':1}},
            {'$sort':{'Medias.PostedOn':-1}},
            {'$skip':offset},
            {'$limit':perpage}
        ],
        function (err, results) {
            if (!err) {
                res.json({'code':200,'response':results});
            }else{
                res.json(err);
            }
        }
    )
    console.log('-----  addFromBoards  ends  ------');
    //return;
    //.populate('Domain Collection ProjectID OwnerID Medias.PostedBy Invitees.UserID Comments.CommentedBy')
 }
 exports.addFromBoards = addFromBoards;
 
 
 
   
/*________________________________________________________________________
   * @Date:      	08 July 2015
   * @Method :   	getCurrentBoardDetails
   * Created By: 	smartData Enterprises Ltd
   * Modified On:	-
   * @Purpose:   	to get current board details along with media
   * @Param:     	2
   * @Return:    	yes
_________________________________________________________________________
*/
/*
 var getCurrentBoardDetails= function(req,res){
	var fields={};
	//console.log()
	var perpage = 0;
	var offset = 0;
	var pageNo = 0;
    if(typeof(req.body.pageNo)!='undefined'){
		pageNo = parseInt(req.body.pageNo);
    }
    if(typeof(req.body.perPage)!='undefined'){
		perpage = parseInt(req.body.perPage);
    }
    if(typeof(req.body.perPage)!='undefined' && typeof(req.body.pageNo)!='undefined'){
		console.log('here');
		offset = (pageNo-1)*perpage;
    }
    if(typeof(req.body.project)!='undefined'){
		//fields['ProjectID']=req.body.project;	
    }
    if(typeof(req.body.id)!='undefined') {
		fields['_id']=req.body.id;
		//fields['_id']=new mongoose.Types.ObjectId(req.body.id)
    }
    if (typeof(req.body.gt)!='undefined' && typeof(req.body.gt)=='String') {
		//fields['Medias.ThemeID']=req.body.gt;
    }
    
    //fields['IsDeleted']=0;
	//console.log("---------conditions-------------------------------------------------------------",fields);
    board.find(fields,{_id:1,Title:1,Domain:1,OwnerId:1,ProjectID:1,isDeleted:1,Invitees:1,ModifiedDate:1,CreatedDate:1,PrivacySetting:1,Collection:1,HeaderImage:1})
	//.populate('Domain Collection ProjectID OwnerID Medias.PostedBy Invitees.UserID Comments.CommentedBy')
	.populate('Domain Collection OwnerId Medias.PostedBy')
	.exec(function(err,result){
		var boardData = result;
		if(err){
			//throw err;
			res.json(err);
		}
		else{
			if(result.length==0){
			res.json({"code":"404","msg":"Not Found..."})
			}
			else{
				var id = req.body.id;
				board.aggregate([
						{'$match':{_id:new mongoose.Types.ObjectId(id)}},
						{'$unwind':'$Medias'},
						{'$project':{'Medias':1}},
						{'$sort':{'Medias.PostedOn':-1}},
						{'$skip':offset},
						{'$limit':perpage}
					],
					function (err, results) {
						if (!err) {
							user.populate(results,{path:'Medias.PostedBy'},function(err,data){
								if (!err) {
									//res.json({'code':200,'response':results});
									res.json({"code":"200","msg":"Success","response":boardData,"media":results});
								}else{
									res.json(err);
								}
							})
						}else{
							res.json(err);
						}
					}
				)
				
			}
		}
    });
 }
 */
var getCurrentBoardDetails = function(req, res) {
    var fields = {};
    //console.log()
    var perpage = 0;
    var offset = 0;
    var pageNo = 0;
    if (typeof (req.body.pageNo) != 'undefined') {
        pageNo = parseInt(req.body.pageNo);
    }
    if (typeof (req.body.perPage) != 'undefined') {
        perpage = parseInt(req.body.perPage);
    }
    if (typeof (req.body.perPage) != 'undefined' && typeof (req.body.pageNo) != 'undefined') {
        console.log('here');
        offset = (pageNo - 1) * perpage;
    }
    if (typeof (req.body.project) != 'undefined') {
        //fields['ProjectID']=req.body.project;
    }
    if (typeof (req.body.id) != 'undefined') {
        fields['_id'] = req.body.id;
        //fields['_id']=new mongoose.Types.ObjectId(req.body.id)
    }
    if (typeof (req.body.gt) != 'undefined' && typeof (req.body.gt) == 'String') {
        //fields['Medias.ThemeID']=req.body.gt;
    }

    //fields['IsDeleted']=0;
    //console.log("---------conditions-------------------------------------------------------------",fields);
    board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1})
	//.populate('Domain Collection ProjectID OwnerID Medias.PostedBy Invitees.UserID Comments.CommentedBy')
	.populate('ChapterId Domain Collection OwnerId Medias.PostedBy')
	.exec(function(err, result) {
		var boardData = result;
		if (err) {
			//throw err;
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({"code": "404", "msg": "Not Found..."})
			}
			else {

				var id = req.body.id;
				
				if (result[0].ChapterId.LaunchSettings.ShareMode == 'friend-solo' && result[0].ChapterId.OwnerId != req.session.user._id) {
					board.aggregate([
							{'$match': {_id: new mongoose.Types.ObjectId(id)}},
							{'$unwind': '$Medias'},
							{'$project': {'Medias': 1}},
							{'$match': {$or:[{'Medias.PostedBy': new mongoose.Types.ObjectId(req.session.user._id)},{'Medias.PostedBy': new mongoose.Types.ObjectId(result[0].ChapterId.OwnerId)}]}},
							{'$sort': {'Medias.PostedOn': -1}},
							{'$skip': offset},
							{'$limit': perpage}
						],
						function(err, results) {
							if (!err) {
								user.populate(results, {path: 'Medias.PostedBy'}, function(err, data) {
									if (!err) {
										//res.json({'code':200,'response':results});
										res.json({"code": "200", "msg": "Success", "response": boardData, "media": results, 'mode': result[0].ChapterId.LaunchSettings.ShareMode, 'userId': req.session.user._id});
									} else {
										res.json(err);
									}
								})
							} else {
								res.json(err);
							}
						}
					)
				} else {
					board.aggregate([
							{'$match': {_id: new mongoose.Types.ObjectId(id)}},
							{'$unwind': '$Medias'},
							{'$project': {'Medias': 1}},
							{'$match': {}},
							{'$sort': {'Medias.PostedOn': -1}},
							{'$skip': offset},
							{'$limit': perpage}
						],
						function(err, results) {
							if (!err) {
								user.populate(results, {path: 'Medias.PostedBy'}, function(err, data) {
									if (!err) {
										//res.json({'code':200,'response':results});
										res.json({"code": "200", "msg": "Success", "response": boardData, "media": results, 'mode': result[0].ChapterId.LaunchSettings.ShareMode, 'userId': req.session.user._id});
									} else {
										res.json(err);
									}
								})
							} else {
								res.json(err);
							}
						}
					)
				}
			}
		}
	});
}


//this is with IsOnlyForOwner integration - IsOnlyForOwner__PosterPrivacyCheck - updated on 28 Sep 2017
var getCurrentBoardDetails_V2 = function(req, res) {
    var fields = {};
    var perpage = 0;
    var offset = 0;
    var pageNo = 0;
    if (typeof (req.body.pageNo) != 'undefined') {
        pageNo = parseInt(req.body.pageNo);
    }
    if (typeof (req.body.perPage) != 'undefined') {
        perpage = parseInt(req.body.perPage);
    }
    if (typeof (req.body.perPage) != 'undefined' && typeof (req.body.pageNo) != 'undefined') {
        console.log('here');
        offset = (pageNo - 1) * perpage;
    }
    if (typeof (req.body.project) != 'undefined') {
        //fields['ProjectID']=req.body.project;
    }
    if (typeof (req.body.id) != 'undefined') {
        fields['_id'] = req.body.id;
        //fields['_id']=new mongoose.Types.ObjectId(req.body.id)
    }
    if (typeof (req.body.gt) != 'undefined' && typeof (req.body.gt) == 'String') {
        //fields['Medias.ThemeID']=req.body.gt;
    }
	
	var dontSelect__ChaperFields = {
		'ChapterPlaylist' : 0
	};
	var dontSelect__UserFields = {
		'Name' : 1,
		'NickName' : 1,
		'Email' : 1,
		'ProfilePic' : 1
	};
	
    //fields['IsDeleted']=0;
    //console.log("---------conditions-------------------------------------------------------------",fields);
    board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1})
	//.populate('Domain Collection ProjectID OwnerID Medias.PostedBy Invitees.UserID Comments.CommentedBy')
	//.populate('ChapterId Domain Collection OwnerId Medias.PostedBy')
	//.populate('ChapterId OwnerId Medias.PostedBy')
	.populate([
		{ path: 'ChapterId', select: dontSelect__ChaperFields },
		{ path: 'OwnerId', select: dontSelect__UserFields },
		{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
		
	]).exec(function(err, result) {
		var boardData = result;
		if (err) {
			//throw err;
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({"code": "404", "msg": "Not Found..."})
			}
			else {

				var id = req.body.id;		//board id.
				var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
				var IsOnlyForOwner__PosterPrivacyCheck = {
					$or : [
						{"Medias.IsOnlyForOwner" : false},
						{"Medias.IsOnlyForOwner" : true,"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
					]
				};
				
				if (ShareMode__OwnerPrivacyCheck == 'friend-solo' && result[0].ChapterId.OwnerId != req.session.user._id) {
					board.aggregate([
							{'$match': {_id: new mongoose.Types.ObjectId(id)}},							
							{'$unwind': '$Medias'},
							
							{'$project': {'Medias': 1}},
							//{'$match': {$or:[{'Medias.PostedBy': new mongoose.Types.ObjectId(req.session.user._id)},{'Medias.PostedBy': new mongoose.Types.ObjectId(result[0].ChapterId.OwnerId)}]}},
							{
								'$match': {
									$or:[
										{
											'Medias.PostedBy': new mongoose.Types.ObjectId(req.session.user._id),
											$or : [
												{"Medias.IsOnlyForOwner" : false},
												{"Medias.IsOnlyForOwner" : true,"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
											]
										},
										{
											'Medias.PostedBy': new mongoose.Types.ObjectId(result[0].ChapterId.OwnerId),
											$or : [
												{"Medias.IsOnlyForOwner" : false},
												{"Medias.IsOnlyForOwner" : true,"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
											]
										}
									]
								}
							},							
							{'$sort': {'Medias.PostedOn': -1}},
							{'$skip': offset},
							{'$limit': perpage}
						],
						function(err, results) {
							if (!err) {
								user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
									if (!err) {
										//res.json({'code':200,'response':results});
										res.json({"code": "200", "msg": "Success1", "response": boardData, "media": results, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
									} else {
										res.json(err);
									}
								})
							} else {
								res.json(err);
							}
						}
					)
				} else {
					if( result[0].ChapterId.OwnerId == req.session.user._id ){	//No ShareMode__OwnerPrivacyCheck - checking whether this is Owner post listing or not...
						board.aggregate([
								{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
								{'$unwind': '$Medias'},
								
								{'$project': {'Medias': 1,'commentData':1}},
								{'$match': {}},
								{'$sort': {'Medias.PostedOn': -1}},
								{'$skip': offset},
								{'$limit': perpage}
							],
							function(err, results) {
								if (!err) {
									user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
										if (!err) {
											//res.json({'code':200,'response':results});
											res.json({"code": "200", "msg": "Success2", "response": boardData, "media": results, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
										} else {
											res.json(err);
										}
									})
								} else {
									res.json(err);
								}
							}
						)
					}
					else{	//No ShareMode__OwnerPrivacyCheck - this is member post listing - check poster__privacyCheckPerPost
						board.aggregate([
								{'$match': {_id: new mongoose.Types.ObjectId(id)}},
								
								{'$unwind': '$Medias'},
							
								{'$project': {'Medias': 1,'commentData':1}},
								{'$match': IsOnlyForOwner__PosterPrivacyCheck},
								{'$sort': {'Medias.PostedOn': -1}},
								{'$skip': offset},
								{'$limit': perpage}
							],
							function(err, results) {
								if (!err) {
									user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
										if (!err) {
											//res.json({'code':200,'response':results});
											res.json({"code": "200", "msg": "Success3", "response": boardData, "media": results});
										} else {
											res.json(err);
										}
									})
								} else {
									res.json(err);
								}
							}
						)
					}
				}
			}
		}
	});
}

//this is with IsOnlyForOwner integration - IsOnlyForOwner__PosterPrivacyCheck - updated on 28 Sep 2017
//-updated again on 02 Jan 2019 - for cafe post filter options...
var getCurrentBoardDetails_V3_WithFilters = function(req, res) {
	var fields = {};
	var perpage = 0;
	var offset = 0;
	var pageNo = 0;
	if (typeof (req.body.pageNo) != 'undefined') {
		pageNo = parseInt(req.body.pageNo);
	}
	if (typeof (req.body.perPage) != 'undefined') {
		perpage = parseInt(req.body.perPage);
	}
	if (typeof (req.body.perPage) != 'undefined' && typeof (req.body.pageNo) != 'undefined') {
		console.log('here');
		offset = (pageNo - 1) * perpage;
	}
	if (typeof (req.body.project) != 'undefined') {
		//fields['ProjectID']=req.body.project;
	}
	if (typeof (req.body.id) != 'undefined') {
		fields['_id'] = req.body.id;
		//fields['_id']=new mongoose.Types.ObjectId(req.body.id)
	}
	if (typeof (req.body.gt) != 'undefined' && typeof (req.body.gt) == 'String') {
		//fields['Medias.ThemeID']=req.body.gt;
	}
	
	var dontSelect__ChaperFields = {
		'ChapterPlaylist' : 0
	};
	var dontSelect__UserFields = {
		'Name' : 1,
		'NickName' : 1,
		'Email' : 1,
		'ProfilePic' : 1
	};
	
	
	if(!req.body.criteria) {
		board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1})
		.populate([
			{ path: 'ChapterId', select: dontSelect__ChaperFields },
			{ path: 'OwnerId', select: dontSelect__UserFields },
			{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			
		]).exec(function(err, result) {
			var boardData = result;
			if (err) {
				//throw err;
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({"code": "404", "msg": "Not Found..."})
				}
				else {

					var id = req.body.id;		//board id.
					var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
					var IsOnlyForOwner__PosterPrivacyCheck = {
						$or : [
							{"Medias.IsOnlyForOwner" : false},
							{"Medias.IsOnlyForOwner" : true,"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
						]
					};
					
					if (ShareMode__OwnerPrivacyCheck == 'friend-solo' && result[0].ChapterId.OwnerId != req.session.user._id) {
						board.aggregate([
								{'$match': {_id: new mongoose.Types.ObjectId(id)}},							
								{'$unwind': '$Medias'},
								
								{'$project': {'Medias': 1}},
								{
									'$match': {
										$or:[
											{
												'Medias.PostedBy': new mongoose.Types.ObjectId(req.session.user._id),
												$or : [
													{"Medias.IsOnlyForOwner" : false},
													{"Medias.IsOnlyForOwner" : true,"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
												]
											},
											{
												'Medias.PostedBy': new mongoose.Types.ObjectId(result[0].ChapterId.OwnerId),
												$or : [
													{"Medias.IsOnlyForOwner" : false},
													{"Medias.IsOnlyForOwner" : true,"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
												]
											}
										]
									}
								},							
								{'$sort': {'Medias.PostedOn': -1}},
								{'$skip': offset},
								{'$limit': perpage}
							],
							function(err, results) {
								if (!err) {
									user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
										if (!err) {
											//res.json({'code':200,'response':results});
											res.json({"code": "200", "msg": "Success1", "response": boardData, "media": results, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
										} else {
											res.json(err);
										}
									})
								} else {
									res.json(err);
								}
							}
						)
					} else {
						if( result[0].ChapterId.OwnerId == req.session.user._id ){	//No ShareMode__OwnerPrivacyCheck - checking whether this is Owner post listing or not...
							board.aggregate([
									{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1,'commentData':1}},
									{'$match': {}},
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success2", "response": boardData, "media": results, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						}
						else{	//No ShareMode__OwnerPrivacyCheck - this is member post listing - check poster__privacyCheckPerPost
							board.aggregate([
									{'$match': {_id: new mongoose.Types.ObjectId(id)}},
									
									{'$unwind': '$Medias'},
								
									{'$project': {'Medias': 1,'commentData':1}},
									{'$match': IsOnlyForOwner__PosterPrivacyCheck},
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success3", "response": boardData, "media": results});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						}
					}
				}
			}
		});
	}
	else if(req.body.criteria == "MyPosts"){
		board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1})
		.populate([
			{ path: 'ChapterId', select: dontSelect__ChaperFields },
			{ path: 'OwnerId', select: dontSelect__UserFields },
			{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			
		]).exec(function(err, result) {
			var boardData = result;
			if (err) {
				//throw err;
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({"code": "404", "msg": "Not Found..."})
				}
				else {

					var id = req.body.id;		//board id.
					var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
					
					board.aggregate([
							{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
							{'$unwind': '$Medias'},
							
							{'$project': {'Medias': 1,'commentData':1}},
							{'$match': {"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}},
							{'$sort': {'Medias.PostedOn': -1}},
							{'$skip': offset},
							{'$limit': perpage}
						],
						function(err, results) {
							if (!err) {
								user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
									if (!err) {
										//res.json({'code':200,'response':results});
										res.json({"code": "200", "msg": "Success2", "response": boardData, "media": results, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
									} else {
										res.json(err);
									}
								})
							} else {
								res.json(err);
							}
						}
					)
				}
			}
		});
	
	}
	else if(req.body.criteria == "GlobalCommunity"){
		board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1 , Themes : 1})
		.populate([
			{ path: 'ChapterId', select: dontSelect__ChaperFields },
			{ path: 'OwnerId', select: dontSelect__UserFields },
			{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			
		]).exec(function(err, result) {
			var boardData = result;
			boardData = boardData ? boardData : [];
			if (err) {
				//throw err;
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({"code": "404", "msg": "Not Found..."})
				}
				else {
					var id = req.body.id;		//board id.
				
					var matchCond = {};
					matchCond["_id"] = {$ne : mongoose.Types.ObjectId(id)};
					//matchCond["Origin"] = "journal";
					//matchCond["Medias.IsAdminApproved"] = false;
					matchCond["IsDeleted"] = false;
					
					var attachedThemes = [];
					if(boardData.length){
						boardData[0].Themes = boardData[0].Themes ? boardData[0].Themes :[];
						var themesCount = boardData[0].Themes.length;
						if(boardData[0].Themes.length){
							for(var loop = 0; loop < themesCount ; loop++){
								attachedThemes.push(boardData[0].Themes[loop].id);
							}
						}
						if(attachedThemes.length){
							matchCond["Medias.Themes.id"] = {$in : attachedThemes};
							//matchCond["Medias.Themes.id"] = {$in : attachedThemes};
						}
					}
					console.log("matchCond ---------- @@@@@@",matchCond);

					var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
					
					if(attachedThemes.length){
						if(String(id) != String(req.session.user.AllPagesId)){
							board.aggregate([
									//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
									{'$match': matchCond},
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1}},
									{'$match': 
										{
											"Medias.Themes.id" : {$in : attachedThemes},
											"Medias.IsOnlyForOwner" : false ,
											$or: [
												{ 'Medias.IsAdminApproved': { $exists: false } },
												{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
											]
										}
									},						
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success1", "response": boardData, "media": results, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						}
						else{
							board.aggregate([
									//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
									{'$match': matchCond},
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1}},
									{'$match': 
										{
											//"Medias.Themes.id" : {$in : attachedThemes},
											"Medias.IsOnlyForOwner" : false ,
											$or: [
												{ 'Medias.IsAdminApproved': { $exists: false } },
												{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
											]
										}
									},						
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success1", "response": boardData, "media": results, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						}
					}
					else{
						if(String(id) == String(req.session.user.AllPagesId)){
							board.aggregate([
									//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
									{'$match': matchCond},
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1}},
									{'$match': 
										{
											//"Medias.Themes.id" : {$in : attachedThemes},
											"Medias.IsOnlyForOwner" : false ,
											$or: [
												{ 'Medias.IsAdminApproved': { $exists: false } },
												{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
											]
										}
									},						
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success1", "response": boardData, "media": results, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						}
						else{
							res.json({"code": "200", "msg": "Success1", "response": boardData, "media": [], 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
						}
					}
				}
			}
		});
	}
	else{
		console.log("---------UNWANTED CASE-------------");
		res.json({code:501 , message : "---------UNWANTED CASE-------------"});
	}
}

function __updateResults(results){
	var tmpResults = [];
	var results = JSON.parse(JSON.stringify(results));
	
	for(var loop = 0; loop < results.length; loop++){
		var record = {};
		record = results[loop];
		record.Medias = record.Medias ? record.Medias : {};
		record.Medias.PostPrivacySetting = record.Medias.PostPrivacySetting ? record.Medias.PostPrivacySetting : "PublicWithoutName";
		
		record.Medias.PostedBy = record.Medias.PostedBy ? record.Medias.PostedBy : {};
		if(record.Medias.PostPrivacySetting == "PublicWithoutName"){
			record.Medias.PostedBy.Name = "";
			record.Medias.PostedBy.NickName = "";
			record.Medias.PostedBy.ProfilePic = "";
		}
		
		tmpResults.push(record);
	}
	return tmpResults;
}

function getLabelsArr (results) {
	var LabelsArr = [];
	for(var loop = 0; loop < results.length; loop++){
		var record = {};
		record = results[loop];
		if(record.Medias.Label){
			LabelsArr.push(record.Medias.Label);
		}
	}
	return LabelsArr;
}

var getCurrentBoardDetails_V4_WithPrivacySettings = function(req, res) {
	if(req.body.post_id) {
		var fields = {};
		var perpage = 0;
		var offset = 0;
		var pageNo = 0;
		if (typeof (req.body.pageNo) != 'undefined') {
			pageNo = parseInt(req.body.pageNo);
		}
		if (typeof (req.body.perPage) != 'undefined') {
			perpage = parseInt(req.body.perPage);
		}
		if (typeof (req.body.perPage) != 'undefined' && typeof (req.body.pageNo) != 'undefined') {
			console.log('here');
			offset = (pageNo - 1) * perpage;
		}
		if (typeof (req.body.project) != 'undefined') {
			//fields['ProjectID']=req.body.project;
		}
		if (typeof (req.body.id) != 'undefined') {
			fields['_id'] = req.body.id;
			//fields['_id']=new mongoose.Types.ObjectId(req.body.id)
		}
		if (typeof (req.body.gt) != 'undefined' && typeof (req.body.gt) == 'String') {
			//fields['Medias.ThemeID']=req.body.gt;
		}
		
		var dontSelect__ChaperFields = {
			'ChapterPlaylist' : 0
		};
		var dontSelect__UserFields = {
			'Name' : 1,
			'NickName' : 1,
			//'Email' : 1,
			'ProfilePic' : 1
		};
		var mediaMatchCond = {
			"Medias._id" : mongoose.Types.ObjectId(req.body.post_id)
		};
		
		board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
		.populate([
			{ path: 'ChapterId', select: dontSelect__ChaperFields },
			{ path: 'OwnerId', select: dontSelect__UserFields },
			{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			
		]).exec(function(err, result) {
			var boardData = result;
			
			var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
			
			board.aggregate([
				{
					'$match': {
						"Medias._id" : mongoose.Types.ObjectId(req.body.post_id),
						IsDeleted: false, 
						IsDasheditpage : false,
						PageType : {$in: ["gallery", "qaw-gallery"]}
					}
				},
				{'$unwind': '$Medias'},
				{'$project': {'OwnerId':1,'Medias': 1,'commentData':1}},
				{
					'$match': mediaMatchCond
				},		
				{'$sort': {'Medias.PostedOn': -1}},
				{'$skip': offset},
				{'$limit': perpage}
			],
			function(err, results) {
				if (!err) {
					user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
						if (!err) {
							//console.log("data-------------------------------",data);
							var finalResults = __updateResults(results);
							res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
						} else {
							res.json(err);
						}
					})
				} else {
					res.json(err);
				}
			});
		});
	} else {
		var CapsuleForParam = req.body.CapsuleFor ? req.body.CapsuleFor : null;
		if(CapsuleForParam == 'Theme') {
			getCurrentBoardDetails_CapsuleForThemeCases(req , res);
			
		}
		else {
			var fields = {};
			var perpage = 0;
			var offset = 0;
			var pageNo = 0;
			if (typeof (req.body.pageNo) != 'undefined') {
				pageNo = parseInt(req.body.pageNo);
			}
			if (typeof (req.body.perPage) != 'undefined') {
				perpage = parseInt(req.body.perPage);
			}
			if (typeof (req.body.perPage) != 'undefined' && typeof (req.body.pageNo) != 'undefined') {
				console.log('here');
				offset = (pageNo - 1) * perpage;
			}
			if (typeof (req.body.project) != 'undefined') {
				//fields['ProjectID']=req.body.project;
			}
			if (typeof (req.body.id) != 'undefined') {
				fields['_id'] = req.body.id;
				//fields['_id']=new mongoose.Types.ObjectId(req.body.id)
			}
			if (typeof (req.body.gt) != 'undefined' && typeof (req.body.gt) == 'String') {
				//fields['Medias.ThemeID']=req.body.gt;
			}
			
			var dontSelect__ChaperFields = {
				'ChapterPlaylist' : 0
			};
			var dontSelect__UserFields = {
				'Name' : 1,
				'NickName' : 1,
				//'Email' : 1,
				'ProfilePic' : 1
			};
			
			if(req.body.criteria == 'MePlusMyFriends') {
				req.body.criteria = null;
			}
			
			if(!req.body.criteria) {
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							var IsOnlyForOwner__PosterPrivacyCheck = {
								$or : [
									{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
									{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
								]
							};
							
							if(String(id) != String(req.session.user.AllPagesId)){
								if (ShareMode__OwnerPrivacyCheck == 'friend-solo' && result[0].ChapterId.OwnerId != req.session.user._id) {
									
									var mediaMatchCond = {
										$or:[
											{
												'Medias.PostedBy': new mongoose.Types.ObjectId(req.session.user._id),
												$or : [
													{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
													{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
												]
											},
											{
												'Medias.PostedBy': new mongoose.Types.ObjectId(result[0].ChapterId.OwnerId),
												$or : [
													{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
													{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
												]
											},
											{
												"Medias.TaggedUsers" : req.session.user.Email
											}
										]
									};
										
									var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
									if(searchByTagName) {
										mediaMatchCond["Medias.Themes"] = {
											$elemMatch : {
												"text" : searchByTagName
											}
										};
									};
									
									var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
									if(searchByLabel) {
										mediaMatchCond["Medias.Label"] = searchByLabel;
									}
									
									board.aggregate([
											{'$match': {_id: new mongoose.Types.ObjectId(id)}},							
											{'$unwind': '$Medias'},
											
											{'$project': {'Medias': 1}},
											{
												'$match': mediaMatchCond
											},							
											{'$sort': {'Medias.PostedOn': -1}},
											{'$skip': offset},
											{'$limit': perpage}
										],
										function(err, results) {
											if (!err) {
												user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
													if (!err) {
													
														var finalResults = __updateResults(results);
													
														//res.json({'code':200,'response':results});
														res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
													} else {
														res.json(err);
													}
												})
											} else {
												res.json(err);
											}
										}
									)
								} else {
									if( result[0].ChapterId.OwnerId == req.session.user._id ){	//No ShareMode__OwnerPrivacyCheck - checking whether this is Owner post listing or not...
										
										var mediaMatchCond = {};
										
										var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
										if(searchByTagName) {
											mediaMatchCond["Medias.Themes"] = {
												$elemMatch : {
													"text" : searchByTagName
												}
											};
										}
										
										var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
										if(searchByLabel) {
											mediaMatchCond["Medias.Label"] = searchByLabel;
										}
										
										board.aggregate([
												{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
												{'$unwind': '$Medias'},
												
												{'$project': {'Medias': 1,'commentData':1}},
												{'$match': mediaMatchCond},
												{'$sort': {'Medias.PostedOn': -1}},
												{'$skip': offset},
												{'$limit': perpage}
											],
											function(err, results) {
												if (!err) {
													user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
														if (!err) {
															
															var finalResults = __updateResults(results);
															
															//res.json({'code':200,'response':results});
															res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
														} else {
															res.json(err);
														}
													})
												} else {
													res.json(err);
												}
											}
										)
									}
									else{	//No ShareMode__OwnerPrivacyCheck - this is member post listing - check poster__privacyCheckPerPost
									
										var mediaMatchCond = {
											$or : [
												{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
												{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)},
												{
													"Medias.TaggedUsers" : req.session.user.Email
												}
											]
										};
										
										var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
										if(searchByTagName) {
											mediaMatchCond["Medias.Themes"] = {
												$elemMatch : {
													"text" : searchByTagName
												}
											};
										}
										var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
										if(searchByLabel) {
											mediaMatchCond["Medias.Label"] = searchByLabel;
										}
										
										board.aggregate([
												{'$match': {_id: new mongoose.Types.ObjectId(id)}},
												
												{'$unwind': '$Medias'},
											
												{'$project': {'Medias': 1,'commentData':1}},
												{
													'$match': mediaMatchCond
												},
												{'$sort': {'Medias.PostedOn': -1}},
												{'$skip': offset},
												{'$limit': perpage}
											],
											function(err, results) {
												if (!err) {
													user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
														if (!err) {
															
															var finalResults = __updateResults(results);
														
															//res.json({'code':200,'response':results});
															res.json({"code": "200", "msg": "Success3", "response": boardData, "media": finalResults, LabelsArr : getLabelsArr(finalResults)});
														} else {
															res.json(err);
														}
													})
												} else {
													res.json(err);
												}
											}
										)
									}
								}
							}
							else{
								var mediaMatchCond = {
									$or : [
										{OwnerId : {$ne : String(req.session.user._id)} , "Medias.PostedBy" : mongoose.Types.ObjectId(req.session.user._id)},
										{OwnerId: String(req.session.user._id)},
										{OwnerId : {$ne : String(req.session.user._id)}, "Medias.TaggedUsers" : req.session.user.Email}
									]
									//"Medias.PostedBy" : new mongoose.Types.ObjectId(req.session.user._id)
									//"Medias.Origin" : {$nin : ["Copy"]}
								};
								
								var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
								if(searchByTagName) {
									mediaMatchCond["Medias.Themes"] = {
										$elemMatch : {
											"text" : searchByTagName
										}
									};
								}
								
								var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
								if(searchByLabel) {
									mediaMatchCond["Medias.Label"] = searchByLabel;
								}
								
								board.aggregate([
										{
											'$match': {
												/*
												$or : [
													{OwnerId: String(req.session.user._id)},
													{"LaunchSettings.Invitees.UserEmail" :req.session.user.Email}
												],
												*/
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'OwnerId':1,'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							
							}
						}
					}
				});
			}
			else if(req.body.criteria == "MyPosts" && !req.body.IsAddedFromStream){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							
							var mediaMatchCond = {
								"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id),
								"$or" : [
									{ 'Medias.IsAddedFromStream': { $exists: false } },
									{ 'Medias.IsAddedFromStream': { $exists: true }, 'Medias.IsAddedFromStream': false }
								]
							};
							
							var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
							if(searchByTagName) {
								mediaMatchCond["Medias.Themes"] = { 
									$elemMatch : {
										"text" : searchByTagName
									}
								};
								
							}
							var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
							if(searchByLabel) {
								mediaMatchCond["Medias.Label"] = searchByLabel;
							}
							
							if(String(id) != String(req.session.user.AllPagesId)){
								board.aggregate([
										{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{	//If General Page - Show all my posts in Space or Capsules
								board.aggregate([
										{
											'$match': {
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
						}
					}
				});
			
			}
			//Streams - MyPosts case
			else if(req.body.criteria == "MyPosts" && req.body.IsAddedFromStream  && !req.body.IsPostForUser && !req.body.IsPostForTeam){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							
							var streamId = req.body.StreamId ? req.body.StreamId : null;
							if(!streamId) {
								return res.json({"code": "200", "msg": "Success2", "response": boardData, "media": [], 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : []});
							}
							var mediaMatchCond = {
								$or : [
									{ 'Medias.QuestionPostId': {$exists : false} },
									{ 'Medias.QuestionPostId': null },
									{ 'Medias.QuestionPostId': '' }
								],
								"Medias.StreamId" : mongoose.Types.ObjectId(streamId),
								"Medias.PostPrivacySetting" : "OnlyForOwner",
								"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id),
								'Medias.IsAddedFromStream': { $exists: true },
								'Medias.IsAddedFromStream': true,
								'$and' : [
									{
										'$or' : [
											{'Medias.IsPostForUser': { $exists: false }},
											{'Medias.IsPostForUser': { $exists: true }, 'Medias.IsPostForUser': false}
										]
									},
									{
										'$or' : [
											{'Medias.IsPostForTeam': { $exists: false }},
											{'Medias.IsPostForTeam': { $exists: true }, 'Medias.IsPostForTeam': false}
										]
									}
								]
							};
							
							var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
							if(searchByTagName) {
								mediaMatchCond["Medias.Themes"] = { 
									$elemMatch : {
										"text" : searchByTagName
									}
								};
								
							}
							var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
							if(searchByLabel) {
								mediaMatchCond["Medias.Label"] = searchByLabel;
							}
							
							if(String(id) != String(req.session.user.AllPagesId)){
								board.aggregate([
										{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{	//If General Page - Show all my posts in Space or Capsules
								board.aggregate([
										{
											'$match': {
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
						}
					}
				});
			}
			//Streams - MyPosts case
			else if(req.body.criteria == "MyStreamPosts"){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							
							var streamId = req.body.StreamId ? req.body.StreamId : null;
							if(!streamId) {
								return res.json({"code": "200", "msg": "Success2", "response": boardData, "media": [], 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : []});
							}
							var mediaMatchCond = {
								//"Medias.StreamId" : mongoose.Types.ObjectId(streamId),
								"Medias.PostType" : { $in : ["KeyPost", "GeneralPost"] },
								"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)
							};
							
							var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
							if(searchByTagName) {
								mediaMatchCond["Medias.Themes"] = { 
									$elemMatch : {
										"text" : searchByTagName
									}
								};
								
							}
							var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
							if(searchByLabel) {
								mediaMatchCond["Medias.Label"] = searchByLabel;
							}
							
							if(String(id) != String(req.session.user.AllPagesId)){
								board.aggregate([
										{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{	//If General Page - Show all my posts in Space or Capsules
								board.aggregate([
										{
											'$match': {
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
						}
					}
				});
			}
			//Stream - Community posts case
			else if(req.body.criteria == "GlobalCommunity" && req.body.IsAddedFromStream){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							
							var streamId = req.body.StreamId ? req.body.StreamId : null;
							if(!streamId) {
								return res.json({"code": "200", "msg": "Success2", "response": boardData, "media": [], 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : []});
							}
							var mediaMatchCond = {
								"Medias.StreamId" : mongoose.Types.ObjectId(streamId),
								"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
								//"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id),
								'Medias.IsAddedFromStream': { $exists: true },
								'Medias.IsAddedFromStream': true,
								'$and' : [
									{
										'$or' : [
											{'Medias.IsPostForUser': { $exists: false }},
											{'Medias.IsPostForUser': { $exists: true }, 'Medias.IsPostForUser': false}
										]
									},
									{
										'$or' : [
											{'Medias.IsPostForTeam': { $exists: false }},
											{'Medias.IsPostForTeam': { $exists: true }, 'Medias.IsPostForTeam': false}
										]
									}
								]
							};
							
							var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
							if(searchByTagName) {
								mediaMatchCond["Medias.Themes"] = { 
									$elemMatch : {
										"text" : searchByTagName
									}
								};
								
							}
							var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
							if(searchByLabel) {
								mediaMatchCond["Medias.Label"] = searchByLabel;
							}
							
							if(String(id) != String(req.session.user.AllPagesId)){
								board.aggregate([
										//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
										{'$match': {}},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{	//If General Page - Show all my posts in Space or Capsules
								board.aggregate([
										{
											'$match': {
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
						}
					}
				});
			
			}
			//Stream - Out Chats case
			else if(req.body.criteria == "MyPosts" && req.body.IsAddedFromStream && (req.body.IsPostForUser || req.body.IsPostForTeam)){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							
							req.body.SelectedUser = req.body.SelectedUser ? req.body.SelectedUser : {};
							var SelectedUserId = req.body.SelectedUser.UserId ? req.body.SelectedUser.UserId : null;
							var SelectedUserEmail = req.body.SelectedUser.Email ? req.body.SelectedUser.Email : null;
							var PostedBy = [mongoose.Types.ObjectId(req.session.user._id)];
							var TaggedUsers = [req.session.user.Email];
							if(SelectedUserId && SelectedUserEmail) {
								if(req.body.IsPostForUser) { //no need for team case
									PostedBy.push(mongoose.Types.ObjectId(SelectedUserId));
								}
								TaggedUsers.push(SelectedUserEmail);
							}
							
							var mediaMatchCond = {};
							if(req.body.IsPostForUser) {
								mediaMatchCond = {
									"Medias.PostedBy": {$in : PostedBy},
									'Medias.IsAddedFromStream': { $exists: true },
									'Medias.IsAddedFromStream': true,
									'Medias.IsPostForUser': { $exists: true },
									'Medias.IsPostForUser': true,
									"Medias.TaggedUsers" : { '$in' : TaggedUsers }
								};
							}
							
							if(req.body.IsPostForTeam) {
								mediaMatchCond = {
									//"Medias.PostedBy": {$in : PostedBy},
									'Medias.IsAddedFromStream': { $exists: true },
									'Medias.IsAddedFromStream': true,
									'Medias.IsPostForTeam': { $exists: true },
									'Medias.IsPostForTeam': true,
									"Medias.TaggedUsers" : { '$in' : TaggedUsers }
								};
							}
							
							var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
							if(searchByTagName) {
								mediaMatchCond["Medias.Themes"] = { 
									$elemMatch : {
										"text" : searchByTagName
									}
								};
								
							}
							var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
							if(searchByLabel) {
								mediaMatchCond["Medias.Label"] = searchByLabel;
							}
							
							if(String(id) != String(req.session.user.AllPagesId)){
								board.aggregate([
										{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{	//If General Page - Show all my posts in Space or Capsules
								board.aggregate([
										{
											'$match': {
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
						}
					}
				});
			
			}
			else if(req.body.criteria == "GlobalCommunity" && !req.body.IsAddedFromStream){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, TitleInvitees: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1 , Themes : 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					boardData = boardData ? boardData : [];
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {
							var id = req.body.id;		//board id.
						
							var matchCond = {};
							matchCond["_id"] = {$ne : mongoose.Types.ObjectId(id)};
							//matchCond["Origin"] = "journal";
							//matchCond["Medias.IsAdminApproved"] = false;
							matchCond["IsDeleted"] = false;
							matchCond["IsDasheditpage"] = false;
							matchCond["PageType"] = {$in: ["gallery", "qaw-gallery"]};
							var attachedThemes = [];
							if(boardData.length){
								boardData[0].Themes = boardData[0].Themes ? boardData[0].Themes :[];
								var themesCount = boardData[0].Themes.length;
								if(boardData[0].Themes.length){
									for(var loop = 0; loop < themesCount ; loop++){
										if(boardData[0].Themes[loop].id){
											attachedThemes.push(boardData[0].Themes[loop].id);
										}
									}
								}
								if(attachedThemes.length){
									matchCond["Medias.Themes.id"] = {$in : attachedThemes};
									//matchCond["Medias.Themes.id"] = {$in : attachedThemes};
								}
							}
							console.log("matchCond ---------- @@@@@@",matchCond);

							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							
							if(attachedThemes.length){
								if(String(id) != String(req.session.user.AllPagesId)){
									var mediaMatchCond = {
										"Medias.Themes.id" : {$in : attachedThemes},
										"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
										$or: [
											{ 'Medias.IsAdminApproved': { $exists: false } },
											{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
										],
										"Medias.Origin" : {$nin : ["Copy"]}
									};
									
									var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
									if(searchByTagName) {
										mediaMatchCond = {
											"Medias.Themes" : {
												$elemMatch : {
													"text" : searchByTagName
												}
											},
											"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
											$or: [
												{ 'Medias.IsAdminApproved': { $exists: false } },
												{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
											],
											"Medias.Origin" : {$nin : ["Copy"]}
										};
									}
									
									var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
									if(searchByLabel) {
										mediaMatchCond["Medias.Label"] = searchByLabel;
									}
									
									board.aggregate([
											//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
											{'$match': matchCond},
											{'$unwind': '$Medias'},
											
											{'$project': {'Medias': 1}},
											{'$match': mediaMatchCond},						
											{'$sort': {'Medias.PostedOn': -1}},
											{'$skip': offset},
											{'$limit': perpage}
										],
										function(err, results) {
											if (!err) {
												user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
													if (!err) {
														
														var finalResults = __updateResults(results);
													
														//res.json({'code':200,'response':results});
														res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
													} else {
														res.json(err);
													}
												})
											} else {
												res.json(err);
											}
										}
									)
								}
								else{
									var mediaMatchCond = {
										"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
										$or: [
											{ 'Medias.IsAdminApproved': { $exists: false } },
											{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
										],
										"Medias.Origin" : {$nin : ["Copy"]}
									};
									
									var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
									if(searchByTagName) {
										mediaMatchCond["Medias.Themes"] = { 
											$elemMatch : {
												"text" : searchByTagName
											}
										};
										
									}
									
									var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
									if(searchByLabel) {
										mediaMatchCond["Medias.Label"] = searchByLabel;
									}
									
									board.aggregate([
											//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
											{'$match': matchCond},
											{'$unwind': '$Medias'},
											
											{'$project': {'Medias': 1}},
											{'$match': mediaMatchCond},						
											{'$sort': {'Medias.PostedOn': -1}},
											{'$skip': offset},
											{'$limit': perpage}
										],
										function(err, results) {
											if (!err) {
												user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
													if (!err) {
													
														var finalResults = __updateResults(results);
														//res.json({'code':200,'response':results});
														res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
													} else {
														res.json(err);
													}
												})
											} else {
												res.json(err);
											}
										}
									)
								}
							}
							else{
								var mediaMatchCond = {
									"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
									$or: [
										{ 'Medias.IsAdminApproved': { $exists: false } },
										{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
									],
									"Medias.Origin" : {$nin : ["Copy"]}
								};
								
								var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
								if(searchByTagName) {
									mediaMatchCond["Medias.Themes"] = { 
										$elemMatch : {
											"text" : searchByTagName
										}
									};
									
								}
								
								var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
								if(searchByLabel) {
									mediaMatchCond["Medias.Label"] = searchByLabel;
								}
								
								if(String(id) == String(req.session.user.AllPagesId)){
									board.aggregate([
											//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
											{'$match': matchCond},
											{'$unwind': '$Medias'},
											
											{'$project': {'Medias': 1}},
											{'$match': mediaMatchCond},						
											{'$sort': {'Medias.PostedOn': -1}},
											{'$skip': offset},
											{'$limit': perpage}
										],
										function(err, results) {
											if (!err) {
												user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
													if (!err) {
													
														var finalResults = __updateResults(results);
														//res.json({'code':200,'response':results});
														res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
													} else {
														res.json(err);
													}
												})
											} else {
												res.json(err);
											}
										}
									)
								}
								else{
									res.json({"code": "200", "msg": "Success1", "response": boardData, "media": [], 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
								}
							}
						}
					}
				});
			}
			else if(req.body.criteria == "All"){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, Themes: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							var IsOnlyForOwner__PosterPrivacyCheck = {
								$or : [
									{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
									{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
								]
							};
							
							var matchCond = {};
							var matchCond_2 = [];
							//matchCond["Origin"] = "journal";
							//matchCond["Medias.IsAdminApproved"] = false;
							matchCond["IsDeleted"] = false;
							matchCond["IsDasheditpage"] = false;
							matchCond["PageType"] = {$in: ["gallery", "qaw-gallery"]};
							var attachedThemes = [];
							if(boardData.length){
								boardData[0].Themes = boardData[0].Themes ? boardData[0].Themes :[];
								var themesCount = boardData[0].Themes.length;
								if(boardData[0].Themes.length){
									for(var loop = 0; loop < themesCount ; loop++){
										if(boardData[0].Themes[loop].id){
											attachedThemes.push(boardData[0].Themes[loop].id);
										}
									}
								}
								//console.log("attachedThemes ===== ", attachedThemes);
								
								matchCond_2 = [
									{
										_id : mongoose.Types.ObjectId(id),
										'Medias.PostedBy': mongoose.Types.ObjectId(req.session.user._id),
										"Medias.PostPrivacySetting" : "OnlyForOwner"
									},
									{
										_id : mongoose.Types.ObjectId(id),
										'OwnerId' : String(req.session.user._id),
										"Medias.PostPrivacySetting" : "OnlyForOwner"
									},
									{
										_id : mongoose.Types.ObjectId(id),
										"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}
									}
								];
								
								if(attachedThemes.length){
									matchCond_2.push(
										{
											"Medias.Themes.id" : {$in : attachedThemes},
											"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
											$or: [
												{ 'Medias.IsAdminApproved': { $exists: false } },
												{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
											],
											"Medias.Origin" : {$nin : ["Copy"]}
										}
									);
								} else {
									matchCond["_id"] = mongoose.Types.ObjectId(id);
								}
							}
							console.log("matchCond ---------- @@@@@@",matchCond);
							console.log("matchCond_2 ---------- @@@@@@",matchCond_2);
							
							
							var mediaMatchCond = {
								$or: matchCond_2
							};
							
							var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
							if(searchByTagName) {
								mediaMatchCond["Medias.Themes"] = {
									$elemMatch : {
										"text" : searchByTagName
									}
								};
							}
							
							var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
							if(searchByLabel) {
								mediaMatchCond["Medias.Label"] = searchByLabel;
							}
							
							if(String(id) != String(req.session.user.AllPagesId)){
								board.aggregate([
										{'$match': matchCond},							
										{'$unwind': '$Medias'},
										
										{'$project': {'OwnerId':1,'Medias': 1}},
										{
											'$match': mediaMatchCond
										},							
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
												
													var finalResults = __updateResults(results);
												
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{
								matchCond_2 = [
									{
										//"Medias.Themes.id" : {$in : attachedThemes},
										"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
										$or: [
											{ 'Medias.IsAdminApproved': { $exists: false } },
											{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
										],
										"Medias.Origin" : {$nin : ["Copy"]}
									},
									{
										OwnerId : {$ne : String(req.session.user._id)} , 
										"Medias.PostedBy" : mongoose.Types.ObjectId(req.session.user._id)
									},
									{
										OwnerId: String(req.session.user._id)
									},
									{
										"Medias.TaggedUsers" : req.session.user.Email
									}
								];
								
								var mediaMatchCond = {
									$or: matchCond_2
								};
								
								var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
								if(searchByTagName) {
									mediaMatchCond["Medias.Themes"] = {
										$elemMatch : {
											"text" : searchByTagName
										}
									};
								}
								
								var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
								if(searchByLabel) {
									mediaMatchCond["Medias.Label"] = searchByLabel;
								}
								
								board.aggregate([
										{
											'$match': {
												/*
												$or : [
													{OwnerId: String(req.session.user._id)},
													{"LaunchSettings.Invitees.UserEmail" :req.session.user.Email}
												],
												*/
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'OwnerId':1,'Medias': 1,'commentData':1}},
										{
											'$match': mediaMatchCond
										},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							
							}
						}
					}
				});
			}
			else if(req.body.criteria == "AllAnswerPosts"){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							
							var questionPostsArr = Array.isArray(req.body.questionPostsArr) || [];
							
							var mediaMatchCond = {
								"Medias.PostType" : "AnswerPost",
								//"Medias.MediaType" : "Notes",
								"Medias.QuestionPostId" : {$in :[ 
									ObjectId("637124b655c19859bb8bb6df"),
									ObjectId("637124b655c19859bb8bb6e0"),
									ObjectId("637124b655c19859bb8bb6e1"),
									ObjectId("637124b655c19859bb8bb6e2"),
									ObjectId("637124b655c19859bb8bb6e7"),
									ObjectId("637124b655c19859bb8bb6e8"),
									ObjectId("637124b655c19859bb8bb6eb"),
									ObjectId("637124b655c19859bb8bb6ec")
								]}
							};
							
							if(String(id) != "637124b655c19859bb8bb6ed"){
								board.aggregate([
										{'$match': mediaMatchCond},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},
										{'$sort': {'Medias.PostedOn': 1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{	//If General Page - Show all my posts in Space or Capsules
								board.aggregate([
										{
											'$match': {
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
						}
					}
				});
			
			}
			else if(req.body.criteria == "AnswerMissingKeywords"){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {

							var id = req.body.id;		//board id.
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
							
							var questionPostsArr = Array.isArray(req.body.questionPostsArr) || [];
							
							var mediaMatchCond = {
								/*$or : [
									{"Medias.SurpriseSelectedWords" : {$size : 0}},
									{"Medias.SurpriseSelectedWords" : {$size : 1}},
									{"Medias.SurpriseSelectedWords" : {$size : 2}}
								],*/
								"Medias.SurpriseSelectedWords" : {$exists : false},
								"Medias.PostType" : "AnswerPost",
								"Medias.MediaType" : "Notes",
								"Medias.QuestionPostId" : {$in :[ 
									ObjectId("637124b655c19859bb8bb6df"),
									ObjectId("637124b655c19859bb8bb6e0"),
									ObjectId("637124b655c19859bb8bb6e1"),
									ObjectId("637124b655c19859bb8bb6e2"),
									ObjectId("637124b655c19859bb8bb6e7"),
									ObjectId("637124b655c19859bb8bb6e8"),
									ObjectId("637124b655c19859bb8bb6eb"),
									ObjectId("637124b655c19859bb8bb6ec")
								]}
							};
							
							if(String(id) != "637124b655c19859bb8bb6ed"){
								board.aggregate([
										{'$match': mediaMatchCond},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},
										{'$sort': {'Medias.PostedOn': 1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{	//If General Page - Show all my posts in Space or Capsules
								board.aggregate([
										{
											'$match': {
												IsDeleted: false, 
												IsDasheditpage : false,
												PageType : {$in: ["gallery", "qaw-gallery"]}
											}
										},
										{'$unwind': '$Medias'},
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': mediaMatchCond},		
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													//console.log("data-------------------------------",data);
													var finalResults = __updateResults(results);
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
						}
					}
				});
			
			}
			else if(req.body.criteria == "CuratedPosts"){
				board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1 , Themes : 1, IsLabelAllowed: 1, DefaultLabels: 1, OwnerLabels: 1, Labels: 1, HeaderColorCode: 1})
				.populate([
					{ path: 'ChapterId', select: dontSelect__ChaperFields },
					{ path: 'OwnerId', select: dontSelect__UserFields },
					{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
					
				]).exec(function(err, result) {
					var boardData = result;
					boardData = boardData ? boardData : [];
					if (err) {
						//throw err;
						res.json(err);
					}
					else {
						if (result.length == 0) {
							res.json({"code": "404", "msg": "Not Found..."})
						}
						else {
							var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
						
							var currentPageId = req.body.id ? req.body.id : null;	//board id.;
							var ___id = "5d9bfb3210a9895a29cc81d1";	//Curated Posts page id. -- Perserverence Page
							var matchCond = {
								$or: [
									{ 
										_id : {
											$in :[ 
												new mongoose.Types.ObjectId(___id), 
												new mongoose.Types.ObjectId(currentPageId)
											]
										}
									},
									{ 'Medias.IsEditorPicked': true }
								]
							}
							var mediaMatchCond = {
								$or: [
									{ 
										_id : {
											$in :[ 
												new mongoose.Types.ObjectId(___id), 
												new mongoose.Types.ObjectId(currentPageId)
											]
										},
										"Medias.PostPrivacySetting" : {
											$nin : ["OnlyForOwner"] 
										}
									},
									{ 
										_id : {
											$nin :[ 
												new mongoose.Types.ObjectId(___id), 
												new mongoose.Types.ObjectId(currentPageId)
											]
										},
										'Medias.IsEditorPicked': true,
										"Medias.PostPrivacySetting" : {
											$nin : ["OnlyForOwner","InvitedFriends"]
										}, 
										$or : [
											{'Medias.IsAdminApproved': { $exists: false }},
											{'Medias.IsAdminApproved': { $exists: true },'Medias.IsAdminApproved': true}
										],
										"Medias.Origin" : {$nin : ["Copy"]}
									}
								]
							}
							
							var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
							if(searchByTagName) {
								mediaMatchCond["Medias.Themes"] = { 
									$elemMatch : {
										"text" : searchByTagName
									}
								};
								
							}
							
							//check if filterByUser is requested.
							var filterByUserId = req.body.filterByUserId ? req.body.filterByUserId : null;
							if(filterByUserId) {
								if(filterByUserId != 'NOT_FOUND') {
									mediaMatchCond["Medias.PostedBy"] = new mongoose.Types.ObjectId(String(filterByUserId));
								}
								else {
									mediaMatchCond["Medias.PostedBy"] = new mongoose.Types.ObjectId("5d9bfb3210a9895a29cc81d1");		//just faking the logic - this is not a userid - it's page id so we will always get No records.
									
								}
							}
							
							board.aggregate([
								//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
								{'$match': matchCond},
								{'$unwind': '$Medias'},
								
								{'$project': {'Medias': 1,'_id' : 1}},
								{'$match': mediaMatchCond},						
								{'$sort': {'Medias.PostedOn': -1}},
								{'$skip': offset},
								{'$limit': perpage}
							],
							function(err, results) {
								if (!err) {
									user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
										if (!err) {
										
											var finalResults = __updateResults(results);
											//res.json({'code':200,'response':results});
											res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id, LabelsArr : getLabelsArr(finalResults)});
										} else {
											res.json(err);
										}
									})
								} else {
									res.json(err);
								}
							});
						}
					}
				});
			}
			else{
				console.log("---------UNWANTED CASE-------------");
				res.json({code:501 , message : "---------UNWANTED CASE-------------"});
			}
			
		}
	}
}

var getCurrentBoardDetails_CapsuleForThemeCases = function(req, res) {
	var fields = {};
	var perpage = 0;
	var offset = 0;
	var pageNo = 0;
	if (typeof (req.body.pageNo) != 'undefined') {
		pageNo = parseInt(req.body.pageNo);
	}
	if (typeof (req.body.perPage) != 'undefined') {
		perpage = parseInt(req.body.perPage);
	}
	if (typeof (req.body.perPage) != 'undefined' && typeof (req.body.pageNo) != 'undefined') {
		console.log('here');
		offset = (pageNo - 1) * perpage;
	}
	if (typeof (req.body.project) != 'undefined') {
		//fields['ProjectID']=req.body.project;
	}
	if (typeof (req.body.id) != 'undefined') {
		fields['_id'] = req.body.id;
		//fields['_id']=new mongoose.Types.ObjectId(req.body.id)
	}
	if (typeof (req.body.gt) != 'undefined' && typeof (req.body.gt) == 'String') {
		//fields['Medias.ThemeID']=req.body.gt;
	}
	
	var dontSelect__ChaperFields = {
		'ChapterPlaylist' : 0
	};
	var dontSelect__UserFields = {
		'Name' : 1,
		'NickName' : 1,
		//'Email' : 1,
		'ProfilePic' : 1
	};
	
	
	if(!req.body.criteria) {
		board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1})
		.populate([
			{ path: 'ChapterId', select: dontSelect__ChaperFields },
			{ path: 'OwnerId', select: dontSelect__UserFields },
			{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			
		]).exec(function(err, result) {
			var boardData = result;
			if (err) {
				//throw err;
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({"code": "404", "msg": "Not Found..."})
				}
				else {

					var id = req.body.id;		//board id.
					var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
					var IsOnlyForOwner__PosterPrivacyCheck = {
						$or : [
							{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
							{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
						]
					};
					
					if(String(id) != String(req.session.user.AllPagesId)){
						if (ShareMode__OwnerPrivacyCheck == 'friend-solo' && result[0].ChapterId.OwnerId != req.session.user._id) {
							board.aggregate([
									{'$match': {_id: new mongoose.Types.ObjectId(id)}},							
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1}},
									{
										'$match': {
											$or:[
												{
													'Medias.PostedBy': new mongoose.Types.ObjectId(req.session.user._id),
													$or : [
														{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
														{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
													]
												},
												{
													'Medias.PostedBy': new mongoose.Types.ObjectId(result[0].ChapterId.OwnerId),
													$or : [
														{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
														{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
													]
												}
											]
										}
									},							
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
											
												var finalResults = __updateResults(results);
											
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						} else {
							if( result[0].ChapterId.OwnerId == req.session.user._id ){	//No ShareMode__OwnerPrivacyCheck - checking whether this is Owner post listing or not...
								board.aggregate([
										{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
										{'$unwind': '$Medias'},
										
										{'$project': {'Medias': 1,'commentData':1}},
										{'$match': {}},
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													
													var finalResults = __updateResults(results);
													
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
							else{	//No ShareMode__OwnerPrivacyCheck - this is member post listing - check poster__privacyCheckPerPost
								board.aggregate([
										{'$match': {_id: new mongoose.Types.ObjectId(id)}},
										
										{'$unwind': '$Medias'},
									
										{'$project': {'Medias': 1,'commentData':1}},
										{
											'$match': {
												$or : [
													{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
													{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
												]
											}
										},
										{'$sort': {'Medias.PostedOn': -1}},
										{'$skip': offset},
										{'$limit': perpage}
									],
									function(err, results) {
										if (!err) {
											user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
												if (!err) {
													
													var finalResults = __updateResults(results);
												
													//res.json({'code':200,'response':results});
													res.json({"code": "200", "msg": "Success3", "response": boardData, "media": finalResults});
												} else {
													res.json(err);
												}
											})
										} else {
											res.json(err);
										}
									}
								)
							}
						}
					}
					else{
						board.aggregate([
								{
									'$match': {
										/*
										$or : [
											{OwnerId: String(req.session.user._id)},
											{"LaunchSettings.Invitees.UserEmail" :req.session.user.Email}
										],
										*/
										IsDeleted: false, 
										IsDasheditpage : false,
										PageType : {$in: ["gallery", "qaw-gallery"]}
									}
								},
								{'$unwind': '$Medias'},
								{'$project': {'OwnerId':1,'Medias': 1,'commentData':1}},
								{
									'$match': {
										$or : [
											{OwnerId : {$ne : String(req.session.user._id)} , "Medias.PostedBy" : mongoose.Types.ObjectId(req.session.user._id)},
											{OwnerId: String(req.session.user._id)}
										]
										//"Medias.PostedBy" : new mongoose.Types.ObjectId(req.session.user._id)
										//"Medias.Origin" : {$nin : ["Copy"]}
									}
								},		
								{'$sort': {'Medias.PostedOn': -1}},
								{'$skip': offset},
								{'$limit': perpage}
							],
							function(err, results) {
								if (!err) {
									user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
										if (!err) {
											//console.log("data-------------------------------",data);
											var finalResults = __updateResults(results);
											//res.json({'code':200,'response':results});
											res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
										} else {
											res.json(err);
										}
									})
								} else {
									res.json(err);
								}
							}
						)
					
					}
				}
			}
		});
	}
	else if(req.body.criteria == "MyPosts"){
		board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1})
		.populate([
			{ path: 'ChapterId', select: dontSelect__ChaperFields },
			{ path: 'OwnerId', select: dontSelect__UserFields },
			{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			
		]).exec(function(err, result) {
			var boardData = result;
			if (err) {
				//throw err;
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({"code": "404", "msg": "Not Found..."})
				}
				else {

					var id = req.body.id;		//board id.
					var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
					if(String(id) != String(req.session.user.AllPagesId)){
						board.aggregate([
								{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
								{'$unwind': '$Medias'},
								
								{'$project': {'Medias': 1,'commentData':1}},
								{'$match': {"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}},
								{'$sort': {'Medias.PostedOn': -1}},
								{'$skip': offset},
								{'$limit': perpage}
							],
							function(err, results) {
								if (!err) {
									user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
										if (!err) {
											//console.log("data-------------------------------",data);
											var finalResults = __updateResults(results);
											//res.json({'code':200,'response':results});
											res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
										} else {
											res.json(err);
										}
									})
								} else {
									res.json(err);
								}
							}
						)
					}
					else{	//If General Page - Show all my posts in Space or Capsules
						board.aggregate([
								{
									'$match': {
										IsDeleted: false, 
										IsDasheditpage : false,
										PageType : {$in: ["gallery", "qaw-gallery"]}
									}
								},
								{'$unwind': '$Medias'},
								{'$project': {'Medias': 1,'commentData':1}},
								{
									'$match': {
										"Medias.PostedBy" : mongoose.Types.ObjectId(req.session.user._id),
										//"Medias.Origin" : {$nin : ["Copy"]}
									}
								},		
								{'$sort': {'Medias.PostedOn': -1}},
								{'$skip': offset},
								{'$limit': perpage}
							],
							function(err, results) {
								if (!err) {
									user.populate(results, {path: 'Medias.PostedBy' , select: dontSelect__UserFields}, function(err, data) {
										if (!err) {
											//console.log("data-------------------------------",data);
											var finalResults = __updateResults(results);
											//res.json({'code':200,'response':results});
											res.json({"code": "200", "msg": "Success2", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
										} else {
											res.json(err);
										}
									})
								} else {
									res.json(err);
								}
							}
						)
					}
				}
			}
		});
	
	}
	else if(req.body.criteria == "GlobalCommunity"){
		board.find(fields, {_id: 1, ChapterId: 1, Title: 1, TitleInvitees: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1 , Themes : 1})
		.populate([
			{ path: 'ChapterId', select: dontSelect__ChaperFields },
			{ path: 'OwnerId', select: dontSelect__UserFields },
			{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			
		]).exec(function(err, result) {
			var boardData = result;
			boardData = boardData ? boardData : [];
			if (err) {
				//throw err;
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({"code": "404", "msg": "Not Found..."})
				}
				else {
					var id = req.body.id;		//board id.
				
					var matchCond = {};
					matchCond["_id"] = {$ne : mongoose.Types.ObjectId(id)};
					//matchCond["Origin"] = "journal";
					//matchCond["Medias.IsAdminApproved"] = false;
					matchCond["IsDeleted"] = false;
					matchCond["IsDasheditpage"] = false;
					matchCond["PageType"] = {$in: ["gallery", "qaw-gallery"]};
					var attachedThemes = [];
					if(boardData.length){
						boardData[0].Themes = boardData[0].Themes ? boardData[0].Themes :[];
						var themesCount = boardData[0].Themes.length;
						if(boardData[0].Themes.length){
							for(var loop = 0; loop < themesCount ; loop++){
								if(boardData[0].Themes[loop].id){
									attachedThemes.push(boardData[0].Themes[loop].id);
								}
							}
						}
						if(attachedThemes.length){
							matchCond["Medias.Themes.id"] = {$in : attachedThemes};
							//matchCond["Medias.Themes.id"] = {$in : attachedThemes};
						}
					}
					console.log("matchCond ---------- @@@@@@",matchCond);

					var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
					
					if(attachedThemes.length){
						if(String(id) != String(req.session.user.AllPagesId)){
							board.aggregate([
									//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
									{'$match': matchCond},
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1}},
									{'$match': 
										{
											"Medias.Themes.id" : {$in : attachedThemes},
											"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
											$or: [
												{ 'Medias.IsAdminApproved': { $exists: false } },
												{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
											],
											"Medias.Origin" : {$nin : ["Copy"]}
										}
									},						
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
												
												var finalResults = __updateResults(results);
											
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						}
						else{
							board.aggregate([
									//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
									{'$match': matchCond},
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1}},
									{'$match': 
										{
											//"Medias.Themes.id" : {$in : attachedThemes},
											"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
											$or: [
												{ 'Medias.IsAdminApproved': { $exists: false } },
												{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
											],
											"Medias.Origin" : {$nin : ["Copy"]}
										}
									},						
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
											
												var finalResults = __updateResults(results);
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						}
					}
					else{
						if(String(id) == String(req.session.user.AllPagesId)){
							board.aggregate([
									//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
									{'$match': matchCond},
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1}},
									{'$match': 
										{
											//"Medias.Themes.id" : {$in : attachedThemes},
											"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
											$or: [
												{ 'Medias.IsAdminApproved': { $exists: false } },
												{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
											],
											"Medias.Origin" : {$nin : ["Copy"]}
										}
									},						
									{'$sort': {'Medias.PostedOn': -1}},
									{'$skip': offset},
									{'$limit': perpage}
								],
								function(err, results) {
									if (!err) {
										user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
											if (!err) {
											
												var finalResults = __updateResults(results);
												//res.json({'code':200,'response':results});
												res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
											} else {
												res.json(err);
											}
										})
									} else {
										res.json(err);
									}
								}
							)
						}
						else{
							res.json({"code": "200", "msg": "Success1", "response": boardData, "media": [], 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
						}
					}
				}
			}
		});
	}
	else if(req.body.criteria == "CuratedPosts"){
		board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1 , Themes : 1})
		.populate([
			{ path: 'ChapterId', select: dontSelect__ChaperFields },
			{ path: 'OwnerId', select: dontSelect__UserFields },
			{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			
		]).exec(function(err, result) {
			var boardData = result;
			boardData = boardData ? boardData : [];
			if (err) {
				//throw err;
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({"code": "404", "msg": "Not Found..."})
				}
				else {
					var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
				
					//var id = "5d162135e4f1570c0b428f13";	//Curated Posts page id. -- Birthday Page
					var id = "5d9bfb3210a9895a29cc81d1";	//Curated Posts page id. -- Perserverence Page
					/*
					var matchCond = {
						_id : new mongoose.Types.ObjectId(id)
					};
					*/
					var matchCond = {
						$or: [
							{ _id : new mongoose.Types.ObjectId(id) },
							{ 'Medias.IsEditorPicked': true }
						]
					}
					
					board.aggregate([
						//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
						{'$match': matchCond},
						{'$unwind': '$Medias'},
						
						{'$project': {'Medias': 1,'_id' : 1}},
						{'$match': 
							{
								//"Medias.Themes.id" : {$in : attachedThemes},
								//"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
								$or: [
									{ _id : new mongoose.Types.ObjectId(id), "Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner"] }},
									{ 'Medias.IsEditorPicked': true, "Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]}, 'Medias.IsAdminApproved': { $exists: false }, 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
								],
								"Medias.Origin" : {$nin : ["Copy"]}
							}
						},						
						{'$sort': {'Medias.PostedOn': -1}},
						{'$skip': offset},
						{'$limit': perpage}
					],
					function(err, results) {
						if (!err) {
							user.populate(results, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
								if (!err) {
								
									var finalResults = __updateResults(results);
									//res.json({'code':200,'response':results});
									res.json({"code": "200", "msg": "Success1", "response": boardData, "media": finalResults, 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
								} else {
									res.json(err);
								}
							})
						} else {
							res.json(err);
						}
					});
				}
			}
		});
	}
	else{
		console.log("---------UNWANTED CASE-------------");
		res.json({code:501 , message : "---------UNWANTED CASE-------------"});
	}
}
//exports.getCurrentBoardDetails = getCurrentBoardDetails;
//exports.getCurrentBoardDetails = getCurrentBoardDetails_V2;
exports.getCurrentBoardDetails = getCurrentBoardDetails_V4_WithPrivacySettings;
 
 var viewPostedMedia = function(req, res) {
    /*
	var conditions = {
		_id : req.body.page_id ? req.body.page_id : ''
	};
	*/
	var conditions = {
		"Medias._id" : req.body.post_id ? req.body.post_id : ''
	};
	
	var projection = { 
		Medias: { $elemMatch: { _id: req.body.post_id ? req.body.post_id : '' } } 
	};
    
	var dontSelect__ChaperFields = {
		'ChapterPlaylist' : 0
	};
	var dontSelect__UserFields = {
		'Name' : 1,
		'NickName' : 1,
		//'Email' : 1,
		'ProfilePic' : 1
	};
	
    board.find(conditions, projection)
	.populate([
		{ path: 'ChapterId', select: dontSelect__ChaperFields },
		{ path: 'OwnerId', select: dontSelect__UserFields }
		/*{ path: 'Medias.PostedBy', select: dontSelect__UserFields }*/
	])
	.exec(function(err, result) {
		var boardData = result;
		if (err) {
			//throw err;
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({"code": "404", "msg": "Not Found!"})
			}
			else {
				user.populate(result, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
					if(!err) {
						result[0].Medias[0].PostPrivacySetting = result[0].Medias[0].PostPrivacySetting ? result[0].Medias[0].PostPrivacySetting : "PublicWithoutName";
						if(result[0].Medias[0].PostPrivacySetting == "PublicWithoutName"){
							result[0].Medias[0].PostedBy.Name = "";
							result[0].Medias[0].PostedBy.NickName = "";
							result[0].Medias[0].PostedBy.ProfilePic = "";
						}
						res.json({"code":"200","message":"success.","result":result[0].Medias[0]})
					}
					else {
						res.json({"code": "404", "msg": "Not Found!"})
					}
				});
			}
		}
	});
}
exports.viewPostedMedia = viewPostedMedia;
 
// To fetch all boards inside a project ///modified by parul 13 july 2015
var getProjectBoards = async function(req, res){
    try {
    var fields={};
    if(typeof(req.body.project)!='undefined'){
		fields['ProjectID']=req.body.project;	
		fields['isDeleted']=0;
            
            const result = await board.find(fields,{'Medias':0})
		.populate('Domain Collection ProjectID')
                .exec();
                
				if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
				}
				else{
					if (req.session.user) {
						res.json({"code":"200","msg":"Success","response":result});
					}
				}
	}else{
		res.json({"code":"404","msg":" Error!!! Project ID not found!!!"});
	}
    } catch(err) {
        res.json(err);
    }
};

exports.getProjectBoards = getProjectBoards;

var updatePost = function(req,res){
    console.log("In updatePost...");//return;
	var thumbnail = '';
	if( req.body.thumbnail ){
		thumbnail = req.body.thumbnail;
	}
	
	var BoardId = req.body.id ? req.body.id : null;
	var PostId = req.body.PostId ? req.body.PostId : null;
	var Editor = req.session.user._id ? req.session.user._id : null;
	
	var postObjToUpdate = {
		_id : PostId,
		MediaID:req.body.media,
		MediaURL:req.body.url,
		Title:req.body.title,
		Prompt:req.body.prompt,
		Locator:req.body.locator,
		ThemeID:req.body.themeId ? req.body.themeId : null,
		ThemeTitle:req.body.theme ? req.body.theme : "No Theme",
		MediaType:req.body.data.value.MediaType,
		ContentType:req.body.data.value.ContentType,
		Content:req.body.Content,
		OwnerId:req.body.owner,
		thumbnail:thumbnail,	//added by manishp on 23122014
		PostStatement:req.body.Statement, //added by manishp on 23042015
		IsOnlyForOwner : req.body.IsOnlyForOwner ? req.body.IsOnlyForOwner : false,
		PostPrivacySetting:req.body.PostPrivacySetting ? req.body.PostPrivacySetting : "PublicWithoutName",
		IsUnsplashImage : req.body.IsUnsplashImage ? req.body.IsUnsplashImage : false,
		Themes : req.body.Themes ? req.body.Themes : [],
		TaggedUsers : req.body.TaggedUsers ? req.body.TaggedUsers : []
		
	};
	
	if(req.body.Label) {
		postObjToUpdate.Label = req.body.Label;
	}
	
	var query = {
		//"_id" : BoardId,
		"Medias._id" : PostId, 
		IsDasheditpage : false
	};
	var setObj = {
		"Medias.$.MediaID" : req.body.media,
		"Medias.$.MediaURL":req.body.url,
		"Medias.$.Title":req.body.title,
		"Medias.$.Prompt":req.body.prompt,
		"Medias.$.Locator":req.body.locator,
		"Medias.$.ThemeID":req.body.themeId ? req.body.themeId : null,
		"Medias.$.ThemeTitle":req.body.theme ? req.body.theme : "No Theme",
		"Medias.$.MediaType":req.body.data.value.MediaType,
		"Medias.$.ContentType":req.body.data.value.ContentType,
		"Medias.$.Content":req.body.Content,
		"Medias.$.OwnerId":req.body.owner,
		"Medias.$.thumbnail":thumbnail,	//added by manishp on 23122014
		"Medias.$.PostStatement":req.body.Statement, //added by manishp on 23042015
		"Medias.$.IsOnlyForOwner" : req.body.IsOnlyForOwner ? req.body.IsOnlyForOwner : false,
		"Medias.$.PostPrivacySetting":req.body.PostPrivacySetting ? req.body.PostPrivacySetting : "PublicWithoutName",
		"Medias.$.IsUnsplashImage" : req.body.IsUnsplashImage ? req.body.IsUnsplashImage : false,
		"Medias.$.Themes" : req.body.Themes ? req.body.Themes : [],
		"Medias.$.TaggedUsers" : req.body.TaggedUsers ? req.body.TaggedUsers : []
	}
	
	if(req.body.Label) {
		setObj["Medias.$.Label"] = req.body.Label;
	}
	
	var options = { multi: false };
	board.update(query, {$set : setObj}, options, callback)
	
	//this will update the IsDasheditpage case
	var query2 = {
		//"_id" : BoardId,
		"Medias._id" : PostId, 
		IsDasheditpage : true
	};
	board.update(query2, {$set : setObj}, options, function(err , result){
		//do nothing...
		if(!err){
			console.log("------The IsDasheditpage page case has been updated------");
		}
		else{
			console.log(err);
		}
	})
	//this will update the IsDasheditpage case
	
	function callback (err, numAffected) {
		if(err){
			res.json({"status":"failed","message":"Error!"});
		}
		else{
			//update updated Post object in mediaActionLogs collection
			var conditions = {
				PostId : PostId,
				//BoardId : BoardId,
				UserId : Editor,
				MediaId : postObjToUpdate.MediaID,
				Action : 'Post'
			};
			
			var setObj_mediaActionLogs = {
				PostId : req.body.PostId,
				MediaId : req.body.MediaID,
				UserId : req.session.user._id,
				UserFsg: req.session.user.FSGs,
				BoardId : req.body.BoardId,
				OwnerId : req.body.OwnerId,
				Action: 'Post',
				Title: req.body.Title,
				Prompt: req.body.Prompt,
				Locator: req.body.Locator,
				URL: req.body.MediaURL,
				MediaType: req.body.MediaType,
				ContentType: req.body.ContentType,
				Content: req.body.Content,
				Comment: req.body.Comment ? req.body.Comment : "",
				IsOnlyForOwner : req.body.IsOnlyForOwner ? req.body.IsOnlyForOwner : false,
				PostPrivacySetting:req.body.PostPrivacySetting ? req.body.PostPrivacySetting : "PublicWithoutName",
				IsUnsplashImage : req.body.IsUnsplashImage ? req.body.IsUnsplashImage : false,
				Themes : req.body.Themes ? req.body.Themes : [],
				TaggedUsers : req.body.TaggedUsers ? req.body.TaggedUsers : []
			};
			
			mediaAction.find(conditions).count().exec(function(err , mCount){
				if(!err){
					if(mCount) {
						mediaAction.update(conditions , {$set:setObj_mediaActionLogs} , {multi : false} , function(err , numAffected){
							if(err){
								console.log(err);
								//res.json({"status":"failed","message":"Error!"});
							}
							else{
								console.log(numAffected);
								//res.json({"status":"success","message":"Success!","affected":numAffected});
							}
						})
					}
					else{
						//It means it was an old record just save a record there with action Post.
						mediaAction(setObj_mediaActionLogs).save(function(err,result1){
							if(err){
								console.log(err);
								//res.json({"status":"failed","message":"Error!"});
							}
							else{
								//res.json({"status":"success","message":"Success!","result":result1});
							}	
						});
					}
				}
				else{
					//res.json({"status":"failed","message":"Error!"});
				}
			});
			//update PostId in mediaActionLogs collection
			
			var projection = { 
				Medias: { $elemMatch: { _id: PostId ? PostId : '' } } 
			};
			
			var dontSelect__ChaperFields = {
				'ChapterPlaylist' : 0
			};
			var dontSelect__UserFields = {
				'Name' : 1,
				'NickName' : 1,
				//'Email' : 1,
				'ProfilePic' : 1
			};
			
			board.find(query, projection)
			.populate([
				{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
			])
			.exec(function(err, result) {
				var boardData = result;
				if (err) {
					//throw err;
					res.json(err);
				}
				else {
					if (result.length == 0) {
						res.json({"status":"failed","message":"Error!"});
					}
					else {
						
						if(postObjToUpdate.PostPrivacySetting == "PublicWithoutName"){
							result[0].Medias[0].PostedBy.Name = "";
							result[0].Medias[0].PostedBy.NickName = "";
							result[0].Medias[0].PostedBy.ProfilePic = "";
						}
						
						postObjToUpdate.PostedBy = result[0].Medias[0].PostedBy;
						
						//res.json({"status":"success","message":"Success!","affected":numAffected,postData:result[0].Medias[0]});
						res.json({"status":"success","message":"Success!","affected":numAffected,postData:postObjToUpdate});
					}
				}
			});
		}
	}
}
exports.updatePost = updatePost;

var editorPickUpdatePost = function(req,res){
    console.log("In editorPickUpdatePost...");//return;
	var BoardId = req.body.BoardId ? req.body.BoardId : null;
	var PostId = req.body.PostId ? req.body.PostId : null;
	var Editor = req.session.user._id ? req.session.user._id : null;
	var IsEditorPicked = req.body.IsEditorPicked == true ? true : false;
	
	var query = {
		//"_id" : BoardId,
		"Medias._id" : PostId, 
		IsDasheditpage : false
	};
	var query2 = {
		//"_id" : BoardId,
		"Medias._id" : PostId, 
		IsDasheditpage : true
	};
	var setObj = {
		"Medias.$.IsEditorPicked" : req.body.IsEditorPicked
	}
	console.log("query ----------",query);
	var options = { multi: false };
	board.update(query, {$set : setObj}, options, function(err , numAffected) {
		if(!err){
			board.update(query2, {$set : setObj}, options, function(err , numAffected){
				//do nothing...
				if(!err){
					console.log("------The post has been updated with editorPick status------");
					res.json({"status":"success","message":"Success!","affected":numAffected});
				}
				else{
					res.json({"status":"failed","message":"Failed!","affected":numAffected});
				}
			})
		}
		else {
			res.json({"status":"failed","message":"Failed!","affected":numAffected});
		}
	});
	//this will update the IsDasheditpage case
}
exports.editorPickUpdatePost = editorPickUpdatePost;