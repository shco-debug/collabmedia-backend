for(var idx = 0; idx < actionObj.Users.length; idx++ ){
	if(actionObj.Users[idx].UserFSGs){
		itemObj = actionObj.Users[idx].UserFSGs;
		var temp = {};
		var countN = 0;
		for( var attrName in loginUsrFsgs ){
			//if( itemObj[attrName] != undefined && itemObj[attrName] == loginUsrFsgs[attrName] ){
			if( itemObj[attrName] != undefined && ( itemObj[attrName] != '' || itemObj[attrName] != null ) ){
				var array1 = [];
				var array2 = [];
				var arrayIntersection = [];
				var matchedFsgWeight = 0;
				var matchedFsgWeightArr = [];
				
				array1 = itemObj[attrName].split(',');
				array2 = loginUsrFsgs[attrName].split(',');
				
				//keep the matched/common values 
				arrayIntersection = intersect( array1 , array2 );
				matchedFsgWeight = arrayIntersection.length; //get weight of the matched values - multiple case!
				
				
				if( matchedFsgWeight ){
					//keep track for further process
					//matchedFsgWeightArr.push({"matchedValues":arrayIntersection.join(),}); - will use this further to enhance the algorithm 
					matchedFsgWeightArr.push(matchedFsgWeight);
				}
				
				matchedFsgWeightArrSort = matchedFsgWeightArr.sort();
				
				if( itemObj[attrName] == loginUsrFsgs[attrName] ){	
					temp[attrName] = loginUsrFsgs[attrName];
				}
				
				if(){
				
				}
				
				countN += 1; //This count will tell the BestMatchedFSGs at last.
			}
			//}
			objToMap.push(countN);
		}
	}
}

http://jsfiddle.net/neoswf/aXzWw/

function intersect(array1, array2) {
   var result = [];
   // Don't destroy the original arrays
   var a = array1.slice(0);
   var b = array2.slice(0);
   var aLast = a.length - 1;
   var bLast = b.length - 1;
   while (aLast >= 0 && bLast >= 0) {
      if (a[aLast] > b[bLast] ) {
         a.pop();
         aLast--;
      } else if (a[aLast] < b[bLast] ){
         b.pop();
         bLast--;
      } else /* they're equal */ {
         result.push(a.pop());
         b.pop();
         aLast--;
         bLast--;
      }
   }
   return result;
}



function arrayIntersection() {
    var val, arrayCount, firstArray, i, j, intersection = [], missing;
    var arrays = Array.prototype.slice.call(arguments); 
    firstArr = arrays.pop();
    if (firstArr) {
        j = firstArr.length;
        arrayCount = arrays.length;
        while (j--) {
            val = firstArr[j];
            missing = false;
            i = arrayCount;
            idx = null;
            while (!missing && i--) {
                idx = arrays[i].indexOf(val);
                if ( !arrayContains(arrays[i], val) ) {
                    missing = true;
                }
            }
            if (!missing) {
                intersection.push(idx);
            }
        }
    }
    return intersection;
}



var array1  = [1, 2, 3, 4, 5, 6],
array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function myTest(array1 , array2){
	var common = $.grep(array1, function(element) {
		return $.inArray(element, array2 ) !== -1;
	});
	return common;
}
var common = $.grep(array1, function(element) {
    return $.inArray(element, array2 ) !== -1;
});

console.log(common); // returns [1, 2, 3, 4, 5, 6];



var array3 = array2.filter(function(obj) { return array1.indexOf(obj) == -1; });

// returns [7,8,9];