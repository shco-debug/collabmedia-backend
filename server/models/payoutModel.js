var mongoose = require('mongoose');
var payoutSchema = new mongoose.Schema(
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
        collection: 'Payouts' 
    }
);

var payout = mongoose.model('Payouts', payoutSchema);

module.exports = payout;