var mongoose = require('mongoose');

var PageUsedMediaSchema = new mongoose.Schema({	
	pageId : {
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Pages',
		required: true,
		unique: true,  // One document per page
		index: true    // Index for fast lookups
	},
	usedMediaIds : [{
		type : mongoose.Schema.Types.ObjectId,
		ref : 'Medias'  // References Media._id
	}],
	lastUpdated : { 
		type : Date, 
		default : Date.now
	},
	createdOn : { 
		type : Date,
		default : Date.now
	}
}, { collection: 'PageUsedMedia' });

// Index for faster queries
PageUsedMediaSchema.index({ pageId: 1 });

var PageUsedMedia = mongoose.model('PageUsedMedia', PageUsedMediaSchema);
module.exports = PageUsedMedia;

