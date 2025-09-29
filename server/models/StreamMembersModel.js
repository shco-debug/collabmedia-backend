var mongoose = require('mongoose');
var StreamMembersSchema = new mongoose.Schema({	
	StreamId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Capsules',
		required : true
	},
	OwnerId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'user',
		required : true
	},
	Members : {
		type : Array,
		default : []
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
}, { collection: 'StreamMembers' });

var StreamMembers = mongoose.model('StreamMembers', StreamMembersSchema);
module.exports = StreamMembers;