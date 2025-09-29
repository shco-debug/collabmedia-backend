var mongoose = require('mongoose');
var statementSchema = require(__dirname+'/statementSchema.js');

var shortid = require('shortid');	//updated on 16Oct2017 - For search algorithm default random media

var mediaLocationSchema = new mongoose.Schema({
	Size:{type:String},
	URL:{type:String}	
})

var groupTagSchema = new mongoose.Schema({
	GroupTagID:{type:String,ref:'groupTags'},
	GroupTagTitle:{type:String}, // Added for fast search performance
	MetaMetaTagID: {type:String,ref:'groupTags'},
	MetaTagID: {type:String,ref:'groupTags'},
})

var collectionSchema = new mongoose.Schema({
	CollectionID:{type:String}
})

/*
 
Where added (by user)
        When user is inside a Capsule
        When user is inside a Board
	
Date added
	Start date
        End date

*/

var mediaSchema = new mongoose.Schema({
	Location:[mediaLocationSchema],
	//UploadedBy:{type:String,ref:'users'}, // admin/user/owner(at create end - private set of default media of the page)
	UploadedBy:{type:String}, // admin/user/owner(at create end - private set of default media of the page)
	UploadedOn:{type : Date, default: Date.now},
	UploaderID:{type:String},
	Notes:{type:String},
	Source:{type:String},	//MJ
	SourceUniqueID:{ type: mongoose.Schema.Types.ObjectId, ref: 'Sources' },
	MetaMetaTags:{ type: mongoose.Schema.Types.ObjectId, ref: 'metaMetaTags' },
	MetaTags:{ type: String },
	Domains:{ type: mongoose.Schema.Types.ObjectId, ref: 'Domains' },
	GroupTags:[groupTagSchema], // Changed to use groupTagSchema to match document structure
	//GroupTags:[{type:String}], // Old format - commented out
	//Collection:[collectionSchema], parul 06012015
	//Collection:[],// modified by parul 08012015
	Collection:[{type:String,ref:'Collections'}],
	Prompt:{ type:String }, //prompt will be used for discriptor from now onwards
	Title:{ type: String },
	Locator:{ type: String ,unique:true},
	Status:{ type:Number , default:0 },		//3-when new media is added to the media tray by user but not on board.. 1-when tag information will be assigned, 0- when admin media uploader submits. 2- When User adds Media without tags. it means media added from the front-end will never have Status 0, Either 2 or 1.
	AddedWhere:{ type: String }, //directToPf,capsule,board
	TagType:{ type : String }, //More,Less,Think,
	AddedHow:{ type : String }, //hardDrive,dragAndDrop,drawing. blending
	IsDeleted:{ type:Number },
	Content:{ type:String },
	MediaType:{ type:String },
	IsUnsplashImage : {type : Boolean , default : false},	//unsplash integration - For If MediaType : Link && LinkType : Image
	IsSpeechToTextDone : {type : Boolean , default : false},
	UnsplashPhotoId : {type : String},
	ContentType:{ type:String },
	ViewsCount:{type : Number},
	Views:{type:Object},
	Selects:{type:Object},
	Posts:{type:Object},
	Marks:{type:Object},
	Stamps:{type:Object},
	UserScore:{type:Number},
	OwnerFSGs:{type:Object},
	thumbnail:{type:String}, //added by manishp on 19122014
	WebThumbnail:{type:String}, //added by manishp on 16012015 for dynamic entry script
	IsPrivate:{type:Number,default:0}, //added by manishp on 21012015 for IsPrivate functionality,
	AutoId : {type:Number,unique:true},	 //media_unique_number/Platform Locator
	Photographer:{type:String},
	LinkType:{type:String},	//added on 10022015
	OwnStatement:{type:String},	//The Original statement by the image owner 
	CurrStatement:{type:String},	// Statement currently in use
	Statements:[statementSchema],	//Array containing all Statements/ideas used for reposting
	InAppropFlagCount : {type:Number,default:0},
	RandomSortId: {type: String , default : shortid.generate , index : true},
	RandomSortId_UpdatedOn : {type: String, default: Date.now}, // Changed to String to match document
	StyleKeyword : {type : String},
	Lightness : {type : String, default: "0"},
	DominantColors : {type : String, default: ""},
	MetaData: {type: Object},
	BlendSettings: {type: Object}, // Store blend settings for 2MJ posts
	
	// Copy/Move tracking fields (added for copy functionality)
	PostedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null},
	PostedOn: {type: Date, default: null},
	UpdatedOn: {type: Date, default: null},
	Origin: {type: String, enum: ["Move", "Copy"], default: null},
	OriginatedFrom: {type: mongoose.Schema.Types.ObjectId, default: null},
	OriginalPostId: {type: mongoose.Schema.Types.ObjectId, default: null},
	PostPrivacySetting: {type: String, enum: ["PublicWithName", "PublicWithoutName", "OnlyForOwner", "InvitedFriends"], default: null},
	
	// Post marking fields
	PostType: {type: String, enum: [null, "AdPost", "BroadcastPost", "KeyPost", "GeneralPost", "Post", "QuestionPost", "AnswerPost", "InfoPost", "InfoPostOwner"], default: "Post"},
	KeyPostType: {type: String, enum: ["Comment", "Post", "Recording", "CommentFromFriend"], default: "Comment"},
	IsPreLaunchPost: {type: Boolean, default: false},
	IsPrivateQuestionPost: {type: Boolean, default: false},
	IsOnetimeStream: {type: Boolean, default: false}
	//Themes : {type : Array , default : []},				//adding for new keywords hierarchy - Text Search
	//Descriptors : {type : Array , default : []}			//adding for new keywords hierarchy - Text Search
},{shardKey:{_id: 1}},{ collection: 'media' });

// Pre-save middleware to ensure GroupTags maintain proper structure
mediaSchema.pre('save', function(next) {
    if (this.GroupTags && Array.isArray(this.GroupTags)) {
        this.GroupTags = this.GroupTags.map(groupTag => {
            // If it's already in the correct format, keep it
            if (typeof groupTag === 'object' && groupTag.GroupTagID) {
                return {
                    _id: groupTag._id || new mongoose.Types.ObjectId(),
                    GroupTagID: groupTag.GroupTagID.toString(),
                    GroupTagTitle: groupTag.GroupTagTitle || null, // Preserve GroupTagTitle
                    MetaMetaTagID: groupTag.MetaMetaTagID || null,
                    MetaTagID: groupTag.MetaTagID || null
                };
            } 
            // If it's a string, convert to object format
            else if (typeof groupTag === 'string') {
                return {
                    _id: new mongoose.Types.ObjectId(),
                    GroupTagID: groupTag,
                    GroupTagTitle: null, // Will be populated by the update script
                    MetaMetaTagID: null,
                    MetaTagID: null
                };
            }
            // Return as is if already in correct format
            return groupTag;
        });
    }
    next();
});

var media = mongoose.model('Media',mediaSchema);

module.exports = media;