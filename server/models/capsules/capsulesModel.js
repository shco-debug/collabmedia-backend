var mongoose = require('mongoose');

var capsuleSchema = new mongoose.Schema({
	collectionTitle:{type:String},
	userType: {type: String},
	status:{type:Number},
	isDeleted:{type:Number},
	createdBy: {type: mongoose.Schema.ObjectId },
	createdDate: {type: Date}
}, { collection: 'Capsules' });

// Create Capsule
capsuleSchema.methods.saveCapsule = function(capsule, callBack){
	this.collectionTitle =  capsule.title;
	this.userType= '' ;
	this.status =  1;
	this.isDeleted =  0;
	this.createdBy= capsule.id;
	this.createdDate = new Date();
	this.save(function(err, res) {
		if(!res) return callBack(null, null);

		callBack( null, res);
	});
}


var collection = mongoose.model('Capsules',capsuleSchema);

module.exports = collection;