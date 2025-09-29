
var get_oembed = function (req , res){
	
	var exec = require('child_process').exec;
	if( req.query.url ){
		var url = req.query.url;
		
		if(url.indexOf('youtube') != -1){
			url = url.replace('http:','https:');
		}
		
		if(url.indexOf('ted.com') != -1){
			url = url.replace('http:','https:');
		}
		
		//in curl we have to escape '&' from fileUrl
		//var curl =  'curl "' + url.replace(/&/g,'\\&') +'&format=json"';
		//var curl =  'curl "' + url.replace(/&/g,'\\&') +'"';
		var curl =  'curl "' + url.replace(/&/g,'\\&') +'"'+' -H "Accept: text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8"';
		//var curl =  'curl "' + url +'"';
		console.log("Command to get : "+curl);
		//res.header('Content-Type','application/json');
		try{
			var child = exec(curl, function(err, stdout, stderr) {
				if (err){ 
					console.log(stderr); //throw err; 
				} 
				else {
					//console.log("stdout = ",stdout);
					//response.data = JSON.parse(stdout);
					try{
						var response = {};
						response.status = "error";
						response.data = {};
						
						//console.log("stdout = ",stdout);
						
						response.data = JSON.parse(stdout);
						
						//console.log("response = ",response);
						response.status = "success";
						res.json(response);
					}
					catch(error){
						//console.log("In catch-1 = ",error);
						response.data = {};
						//console.log("In catch-1 = ",response.data);
						//console.log("In catch-1 = ",typeof(response.data));
						//may be xml format
						//if( response.data == {} ){
						if( typeof(response.data) == "object" ){
							var againCurlWithFormatAttr = 'curl "' + url.replace(/&/g,'\\&') +'&format=json"'+' -H "Accept: text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8"';
							//var againCurlWithFormatAttr = 'curl "' + url +'&format=json"'+' -H "Accept: text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8"';
							get_oembed( againCurlWithFormatAttr );
							//return;
						}
						else{
							//console.log("In else---response = ",response);
							res.json(response);
						}
					}
				}
			});
		}
		catch(e){
			console.log("E = ",e);
			
		}
	
		function get_oembed ( curl ){
			//res.header('Content-Type','application/json');
			console.log("curl-@@@@@@@@----------",curl);
			try{
				var child = exec(curl, function(err, stdout, stderr) {
					if (err){ 
						console.log(stderr); //throw err; 
					} 
					else {
						//response.data = JSON.parse(stdout);
						try{
							//console.log("get_oembed called----------------");
							var response = {};
							response.status = "error";
							response.data = {};
							
							//console.log("stdout = ",stdout);
							
							response.data = JSON.parse(stdout);
							//console.log("response = ",response);
							
							response.status = "success";
							res.json(response);
						}
						catch(error){
							
							//try_embedly();
							//console.log("In catch-2---------",error);
							response.data = {};
							//console.log("response = ",response);
							res.json(response);
							//console.log("response.json called----------");
							
						}
					}
				});
			}
			catch(e){
				console.log("E = ",e);
				
			}
		}
		
		function try_embedly(){
			console.log("-----------try_embedly called--------------");
			var key = "63953b23179d406d9c27ab937ea4fb5d";
			var new_curl = "http://api.embed.ly/1/extract?key="+key+"&url="+url+"&format=json";
			try{
				var child = exec(new_curl, function(err, stdout, stderr) {
					if (err){ 
						console.log(stderr); //throw err; 
					} 
					else {
						//response.data = JSON.parse(stdout);
						try{
							console.log("try_embedly called-2----------------"+new_curl);
							var response = {};
							response.status = "error";
							response.data = {};
							
							console.log("stdout = ",stdout);
							
							response.data = JSON.parse(stdout);
							console.log("response = ",response);
							
							response.status = "success";
							res.json(response);
						}
						catch(error){
							console.log("In catch-3");
							response.data = {};
							console.log("response = ",response);
							res.json(response);
							console.log("response.json called----------");
						}
					}
				});
			}
			catch(e){
				console.log("E = ",e);
				
			}
		}
	}else{
		res.json({status:"failed",error:"no url parameter!"});
	}
}
exports.get_oembed = get_oembed;