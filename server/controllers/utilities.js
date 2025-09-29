var getFormattedDate = function(mmddyyyy) {
	var formattedDate = mmddyyyy;
	var mArr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var inputArr = mmddyyyy.split('/');
	if(inputArr.length===3) {
		var date = inputArr[1];
		var month = mArr[(parseInt(inputArr[0]) - 1)];
		var year = inputArr[2];
		formattedDate = month +' '+ date +', '+ year;
	}
	return formattedDate;
}

exports.getFormattedDate = getFormattedDate;