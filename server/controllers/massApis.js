var mongoose = require('mongoose');

exports.massApis = {
	getUniqueDescriptors : getUniqueDescriptors(),
	getDuplicateDescriptors : getDuplicateDescriptors()
};
/*
1#) get all the descriptors list which are duplicated in a separate collection say it descriptors_duplicates.

*/
function getAllDescriptors() {
	function Map() {
		emit(
			this._id,					// how to group
			{count: 1,GroupTagTitle:this.GroupTagTitle}	// associated data point (document)
		);
	}
	
	function Reduce(key, values) {
		var reduced = {count:0,GroupTagTitle:''}; // initialize a doc (same format as emitted value)
		values.forEach(function(val) {
			reduced.count += val.count; 
			reduced.GroupTagTitle = val.GroupTagTitle;
		});
		return reduced;	
		//return values[0];
	}
	
	function Finalize(key, reduced) {
		return reduced;
	}
	
	/*
		query = {status:3};
		collection = "descriptors_all"
		format = "Replace"
	*/
}

function getUniqueDescriptors() {
	function Map() {
		emit(
			this.GroupTagTitle,					// how to group
			{count: 1,one_descriptor_id:this._id,all_descriptors:[]}	// associated data point (document)
		);
	}
	
	function Reduce(key, values) {
		var reduced = {count:0,one_descriptor_id:0,all_descriptors:[]}; // initialize a doc (same format as emitted value)

		values.forEach(function(val) {
			reduced.count += val.count; 
			reduced.one_descriptor_id = val.one_descriptor_id; 
			reduced.all_descriptors.push(val.one_descriptor_id);
		});

		return reduced;	
		
		//return values[0];
	}
	
	function Finalize(key, reduced) {
		return reduced;
	}
	
	/*
		query = {status:3};
		collection = "descriptors_unique"
		format = "Replace"
	*/
	
}

function getDuplicateDescriptors() {
	
}

//map-reduce on media collection
function getMediaDescriptors__All() {
	function Map() {
		var thisObj = this;
		var prompts = typeof(thisObj.Prompt) == 'string' ? thisObj.Prompt.split(',') : [];
		prompts.forEach(function(item){
			emit(
				{media_id:thisObj._id,descriptor : item.trim()},					// how to group
				{count: 1, media_id: thisObj._id, media_ids:[thisObj._id]}	// associated data point (document)
			);
		})
	}
	
	function Reduce(key, values) {
		var reduced = {count:0, media_id:0, media_ids:[]}; // initialize a doc (same format as emitted value)

		values.forEach(function(val) {
			reduced.media_id = val.media_id; 	// reduce logic
			reduced.media_ids.push(val.media_id); 	// reduce logic
			reduced.count += val.count; 
		});

		return reduced;	
		
		//return values[0];
	}
	
	function Finalize(key, reduced) {
		return reduced;
	}
	
	/*
		query = {Status:1,IsDeleted:0};
		collection = "media_descriptors_all"	= 289636
		format = "Replace"
	*/
}

//map-reduce on media_descriptors_all collection
function getMediaDescriptors__AllUnique() {
	function Map() {
		emit(
			this._id.descriptor,					// how to group
			{count: 1, media_id: this._id.media_id, media_ids: [this._id.media_id]}	// associated data point (document)
		); 
	}
	
	function Reduce(key, values) {
		var reduced = {count:0, media_id:0, media_ids:[]}; // initialize a doc (same format as emitted value)

		values.forEach(function(val) {
			reduced.media_id = val.media_id; 	// reduce logic
			reduced.media_ids.push(val.media_id); 	// reduce logic
			reduced.count += val.count; 
		});

		return reduced;	
		
		//return values[0];
	}
	
	function Finalize(key, reduced) {
		return reduced;
	}
	
	/*
		query = {};
		collection = "media_descriptors_all_unique"	 = 10760 records
		format = "Replace"
	*/
}

/*
2#) get all the unique descriptors list(of media prompt fields) with media ids (so that later we can map them) which are not added on the master table - grouptags in a separate collection say it "all_missing_media_descriptors".

*/








