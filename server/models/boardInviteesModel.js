var mongoose = require('mongoose');

var boardInviteesLogSchema = new mongoose.Schema({
	UserId:{ type : mongoose.Schema.Types.ObjectId },
	BoardId:{ type : mongoose.Schema.Types.ObjectId },
	UserEmail:{ type: String },
	Relation:{ type: String },
	UserName:{ type: String },
	InvitationSent:{type : Date, default: Date.now},
	AcceptedOn:{type : Date},
	SenderId:{ type : mongoose.Schema.Types.ObjectId}
},{ collection: 'BoardInviteesLogs' });

var boardInviteesLog = mongoose.model('BoardInviteesLogs',boardInviteesLogSchema);

module.exports = boardInviteesLog;