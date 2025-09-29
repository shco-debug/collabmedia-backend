var mongoose = require('mongoose');

var streamLikesSchema = new mongoose.Schema({
	SocialPageId: { type : mongoose.Schema.Types.ObjectId },
	SocialPostId: { type : mongoose.Schema.Types.ObjectId },
	hexcode_blendedImage : { type : String },
	UserId: { type : mongoose.Schema.Types.ObjectId , ref: 'user'},
	CreatedOn:{type : Date, default: Date.now()},
	UpdatedOn:{type : Date, default: Date.now()},
	IsDeleted:{ type:Boolean , default:0 }	
},{ collection: 'StreamLikes' });

var streamLikes = mongoose.model('StreamLikes',streamLikesSchema);

module.exports = streamLikes;