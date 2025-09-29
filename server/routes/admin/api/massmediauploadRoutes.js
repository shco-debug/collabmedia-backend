var media = require('../../../controllers/mediaController.js');
module.exports = function(router){
	 
	
	router.post('/add',function(req,res){
		media.uploadfile(req,res);
	})
	
	router.post('/edit',function(req,res){
		media.edit(req,res);
	})
	router.post('/editall',function(req,res){
		media.editAll(req,res);
	})
	router.post('/editTag',function(req,res){
		media.editTags(req,res);
	})	
	router.post('/view',function(req,res){
		media.findAll(req,res);
	})
	router.post('/view/all',function(req,res){
		media.findAllStatus(req,res);
	})
	router.post('/delete',function(req,res){
		media.deleteMedia(req,res);
	})
	// parul 08-01-2015
	router.post('/viewMedia',function(req,res){
		media.viewMediaAdmin(req,res);
	})
	// end
	
	// parul 10-04-2015
	router.post('/view/subadmin',function(req,res){
		media.findAll_subAdmin(req,res);
	})
	// end
	
	// by arun
	router.post('/view/allstatus',function(req,res){
		media.filteredData(req,res);
	})
	router.post('/editMedia',function(req,res){
		media.editMedia(req,res);
	})
	router.post('/addedTag',function(req,res){
		media.addedTag(req,res);
	})
	router.post('/deleteDescriptor',function(req,res){
		media.deleteDescriptor(req,res);
	})
	
	//added by manishp on 10032016 - making search by locator drop-down fast.
	router.post('/searchByLocatorList',function(req,res){
		media.searchByLocatorList(req,res);
	})
	
	//Added By Mayank Thapa 17 Feb 2k17
	router.post('/getFlagAsInAppropriates',function(req,res){
		media.getFlagAsInAppropriates(req,res);
	})





	router.post('/addMassImport',function(req,res){
		media.uploadMassImport(req,res);
	})

	router.post('/viewMassImport',function(req,res){
		media.findAllMassImport(req,res);
	})

	router.post('/deleteZipFile',function(req,res){
		media.deleteZipFile(req,res);
	})
	
	router.get('/ApiToFixDescriptors',function(req,res){
		media.ApiToFixDescriptorsMappingOnMedia(req,res);
	})
	

}