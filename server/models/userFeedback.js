var mongoose = require('mongoose');

var userFeedbackSchema = new mongoose.Schema({
	UserId: { type : mongoose.Schema.Types.ObjectId , ref: 'user', require : true},
	WhatWorks : { type : String, require : true, maxLength: 2000 },
	WhatPromise : { type : String, require : true, maxLength: 2000 },
	IsDeleted:{ type: Boolean , default:0 },
	CreatedOn:{ type : Date, default: Date.now() },
	UpdatedOn:{ type : Date, default: Date.now() }
},{ collection: 'UserFeedback' });

var userFeedback = mongoose.model('UserFeedback',userFeedbackSchema);

module.exports = userFeedback;