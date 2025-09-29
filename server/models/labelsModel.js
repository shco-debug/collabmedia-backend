var mongoose = require('mongoose');
var labelSchema = new mongoose.Schema({
	Label: {
		type: String
	},
	Icon: {
		type: String
	},
	AddedBy: {
		type: String,
		enum: ["Admin", "User"],
		default: "User"
	},
	CreaterId: {
		type: String,
		ref: 'user'
	},
	Status: {
		type: Boolean,
		default: true
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
}, { collection: 'Labels' });

var label = mongoose.model('Labels', labelSchema);
module.exports = label;