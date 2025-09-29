//get all qaw-gallery pageIds from PageObj.
var allIds = [];
exports.getAllValues__OfTheMatchedKey = function(obj , key){
	var obj = obj ? obj : {};
	var key = key ? key : 'PageId';
	iterate(obj, key, '');
	console.log("allIds =--------",allIds);
	return allIds;
}
function iterate(obj2, key, stack) {
  for (var property in obj2) {
	if (Object.prototype.hasOwnProperty.call(obj2,property)) {
	//if(obj2.hasOwnProperty(property)){
	  if (typeof obj2[property] == "object") {
		//setImmediate(function(){
			var returnVal = iterate(obj2[property], stack + '.' + property);
			if(returnVal != undefined){
			  allIds.push(returnVal);
			}
		//});
	  } else {
		//console.log(property + "   " + obj2[property]);
		if(property==key){
		  //$('#output').append($("<div/>").text(stack + '.' + property))
		  //return property;
		  return obj2[property]
		}
	  }
	}
  }
}