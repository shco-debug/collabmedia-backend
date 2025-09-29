/*
	Comments - Loads all the Mongoose models defined on the server.
*/

var fs = require('fs');

module.exports = function(){
	
	//required models for front-end
	require('./models/userModel.js');
	require('./models/projectModel.js');
	require('./models/fsgModel.js');
	require('./models/domainModel.js');
	
	require('./models/collectionModel.js');
	require('./models/boardModel.js');
	require('./models/groupTagsModel.js');
	require('./models/metaMetaTagsModel.js');
	require('./models/mediaActionLogModel.js');
	require('./models/mediaModel.js');
	require('./models/pageModel.js');
	
	//required models for back-end other than above
	
	require('./models/adminModel.js');
	require('./models/contributionModel.js');
	require('./models/sourceModel.js');
	
	//collab-7.2
	require('./models/chapterModel.js');
	require('./models/referralModel.js');
	require('./models/transectionHistoryModel.js');
	require('./models/massImportModel.js')

	
	
	/*dynamic loading code
	var models_path = __dirname + '/models';
	var walk = function(path) {
			fs.readdirSync(path).forEach(function(file) {
					var newPath = path + '/' + file;
					var fileStatus = fs.statSync(newPath);
					if(fileStatus.isFile()){
							if(/(.*)\.(js$)/.test(file)){
								require(newPath);
							}
					}
					else if (fileStatus.isDirectory()){
							walk(newPath);
					}
			});
	};
	walk(models_path);
	*/
}