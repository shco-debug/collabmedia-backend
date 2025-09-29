// Muaz Khan     - www.MuazKhan.com
// MIT License   - www.WebRTC-Experiment.com/licence
// Source Code   - github.com/muaz-khan/WebRTC-Experiment/tree/master/RecordRTC/RecordRTC-to-Nodejs

//exports.upload_dir = './public/assets/Media/video';
exports.upload_dir = __dirname+'/../../../../public/assets/Media/video';
exports.upload_dir_speechtotext = __dirname+'/../../../../public/assets/Media/speechtotext';

exports.s3 = {
    key: '',
    secret: '',
    bucket: ''
};

exports.s3_enabled = false;
