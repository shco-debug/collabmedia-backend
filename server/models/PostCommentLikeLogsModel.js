var mongoose = require('mongoose');


var PostCommentLikeLogsSchema = new mongoose.Schema({	
        PostCommentId:{type: mongoose.Schema.Types.ObjectId, ref: 'MediaActionLog', required : true},
        LikedById:{type: mongoose.Schema.Types.ObjectId, ref: 'user', required : true},
        CreatedOn:{type : Date, default: Date.now()},
        ModifiedOn:{type : Date, default: Date.now()},
});
PostCommentLikeLogsSchema.index({PostCommentId: 1, LikedById: 1}, {unique: true});
var PostCommentLikeLogs = mongoose.model('PostCommentLikeLogs',PostCommentLikeLogsSchema);

module.exports = PostCommentLikeLogs;
