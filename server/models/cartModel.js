var mongoose = require('mongoose');

var OwnersSchema = new mongoose.Schema({	
    //OwnerId:{type:mongoose.Schema.Types.ObjectId, ref: 'user', required : true}, 
    OwnerEmail:{type:String , required : true},
    OwnerObj:{},
    UniqueIdPerOwner : {type:String}
});

var CartItemsSchema = new mongoose.Schema({	
    CapsuleId:{type:mongoose.Schema.Types.ObjectId, ref: 'Capsules', required : true},
    CapsuleTitle:{type:String},
	Price:{type:Number, required : true},				//this is the capsule price
    TotalPayment : {type : Number , required : true},	//this is the capsule price * NoOfOwners
    CapsuleCreatedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user', required : true},
    PurchaseFor:{type:String}, //,enum:["Myself","Gift"],default:"Myself"
    Owners : [], //this must have ids of owners so that we can ref it.
	MonthFor : {
		type:String,
		default:'M12'
		//enum:['M1','M3','M6','M9','M12','M15','M18','M21','M24']
	},
	Frequency : {
		type:String,
		default: 'medium'
		//enum:['high','medium','low']
	},
	IsStreamPaused : {
		type : Boolean,
		default : false
	},
	EmailTemplate : {
		type : String,
		default : 'PracticalThinker',
		//enum : ['ImaginativeThinker', 'PracticalThinker']
	},
	IsSurpriseGift : {
		type : Boolean,
		default : false
	}
});

var CartSchema = new mongoose.Schema(
    {	
        CreatedById : {type:mongoose.Schema.Types.ObjectId, ref: 'user' , required : true}, 
        CreatedByEmail : {type:String , required : true}, 
        CartItems : [CartItemsSchema],
        Status : { 
            type: Boolean,
            default : false
        }, 
        IsDeleted : {
            type : Boolean,
            default : false
        },
        CreatedOn : { 
            type : Date,
            default : Date.now() 
        },
        UpdatedOn : { 
            type : Date, 
            default : null 
        }
    }, 
    { 
        collection: 'Cart' 
    }
);

var cart = mongoose.model('Cart', CartSchema);

module.exports = cart;