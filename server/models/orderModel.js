var mongoose = require('mongoose');

var OwnersSchema = new mongoose.Schema({	
   // OwnerId:{type:mongoose.Schema.Types.ObjectId, ref: 'user', required : true}, 
    OwnerEmail:{type:String , required : true},
    OwnerName:{type:String , required : true},
	UniqueIdPerOwner : {type:String}
});

var CartSchema = new mongoose.Schema({	
    CapsuleId:{type:mongoose.Schema.Types.ObjectId, ref: 'Capsules', required : true}, 
    Price:{type:Number, required : true},					//This field will not be used for CREATE_Others case. 
    TotalPayment : {type : Number , required : true},
	PlatformCommission : {type : Number,required : true},			//For CREATE_Others case it is currently $9.99 per owner.
	CapsuleCreatedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'user', required : true},
    Owners : [OwnersSchema], //this must have ids of owners so that we can ref it.
	PayoutStatus : {type : Boolean , default : false},					//these two fields will be used for 
	PayoutId : {type:mongoose.Schema.Types.ObjectId, ref: 'Payouts'},
	MonthFor : {
		type:String,
		default: 'M12'
		//enum:['M1','M3','M6','M9','M12','M15','M18','M21','M24']
	},
	Frequency : {
		type:String,
		default: 'high'
		//enum:['high','medium','low']
	},
	IsStreamPaused : {
		type : Boolean,
		default : false
	},
	EmailTemplate : {
		type : String,
		default : 'ImaginativeThinker',
		//enum : ['ImaginativeThinker', 'PracticalThinker']
	},
	IsSurpriseGift : {
		type : Boolean,
		default : false
	}
});

var orderSchema = new mongoose.Schema(
    {	
        OrderInitiatedFrom : {  //this will tell us how this order has been initiated. we can put our logic based on these keys
            type : String,
            enum : ["CREATE_Others","PGALLARY","PGALLARY_Myself","PGALLARY_Gift"],
            required : true
        },
        CreatedById : {type:mongoose.Schema.Types.ObjectId, ref: 'user' , required : true}, 
        CreatedByEmail : {type:String , required : true}, 
        TotalPayment : {type : Number , required : true},
		TotalPlatformCommission : {type : Number , required : true},
        CartItems : [CartSchema],
        TransactionState : {
            type: String,
            enum : ["Initiated","Completed","Failed"],
            Required : true,
            default : "Initiated"
        },
        PGatewayResult : {
            type : Object,
            default : {}
        },
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
        },
		IsPaidToCreator : {
			type : Boolean, 
			default : false
		}
    }, 
    { 
        collection: 'Orders' 
    }
);

var order = mongoose.model('Orders', orderSchema);

module.exports = order;