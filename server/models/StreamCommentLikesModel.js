var mongoose = require('mongoose');

var StreamCommentLikesSchema = new mongoose.Schema({	
	SocialPageId:{type: mongoose.Schema.Types.ObjectId, required : true},
	CommentId:{type: mongoose.Schema.Types.ObjectId, ref: 'StreamComments', required : true},
	LikedById:{type: mongoose.Schema.Types.ObjectId, ref: 'user', required : true},
	CreatedOn:{type : Date, default: Date.now()},
	ModifiedOn:{type : Date, default: Date.now()},
	IsDeleted: {type: Boolean, default: false}
});
//StreamCommentLikesSchema.index({CommentId: 1, LikedById: 1}, {unique: true});
var StreamCommentLikes = mongoose.model('StreamCommentLikes',StreamCommentLikesSchema);

module.exports = StreamCommentLikes;
