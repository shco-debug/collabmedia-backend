var mongoose = require('mongoose');
var StreamConversationSchema = new mongoose.Schema({	
	CapsuleId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Capsules',
		required : true
	},
	UserId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'users',
		required : true
	},
	ConversationCount : {
		type : Number,
		required : true,
		default : 0
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
}, { collection: 'StreamConversation' });

var StreamConversation = mongoose.model('StreamConversation', StreamConversationSchema);
module.exports = StreamConversation;