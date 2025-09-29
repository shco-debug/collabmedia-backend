var mongoose = require('mongoose');
//statement model
var statementSchema = new mongoose.Schema({
	Statement:{type:String},
	PostedBy:{type:String , ref:'users'},
	PostedOn:{type:Date , default: Date.now}
})
//var statement = mongoose.model('Statement',statementSchema);

module.exports = statementSchema;