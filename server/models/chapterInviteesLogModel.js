var mongoose = require('mongoose');

var chapterInviteesLogSchema = new mongoose.Schema({
	SenderId : { 
		type : mongoose.Schema.Types.ObjectId , 
		required : true
	},
	ChapterId : { 
		type : mongoose.Schema.Types.ObjectId , 
		required : true
	},
	//UserId will be null if user is not a registered user at the time of inviting, will update this when user will register.
	UserId : { 					
		type : mongoose.Schema.Types.ObjectId 
	},
	UserEmail : { 
		type : String ,
		required : true
	},
	Relation : { 
		type : String, 
		required : true
	},
	UserName : { 
		type : String , 
		required : true
	},
	CreatedOn : {
		type : Date
	},
	ModifiedOn : {
		type : Date,
		default : Date.now();
	}
	AcceptedOn : {
		type : Date
	}
	
},{ collection : 'ChapterInviteesLogs' });

var ChapterInviteesLog = mongoose.model('ChapterInviteesLogs',chapterInviteesLogSchema);

module.exports = ChapterInviteesLog;