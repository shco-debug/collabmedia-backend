var mongoose = require('mongoose');

var referralSchema = new mongoose.Schema({
    ReferredById: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    ReferredToId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    ReferredByEmail: { type: String },
    ReferredToEmail: { type: String },
    ReferralCode: { type: String },
    ReferradCapsuleId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Capsules'},
    status: { type: Boolean, default: false }
});


var referral = mongoose.model('Referral', referralSchema);

module.exports = referral;






