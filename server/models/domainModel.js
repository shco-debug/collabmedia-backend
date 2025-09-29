var mongoose = require('mongoose');

var domainSchema = new mongoose.Schema({
	DomainTitle:{type:String},
	Notes:{type:String},
	status:{type:Number},
	DateAdded : { type : Date, default: Date.now },
	LastModified : { type : Date, default: Date.now },
	isDeleted:{type:Number}
}, { collection: 'Domains' });

var domain = mongoose.model('Domains',domainSchema);

module.exports = domain;

