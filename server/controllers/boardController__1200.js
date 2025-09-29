//var board = require('./../models/boardModel.js');
var board = require('./../models/pageModel.js');
var media = require('./../models/mediaModel.js');
var mediaAction = require('../models/mediaActionLogModel.js');
var mediaActionCtrl = require('../controllers/mediaActionLogsController.js');
var user = require('./../models/userModel.js');
var boardInvitees = require('./../models/boardInviteesModel.js');
var groupTags = require('./../models/groupTagsModel.js');
var nodemailer = require('nodemailer');
var counters=require('./../models/countersModel.js');
var fs = require('fs');
var formidable = require('formidable');
var mongoose = require("mongoose");
var im   = require('imagemagick');
var path = require('path');

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
	.exec(function(err,result){
		if(err){ 		
			res.json(err);
		}
		else{
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
		}
    });
    
};

exports.findAll = findAll;


var userBoards = function(req, res){
    var fields={};    
    
    fields['Invitees.UserID']=req.session.user._id;
        
    fields['isDeleted']=0;
    	
    board.find(fields,function(err,result){
		
	if(err){ 		
	    res.json(err);
	}
	else{
	    if(result.length==0){
		res.json({"code":"404","msg":"Not Found"})
	    }
	    else{				
		res.json({"code":"200","msg":"Success","response":result})
	    }
	}
	
    }).populate('Domain Collection ProjectID OwnerID')
    
};

exports.userBoards = userBoards;



var addMediaToBoard = function(req,res){
        
    fields={	
	Medias:[]
    };
    
    board.find({_id:req.body.id},function(err,result){
		
	if(err){ 		
	    res.json(err);
	}
	else{
	    if(result.length==0){
		res.json({"code":"404","msg":"Not Found"})
	    }
	    else{
		if (result[0].Medias==null) {
		    fields.Medias=[];
		}
		else{
		    fields.Medias = result[0].Medias;
		}
		
		
		fields.Medias.push({
		    MediaID:req.body.media,
		    MediaURL:req.body.url,
		    Title:req.body.title,
		    Prompt:req.body.prompt,
		    Locator:req.body.locator,
		    PostedBy:req.session.user._id,
		    PostedOn:Date.now(),
		    ThemeID:req.body.themeId,
		    ThemeTitle:req.body.theme,
		    MediaType:req.body.data.value.MediaType,
		    ContentType:req.body.data.value.ContentType,
		    Content:req.body.data.value.Content,
		    Votes:[],
		    Marks:[],
		    OwnerId:req.body.owner
		});    
		    
		var query={_id:req.body.id};
		var options = { multi: true };
		board.update(query, { $set: fields}, options, callback)
		
	    }
	}
	
    }).populate('Domain Collection ProjectID OwnerID')
    
    
    function callback (err, numAffected) {
		if(err){
			res.json(err)
		}
		else{
	    
			var datafield={
				Posts:{}
			};
	    
			datafield.Posts.Users=[];    
			datafield.Posts.Users.push({UserFSGs:req.session.user.FSGs});
			
			var query={_id:req.body.media};
			var options={multi:false};
			media.update(query,datafield,options,function(err){
				if (err) {
					res.json(err);
				}
				else{
					postMedia(req,res);
				}
			})
		}
    }
    
}

exports.addMediaToBoard = addMediaToBoard;

