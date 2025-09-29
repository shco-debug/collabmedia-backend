var mongoose = require('mongoose');

var appSettingSchema = new mongoose.Schema({
    ReferralDiscount: { type: Number },
    PrimarySecondaryKeywordsPrompt: { type: String, default: '' },
    StreamMediaFilterSortingOrder: { type: String, default: '123' },
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true
});

var appSetting = mongoose.model('appSetting', appSettingSchema);
module.exports = appSetting;