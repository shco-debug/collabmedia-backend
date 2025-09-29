var mongoose = require('mongoose');

var pageSchema = new mongoose.Schema({
	collectionTitle:{type:String},
	notes:{type:String},
	status:{type:Number},
	isDeleted:{type:Number}	
}, { collection: 'Pages' });

var collection = mongoose.model('Pages',collectionSchema);

module.exports = collection;