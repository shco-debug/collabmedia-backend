/*
Emails For : 

#) Registration
		
#) Forgot Password

#) Invite your Friends In Scrpt

#) Share
	- capsule
	- chapter
	- page
	------------------------
		- Registered User
		- Non-Registered User
		
	
	
#) Chapter Made for Other
		- Registered User
		- Non-Registered User
	
	
#) Chapter Invitation
		- Registered User
		- Non-Registered User


#) 




*/
var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'collabmedia.scrpt@gmail.com',
		pass: 'scrpt123_2014collabmedia#1909'
	}
});	

var mailOptions = {
	from: 'collabmedia support  <collabmedia.scrpt@gmail.com>', // sender address
	to: to, // list of receivers
	subject: 'Scrpt - '+user.Name+' has sent you a Chapter!',
	text: 'http://203.100.79.94:8888/#/login', 
	html: 'Hi,'"<br/><br/>"+user.Name+" has sent you a chapter : 'Lorem Ipsum' in scrpt.<br/><a target='_blank' style='text-align:center;font-size:11px;font-family:arial,sans-serif;color:white;font-weight:bold;border-color:#3079ed;background-color:#4d90fe;background-image:linear-gradient(top,#4d90fe,#4787ed);text-decoration:none;display:inline-block;min-height:27px;padding-left:8px;padding-right:8px;line-height:27px;border-radius:2px;border-width:1px' href='http://203.100.79.94:9175/#/'><span style='color:white'>Check Chapter Library</span></a><br/>Sincerely,<br>The Scrpt team. "
};

transporter.sendMail(mailOptions, function(error, info){
	if(error){
		console.log(error);
		res.json(err);
	}else{
		console.log('Message sent to: '+to + info.response);
		res.json({'msg':'done','code':'200'});
	}
});


var chapter__ShareEmail = function ( user ,  ){

};


