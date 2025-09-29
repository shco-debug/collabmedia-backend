var mongoose = require('mongoose');

var projectSchema = new mongoose.Schema({	
	ProjectTitle:{type:String},
	OwnerID:{type : String},
	Domain:{ type: mongoose.Schema.Types.ObjectId, ref: 'Domains' },
	isDeleted:{type:String},
	boardsCount:{type:Number, default:0},
	CreatedOn:{type:Date, default:Date.now()},
	ModifiedOn:{type:Date, default:Date.now()}
},{ collection : 'Projects' });


var project = mongoose.model('Projects',projectSchema);

module.exports = project;