//16092014
var addMediaToBoard_2 = function(req,res){
    console.log("In addMediaToBoard_2...");//return;
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
					Themes : req.body.Themes ? req.body.Themes : []
				};
				
				
				fields.Medias.push(postData);				
				console.log("fields.Medias =  ",fields.Medias);//return;
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
var postMedia = function(req,res){

    var fields={
	MediaId:req.body.media,
	Title:req.body.data.value.Title,
	Prompt:req.body.data.value.Prompt,
	Locator:req.body.data.value.Locator,
	OwnerId:req.body.owner,
	BoardId:req.body.id,
	Action:'Post',
	MediaType:req.body.data.value.MediaType,
	ContentType:req.body.data.value.ContentType,
	UserFsg:req.session.user.FSGs,
	CreatedOn:Date.now(),
	UserId:req.session.user._id
    };
    console.log(fields)
    mediaAction(fields).save(function(err){
	if(err){
	    res.json({"code":"404","message":err});
	}
	else{
	    findAll(req,res);	    
	}
    })
    
    
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
var add = function(req,res){
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
  
  board(fields).save(function(err){
    if(err){
      res.json(err);
    }
    else{
      findAll(req,res)
    }
  });
  
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
var edit = function(req,res){
    
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
			console.log('=========================')
			console.log(data);
			//data.seq=(data.seq)+1;
			console.log(data.seq);
			incNum=data.seq;
			//data.save();
			console.log("incNum="+incNum);
    
    
			var form = new formidable.IncomingForm();
			
			
			form.parse(req, function(err, fields, files) {
			var file_name="";
			console.log("Fields",fields);
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
                                        
                                        try{
                                            crop_image(srcPath,dstPathCrop_SMALL,100,100);
                                            crop_image(srcPath,dstPathCrop_SG,300,300);
                                            //crop_image(srcPath,dstPathCrop_400,400,400);
                                            //crop_image(srcPath,dstPathCrop_500,500,500);

                                            //updated on 09022015 as per client request
                                            crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
                                            crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
                                            resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);

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
				console.log('-------------------------------------------------------------------------------');
				
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
				
				console.log('===========================================================================')
				console.log(dataToUpload)
				console.log('===========================================================================')
		
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
			
			
			
		});
		 
	}
    })
    
}
exports.uploadMedia = uploadMedia;

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
var uploadHeader = function(req,res){
    
    var form = new formidable.IncomingForm();        	
	
	form.parse(req, function(err, fields, files) {
	  var file_name="";
	  
	    if(files.myFile.name){
			if (typeof(req.query.type)!='undefined') {
				uploadDir = __dirname + "/../../public/assets/board/backgroundAudio";
			}else{
				//uploadDir = __dirname + "/../../public/assets/board/headerImg";
				uploadDirOR = __dirname + "/../../public/assets/Media/headers/orignal";
				uploadDirAF = __dirname + "/../../public/assets/Media/headers/aspectfit";  
				uploadDirSG = __dirname + "/../../public/assets/Media/headers/sg"; 
				uploadDirSM = __dirname + "/../../public/assets/Media/headers/small"; 
				uploadDirMD = __dirname + "/../../public/assets/Media/headers/medium"; 
			}		
			file_name=files.myFile.name;
			file_name=file_name.split('.');
			ext=file_name[file_name.length-1];
			name=Date.now();
			file_name=name+'.'+ext;
			
			fs.rename(files.myFile.path, uploadDirOR + "/" + file_name, function(err){
				if (err) {
					res.json(err)
				}else{
					im.identify(uploadDirOR + "/" + file_name,function(err,features){
						if (err) {
							console.log(err);
						}else{
							im.resize({
								srcPath: uploadDirOR + "/" + file_name,
								dstPath: uploadDirAF + "/" + file_name,
								width: features.width,
								height: features.height,
							}, function(err, stdout, stderr){
								if (err) {
									res.json(err);
								}else{
									im.crop({
										srcPath: uploadDirOR + "/" + file_name,
										dstPath: uploadDirMD + "/" + file_name,
										width: 262,
										height: 162,
										quality: 1,
										gravity: "Center"
									}, function(err, stdout, stderr){
										if (err){
											throw err;
										}else{
											console.log('sucess...');
											im.crop({
												srcPath: uploadDirOR + "/" + file_name,
												dstPath: uploadDirSM + "/" + file_name,
												width: 155,
												height: 121,
												quality: 1,
												gravity: "Center"
											}, function(err, stdout, stderr){
												if (err){
													throw err;
												}else{
													console.log('sucess...');
													im.crop({
														srcPath: uploadDirOR + "/" + file_name,
														dstPath: uploadDirSG + "/" + file_name,
														width: 300,
														height: 300,
														quality: 1,
														gravity: "Center"
													}, function(err, stdout, stderr){
														if (err){
															throw err;
														}else{
															console.log('sucess...');
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
															board.update(query, { $set: dataToUpload}, options, function(err, numAffected) {
																if(err){
																	res.json({"code":"404","message":err});
																}
																else{
																	res.json({"code":"200","message":"Success","result":dataToUpload});		    
																}
															})
														}
													});
												}
											});
										}
									});
								}
							});
							
						}
					})
					//fs.rename(uploadDirAF + "/" + file_name, uploadDirOR + "/" + file_name , function(err){
					//	if (err) {
					//		console.log('error here');
					//		res.json(err)
					//	}else{
					//		
					//	}
					//});
				}
			});
			
			
	    }
	    
	      
	})
    
}
exports.uploadHeader = uploadHeader;


var duplicate = function(req,res){
    console.log(req.body)
    board.find({_id:req.body.id},function(err,result){	
	if (err) {
	    res.json({"code":"404","message":err});
	}
	else{
	    //delete result[0].Comments;
	    //delete result[0].Medias;
	    //delete result[0].Invitees;
	    result[0].Comments= null;
	    result[0].Medias = null;
	    result[0].Invitees = null;
		result[0].TotalVoteCount = 0;
	    var fields={};
	    fields=result[0];
	    fields.Title=req.body.title;
	    fields._id=null;
	    
	    board(fields).save(function(err1){
		if(err1){
		    res.json({"code":"404","message":err1});
		}
		else{
		    res.json({"code":"200","message":result[0].ProjectID});
		}	
	    })
	}
    })
}
exports.duplicate = duplicate;


var addComment = function(req,res){
    board.find({_id:req.body.id},function(err,result){
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
	board.update(query, { $set: fields}, options, callback)
	function callback (err, numAffected) {
		if(err){
			res.json(err)
		}
		else{
			findAll(req,res)
		}
	}
    })
}
exports.addComment = addComment;

