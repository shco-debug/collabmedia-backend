var mongoose = require('mongoose');
var statementSchema = require(__dirname+'/statementSchema.js');

var mediaLocationSchema = new mongoose.Schema({
	Size:{type:String},
	URL:{type:String}	
})

var groupTagSchema = new mongoose.Schema({
	GroupTagID:{type:String,ref:'groupTags'},
	MetaMetaTagID: {type:String,ref:'groupTags'},
	MetaTagID: {type:String,ref:'groupTags'},
})

var collectionSchema = new mongoose.Schema({
	CollectionID:{type:String}
})

/*
 
Where added (by user)
        When user is inside a Capsule
        When user is inside a Board
	
Date added
	Start date
        End date

*/

var mediaSchema = new mongoose.Schema({
	_id:{type:String, unique:true},
	value:{type:Array , default:[]}	//Array containing all Statements/ideas used for reposting
},{ collection: 'duplicate_medias' });

var duplicate_medias = mongoose.model('duplicate_medias',mediaSchema);

module.exports = duplicate_medias;