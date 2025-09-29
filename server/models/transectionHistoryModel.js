var mongoose = require('mongoose');

var transectionHistorySchema = new mongoose.Schema({
    TransectionId:  {type:String}, // If transection type credit then save referralId. other then type dr then save order id
    TransectionType: {type: String}, //Cr and Dr
    Amount: { type: Number , default: 0 }
});


var transectionHistory = mongoose.model('TransectionHistory', transectionHistorySchema);

module.exports = transectionHistory;






