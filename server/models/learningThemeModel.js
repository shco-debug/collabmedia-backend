var mongoose = require('mongoose');

var learningThemesSchema = new mongoose.Schema({
	PageId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Pages'
	},
	UserId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'user'
	},
	ThemeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'groupTags'
	},
	ThemeTitle: {
		type: String,
		required: true
	},
	IsDeleted: {
		type: Boolean,
		default: false
	},
	CreatedOn: {
		type: Date,
		default: Date.now()
	},
	ModifiedOn: {
		type: Date,
		default: Date.now()
	}
}, { collection: 'LearningThemes' });

var learningThemes = mongoose.model('LearningThemes', learningThemesSchema);
module.exports = learningThemes;