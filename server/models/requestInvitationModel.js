var mongoose = require('mongoose');
var bcrypt=require('bcryptjs');

var requestInvitationSchema = new mongoose.Schema({
	Name:{type:String , required : true},
	Email:{type : String , required: true},
	Gender : {type:String,enum:["Male","Female","Other",""],default:""},
	RequestedAt : {type : Date,default : Date.now()},
	ModifiedOn : {type : Date,default : Date.now()},
	Status:{type:String,enum:["pending", "approved", "rejected", "expired"],default: "pending"},
	IsDeleted:{type:Boolean,default:false}
});

var requestInvitation = mongoose.model('requestInvitation',requestInvitationSchema);

module.exports = requestInvitation;

