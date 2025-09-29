var mongoose = require('mongoose');
var TeamsSchema = new mongoose.Schema({	
	TeamName : {
		type : String,
		required : true
	},
	UserId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'user',
		required : true
	},
	MemberEmails : {
		type : Array,
		default : []
		/*
			[{
				Email : "",
				Status : 0,
				StreamIds : []
			}]
		*/
	},
	StreamIds : {
		type : Array,
		default : []
	},
	Status : { 
		type: Boolean,
		default : 1
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
}, { collection: 'Teams' });

var Teams = mongoose.model('Teams', TeamsSchema);
module.exports = Teams;