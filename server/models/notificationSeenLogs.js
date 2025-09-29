var mongoose = require('mongoose');

var notificationSeenLogsSchema = new mongoose.Schema({
	UserId: { type : mongoose.Schema.Types.ObjectId , ref: 'user'},
	SeenBy: { type : mongoose.Schema.Types.ObjectId , ref: 'user' },
	CreatedOn:{type : Date, default: Date.now()},
	UpdatedOn:{type : Date, default: Date.now()}
},{ collection: 'NotificationSeenLogs' });

var notificationSeenLogs = mongoose.model('NotificationSeenLogs', notificationSeenLogsSchema);
module.exports = notificationSeenLogs;