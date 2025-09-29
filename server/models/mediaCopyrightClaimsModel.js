var mongoose = require('mongoose');

var UrlObjectSchema = new mongoose.Schema({
    Url:{type:String,ref:'groupTags', required : true},
    UrlWork: {type:String,ref:'groupTags'} 
   },{_id:false});


var mediaCopyrightClaimsSchema = new mongoose.Schema({	
        MediaId:{type: mongoose.Schema.Types.ObjectId, ref: 'media',required : true},
        ClaimedBy:{type: mongoose.Schema.Types.ObjectId, ref: 'user',required : true},
		UrlArr:[UrlObjectSchema], 	
        Description:{type:String, required : true},
        FirstName:{type:String, required : true}, 	
		LastName:{type:String, required : true},
        Company:{type:String}, 	
		Address:{type:String, required : true},
        Address2:{type:String}, 	
		City:{type:String, required : true},
        State:{type:String, required : true},
        PostalCode:{type:String, required : true},
        Country:{type:String},
        PhoneNumber:{type:String, required : true},
        Email:{type:String, required : true},
        IsNotAuthByCRightOwner:{type : Boolean,default : false},
        AreYouAuthorisedOwner:{type : Boolean,default : false},
        IsProvidedInfoAccurate:{type : Boolean,default : false},    
        FullName:{type:String, required : true},
		CreatedOn:{type : Date, default: Date.now},
		IsDeleted:{ type:Boolean , default:false }
});

var MediaCopyrightClaims = mongoose.model('MediaCopyrightClaims',mediaCopyrightClaimsSchema);

module.exports = MediaCopyrightClaims;
