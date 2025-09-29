var mongoose = require('mongoose');

var sessionPostsModel = new mongoose.Schema({
    _id : {type:mongoose.Schema.Types.ObjectId , required : true},
	PageId : {type:mongoose.Schema.Types.ObjectId , required : true}, 
	SessionPostIds : [],
	CreatedOn : {type : Date , default : Date.now()},
	UpdatedOn : {type : Date , default : Date.now()},
	IsDeleted : false
});

var sessionPosts = mongoose.model('sessionPosts',sessionPostsModel);
module.exports = sessionPosts;