var CronJobsModule = require('./cronJobsController.js');
var CronEngine = require('node-cron');

console.log('Loading cronJobs__Manager.js');
console.log('cronJobsController and node-cron required.');

console.log('Initializing Cron Schedules...');

//#) CronJobs to update the media counts per gt
CronEngine.schedule('0 0 1 * * *', function () {
    console.log('@@@@@@@@---------------------------Running CronJobsModule.updateMediaCountsPerGt-----------------------------@@@@@@@@@');
    CronJobsModule.updateMediaCountsPerGt();
});
console.log('updateMediaCountsPerGt schedule set.');

//#) CronJobs to update the post media counts
CronEngine.schedule('0 0 2 * * *', function () {
    console.log('@@@@@@@@---------------------------Running CronJobsModule.updatePostCountsPerGt-----------------------------@@@@@@@@@');
    CronJobsModule.updatePostCountsPerGt();
});
console.log('updatePostCountsPerGt schedule set.');

//#) CronJobs to updateRandomSortIdPerMedia
CronEngine.schedule('0 0 */5 * * *', function () {
    console.log('@@@@@@@@---------------------------Running CronJobsModule.updateRandomSortIdPerMedia-----------------------------@@@@@@@@@');
    CronJobsModule.updateRandomSortIdPerMedia();
});
console.log('updateRandomSortIdPerMedia schedule set.');

//#) CronJobs to updateAlltagsCollection
CronEngine.schedule('0 0 */6 * * *', function () {
    console.log('@@@@@@@@---------------------------Running CronJobsModule.updateAlltagsCollection-----------------------------@@@@@@@@@');
    CronJobsModule.updateAlltagsCollection();
});
console.log('updateAlltagsCollection schedule set.');

//#) CronJobs for InvitationEngineCron (daily on 05:00 minutes)
CronEngine.schedule('0 0 5 * * *', function () {
    console.log('@@@@@@@@---------------------------Running CronJobsModule.InvitationEngineCron-----------------------------@@@@@@@@@');
    CronJobsModule.InvitationEngineCron();
});
console.log('InvitationEngineCron schedule set.');

// --- TEST FUNCTION FOR DEBUGGING SYNEDPOSTEMAILCRON ---
function simpleSynedPostEmailCronTest() {
    console.log('@@@@@@@@---------------------------SynedPostEmailCron TEST TRIGGERED-----------------------------@@@@@@@@@');
    // Uncomment the next line to call the real function after confirming the trigger works:
    // CronJobsModule.SynedPostEmailCron();
}

console.log('About to schedule SynedPostEmailCron.');

// Schedule the test function every minute
CronEngine.schedule('* * * * *', function () {
    simpleSynedPostEmailCronTest();
});
console.log('SynedPostEmailCron schedule set (every minute test).');

console.log('Cron Schedules Initialization Complete.');

//#) CronJobs to update the media counts on daily basis - so that we can ignore those keywords which doesn't have any media on the platform. //daily on 00:59 minutes ...
CronEngine.schedule('0 0 1 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.updateMediaCountsPerGt-----------------------------@@@@@@@@@');
    CronJobsModule.updateMediaCountsPerGt();
});

//#) CronJobs to update the post media counts on daily basis - so that we can ignore those keywords which doesn't have any post media on the platform. //daily on 01:59 minutes ...
CronEngine.schedule('0 0 2 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.updateMediaCountsPerGt-----------------------------@@@@@@@@@');
    CronJobsModule.updatePostCountsPerGt();
});

//#) CronJobs to updateRandomSortIdPerMedia on daily basis - so that we can sort by random media for default search cases. //every 5 hours ...
CronEngine.schedule('0 0 */5 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.updateMediaCountsPerGt-----------------------------@@@@@@@@@');
    CronJobsModule.updateRandomSortIdPerMedia();
});

//#) CronJobs to updateAlltagsCollection on every 6 hours basis - so that we can generate gt's tag similar to gts for search keywords suggestions cases. //every 6 hours ...
CronEngine.schedule('0 0 */6 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.updateMediaCountsPerGt-----------------------------@@@@@@@@@');
    CronJobsModule.updateAlltagsCollection();
});

//#) CronJobs to update the media counts on daily basis - so that we can ignore those keywords which doesn't have any media on the platform. //daily on 12:00 minutes ...
CronEngine.schedule('0 0 5 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.InvitationEngineCron-----------------------------@@@@@@@@@');
    CronJobsModule.InvitationEngineCron();
});
/*ToDo
CronEngine.schedule('0 0 0 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.WishHappyBirthdayCron-----------------------------@@@@@@@@@');
    CronJobsModule.WishHappyBirthdayCron();
});
*/
/*ToDo
CronEngine.schedule('0 0 5 * * *', function () {
    CronJobsModule.GroupStreamBirthdayCron();
});
*/

CronEngine.schedule('0 0 5 * * *', function () {
    CronJobsModule.GroupStreamTopicCron();
});

CronEngine.schedule('0 30 23 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.WishHappyBirthdayCron-----------------------------@@@@@@@@@');
    CronJobsModule.sendLikesBatchNotification();
});

CronEngine.schedule('0 0 1 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.WishHappyBirthdayCron-----------------------------@@@@@@@@@');
    CronJobsModule.PreLaunch_GroupStreamTopicCron();
});
//#) Set CronJob for payouts to Creators on Daily Basis - need to update all collection with Payout Id and PayoutStatus if all success.
/*
CronEngine.schedule('27 9 * * *', function () {
    console.log('Running Cron daily to payout to the creators on their sales.');
    //CronJobsModule.payoutAll();
});
*/

//#) CronJobs to send the synced posts. //daily on 05:00 minutes ...

// CronEngine.schedule('0 0 6 * * *', function () {
CronEngine.schedule('* * * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.SynedPostEmailCron-----------------------------@@@@@@@@@');
    CronJobsModule.SynedPostEmailCron();
});
/*CronEngine.schedule('0 0 6 * * *', function () {
    //console.log('@@@@@@@@---------------------------Running CronJobsModule.SynedPostEmailCron-----------------------------@@@@@@@@@');
    CronJobsModule.SynedPostEmailCron();
});*/

//CronJobsModule.SynedPostEmailCron();
function reportAdmin (message , emails) {
	var message = message ? message : null;
	var emails = emails ? emails : [];
	
	if( message != null && emails.length ){
		
	}
	else{
	
	}
}