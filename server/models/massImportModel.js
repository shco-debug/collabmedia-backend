var mongoose = require('mongoose');

var massImportSchema = new mongoose.Schema({
	Title: { type: String },
	UploadedBy: { type: String }, // admin/user/owner(at create end - private set of default media of the page)
	UploadedOn: { type: Date, default: Date.now },
	UploaderID: { type: String },
	Notes: { type: String },
	Source: { type: String },
	SourceUniqueID: { type: mongoose.Schema.Types.ObjectId, ref: 'Sources' },
	MetaMetaTags: { type: mongoose.Schema.Types.ObjectId, ref: 'metaMetaTags' },
	MetaTags: { type: String },
	Domains: { type: mongoose.Schema.Types.ObjectId, ref: 'Domains' },
	Collection: [{ type: String, ref: 'Collections' }],
	Prompt: { type: String }, //prompt will be used for discriptor from now onwards
	Title: { type: String },
	Locator: { type: String, unique: true },
	status: { type: Boolean, default: false },
	IsDeleted: { type: Boolean,default: false},
});


var massImport = mongoose.model('massImport', massImportSchema);

module.exports = massImport;






