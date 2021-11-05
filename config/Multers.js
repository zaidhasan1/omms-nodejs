const multer = require("multer");
var path = require('path')

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, `${parseInt(Math.random() * Date.now())}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

var upload = multer({storage: storage})

module.exports = upload;


// fieldname: 'file',
//     originalname: 'IMG_1808.JPG',
//     encoding: '7bit',
//     mimetype: 'image/jpeg',
//     destination: './uploads/',
//     filename: '59093152846_1635078027025.JPG',
//     path: 'uploads\\59093152846_1635078027025.JPG',
//     size: 7176145
