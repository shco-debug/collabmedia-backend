var mongoose = require('mongoose');

var flagAsInAppropriateSchema = new mongoose.Schema({	
	MediaId:{type: mongoose.Schema.Types.ObjectId, ref: 'media', required : true},
	UserId:{type: mongoose.Schema.Types.ObjectId, ref: 'user', required : true},
	FlagAs:{type:Boolean}
});

var FlagAsInAppropriate = mongoose.model('FlagAsInAppropriate',flagAsInAppropriateSchema);

module.exports = FlagAsInAppropriate;
