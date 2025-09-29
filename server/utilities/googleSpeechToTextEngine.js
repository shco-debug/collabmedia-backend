// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const fs = require('fs');

var getSpeechToText = function (req, res) {
	// Creates a client
	const client = new speech.SpeechClient();

	// The name of the audio file to transcribe
	//const fileName = './resources/audio.raw';
	const fileName = '../../public/assets/Media/video/1489126466715_WidgetBgVideo_15570.webm';

	// Reads a local audio file and converts it to base64
	const file = fs.readFileSync(fileName);
	const audioBytes = file.toString('base64');

	// The audio file's encoding, sample rate in hertz, and BCP-47 language code
	const audio = {
	content: audioBytes,
	};
	const config = {
	encoding: 'LINEAR16',
	sampleRateHertz: 16000,
	languageCode: 'en-US',
	};
	const request = {
	audio: audio,
	config: config,
	};

	// Detects speech in the audio file
	client.recognize(request , function(err , response) {
		if(!err) {
			/*
			const transcription = response.results
			.map(result => result.alternatives[0].transcript)
			.join('\n');
			//console.log(`Transcription: ${transcription}`);
			*/
			res.json({"response": response});
			
		}
		
	});
}

exports.getSpeechToText = getSpeechToText;