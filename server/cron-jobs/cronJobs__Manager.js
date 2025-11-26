var CronJobsModule = require('./cronJobsController.js');
var CronEngine = require('node-cron');

console.log('Loading cronJobs__Manager.js');
console.log('cronJobsController and node-cron required.');

console.log('Initializing Cron Schedules...');

// ============================================================================
// DISABLED CRON JOBS - Only active cron jobs are listed below
// ============================================================================

//#) CronJobs to update the media counts per gt - DISABLED
// CronEngine.schedule('0 0 1 * * *', function () {
//     console.log('@@@@@@@@---------------------------Running CronJobsModule.updateMediaCountsPerGt-----------------------------@@@@@@@@@');
//     CronJobsModule.updateMediaCountsPerGt();
// });
// console.log('updateMediaCountsPerGt schedule set.');

//#) CronJobs to update the post media counts - DISABLED
// CronEngine.schedule('0 0 2 * * *', function () {
//     console.log('@@@@@@@@---------------------------Running CronJobsModule.updatePostCountsPerGt-----------------------------@@@@@@@@@');
//     CronJobsModule.updatePostCountsPerGt();
// });
// console.log('updatePostCountsPerGt schedule set.');

//#) CronJobs to updateRandomSortIdPerMedia - DISABLED
// CronEngine.schedule('0 0 */5 * * *', function () {
//     console.log('@@@@@@@@---------------------------Running CronJobsModule.updateRandomSortIdPerMedia-----------------------------@@@@@@@@@');
//     CronJobsModule.updateRandomSortIdPerMedia();
// });
// console.log('updateRandomSortIdPerMedia schedule set.');

//#) CronJobs to updateAlltagsCollection - DISABLED
// CronEngine.schedule('0 0 */6 * * *', function () {
//     console.log('@@@@@@@@---------------------------Running CronJobsModule.updateAlltagsCollection-----------------------------@@@@@@@@@');
//     CronJobsModule.updateAlltagsCollection();
// });
// console.log('updateAlltagsCollection schedule set.');

//#) CronJobs for InvitationEngineCron - DISABLED
// CronEngine.schedule('0 0 5 * * *', function () {
//     console.log('@@@@@@@@---------------------------Running CronJobsModule.InvitationEngineCron-----------------------------@@@@@@@@@');
//     CronJobsModule.InvitationEngineCron();
// });
// console.log('InvitationEngineCron schedule set.');

console.log('Cron Schedules Initialization Complete.');

// ============================================================================
// DISABLED CRON JOBS - Duplicate/Inactive jobs commented out below
// ============================================================================

//#) CronJobs to update the media counts on daily basis - DISABLED
// CronEngine.schedule('0 0 1 * * *', function () {
//     CronJobsModule.updateMediaCountsPerGt();
// });

//#) CronJobs to update the post media counts on daily basis - DISABLED
// CronEngine.schedule('0 0 2 * * *', function () {
//     CronJobsModule.updatePostCountsPerGt();
// });

//#) CronJobs to updateRandomSortIdPerMedia - DISABLED
// CronEngine.schedule('0 0 */5 * * *', function () {
//     CronJobsModule.updateRandomSortIdPerMedia();
// });

//#) CronJobs to updateAlltagsCollection - DISABLED
// CronEngine.schedule('0 0 */6 * * *', function () {
//     CronJobsModule.updateAlltagsCollection();
// });

//#) CronJobs for InvitationEngineCron - DISABLED
// CronEngine.schedule('0 0 5 * * *', function () {
//     CronJobsModule.InvitationEngineCron();
// });

//#) WishHappyBirthdayCron - DISABLED (ToDo)
// CronEngine.schedule('0 0 0 * * *', function () {
//     CronJobsModule.WishHappyBirthdayCron();
// });

//#) GroupStreamBirthdayCron - DISABLED (ToDo)
// CronEngine.schedule('0 0 5 * * *', function () {
//     CronJobsModule.GroupStreamBirthdayCron();
// });

//#) GroupStreamTopicCron - DISABLED
// CronEngine.schedule('0 0 5 * * *', function () {
//     CronJobsModule.GroupStreamTopicCron();
// });

//#) sendLikesBatchNotification - DISABLED
// CronEngine.schedule('0 30 23 * * *', function () {
//     CronJobsModule.sendLikesBatchNotification();
// });

//#) PreLaunch_GroupStreamTopicCron - DISABLED
// CronEngine.schedule('0 0 1 * * *', function () {
//     CronJobsModule.PreLaunch_GroupStreamTopicCron();
// });
//#) Set CronJob for payouts to Creators on Daily Basis - need to update all collection with Payout Id and PayoutStatus if all success.
/*
CronEngine.schedule('27 9 * * *', function () {
    console.log('Running Cron daily to payout to the creators on their sales.');
    //CronJobsModule.payoutAll();
});
*/

// ============================================================================
// ACTIVE CRON JOBS - Only these three are enabled
// ============================================================================

//#) CronJobs to send the synced posts - Daily at 6:00 AM UTC
const emailCronSchedule = process.env.EMAIL_CRON_SCHEDULE || '0 0 6 * * *'; // Daily at 6:00 AM UTC
CronEngine.schedule(emailCronSchedule, function () {
    console.log('@@@@@@@@---------------------------Running CronJobsModule.SynedPostEmailCron-----------------------------@@@@@@@@@');
    CronJobsModule.SynedPostEmailCron();
});
console.log(`✅ SynedPostEmailCron schedule set: ${emailCronSchedule} (Daily at 6:00 AM UTC)`);
/*CronEngine.schedule('0 0 6 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.SynedPostEmailCron-----------------------------@@@@@@@@@');
    CronJobsModule.SynedPostEmailCron();
});*/

//CronJobsModule.SynedPostEmailCron();

//#) CronJobs to process subscription renewals - Daily at 2:00 AM UTC
CronEngine.schedule('0 2 * * *', function () {
    console.log('@@@@@@@@---------------------------Running CronJobsModule.processSubscriptionRenewals-----------------------------@@@@@@@@@');
    CronJobsModule.processSubscriptionRenewals();
});
console.log('✅ processSubscriptionRenewals schedule set (Daily at 2:00 AM UTC).');

//#) CronJobs to expire due subscriptions - Daily at 1:30 AM UTC
CronEngine.schedule('0 30 1 * * *', function () {
    console.log('@@@@@@@@---------------------------Running CronJobsModule.expireDueSubscriptions-----------------------------@@@@@@@@@');
    CronJobsModule.expireDueSubscriptions();
});
console.log('✅ expireDueSubscriptions schedule set (Daily at 1:30 AM UTC).');

function reportAdmin (message , emails) {
	var message = message ? message : null;
	var emails = emails ? emails : [];
	
	if( message != null && emails.length ){
		
	}
	else{
	
	}
}