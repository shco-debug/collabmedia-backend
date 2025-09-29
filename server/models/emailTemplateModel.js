var mongoose = require('mongoose');

var emailtemplateSchema = new mongoose.Schema({
	name:{type:String},
	constants:{type:String},
	subject:{type:String},
	description:{type:String}
}, { collection: 'emailtemplates' });

var emailtemplate = mongoose.model('emailtemplates',emailtemplateSchema);

module.exports = emailtemplate;