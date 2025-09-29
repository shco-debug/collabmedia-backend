var commonModule = {
	getObjectArrIndexByKeyValue : getObjectArrIndexByKeyValue,
	getHashStrArr: getHashStrArr,
	strToCustomHash: strToCustomHash,
	customHashToStr: customHashToStr,
	getBlendConfigByLightnessScores: getBlendConfigByLightnessScores
}
exports.commonModule = commonModule;

/*It will work for 1 level hierarchy at the moment
 Input Array ex :
 var inputData = [
    {id_list: 2, name: 'John', token: '123123'},
    {id_list: 1, name: 'Nick', token: '312312'}
 ];
 getObjectArrIndexByKeyValue(inputData, 'id_list', 1) => It will return 1
 getObjectArrIndexByKeyValue(inputData, 'id_list', 10) => It will return -1.
*/
function getObjectArrIndexByKeyValue(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] == value) {	//you can use '===' for type checking ...
            return i;
        }
    }
    return -1;
}

function getHashStrArr() {
	var pStrangeStr1 = '87fb';
	var pStrangeStr2 = '786b';
	var pStrangeStr3 = 'kjwh9hy';
	var pStrangeStr4 = 'trnsbd';
	var pStrangeStr5 = 'jh456';
	var pStrangeStr6 = '98sdfn8';

	var hashStrArr = [
		pStrangeStr1,
		pStrangeStr2,
		pStrangeStr3,
		pStrangeStr4,
		pStrangeStr5,
		pStrangeStr6
	];
	return hashStrArr;
}

function strToCustomHash (str) {
	var strArr = Array.from(str);
	var tL = strArr.length;
	var hL = parseInt(tL / 2);
	var atTheRateConversion = '__';

	var hashStrArr = getHashStrArr();
	var hashArrcounter = -1;

	var newStrArr1 = strArr.slice(0, hL);
	var newStrArr2 = strArr.slice(hL,tL);

	var tmpArr1 = [];
	var tmpArr2 = [];
	for(var i = 0; i < hL; i++ ) {
		if(i % 2 == 0) {
			hashArrcounter++;
			tmpArr1.push(newStrArr1[i]+hashStrArr[hashArrcounter]);
		} else {
			tmpArr1.push(newStrArr1[i]);
		}

		if(hashArrcounter == (hashStrArr.length - 1)) {
			hashArrcounter = -1;
		}
	}

	hashArrcounter = -1;
	for(var j = 0; j < (tL-hL); j++) {
		if(j % 2 == 0) {
			hashArrcounter++;
			tmpArr2.push(newStrArr2[j]+hashStrArr[hashArrcounter]);
		} else {
			tmpArr2.push(newStrArr2[j]);
		}

		if(hashArrcounter == (hashStrArr.length - 1)) {
			hashArrcounter = -1;
		}
	}

	return tmpArr1.concat(tmpArr2).toString().replace(/,/g , '');

}

function customHashToStr (str) {
	var hashStrArr = getHashStrArr();
	for(var i = 0; i < hashStrArr.length; i++) {
		var regEx = new RegExp(hashStrArr[i], 'g');
		str = str.replace(regEx, '');
	}

	return str;
}

/*
var obj = {
	"blendImage1" : blendImage1,
	"blendImage2" : blendImage2,
	"isSelected" : true,
	"blendMode" : "hard-light",
	"Keywords" : keywords ? keywords : [],
	"SelectedKeywords" : selectedKeywords ? selectedKeywords : []
};
*/
function getBlendConfigByLightnessScores (obj, lightness1, lightness2) {
	if(obj.blendImage1 && obj.blendImage2) {
		//assign blend mode
		lightness1 = lightness1 ? parseFloat(lightness1) : 0;
		lightness2 = lightness2 ? parseFloat(lightness2) : 0;

		if(lightness1 < 0.5 && lightness2 < 0.5) {
			//both dark
			obj.blendMode = 'screen';
		}

		if(lightness1 > 0.5 && lightness2 > 0.5) {
			//both dark
			obj.blendMode = 'darken';
		}

		if(lightness1 > 0.5 && lightness2 < 0.5) {
			//both dark
			obj.blendMode = 'hard-light';
		}

		if(lightness1 < 0.5 && lightness2 > 0.5) {
			//both dark
			var BlendImage1_bck = obj.blendImage1;
			obj.blendImage1 = obj.blendImage2;
			obj.blendImage2 = BlendImage1_bck;

			obj.blendMode = 'overlay';
		}

	}
	obj.blendMode = obj.blendMode ? obj.blendMode : 'hard-light';
	return obj;
}