var mongoose = require('mongoose');
var musicLibrarySchema = new mongoose.Schema({
	Filename:{type:String , required : true},
	UserId:{type : mongoose.Schema.Types.ObjectId,ref : 'user', required : true},  
	Bytes:{type:Number, required : true}, 
	Duration : {type:Number, required : true},
	Track:{type:String, required : true},
	Status:{type:Number,default:1},
	CreatedOn : { type : Date, default: Date.now() },
	ModifiedOn : { type : Date, default: Date.now() },
	IsDeleted:{type:Number,default:0}
},{ collection: 'musicLib' });

var musicLib = mongoose.model('MusicLib',musicLibrarySchema);

module.exports = musicLib;