var mongoose = require('mongoose');
var votesSchema = new mongoose.Schema({	
	VotedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'}, 
	VotedOn:{type:Date,default:Date.now()}
});

var marksSchema = new mongoose.Schema({	
	MarkedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'}, 
	MarkedOn:{type:Date}
});

// Schema for embedded posts in pages (reference-only approach)
var embeddedPostSchema = new mongoose.Schema({	
	// Reference to master media
	MediaID:{type:mongoose.Schema.Types.ObjectId, ref: 'media'}, 
	
	// Page-specific data only
	PostedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user'},
	PostedOn:{type:Date , default : Date.now()},
	OwnerId:{type:String},
	PostPrivacySetting : {type : String , enum : ["PublicWithName","PublicWithoutName","OnlyForOwner","InvitedFriends"] , default : "PublicWithoutName"},
	
	// Optional page-specific overrides (if needed)
	MediaURL:{type:String},
	Title:{type:String},
	Prompt:{type:String},
	Locator:{type:String},
	thumbnail:{type:String},
	PostStatement:{type:String},
	
	// Move/Copy tracking (if needed)
	OriginalPostId : {type:mongoose.Schema.Types.ObjectId},
	Origin : {type : String , enum : ["Move","Copy"]},
	OriginatedFrom : {type:mongoose.Schema.Types.ObjectId},
	
	// Post-specific settings
	IsOnlyForOwner:{type:Boolean,default:false},
	IsAdminApproved: {type: Boolean , default: true},
	Themes:{type:Array,default:[]},
	TaggedUsers:{type:Array,default:[]},
	Label: {type:String},
	IsUnsplashImage : {type: Boolean , default: false},
	IsAddedFromStream : {type: Boolean , default: false},
	StreamId : {type:mongoose.Schema.Types.ObjectId},
	IsPostForUser : {type: Boolean , default: false},
	IsPostForTeam : {type: Boolean , default: false},
	IsEditorPicked : {type: Boolean , default: false},
	SurpriseSelectedWords : {type:String},
	SecondaryKeywords: {type: String},
	SecondaryKeywordsMap: {type: Object},
	SecondaryKeywords2: {type: String},
	SecondaryKeywordsMap2: {type: Object},
	MediaSelectionCriteria : {type: Object, default: null},
	MediaSelectionCriteria1 : {type: Object, default: null},
	MediaSelectionCriteria2 : {type: Object, default: null},
	PostStreamType: {type: String},
	Lightness : {type : String, default: "0"},
	DominantColors : {type : String, default: ""},
	PostType : {type : String , enum : [null, "AdPost", "BroadcastPost", "KeyPost", "GeneralPost", "Post", "QuestionPost", "AnswerPost", "InfoPost", "InfoPostOwner"], default : "Post"},
	IsPreLaunchPost: {type: Boolean, default: false},
	IsPrivateQuestionPost: {type: Boolean, default: false},
	"QuestionPostId" : {type:mongoose.Schema.Types.ObjectId},
	KeyPostType : {type : String , enum : ["Comment", "Post", "Recording", "CommentFromFriend"], default : "Comment"},
	PostLinkUrl : {type : String},
	IsOnetimeStream : {type: Boolean , default: false}
	
	// Removed: Content, MediaType, ContentType, GroupTags (these come from master media)
});