var deleteOne = function(req,res){
	console.log("Request Body : ",req.body);
	var fields={
	    isDeleted:1
	};
	var query={_id:req.body.boardId};
	var options = { multi: false };
	board.update(query, { $set: fields}, options, callback)
	function callback (err, numAffected) {
		if(err){
			res.json(err)
		}
		else{
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
			board.find(fields,function(err,result){
			    if(err){ 		
					res.json(err);
			    }
			    else{
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
			    }
			    
			}).populate('Domain Collection ProjectID OwnerID Medias.PostedBy Invitees.UserID')
			
		}
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

var addGroupTag = function(req,res){
    
    board.find({_id:req.body.id},function(err,result){
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
	    ThemeID:req.body.themeid, 
	    ThemeTitle:req.body.gtsa,
	    SuggestedBy:req.session.user._id,
	    SuggestedOn:Date.now(),
	    isApproved:isApproved
	});
	
	
	var query={_id:req.body.id};
	var options = { multi: true };
	
	board.update(query, { $set: fields}, options, callback);
    })
    
    function callback (err, numAffected) {	    
	if(err){
	    res.json(err)
	}
	else{
	    findAll(req,res);
	}
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
	var boardId = req.body.id ? req.body.id : null;
	var postId = req.body.post_id ? req.body.post_id : null;
	var conditions = {
		_id : boardId
	};
	var pullObj = {
		 $pull : { "Medias" : {"_id":postId} }
	};
	
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
function crop_image(srcPath,dstPath,width,height){
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
 
function resize_image(srcPath,dstPath,w,h){
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
							matchCond["Themes.id"] = {$in : attachedThemes};
						}
					}
					console.log("matchCond ---------- @@@@@@",matchCond);

					var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
					
					
					if(!attachedThemes.length && String(id) != String(req.session.user.AllPagesId)){
						res.json({"code": "200", "msg": "Success1", "response": boardData, "media": [], 'mode': ShareMode__OwnerPrivacyCheck, 'userId': req.session.user._id});
					}
					else if (ShareMode__OwnerPrivacyCheck == 'friend-solo' && result[0].ChapterId.OwnerId != req.session.user._id) {
						board.aggregate([
								//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
								{'$match': matchCond},
								{'$unwind': '$Medias'},
								
								{'$project': {'Medias': 1}},
								{'$match': {"Medias.IsOnlyForOwner" : false , "Medias.IsAdminApproved" : true}},						
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
									{'$match': matchCond},								
									{'$unwind': '$Medias'},
									
									{'$project': {'Medias': 1,'commentData':1}},
									{'$match': {"Medias.IsOnlyForOwner" : false, "Medias.IsAdminApproved" : true}},
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
									{'$match': matchCond},
									
									{'$unwind': '$Medias'},
								
									{'$project': {'Medias': 1,'commentData':1}},
									{'$match': {"Medias.IsOnlyForOwner" : false, "Medias.IsAdminApproved" : true}},
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
	else{
		console.log("---------UNWANTED CASE-------------");
		res.json({code:501 , message : "---------UNWANTED CASE-------------"});
	}
}
//exports.getCurrentBoardDetails = getCurrentBoardDetails;
//exports.getCurrentBoardDetails = getCurrentBoardDetails_V2;
exports.getCurrentBoardDetails = getCurrentBoardDetails_V3_WithFilters;
 
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
    
    board.find(conditions, projection)
	.populate('ChapterId Domain Collection OwnerId Medias.PostedBy')
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
				res.json({"code":"200","message":"success.","result":result[0].Medias[0]})
			}
		}
	});
}
exports.viewPostedMedia = viewPostedMedia;
 
// To fetch all boards inside a project ///modified by parul 13 july 2015
var getProjectBoards = function(req, res){
    var fields={};
    if(typeof(req.body.project)!='undefined'){
		fields['ProjectID']=req.body.project;	
		fields['isDeleted']=0;
		board.find(fields,{'Medias':0})
		.populate('Domain Collection ProjectID')
		.exec(function(err,result){
			if(err){ 		
				res.json(err);
			}
			else{
				if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
				}
				else{
					if (req.session.user) {
						res.json({"code":"200","msg":"Success","response":result});
					}
				}
			}
		});
	}else{
		res.json({"code":"404","msg":" Error!!! Project ID not found!!!"});
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
		Themes : req.body.Themes ? req.body.Themes : []
	};
	
	var query = {
		"_id" : BoardId,
		"Medias._id" : PostId
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
		"Medias.$.Themes" : req.body.Themes ? req.body.Themes : []
	}
	
	
	
	var options = { multi: false };
	board.update(query, {$set : setObj}, options, callback)
	
	function callback (err, numAffected) {
		if(err){
			res.json({"status":"failed","message":"Error!"});
		}
		else{
			//update updated Post object in mediaActionLogs collection
			var conditions = {
				PostId : PostId,
				BoardId : BoardId,
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
				Themes : req.body.Themes ? req.body.Themes : []
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
			
			res.json({"status":"success","message":"Success!","affected":numAffected,postData:postObjToUpdate});
		}
	}
}
exports.updatePost = updatePost;