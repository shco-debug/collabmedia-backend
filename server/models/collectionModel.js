var mongoose = require('mongoose');

var collectionSchema = new mongoose.Schema({
	collectionTitle:{type:String},
	notes:{type:String},
	status:{type:Number},
	DateAdded : { type : Date, default: Date.now },
	LastModified : { type : Date, default: Date.now },
	isDeleted:{type:Number}	
}, { collection: 'Collections' });

var collection = mongoose.model('Collections',collectionSchema);

module.exports = collection;