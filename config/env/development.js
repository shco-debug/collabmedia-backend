/*
* Author -
* Date - 3 June 2014
* Comments - Sets the environment variable values for the development environment
*/
var mongoose = require('mongoose');
var fs = require('fs');
module.exports = function(){

	//Set the default port to run the app
	process.env.PORT = process.env.PORT || 3002; // Use 3002 for local development

	//setting global object
	process.globalSettings = {};
	process.urls = {};

	// Use environment variables for URLs instead of hardcoded values
	process.AppAccessProtocal = process.env.APP_PROTOCOL || 'https://';
	process.AppBaseURL = process.env.APP_BASE_URL || 'www.scrpt.com';
	process.HOST_URL = process.AppAccessProtocal + process.AppBaseURL;
	process.perUserSpace = 524288000;   //500 MB

	process.CAPSULE_VERIFIER = ["manishpodiyal@gmail.com","scrptco@gmail.com"];
	//console.log("__dirname ------------------",__dirname);
	process.EMAIL_ENGINE = {
		info : {
			smtpOptions : {
				//service: "Godaddy",
				auth : {
					user: "hello@scrpt.com",
					pass: "xiAsH5S#cMq7CLsW"
				},
				host: "smtp.office365.com", //"smtp.ionos.com", "smtp.office365.com", //"smtpout.secureserver.net",
				port: 587, //465,
				secure: false,
				secureConnection: false,
				requireTLS:true,
				tls: true,
				// DKIM configuration commented out for local development
				/*
				dkim: {
					domainName: "scrpt.com",
					keySelector: "handwritten",
					//privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABCyIkWMzxn2QPZ70vo0DorVAAAAEAAAAAEAAAEXAAAAB3NzaC1yc2EAAAADAQABAAABAQC/QiGJERB3mIqOMTbTY7Q1qtlDTgBwXLQVk4LpXo/CA5ZaajYro990OBerXrQ4lB+w6VMtxFB16WlMvA4bXISefIu6moFx4z4bFpOCfZxyUrVT2dzai66CJdHsaccJRqwgoTpllHSqjFk9mqT7TheDLI0cjLnRRupPDSZYacySQ8OGTCwalHZTk7sPCnKbQjPqShMX9bJGQ2uJI3y9a8trHmtlpqLLAiO8WNl7EG8i0PJrg2jauuLP9SvHTUx7bnxksmsJsXAK7HnjoPXHE6ty2OjZawcMEU4206h3VFfgM+9HS3XQJnJf3DVKs2hvNDg4UrB8nWHetqLdebfGThO5AAAD4CeNLslIx7ogkb1l/L8XLA6kUftvx/qKMg8x2I8TjNW6d4/swEX99qXnLQ2YSGlKiA+Un3gwYJbIxCVBxKpW3xKwLfYLKInOFnGEgxuzlbLJFQamGei5ceok+UVkS1up17WeoGNBED6nFhDrdcBAooIeevUZMm+B/EnTwDUcU/1bawv5l1Bp0rUuSm9dFXsn9ZdsFCn59yshdR3VLYd/gREWL5Y1LX1H1ePrjT655cIpNqFYpdNMWvqjf71Qcn79gYfDVzy82dHWeHKz3FAG9E6Kdl6PtpDlEQOKe3iOrLMGnbAOAisCh8jM7Sdcbv/DzLTfadF6P+imOBBWz6xpDaS9yDIqxyT0yxlSlL5taviAkS+PrIMYYyJfV1eVzwFB7IwpX3c7u9zFIlgdqFEYCy8wSwZ6tLejVZLkEytuGDdRG/cXcRhU4CJ2Wtj4pfKRf9I06ZqweKdxexZzQba0xv2irsNofQEoqorgVO4f6qJLtXq2JMdgNiUSc6bJHedS/ZBPycqIAnpX6SwKwr6WrqgGGFPsYYD4mo/Li6741W+fHfaOY4bjWYztOl01OPSA0bWrEmdumTlAezJ1MtCFr1N+a9ctNWmXMTKwz7sg3rP1yddIEDgJi20xpAcbZACa7aN9FnOckRDi+Iscy2HsrSr9VPcwzzqQRayZO3n8vHQWlZcAZuQ/PScb7fnlaMA1QAy91VPE7x0KuqW6WSmVhN9P2ZOI/kzjLpWifyqaXeF2upgcBTyyEIJvSVJ00UjTvj5E73TdYUucOkZXUVbltKBullxBFTb3zrOYdKglH5ymJ+0bdH2zmgeCu60TSfupBfYcjiG2nT29HfTfKsTbRBnE0Aj+rFpiNYga7N3FDo0m0A8I53gyNe2IzR9Rih/0VV38TMhsaJvcxeCKATraUBQQlbF+2SLLCwLgaRLJKooyB9bQVkEip6CfpLfOM29KHVZBsAev4GbiRl2rDBwC4eOQyRXJJ+1zCqjJbG6gKyljbnzPNCRW2Q1LYCgGoS1OO+k8KOohKUx9PUCCysNHRXyoq0yg3z69W9bi67/N9sqEARwm19MxpGqkO4J4ao+lyUFMbhF9ilyqBW+q8wZTVdejOVd6l8BFf/iRdauLy8c8/hfGFeUyBKrs+RTsQoiC3++NZVDN67dLju6tLGRo8xxCTpV1BC+DR4fzj7cOMigGgeeqaSoKahqRJ0YD27IjPRI1TRwo3KPJqTFRRtJvnz+Qm7OuAxdqepP04Zofau+wMT4Fr7lWYSnHIWBWDqTC5bsB8EeBzfy78GN210JsTCWG74KRGjFZwFIFns92EYcx-----END OPENSSH PRIVATE KEY-----"
					privateKey: fs.readFileSync(__dirname+'/dkim.pem', "utf8"),
					cacheDir: process.env.TMPDIR,
					cacheTreshold: 100 * 1024
				}
				*/
			},
			senderLine : "Scrpt <hello@scrpt.com>"
		},
		password : {
			smtpOptions : {
				type: "SMTP",
				service: "office365", //"ionos",
				host: "smtp.office365.com", //"smtp.ionos.com", "smtp.office365.com", //"smtpout.secureserver.net",
				requireTLS:true,
				secure: false,
				secureConnection: false,
				tls:true,
				auth : {
					user: "hello@scrpt.com",
					pass: "xiAsH5S#cMq7CLsW"
				}
			},
			senderLine : "Scrpt <hello@scrpt.com>"
		}
	};

	process.STRIPE_CONFIG = {
		DEV : {
			token_api : "https://connect.stripe.com/oauth/token",
			stripe_client_id : "ca_AynXWWXR3loPwmLaGAvEAJHmm0GEObyE",
			secret_key : "sk_test_5M7DrMG5iek1yRa8DEwhcG2W"
		},
		LIVE : {
			token_api : "https://connect.stripe.com/oauth/token",
			stripe_client_id : "ca_AynXWWXR3loPwmLaGAvEAJHmm0GEObyE",
			secret_key : "sk_live_3kZkuWPnVFoIIqCCY295aAJp00D7sADLR0"
		}
	};

	process.REVENUE_MODEL_CONFIG = {
		CREATE_Others_Commission : 9.99,	//in USD $
		PerSale_Commission : 35	//in %
	}


	process.globalSettings.init__urlLocations = function(){
		process.urls.small__thumbnail = process.urls.small__thumbnail || '100';
		process.urls.SG__thumbnail = process.urls.SG__thumbnail || '300';
		process.urls.medium__thumbnail = process.urls.medium__thumbnail || '600';
		process.urls.large__thumbnail = process.urls.large__thumbnail || '1200';
		process.urls.aspectfit__thumbnail = process.urls.aspectfit__thumbnail || 'aspectfit';
		process.urls.aspectfit_small__thumbnail = process.urls.aspectfit_small__thumbnail || 'aspectfit_small';

		// Use environment variables for upload directories or fallback to temp
		process.urls.__VIDEO_UPLOAD_DIR = process.env.VIDEO_UPLOAD_DIR || '/tmp/video';
		process.urls.__QUEST_TIP_VIDEO_UPLOAD_DIR = process.env.QUEST_TIP_VIDEO_UPLOAD_DIR || '/tmp/quest-tip-video';
		process.urls.__MUSIC_LIB_DIR = process.env.MUSIC_LIB_DIR || '/tmp/music_library';
		process.urls.__PAGE_VOICEOVER_DIR = process.env.PAGE_VOICEOVER_DIR || '/tmp/page_voiceover';
	}

	process.globalSettings.init__urlLocations();

	//exports.search_v_8 = search_v_8_revised_4;			// for other than default case - frontend
	//exports.search_v_8_temp = search_v_8_temp;			// for default gallery and create gallery case
	process.SEARCH_ENGINE_CONFIG = {
		MMT__RemoveFrom__DefaultCase : [
			new mongoose.Types.ObjectId("56e8fdb07f69c9ca3d627fc7"),	//WIP
			new mongoose.Types.ObjectId("56e8fd4a7f69c9ca3d627fc6"),	//Templates
			new mongoose.Types.ObjectId("5465f22fba7400cd6c06ecb1")		//Barriers
			//mongoose.Types.ObjectId("54c98aab4fde7f30079fdd5a")	//Descriptors
		],
		MMT__RemoveFrom__SearchCase : [
			//mongoose.Types.ObjectId("56e8fdb07f69c9ca3d627fc7"),	//WIP
			new mongoose.Types.ObjectId("56e8fd4a7f69c9ca3d627fc6")		//Templates
		],
		MT__RemoveFrom__DefaultCase : [
			//"582dfd7ec2a8e4ef4c2f8cef"		//Enablers / Master the Self / Admire
		],
		GT__RemoveFrom__DefaultCase : [
			//"550a4a86f952e3660b398942"		//Enablers / Master the Self / Admire
		],
		GT__RemoveFrom__SearchCase : []
	};


	process.StreamConfig = {
		M1 : {
			high : [
				1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30
			],
			medium : [
				1,4,7,10,13,16,19,22,25,28
			],
			low : [
				1,8,15,22,29
			],
			KeyPost : [
				1,4,9,16,23,30
			]
		},
		M3 : {
			high : [
				1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90
			],
			medium : [
				1,4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58,61,64,67,70,73,76,79,82,85,88
			],
			low : [
				1,8,15,22,29,36,43,50,57,64,71,78,85
			],
			KeyPost : [
				1,4,9,16,23,30,37,43,49,55,61,69,76,83,90
			]
		},
		M6 : {
			high : [
				1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180
			],
			medium : [
				1,4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58,61,64,67,70,73,76,79,82,85,88,91,94,97,100,103,106,109,112,115,118,121,124,127,130,133,136,139,142,145,148,151,154,157,160,163,166,169,172,175,178
			],
			low : [
				1,8,15,22,29,36,43,50,57,64,71,78,85,92,99,106,113,120,127,134,141,148,155,162,169,176
			],
			KeyPost : [
				1,4,9,16,23,30,37,43,49,55,61,69,76,83,90,
				101,107,113,119,125,132,139,146,152,159,166,173,180
			]
		},
		M9 : {
			high : [
				1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270
			],
			medium : [
				1,4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58,61,64,67,70,73,76,79,82,85,88,91,94,97,100,103,106,109,112,115,118,121,124,127,130,133,136,139,142,145,148,151,154,157,160,163,166,169,172,175,178,181,184,187,190,193,196,199,202,205,208,211,214,217,220,223,226,229,232,235,238,241,244,247,250,253,256,259,262,265,268
			],
			low : [
				1,8,15,22,29,36,43,50,57,64,71,78,85,92,99,106,113,120,127,134,141,148,155,162,169,176,183,190,197,204,211,218,225,232,239,246,253,260,267
			],
			KeyPost : [
				1,4,9,16,23,30,37,43,49,55,61,69,76,83,90,
				101,107,113,119,125,132,139,146,152,159,166,173,180,187,195,201,208,214,219,226,233,240,
				247,255,261,268
			]
		},
		M12 : {
			high: [
				1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365
			],
			medium : [
				1,4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58,61,64,67,70,73,76,79,82,85,88,91,94,97,100,103,106,109,112,115,118,121,124,127,130,133,136,139,142,145,148,151,154,157,160,163,166,169,172,175,178,181,184,187,190,193,196,199,202,205,208,211,214,217,220,223,226,229,232,235,238,241,244,247,250,253,256,259,262,265,268,271,274,277,280,283,286,289,292,295,298,301,304,307,310,313,316,319,322,325,328,331,334,337,340,343,346,349,352,355,358,361,364
			],
			low : [
				1,8,15,22,29,36,43,50,57,64,71,78,85,92,99,106,113,120,127,134,141,148,155,162,169,176,183,190,197,204,211,218,225,232,239,246,253,260,267,274,281,288,295,302,309,316,323,330,337,344,351,358,365
			],
			KeyPost : [
				1,4,9,16,23,30,37,43,49,55,61,69,76,83,90,
				101,107,113,119,125,132,139,146,152,159,166,173,180,187,195,201,208,214,219,226,233,240,
				247,255,261,268,274,281,287,293,300,307,315,321,328,334,341,347,353,358,360
			]
		}
	};

}
