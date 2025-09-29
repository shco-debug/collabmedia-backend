var mongoose = require('mongoose');


var chapterSchema = new mongoose.Schema({
	collectionTitle:{type:String},
	ImageExtension:{type:String},
	status:{type:Number},
	isDeleted:{type:Number},
	CreateDate: {type:Date},
	CreatedBy: {type:mongoose.Schema.ObjectId}
}, { chapter: 'Chapters' });

//save the chapter
chapterSchema.methods.saveChapter = function(fields,type, callBack){
			this.collectionTitle =  fields.title ;
	        this.ImageExtension = type;
			this.status =  1;
	        this.isDeleted = 0 ;
			this.CreateDate = new Date();
			this.CreatedBy = capsule.id;
	       	this.save(function(err, res) {
	  			if(!res) return callBack(null, null);

	  			callBack( null, res);
	  		});
	    
}

//Delete chapter
chapterSchema.statics.deleteChapter = function(id, callBack){
	this.findOne({ _id : id }, function (err, chapter){
		if (!err){
			chapter.remove( function(error, res){
				if(error) return callBack(null, null)
			
				callBack(null, res);
			});
		}else{
			return callBack(null, null);
		}
	});
}


var chapter = mongoose.model('Chapters',chapterSchema);
module.exports = chapter;