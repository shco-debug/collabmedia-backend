var mongoose = require('mongoose');

var privacySchema = new mongoose.Schema({	
	BoardType:{
		type: String,
		enum: ['OnlyYou', 'FriendsSolo', 'FriendsGroup', 'Public'],
		default: 'OnlyYou'
	}, //Only You (default) 
//Friends - Solo mode - Friends CANNOT see each other's entries
//Friends - Group mode - Friends CAN see each other's entries
//Any visitor from the web
	
	
	DisplayNames:{
		type: String,
		enum: ['RealNames', 'NickName'],
		default: 'RealNames'
	} //Show RealNames or NickName
});

var themeSchema = new mongoose.Schema({	
	ThemeID:{type:mongoose.Schema.Types.ObjectId, ref: 'groupTags'}, 
	ThemeTitle:{type:String},
	SuggestedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'},
	SuggestedOn:{type:Date},
	isApproved:{type:Number}
});

var inviteeSchema = new mongoose.Schema({
	UserID:{type:mongoose.Schema.Types.ObjectId, ref: 'user'},
	UserEmail:{type:String},
	UserName:{type:String},
	UserNickName:{type:String}
});

var votesSchema = new mongoose.Schema({	
	VotedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'}, 
	//VotedOn:{type:Date},// commented by parul14012015
	VotedOn:{type:Date,default:Date.now()}
});

var marksSchema = new mongoose.Schema({	
	MarkedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'}, 
	MarkedOn:{type:Date}
});

var mediaSchema = new mongoose.Schema({	
	MediaID:{type:mongoose.Schema.Types.ObjectId, ref: 'media'}, 
	MediaURL:{type:String},
	MediaTitle:{type:String},
	Title:{type:String},
	Prompt:{type:String},
	Locator:{type:String},
	MediaType:{type:String},
	ContentType:{type:String},
	PostedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'},
	PostedByNickName:{type:String},	
	PostedOn:{type:Date},
	ThemeID:{type:mongoose.Schema.Types.ObjectId, ref: 'groupTags'},
	ThemeTitle:{type:String},
	Votes:[votesSchema],
	Marks:[marksSchema],
	OwnerId:{type:String},
	VoteCount:{type:Number},
	Content:{type:String},
	thumbnail:{type:String}, //added by manishp on 23122014 - Montage case
	PostStatement:{type:String}	//added by manishp on 23042015
});
	
var commentSchema = new mongoose.Schema({
	CommentText:{type:String},
	//CommentedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'users'},
	CommentedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'},//parul--5 jan 2015
	Votes:[votesSchema],//parul 14012015
	CommentedOn:{type:Date},
	CommentStatus:{type:Number} //'0' Unread,'1' Read
});

var boardSchema = new mongoose.Schema({	
	Title:{type:String},
	OwnerID:{type: mongoose.Schema.Types.ObjectId, ref: 'user'},
	Domain:{ type: mongoose.Schema.Types.ObjectId, ref: 'Domains' },
	//Collection:{ type: mongoose.Schema.Types.ObjectId, ref: 'Collections' },
	Collection:[],
	PrivacySetting:[privacySchema],
	ProjectID:{ type: mongoose.Schema.Types.ObjectId, ref: 'Projects' },
	ProjectTitle:{ type: String },
	CreatedDate:{ type: Date, default:Date.now() },
	ModifiedDate:{ type: Date, default:Date.now() },
	BeginDate:{ type: Date},
	EndDate:{ type: Date},
	Themes:[themeSchema],
	Medias:[mediaSchema],
	TotalVoteCount:{type:Number},
	Comments:[commentSchema],
	Invitees:[inviteeSchema],
	HeaderImage:{type:String},
	BackgroundMusic:{type:String},
	isDeleted:{type:Number},
	CommentObjModifiedOn:{type:Date} //added by manishp on 22012015 for notification
	}, { collection: 'Boards' });

var board = mongoose.model('Boards',boardSchema);

module.exports = board;