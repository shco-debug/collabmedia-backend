var mongoose = require('mongoose');

var tagSchema = new mongoose.Schema({
	TagTitle:{type:String , required:true},
	DateAdded : { type : Date, default: Date.now },
	LastModified : { type : Date, default: Date.now },
	gtTitle:{type:String},
	gtId:{type:String},
	status:{type:Number}
})

var moreSchema = new mongoose.Schema({
	GroupTagId:{type:String},
	GroupTagName:{type:String}
})

var lessSchema = new mongoose.Schema({
	GroupTagId:{type:String},
	GroupTagName:{type:String}
})

var thinkSchema = new mongoose.Schema({
	GroupTagId:{type:String},
	GroupTagName:{type:String}
})
var alltagsSchema = new mongoose.Schema({
	gt_id : {type: mongoose.Schema.Types.ObjectId},		//new key to hold gt_id. - multiple enteries
	MainGroupTagTitle:{type:String , required:true},
	GroupTagTitle:{type:String , required:true},
	Notes:{type:String},
	MetaMetaTagID:{ type: mongoose.Schema.Types.ObjectId, ref: 'metaMetaTags' },
	MetaTagID:{type:String},
	More:[moreSchema],
	Less:[lessSchema],
	Think:[thinkSchema],
	Tags:[tagSchema],	
	DateAdded : { type : Date, default: Date.now },
	LastModified : { type : Date, default: Date.now },
	MediaCount : {type : Number, default : 0},
	status:{type:Number} // status is 3 for descriptor case// 1 active gt // 2 user gt // 0 deleted gt
	
}, { collection: 'alltags' });
var alltags = mongoose.model('allTags',alltagsSchema);

module.exports = alltags;