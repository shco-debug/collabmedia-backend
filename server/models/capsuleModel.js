var mongoose = require('mongoose');
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
		default: Date.now
	},
	Relation: {
		type: String,
		enum: ['Friend', 'Family', 'Colleague', 'Acquaintance', 'Other'],
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
		default: false
	},
	LeftOn: {
		type: Date
	},
	ModifiedOn: {
		type: Date
	},
	IsRegistered: {
		type: Boolean,
		required: true
	},

});
var launchSettings = {
	Audience: {						//ME & OTHERS & PUBLISH (SUBSCRIBERS)
		type: String,
		enum: ['ME', 'OTHERS', 'BUYERS', 'SUBSCRIBERS', 'CELEBRITY'],		//SUBSCRIBERS is replaced by BUYERS - Still keeping that in enum...will remove after verification of all cases.
		default: 'ME'
	},
	ShareMode: {						//(private/public/friend-solo/friend-group)	//this is participation
		type: String,
		enum: ['private', 'public', 'friend-solo', 'friend-group', 'invite'],
		default: "private"
	},
	OthersData: [inviteeSchema],
	Invitees: [inviteeSchema],
	//special capsule case like birthday capsule -- all business logics are based on CapsuleFor, OwnerBirthday, IsInvitationSent fields as below and IsAllowedForSales field as well on invitation cron job :
	CapsuleFor : {
		type : String,
		enum : ["Birthday","Theme", "Stream"]
	},
	StreamType : {
		type : String,
		enum : ['', 'Group'], //empty string for simple stream, 'Group' for group stream
		default : undefined
	},
	OwnerBirthday : {
		type : String
	},
	IsInvitationSent : {
		type : Boolean,
		default : false
	}
};

var capsuleSchema = new mongoose.Schema({
	Origin: {
		type: String,
		enum: ["created", "shared", "byTheHouse", "duplicated", "addedFromLibrary", "createdForMe", "published", "purchased", "gifted","journal"],	//published : this is the case when the creater will publish Capsule for other 
		default: "created"
	},
	OriginatedFrom: {			//keep the id from which the instance is created, useful for other than Origin = created case.
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Capsules'
	},
	UniqueIdPerOwner: {            //this is the order's Purchase UniqueId for this Owner's capsule instance
		type: String
	},
	PurchasedBy: {					//started using this from SurpriseGift flow
		type: mongoose.Schema.Types.ObjectId,
		//required: true,
		ref: 'user'
	},
	CreaterId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true
		// Note: No ref constraint to allow flexible population from User, Admin, or SubAdmin collections
	},
	OwnerId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'user'
	},
	OwnerEmail: {									//- To Manage ShareWith Case: Non-Registered user
		type: String
	},
	Title: {
		type: String,
		default: "Untitled Capsule",
		required: true
	},
	Order: {
		type: Number,
		default: 0
	},
	Status: {
		type: Boolean,
		default: true
	},
	IsPublished: {
		type: Boolean,
		default: false
	},
	IsLaunched: {
		type: Boolean,
		default: false
	},
	IsDeleted: {
		type: Boolean,
		default: false
	},
	CreatedOn: {
		type: Date
	},
	ModifiedOn: {
		type: Date,
		default: Date.now
	},
	LaunchSettings: launchSettings,
	CoverArt: {
		type: String
	},
	MenuIcon: {
		type: String
	},
	Chapters: {
		type: Array
	},
	MetaData: {
		description: { type: String },
		edition: { type: String },
		publisher: { type: String },
		author: { type: String },
		Fsg: { type: Object },
		phase: { type: Array },
		focus: { type: Array },
		keywords: { type: String },
		StickerTextStore : { type: String },
		StickerTextOwner : { type: String },
		StickerTextFriend : { type: String },
		StickerColor : { type: String },
		ButtonsColor : { type: String },
		ExploreColor : { type: String },
		StoreDescription : { type : String },
		UserDescription : { type : String },
		CapsuleType : { type : String }
	},
	Price: {
		type: Number
	},
	DiscountPrice: {
		type: Number
	},
	IsAllowedForSales: {
		type: Boolean,
		default: false
	},
	MonthFor : {
		type:String,
		enum:['M1','M3','M6','M9','M12','M15','M18','M21','M24']
	},
	Frequency : {
		type:String,
		enum:['high','medium','low']
	},
	FrequencyInDays : {		//currently this setting will be applied for Group Stream as per new requirement as we don;t have option for buyers to select these settings. we want creater to decide. 
		type:Number,
		default:2
	},
	IsStreamPaused : {
		type : Boolean,
		default : false
	},
	EmailTemplate : {
		type : String,
		default : 'PracticalThinker',
		enum : ['ImaginativeThinker', 'PracticalThinker']
	},
	EmailSubject : {
		type : String
	},
	IsOnetimeStream : {
		type : Boolean,
		default : false
	},
	IsOnlyPostImage : {
		type : Boolean,
		default : false
	},
	IsSurpriseGift : {
		type : Boolean,
		default : false
	},
	CelebrityInstanceId : {
		type : mongoose.Schema.Types.ObjectId
	},
	IsOwnerPostsForMember : {
		type : Boolean,
		default : false
	},
	IsPurchaseNeededForAllPosts : {
		type : Boolean,
		default : false
	},
	OwnerAnswer : {
		type : Boolean,
		default : false
	},
	StreamFlow : {
		type : String,
		default : 'Birthday',
		enum : ['Birthday', 'Event', 'Topic']
	},
	LaunchDate: {
		type: String
	},
	IsLaunchDateFinalized : {
		type : Boolean,
		default : false
	},
	AutoInvitePopupCount : {
		type : Number,
		default : 0
	},
	AutoCoverPageCount : {
		type : Number,
		default : 0
	}
}, { collection: 'Capsules' });

var capsule = mongoose.model('Capsules', capsuleSchema);

/*
chapter.pre('save', function(next){
  //Yes, good. `this` here will be your mongoose model instance
  self = this
  request.get('myapi.com/method', { param_one: this_is_myparam } , function(err, data){
    //Yes, good. All you have to do here is CHANGE the mongoose model instance
    self.myField = data['myFrield']
    //No, bad. This is extraneous. By definition, mongoose is going to save your model
    //automatically after the "preSave" hook completes, so you should remove this.
    //self.save()
    next()
  }
  //No, bad. Remove this as well. You need to wait for the response to come back
  //next()
})
*/
// assign a function to the "methods" object of our capsule schema
/*
capsule.methods.findByIDD = function (cb) {
  return this.model('Capsule').find({ type: this.type }, cb);
}
*/
module.exports = capsule;