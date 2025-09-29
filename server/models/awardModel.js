var mongoose = require('mongoose');
var AwardsSchema = new mongoose.Schema({	
	AwardedBy : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'user'
	},
	StreamId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Capsules'
	},
	PostId : {
		type : mongoose.Schema.Types.ObjectId
	},
	hexcode_blendedImage : { type : String },
	StreamOwnerId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'user'
	},
	PostOwnerId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'user'
	},
	Award : {
		type : String,
		enum : ['Top', 'Best', 'Unique']
	},
	Status : { 
		type: Boolean,
		default : true
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
	}
}, { collection: 'Awards' });

var Awards = mongoose.model('Awards', AwardsSchema);
module.exports = Awards;