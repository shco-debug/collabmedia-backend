const mongoose = require('mongoose');

const fsgValueSchema = new mongoose.Schema({
    valueTitle: { type: String }
});

const fsgSchema = new mongoose.Schema({
    Title: { type: String },
    Values: [fsgValueSchema],
    status: { type: Number },
    DateAdded: { type: Date, default: Date.now },
    LastModified: { type: Date, default: Date.now },
    isDeleted: { type: Number }
}, { collection: 'FSGs' });

const fsg = mongoose.model('FSGs', fsgSchema);

module.exports = fsg;

