var mongoose = require('mongoose');
var SyncedpostsMapSchema = new mongoose.Schema({
	CapsuleId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Capsules'
	},
	SyncedPosts : {
        type: Array,
        default: []
    },
	IsDeleted : {
		type : Boolean,
		default : 0
	},
	CreatedOn : {
		type : Date,
		default : Date.now()
	},
	UpdatedOn : {
		type : Date,
		default : Date.now()
	}
}, { collection: 'SyncedpostsMap' });

var SyncedpostsMap = mongoose.model('SyncedpostsMap', SyncedpostsMapSchema);
module.exports = SyncedpostsMap;