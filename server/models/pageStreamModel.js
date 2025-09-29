var mongoose = require('mongoose');
var PageStreamSchema = new mongoose.Schema({	
	PageId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Pages'
	},
	PostId : {
		type : mongoose.Schema.Types.ObjectId
	},
	PostStatement : {
		type: String,
		default: ''
	},
	SelectedBlendImages : {
		type : Array,
		default : []
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
}, { collection: 'PageStream' });

var PageStream = mongoose.model('PageStream', PageStreamSchema);
module.exports = PageStream;