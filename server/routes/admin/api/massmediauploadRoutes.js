var media = require('../../../controllers/mediaController.js');
var mediaOld = require('../../../controllers/mediaControllerOld.js');
module.exports = function(router){
	 
	
	router.post('/add',function(req,res){
		media.uploadfile(req,res);
	})
	
	router.post('/edit',function(req,res){
		mediaOld.edit(req,res);
	})
	router.post('/editall',function(req,res){
		mediaOld.editAll(req,res);
	})
	router.post('/editTag',function(req,res){
		mediaOld.editTags(req,res);
	})	
	router.post('/view',function(req,res){
		media.findAll(req,res);
	})
	router.post('/view/all',function(req,res){
		media.findAllStatus(req,res);
	})
	router.post('/delete',function(req,res){
		mediaOld.deleteMedia(req,res);
	})
	// parul 08-01-2015
	router.post('/viewMedia',function(req,res){
		mediaOld.viewMediaAdmin(req,res);
	})
	// end
	
	// parul 10-04-2015
	router.post('/view/subadmin',function(req,res){
		mediaOld.findAll_subAdmin(req,res);
	})
	// end
	
	// by arun
	router.post('/view/allstatus',function(req,res){
		media.filteredData(req,res);
	})
	router.post('/editMedia',function(req,res){
		mediaOld.editMedia(req,res);
	})
	router.post('/addedTag',function(req,res){
		mediaOld.addedTag(req,res);
	})
	router.post('/deleteDescriptor',function(req,res){
		mediaOld.deleteDescriptor(req,res);
	})
	
	//added by manishp on 10032016 - making search by locator drop-down fast.
	router.post('/searchByLocatorList',function(req,res){
		media.searchByLocatorList(req,res);
	})
	
	//Added By Mayank Thapa 17 Feb 2k17
	router.post('/getFlagAsInAppropriates',function(req,res){
		mediaOld.getFlagAsInAppropriates(req,res);
	})





	router.post('/addMassImport',function(req,res){
		mediaOld.uploadMassImport(req,res);
	})

	router.post('/viewMassImport',function(req,res){
		mediaOld.findAllMassImport(req,res);
	})

	router.post('/deleteZipFile',function(req,res){
		mediaOld.deleteZipFile(req,res);
	})
	
	router.get('/ApiToFixDescriptors',function(req,res){
		mediaOld.ApiToFixDescriptorsMappingOnMedia(req,res);
	})
	

}