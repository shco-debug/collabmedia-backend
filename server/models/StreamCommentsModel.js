var mongoose = require('mongoose');

var streamCommentsSchema = new mongoose.Schema({
	ParentId: { type : mongoose.Schema.Types.ObjectId },
	SocialPageId: { type : mongoose.Schema.Types.ObjectId },
	SocialPostId: { type : mongoose.Schema.Types.ObjectId },
	hexcode_blendedImage : { type : String },
	UserId: { type : mongoose.Schema.Types.ObjectId , ref: 'user'},
	Comment: {type:String,maxlength: 15000},
	PrivacySetting : {type : String , enum : ["PublicWithName","PublicWithoutName","OnlyForOwner","InvitedFriends"] , default : "PublicWithName"},
	CreatedOn:{type : Date, default: Date.now()},
	UpdatedOn:{type : Date, default: Date.now()},
	IsDeleted:{ type:Boolean , default:0 }	
},{ collection: 'StreamComments' });

var streamComments = mongoose.model('StreamComments',streamCommentsSchema);

module.exports = streamComments;