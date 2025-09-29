var groupTags = require('../../../controllers/groupTagsController.js');
var cronJobs = require('../../../cron-jobs/cronJobsController.js');

module.exports = function(router){
	 
	
	router.get('/view', function(req,res){
		groupTags.findAll(req,res);
	})
	router.get('/findAllGtOfMt', function(req,res){
		groupTags.findAllGtOfMt(req,res);
	})
	router.post('/add', function(req,res){
		groupTags.add(req,res);
	})
	router.post('/edit', function(req,res){
		groupTags.edit(req,res);
	})
	router.post('/delete', function(req,res){
		groupTags.deleteOne(req,res);
	})
	router.post('/viewmt', function(req,res){
		groupTags.findMTAll(req,res);
	})
	router.get('/userGt/view', function(req,res){
		groupTags.findAllUserGt(req,res);
	})
	router.post('/approve', function(req,res){
		groupTags.approve(req,res);
	})
	/*
	 * route added to impliment server side pagination for grouptags
	 */
	router.post('/view', function(req,res){
		groupTags.findPerPage(req,res);
	})
	/*
	 * route added to delete duplicate gts and descriptors
	 */
	router.get('/delete__duplicateDescriptor', function(req,res){
		groupTags.delete__duplicateDescriptor(req,res);
	})
	/*
	 * route added to add tag of same name to previously added descriptors.
	 */
	router.get('/add__tagToDescriptor', function(req,res){
		groupTags.add__tagToDescriptor(req,res);
	})
	/*
	 * route added to remove duplicate tags under  descriptors.
	 */
	router.get('/remove_dup_tags', function(req,res){
		console.log('remove_dup_tags');
		groupTags.remove_dup_tags(req,res);
	})
	
	
	/*
	 * route added to get only grout tags that can be used as themes
	 * excluding all descriptor group tags
	 */
	router.get('/without_descriptors', function(req,res){
		groupTags.withoutDescriptors(req,res);
	})
	
	/*
	 * route added to get all keywords starting with 
	 * a the string re
	 */
	router.post('/getKeywords', function(req,res){
		groupTags.getKeywords(req,res);
	})
	
	router.get('/trim', function(req,res){
		groupTags.trim(req,res);
	})
	
	/*
	 * route added to delete multiple gts 
	 * at a time
	 */
	
	router.post('/deleteAll', function(req,res){
		groupTags.deleteAll(req,res);
	})
	
	// search query
	router.post('/search', function(req,res){
		groupTags.searchQuery(req,res);
	})
	// search by mmt
	router.post('/mmt', function(req,res){
		groupTags.searchMMT(req,res);
	})
	// search by mt
	router.post('/mt', function(req,res){
		groupTags.searchMT(req,res);
	})
	
	// added by arun
	router.post('/getallKeywords', function(req,res){
		groupTags.getallKeywords(req,res);
	})
	
	router.get('/viewOnly', function(req,res){
		groupTags.findOnlyGt(req,res);
	})
	
	/*
		* UPDATE GROUP TAG MEDIA COUNTS - CRON JOB API TO HIT WHENEVER NEEDED TO SHOW IN REAL TIME.
		*
		*
	*/
	router.get('/updateMediaCountsPerGt_API', function(req,res){
		cronJobs.updateMediaCountsPerGt_API(req , res);
	})
	
	router.get('/updateAlltagsCollection_API', function(req,res){
		cronJobs.updateAlltagsCollection_API(req , res);
	})
	
	router.get('/updatePostCountsPerGt_API', function(req,res){
		cronJobs.updatePostCountsPerGt_API(req , res);
	})
	
	router.get('/addDescriptors__MassApi', function(req,res){
		groupTags.addDescriptors__MassApi(req , res);
	})
}