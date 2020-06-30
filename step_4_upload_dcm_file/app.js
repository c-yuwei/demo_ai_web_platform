const express = require('express')
const app = express()
const port = 80
const path = require('path');
const fileUpload = require('express-fileupload');

process.env.PWD = process.cwd();

app.use(express.static(path.join(process.env.PWD, '/step_4_upload_dcm_file/')));

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

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))