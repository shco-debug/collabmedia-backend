var mongoose = require('mongoose');
var StreamEmailTrackerSchema = new mongoose.Schema({	
	CapsuleId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Capsules',
		required : true
	},
	PageId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Pages',
		required : true
	},
	PostId : {
		type : mongoose.Schema.Types.ObjectId,
		required : true
	},
	UserEmail : {
		type : String,
		required : true
	},
	EmailIndex : {
		type : String,
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
}, { collection: 'StreamEmailTracker' });

var StreamEmailTracker = mongoose.model('StreamEmailTracker', StreamEmailTrackerSchema);
module.exports = StreamEmailTracker;