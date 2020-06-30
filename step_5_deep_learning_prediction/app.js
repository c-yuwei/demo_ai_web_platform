const express = require('express')
const app = express()
const port = 80
const path = require('path');
const fileUpload = require('express-fileupload');
const MODEL_PATH = 'https://mlmed.github.io/tools/xray/models/chestxnet-45rot15trans15scale4byte';
const tf = require("@tensorflow/tfjs");
const tfn = require('@tensorflow/tfjs-node');
const execSync = require('child_process').execSync;
const fs = require('fs');
let modelnet;
let resultObj;

process.env.PWD = process.cwd();

app.use(express.static(path.join(process.env.PWD, '/step_5_deep_learning_prediction/')));

app.get("/", function(req, res){
    res.sendFile(path.join(__dirname+'/index.html'))
})

app.use(fileUpload({
    createParentPath: true
}));

app.post("/upload", function(request, response) {
    console.log("File uploading...") 
    try {
      if(!request.files) {
        response.send({
              status: false,
              message: 'No file uploaded'
          });
      } else {
          let avatar = request.files.file;
          avatar.mv(__dirname + '/uploaded_files/' + avatar.name);
          response.send({
              status: true,
              message: 'File is uploaded',
              data: {
                  name: avatar.name,
                  mimetype: avatar.mimetype,
                  size: avatar.size
              }
          });
          console.log("File uploaded!")
      }
    } catch (err) {
      response.status(500).send(err);
    }
});

app.get('/diagnosisResult', function (req, res) {
	fileName = req.originalUrl.split('?')[1];
	predict(fileName,res)
});

async function predict(filePath,res){
	filePath = process.env.PWD + '/step_5_deep_learning_prediction/uploaded_files/' + filePath;
	console.log('model predicting...');
	var input = inputDataAndCallModel(filePath,res);
	console.log('returned the predicting results');	
}

async function inputDataAndCallModel(filePath,res){
	var pythonFilePath = process.env.PWD + '/step_5_deep_learning_prediction/' + 'dcm2jpg.py';
    var cmd = 'python ' + pythonFilePath + ' -f ' + filePath;
    console.log(cmd);
	const bat = execSync(cmd); 
	data = bat.toString();
	console.log(data);
	data = data.replace(/(\r\n|\n|\r)/gm,"");
	var inputPath = __dirname + '/uploaded_files/' + data;
	const imageBuffer = fs.readFileSync(inputPath);
	modelPredict(tfn.node.decodeJpeg(imageBuffer, 1).reshape([1, 1, MODEL_CONFIG.IMAGE_SIZE, MODEL_CONFIG.IMAGE_SIZE]).tile([1,3,1,1]),res);
}

async function modelPredict(input, res){
	input = input.div(225);
	var output = tf.tidy(() => {
	  return modelnet.execute(input, ["Sigmoid"])
	});
	var logits = await output.data()
	resultObj = await distOverClasses(logits);
	res.send(resultObj);
}

async function distOverClasses(values){
	const topClassesAndProbs = [];
	for (let i = 0; i < values.length; i++) {

		if (values[i]<MODEL_CONFIG.OP_POINT[i]){
			value_normalized = values[i]/(MODEL_CONFIG.OP_POINT[i]*2)
		}else{
			value_normalized = 1-((1-values[i])/((1-(MODEL_CONFIG.OP_POINT[i]))*2))
		}
		console.log(MODEL_CONFIG.LABELS[i] + ",pred:" + values[i] + "," + "OP_POINT:" + MODEL_CONFIG.OP_POINT[i] + "->normalized:" + value_normalized)

		topClassesAndProbs.push({
			className: MODEL_CONFIG.LABELS[i],
			probability: value_normalized
		});
	}
	return topClassesAndProbs
}

async function run_model_preload(){
	const handler = MODEL_PATH + '/model.json';
  	modelnet = await tfn.loadGraphModel(handler);
  	var zeros = tfn.zeros([1, 3, 224, 224]);
  	modelnet.predict(zeros).print();
  	var result = modelnet.predict(zeros);
	console.log("Model loaded");
}

let MODEL_CONFIG = {
	IMAGE_SIZE: 224,

	LABELS :["Atelectasis", "Consolidation", "Infiltration",
	    "Pneumothorax", "Edema", "Emphysema", "Fibrosis", "Effusion", "Pneumonia",
	    "Pleural_Thickening", "Cardiomegaly", "Nodule", "Mass", "Hernia"],
	
	
	OP_POINT : [0.10651981830596924,
		 0.03304215893149376,
		 0.16219697892665863,
		 0.024247966706752777,
		 0.014286902733147144,
		 0.008996985852718353,
		 0.020681504160165787,
		 0.09284962713718414,
		 0.01555431168526411,
		 0.033134546130895615,
		 0.012090340256690979,
		 0.04846248775720596,
		 0.03860514238476753,
		 0.0004677231190726161],
	
	PPV80_POINT : [0.8237688541412354,
		 1.0,
		 1.0,
		 0.7671520113945007,
		 1.0,
		 0.810924232006073,
		 1.0,
		 0.815563440322876,
		 1.0,
		 0.7731828093528748,
		 0.8175955414772034,
		 0.7130255699157715,
		 1.0,
		 0.9904402494430542],
	
	NPV80_POINT : [0.0,
		 7.02592296875082e-05,
		 0.7219331860542297,
		 2.2004212951287627e-05,
		 5.649758350045886e-08,
		 1.7375200513924938e-06,
		 1.2579816939251032e-05,
		 0.9373757839202881,
		 9.455027793592308e-06,
		 4.794802953256294e-05,
		 1.8351689732298837e-06,
		 0.77848881483078,
		 6.0240588936721906e-05,
		 1.7112937200636225e-07]
};

run_model_preload();

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))