// Legacy mediaSchema for backward compatibility (keeping for existing data)
var mediaSchema = new mongoose.Schema({	
	//move/copy feature keys
	OriginalPostId : {type:mongoose.Schema.Types.ObjectId},		//optional this key will be used to track the all Move and Copy features of a post, and This id will be the actual parent post which was generated originally.
	Origin : {type : String , enum : ["Move","Copy"]},
	OriginatedFrom : {type:mongoose.Schema.Types.ObjectId},		//this is the id of the post from where It has been Moved or copied
	//move/copy feature keys
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
	PostedOn:{type:Date , default : Date.now()},
	UpdatedOn:{type:Date , default : Date.now()},
	ThemeID:{type:mongoose.Schema.Types.ObjectId, ref: 'groupTags'},
	ThemeTitle:{type:String},
	Votes:[votesSchema],
	Marks:[marksSchema],
	OwnerId:{type:String},
	VoteCount:{type:Number},
	Content:{type:String},
	thumbnail:{type:String}, //added by manishp on 23122014 - Montage case
	PostStatement:{type:String},	//added by manishp on 23042015
	IsOnlyForOwner:{type:Boolean,default:false},
	IsAdminApproved: {type: Boolean , default: true},
	PostPrivacySetting : {type : String , enum : ["PublicWithName","PublicWithoutName","OnlyForOwner","InvitedFriends"] , default : "PublicWithoutName"},
	Themes:{type:Array,default:[]},	//added on 14 nov 2017 by manishp - themePostSearch module (Ideas)
	TaggedUsers:{type:Array,default:[]},
	Label: {type:String},	//for label based searching in cafe
	IsUnsplashImage : {type: Boolean , default: false},
	IsAddedFromStream : {type: Boolean , default: false},
	StreamId : {type:mongoose.Schema.Types.ObjectId},
	IsPostForUser : {type: Boolean , default: false},
	IsPostForTeam : {type: Boolean , default: false},
	IsEditorPicked : {type: Boolean , default: false},
	SurpriseSelectedWords : {type:String},
	SecondaryKeywords: {type: String},
	SecondaryKeywordsMap: {type: Object},
	SecondaryKeywords2: {type: String},
	SecondaryKeywordsMap2: {type: Object},
	MediaSelectionCriteria : {type: Object, default: null},
	MediaSelectionCriteria1 : {type: Object, default: null},
	MediaSelectionCriteria2 : {type: Object, default: null},
	PostStreamType: {type: String},
	Lightness : {type: String, default: "0"},
	DominantColors : {type: String, default: ""},
	PostType : {type: String , enum: [null, "AdPost", "BroadcastPost", "KeyPost", "GeneralPost", "Post", "QuestionPost", "AnswerPost", "InfoPost", "InfoPostOwner"], default: "Post"},
	IsPreLaunchPost: {type: Boolean, default: false},
	IsPrivateQuestionPost: {type: Boolean, default: false},
	"QuestionPostId" : {type:mongoose.Schema.Types.ObjectId},
	KeyPostType : {type: String , enum: ["Comment", "Post", "Recording", "CommentFromFriend"], default: "Comment"},
	PostLinkUrl : {type: String},
	IsOnetimeStream : {type: Boolean , default: false},
	// 🎯 ADDING MISSING GROUP TAGS FIELD
	GroupTags: [{
		GroupTagID: {type: String, ref: 'groupTags'},
		MetaMetaTagID: {type: String, ref: 'groupTags'},
		MetaTagID: {type: String, ref: 'groupTags'}
	}]
});

//Start content page sub-schema
var QAWidObjSchema = new mongoose.Schema({
	PageId : {type : String},
	IsCommunityPost : {type : Boolean , default : false},
	Question : {
		H : {type : Number},
		W : {type : Number},
		X : {type : Number},
		Y :	{type : Number}
	},
	Answer : {
		H : {type : Number},
		W : {type : Number},
		X : {type : Number},
		Y : {type : Number},
		Color : {type : String}
	},
	Button : {
		H : {type : Number},
		W : {type : Number},
		X : {type : Number},
		Y : {type : Number}
	}
},{_id : false});

var backgroundSchema = new mongoose.Schema({	
    Type : {type : String , enum : ["color","image","video"] , default : "color"},
	Data : {type : String},		// will contain color, image url or video embed
	DataInvitees : {type : String},
    LqData : {type : String},	//will contain color, image url or video embed - will be used in case of image and video
    Thumbnail : {type : String},
    BgOpacity : {type : String , default : "1"}
},{_id : false});

var commonParamsSchema = new mongoose.Schema({	
	IsGrid : {type : Boolean , default : false},
	IsSnap : {type : Boolean , default : false},
	ViewportDesktop : {type : Boolean , default : true},
	ViewportTablet : {type : Boolean , default : false},
	ViewportMobile : {type : Boolean , default : false},
	Background : backgroundSchema
},{_id : false});

var widgetsSchema = new mongoose.Schema({
	SrNo : {type : Number , default : 0},
	Animation : {type : String , enum : ["blind","bounce","clip","drop","explode","fade","fold","scale","highlight","transfer","puff","slide","shake","fadeIn","fadeOut"] , default : "drop"},
	BgMusic : {type : String},		
	Type : {type : String , enum : ["text","image","audio","video","questAnswer"] , default : "text"},
	Data : {type : String},					//image - path , audio/video - path / embed code
	DataInvitees : {type : String},
	LqData : {type : String},               //Low Quality Data
	Thumbnail: {type : String},             //for video, audio case. - workshop widget case
	W : {type : Number , default : 0},
	H : {type : Number , default : 0},
	X : {type : Number , default : 0},
	Y : {type : Number , default : 0},
	Z : {type : Number , default : 0},
	QAWidObj : QAWidObjSchema
});

