var mongoose = require('mongoose');
var votesSchema = new mongoose.Schema({	
	VotedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user',required:true}, 
	VotedOn:{type:Date,default:Date.now()}
});

var marksSchema = new mongoose.Schema({	
	MarkedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'}, 
	MarkedOn:{type:Date}
});

var mediaSchema = new mongoose.Schema({	
	MediaID:{type:mongoose.Schema.Types.ObjectId, ref: 'media'}, 
	MediaURL:{type:String,required : true},
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


//Start content page sub-schema

var backgroundSchema = new mongoose.Schema({	
	Type : {type : String , enum : ["color","image","video"] , default : "color"},
	Data : {type : String},		// will contain color, image url or video embed
	LqData : {type : String}	//will contain color, image url or video embed - will be used in case of image and video
});

var commonParamsSchema = new mongoose.Schema({	
	IsGrid : {type : Boolean , default : false},
        IsSnap : {type : Boolean , default : false},
        ViewportDesktop : {type : Boolean , default : true},
        ViewportTablet : {type : Boolean , default : false},
        ViewportMobile : {type : Boolean , default : false},
	Background : backgroundSchema
});

var widgetsSchema = new mongoose.Schema({	
	SrNo : {type : Number , default : 0},
	Animation : {type : String , enum : ["fadeIn","fadeOut"] , default : "fadeIn"},
	BgMusic : {type : String},		
	Type : {type : String , enum : ["text","image","audio","video","questAnswer"]},
	Data : {type : String},			//image - path , audio/video - path / embed code
	W : {type : Number , default : 0},
	H : {type : Number , default : 0},
	X : {type : Number , default : 0},
	Y : {type : Number , default : 0},
	Z : {type : Number , default : 0}
});


var viewportDesktopSectionsSchema = new mongoose.Schema({	
	SrNo : {type : Number , default : 0},
	Animation : {type : String},
	Height : {type : Number , default : 640},
        Background : backgroundSchema,
	Widgets : [widgetsSchema]
});

var viewportTabletSectionsSchema = new mongoose.Schema({	
	SrNo : {type : Number , default : 0},
	Animation : {type : String},
	Height : {type : Number , default : 640},
        Background : backgroundSchema,
	Widgets : [widgetsSchema]
});

var viewportMobileSectionsSchema = new mongoose.Schema({	
	SrNo : {type : Number , default : 0},
	Animation : {type : String},
	Height : {type : Number , default : 640},
        Background : backgroundSchema,
	Widgets : [widgetsSchema]
});
//End content page sub-schema

var pageSchema = new mongoose.Schema(
	{	
		Origin:{
			type : String,
			enum : ["created","shared","byTheHouse","duplicated","addedFromLibrary","createdForMe","published","purchased","gifted"],
			default : "created"
		},
		OriginatedFrom:{			//keep the id from which the instance is created, useful for other than Origin = created case.
			type : mongoose.Schema.Types.ObjectId
		},
		Title:{
			type : String,
			default : "Page Untitled"
		},
		CreaterId : {
			type: String, 
			ref: 'user',
			required : true
		},
		OwnerId : {									//- OwnerID	before
			type: String, 
			ref: 'user',
			required : true
		},
		OwnerEmail : {									//- To Manage ShareWith Case: Non-Registered user
			type: String 
		},
		ChapterId : { 								//- ProjectId before
			type: String, 
			ref: 'Chapters' 
		},
		ChapterTitle : { 
			type: String,
			required : true			
		},
		PageType : {
			type : String,
			enum : ["gallery","content"],
			required : true
		},
		Order : { 
			type: Number,
			default : 0
		},
		Status : { 
			type: Boolean,
			default : 0
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
		},
		TotalVoteCount :{
			type : Number
		},
		HeaderImage : {
			type : String
		},
		BackgroundMusic : {
			type : String
		},
		Medias : [mediaSchema],
		SelectionCriteria : {
			type : String,
			enum : ["media","keyword"],
			default : "media"
		},
		SelectedMedia : { 
			type : Array 
		},
		SelectedKeywords : { 
			type : Array 
		}, 
		IsLaunched : {
			type : Boolean,
			default : 0
		},
		CommonParams : commonParamsSchema,
		ViewportDesktopSections : viewportDesktopSectionsSchema,
		ViewportTabletSections : viewportTabletSectionsSchema,
		ViewportMobileSections : viewportMobileSectionsSchema
	}, 
	{ 
		collection: 'TestContentPages' 
	}
);

var page = mongoose.model('TestContentPages', pageSchema);

module.exports = page;