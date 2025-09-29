var mongoose = require('mongoose');
var AnswerFinishLogsSchema = new mongoose.Schema({	
	StreamId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Capsules',
		required : true
	},
	MemberId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'user',
		required : true
	},
	Status : { 
		type: Boolean,
		default : true
	},
	IsDeleted : {
		type : Boolean,
		default : false
	},
	CreatedOn : { 
		type : Date,
		default : Date.now() 
	},
	UpdatedOn : { 
		type : Date, 
		default : Date.now()
	}
}, { collection: 'AnswerFinishLogs' });

var AnswerFinishLogs = mongoose.model('AnswerFinishLogs', AnswerFinishLogsSchema);
module.exports = AnswerFinishLogs;