var viewportDesktopSectionsSchema = new mongoose.Schema({	
	SrNo : {type : Number , default : 0},
	Animation : {type : String},
	Height : {type : Number , default : 640},
        Background : backgroundSchema,
	Widgets : [widgetsSchema]
},{_id : false});

var viewportTabletSectionsSchema = new mongoose.Schema({	
	SrNo : {type : Number , default : 0},
	Animation : {type : String},
	Height : {type : Number , default : 640},
        Background : backgroundSchema,
	Widgets : [widgetsSchema]
},{_id : false});

var viewportMobileSectionsSchema = new mongoose.Schema({	
	SrNo : {type : Number , default : 0},
	Animation : {type : String},
	Height : {type : Number , default : 640},
        Background : backgroundSchema,
	Widgets : [widgetsSchema]
},{_id : false});
//End content page sub-schema

var inviteeSchema = new mongoose.Schema({
	UserID: {
		type: mongoose.Schema.Types.ObjectId,
	},
	UserEmail: {
		type: String,
		required: true
	},
	UserPic: {
		type: String,
		default: '/assets/users/default.png'
	},
	UserName: {
		type: String
	},
	UserNickName: {
		type: String
	},
	CreatedOn: {
		type: Date,
		default: Date.now()
	},
	Relation: {
		type: String,
		required: true
	},
	RelationId: {
		type: String
	},
	IsAccepted: {
		type: Boolean,
		default: false,
	},
	AcceptedOn: {
		type: Date
	},
	IsDeleted: {
		type: Boolean,
		default: false,
	},
	DeletedOn: {
		type: Date
	},
	DeletedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'user'
	},
	UserLeft: {
		type: Boolean,
	},
	LeftOn: {
		type: Date
	},
	ModifiedOn: {
		type: Date
	},
	IsRegistered: {
		type: Boolean,
		//required: true
	},

});

var labelsSchema = new mongoose.Schema({	
	LabelId:{
		type:mongoose.Schema.Types.ObjectId, 
		ref: 'Labels'
	},
	Label: {
		type: String
	},
	Icon: {
		type: String
	},
	AddedBy: {
		type: String,
		enum: ["Admin", "User"],
		default: "User"
	},
});

var launchSettings = {
	MakingFor: {						//ME & OTHERS & SUBSCRIBERS
		type: String,
		default: 'ME'
	},
	NamingConvention: {
		type: String,
		default: 'realnames'
	},
	/*
	dependent on MakingFor(Audience) = ME :- (private/public/friend-solo/friend-group)
	Public can NOT be private,  
	Private can be public/Friend-Solo/Friend-Group at any point,
	Friend-Solo can be public/Friend-Group
	*/
	ShareMode: {						//(private/public/friend-solo/friend-group)	- from 28 JUN 2017, private & public case are no longer in use.
		type: String,
		default: "friend-group"
	},
	Invitees: [inviteeSchema],
	OthersData: [inviteeSchema]
	//MusicLibrary:[]
};

