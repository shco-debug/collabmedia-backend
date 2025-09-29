var mongoose = require('mongoose');

var friendData = {
	ID : {
		type : String, 
	},
	Email : {
		type : String , 
		required : true
	},
	Name : {
		type : String
	},
	NickName : {
		type : String
	},
    Pic : {
		type : String,
		default:'/assets/users/default.png'
	},
	Relation : {
		type : String
	},
	RelationID : {
		type : String
	},
	IsRegistered : {
		type : Boolean,
		required : true
	}
}


var friendsSchema = new mongoose.Schema({	
	UserID:{
		type : String,
		required : true
	},
	
	Friend: friendData,
	
	Status : {
		type : Boolean, 
		default : true 
	},
	IsDeleted : {
		type : Boolean,
		default : false
	},
	CreatedOn : {
		type : Date
	},
	ModifiedOn : {
		type : Date, 
		default : Date.now()
	}
	
},{ collection : 'Friends' });

var friends = mongoose.model('Friends',friendsSchema);

module.exports = friends;