var mongoose = require('mongoose');

var mediaActionLogSchema = new mongoose.Schema({
	PostId:{ type : mongoose.Schema.Types.ObjectId},				//added on 21st Sep 2017 - have to fix this asap.
	UserId:{ type : mongoose.Schema.Types.ObjectId , ref: 'user'},
	MediaId:{ type : mongoose.Schema.Types.ObjectId },
	Title:{ type: String },
	Prompt:{ type:String },
	Locator:{ type: String },
	OwnerId:{ type : mongoose.Schema.Types.ObjectId },
	BoardId:{type : mongoose.Schema.Types.ObjectId}, 
	Action:{ type: String },							//Post/Mark/Stamp/Vote/Comment
	MediaType:{ type:String },
	ContentType:{ type:String },
	UserFsg:{ type:Object },
	URL: {type:String},
	Content: {type:String},							
	Comment: {type:String,maxlength: 15000},				//this is Comment for Comment Action case.
	CommentLikeCount : {type:Number , default:0},		//For {Action='Comment'} case.			
	CreatedOn:{type : Date, default: Date.now()},
	UpdatedOn:{type : Date, default: Date.now()},
	IsOnlyForOwner:{ type:Boolean , default:0 },		//for post case - inside board privacy ...
	Themes : {type:Array, default : []},				//added on 14 nov 2017 - for underlying themes for searchability
	IsDeleted:{ type:Boolean , default:0 },
	LikeType : {type : String}
	
},{ collection: 'MediaActionLogs' });

var mediaActionLog = mongoose.model('MediaActionLog',mediaActionLogSchema);

module.exports = mediaActionLog;