var pageSchema = new mongoose.Schema(
    {	
        Origin:{
            type : String,
            enum : ["created","shared","byTheHouse","duplicated","addedFromLibrary","createdForMe","published","publishNewChanges","purchased","gifted","journal"],
            default : "created"
        },
        OriginatedFrom:{			//keep the id from which the instance is created, useful for other than Origin = created case.
            type : mongoose.Schema.Types.ObjectId
        },
        Title:{
            type : String,
            default : "Untitled Page"
		},
		TitleInvitees:{
            type : String,
            default : "Untitled Page"
        },
		HeaderVideoLink: {
            type : String
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
                type: String 
        },
        PageType : {
            type : String,
            enum : ["gallery","content","qaw-gallery"],
            required : true
        },
        Order : { 
            type: Number,
            default : 0
        },
        Status : { 
            type: Boolean,
            default : false
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
        Medias : [mongoose.Schema.Types.ObjectId], // Simple array of media IDs - true reference-only 
        IsLaunched : {				//NOT in use.....
            type : Boolean,
            default : false
        },
		QuestionTip : {
            type : String
        },
		uploadedVideo : {
            type : String
        },
        SelectionCriteria : {	//this is to define the prefered media of the board - search gallery , which will always comes first.
            type : String,
            enum : ["media","keyword","all-media","hand-picked","theme","descriptor","filter","upload"],	//keyword will be replaced by themes & descriptors
            default : "media"
        },
        SelectedMedia : { 
            type : Array 
        },
        SelectedKeywords : { 
            type : Array 
        },
		SelectedFilters : { 	//this is used for filter selectionCriteria - to save default filters.
			type : Object
		},
		SelectedGts:{
			type: Array	
		},
		AddAnotherGts:{
			type: Array	
		},
		ExcludedGts:{
			type: Array	
		},
		UploadedMedia : { 
			type : Array 
		},
		mediaTypes : {
			 type : Array	
		},
		PageFilters : {
			type:Object
		},
		mediaRange : {
			type : Number,
			default : 100
		},
        HeaderBlurValue:{
            type : Number,
			default : 5				//Here, value will be 0 - 10.
        },
        HeaderTransparencyValue:{
            type : Number,
			default : 4,		//we devide it by 10 at frontend...	Here, value will be 0 - 10.
        },
		VoiceOverFile : {
			type : String
		},
		VoiceOverLyricsSettings : {
			type : Array,
			default: []
		},
		IsDasheditpage : {	
			type : Boolean,
			default : false			//0 for the normal page and 1 for the edit copy at the dashboard 
		},
		IsCommunityPost : {		//added on 03 nov 2017
			type : Boolean,
			default : false	
		},
		IsLabelAllowed: {
			type : Boolean,
			default : true	
		}, 
		DefaultLabels: { type:Array, default: [] },
		OwnerLabels: { type:Array, default: [] },
		Labels: [labelsSchema],
		HeaderColorCode : { type: String },
		CommonParams : commonParamsSchema,
		ViewportDesktopSections : viewportDesktopSectionsSchema,
		ViewportTabletSections : viewportTabletSectionsSchema,
		ViewportMobileSections : viewportMobileSectionsSchema,
		Themes:{type:Array,default:[]},	//added for journal module
		LaunchSettings: launchSettings,  //added for journal module
		EmailEngineDataSets : {
			type:Array
		},
		MediaSelectionCriteria : {type: Object},
		
		// ========== MODERN COMPONENT-BASED SCHEMA ==========
		// New responsive component system (replaces ViewportDesktop/Tablet/Mobile)
		Content: [{
			id: {
				type: String,
				default: function() { return new mongoose.Types.ObjectId().toString(); }
			},
			type: {
				type: String,
				enum: ["text", "image", "video", "audio", "qa", "media-grid", "question"],
				default: "text"
			},
			// Actual content data
			data: {
				text: { type: String },
				mediaUrl: { type: String },
				mediaTitle: { type: String },
				thumbnail: { type: String },
				qaPageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pages' },
				qaPageRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Pages' }, // Alternative ref name
				embedCode: { type: String },
				mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'media' }]
			},
			// Layout configuration (responsive by default)
			layout: {
				containerClass: { type: String, default: "container" },
				width: { type: String, default: "100%" },
				alignment: { type: String, enum: ["left", "center", "right", "justify"], default: "left" },
				stackOnMobile: { type: Boolean, default: true },
				order: { type: Number, default: 0 }
			},
			// Responsive overrides (optional)
			responsive: {
				mobile: {
					width: { type: String },
					order: { type: Number },
					hide: { type: Boolean, default: false }
				},
				tablet: {
					width: { type: String },
					order: { type: Number },
					hide: { type: Boolean, default: false }
				},
				desktop: {
					width: { type: String },
					order: { type: Number },
					hide: { type: Boolean, default: false }
				}
			},
			// Styling
			style: {
				animation: { type: String },
				bgColor: { type: String },
				textColor: { type: String },
				padding: { type: String },
				margin: { type: String }
			}
		}],
		
		// Page-level layout configuration
		PageLayout: {
			type: { 
				type: String, 
				enum: ["stack", "grid", "flex", "masonry", "custom"], 
				default: "stack" 
			},
			columns: {
				mobile: { type: Number, default: 1 },
				tablet: { type: Number, default: 2 },
				desktop: { type: Number, default: 3 }
			},
			gap: { 
				type: String, 
				enum: ["none", "sm", "md", "lg", "xl"], 
				default: "md" 
			},
			maxWidth: { type: String, default: "1200px" }
		},
		
		// Background for the entire page
		PageBackground: {
			type: { 
				type: String, 
				enum: ["color", "image", "video", "gradient"], 
				default: "color" 
			},
			value: { type: String, default: "#ffffff" },
			opacity: { type: Number, default: 1 },
			overlay: { type: String }
		}
		// Note: Old viewport fields (ViewportDesktopSections, etc.) are kept for backward compatibility
		// They will be deprecated and can be removed after migration
    }, 
    { 
        collection: 'Pages' 
    }
);

var page = mongoose.model('Pages', pageSchema);

module.exports = page;