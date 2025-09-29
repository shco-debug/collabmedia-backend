var mongoose = require('mongoose');

var countersModel = new mongoose.Schema({
    _id:{type:String},
	seq:{type:Number}
});

var counter = mongoose.model('counters',countersModel);

module.exports = counter;

