var mongoose = require('mongoose');

var sourceSchema = new mongoose.Schema({
	sourceTitle:{type:String},
	notes:{type:String},
	status:{type:Number},
	DateAdded : { type : Date, default: Date.now },
	LastModified : { type : Date, default: Date.now },
	isDeleted:{type:Number}	
}, { collection: 'Sources' });

var source = mongoose.model('Sources',sourceSchema);

module.exports = source;

