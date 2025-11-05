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

// ⚡ CRITICAL INDEXES for getUserMixedFeedPosts performance
// These indexes are ESSENTIAL for fast feed queries

// Index 1: For user's own capsules query (Source 1)
// Covers: {CapsuleId: {$in: [...]}, IsDeleted: false, Status: true, 'EmailEngineDataSets.Delivered': false}
SyncedpostsSchema.index({ CapsuleId: 1, IsDeleted: 1, Status: 1, CreatedOn: -1 });

// Index 2: For friend-interacted posts query (Source 2)
// Covers: {PostId: {$in: [...]}, IsDeleted: false, Status: true}
SyncedpostsSchema.index({ PostId: 1, IsDeleted: 1, Status: 1, CreatedOn: -1 });

// Index 3: General sort index for pagination
// Used by $sort in aggregation pipeline
SyncedpostsSchema.index({ CreatedOn: -1, _id: -1 });

// Index 4: For EmailEngineDataSets.Delivered filtering
// Used in Source 1 query condition
SyncedpostsSchema.index({ 'EmailEngineDataSets.Delivered': 1, CapsuleId: 1, IsDeleted: 1, Status: 1 });

var Syncedposts = mongoose.model('Syncedposts', SyncedpostsSchema);
module.exports = Syncedposts;