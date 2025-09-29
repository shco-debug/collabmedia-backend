var mongoose = require('mongoose');

var userActionLogsSchema = new mongoose.Schema({
	UserId: { type : mongoose.Schema.Types.ObjectId , ref: 'user'},
	StreamId: { type : mongoose.Schema.Types.ObjectId },
	PageId: { type : mongoose.Schema.Types.ObjectId },
	PostId: { type : mongoose.Schema.Types.ObjectId },
	CommentId: {type : mongoose.Schema.Types.ObjectId},
	PostImage : { type : String },
	ActionPostType : {type : String, enum : ['UserPost', 'StreamPost', 'PostForFriend']},
	FriendId: { type : mongoose.Schema.Types.ObjectId , ref: 'user'},	//for PostForFriend case ...
	Action : {type : String, enum : ['PostLike','CommentLike', 'Comment', 'PrivateComment', 'Post']},
	Status:{ type:Boolean , default:1},
	IsDeleted:{ type:Boolean , default:0 },
	CreatedOn:{type : Date, default: Date.now()},
	UpdatedOn:{type : Date, default: Date.now()}
},{ collection: 'UserActionLogs' });

var userActionLogs = mongoose.model('UserActionLogs',userActionLogsSchema);

module.exports = userActionLogs;