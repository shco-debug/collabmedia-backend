var mongoose = require('mongoose');
var SyncedpostsSchema = new mongoose.Schema({	
	CapsuleId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Capsules'
	},
	PageId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Pages'
	},
	PostId : {
		type : mongoose.Schema.Types.ObjectId
	},
	PostImage : {
		type : String
	},
	PostStatement : {
		type : String
	},
	PostOwnerId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'user'
	},
	SyncedBy : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'user'
	},
	ReceiverEmails : {
		type : Array
	},
	SurpriseSelectedTags : {
		type : Array
	},
	EmailEngineDataSets : {
		type : Array
	},
	EmailTemplate : {
		type : String,
		default : 'ImaginativeThinker',
		enum : ['ImaginativeThinker', 'PracticalThinker']
	},
	EmailSubject : {
		type : String
	},
	IsOnetimeStream : {
		type : Boolean,
		default : 0
	},
	IsOnlyPostImage : {
		type : Boolean,
		default : 0
	},
	IsPrivateQuestionPost : {
		type : Boolean,
		default : 0
	},
	Status : { 
		type: Boolean,
		default : 1
	}, 
	IsDeleted : {
		type : Boolean,
		default : 0
	},
	IsPageStreamCase : {
		type : Boolean,
		default : 0
	},
	CreatedOn : { 
		type : Date,
		default : Date.now() 
	},
	NotificationWillEndOn : { 
		type : Date,
		default : Date.now() 
	},
	UpdatedOn : { 
		type : Date, 
		default : Date.now()
	}
}, { collection: 'Syncedposts' });

var Syncedposts = mongoose.model('Syncedposts', SyncedpostsSchema);
module.exports = Syncedposts;