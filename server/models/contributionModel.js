var mongoose = require('mongoose');

var contributionSchema = new mongoose.Schema({
	contributionType:{type:String},
	contributionTitle:{type:String},
	DateAdded : { type : Date, default: Date.now },
	LastModified : { type : Date, default: Date.now },
	contributionValue:{type:Number}
}, { collection: 'Contribution' });

var source = mongoose.model('Contribution',contributionSchema);

module.exports = source;

