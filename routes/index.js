var express = require('express');
var router = express.Router();
let allAddress = require("../config/AllAddress")
const Applicant = require("../controller/Applicant")
const fileUploading = require("../config/Multers")

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

allAddress.forEach((v) => {
    if (v.method == "post") {
        router.post(v.link, v.func)
    } else if (v.method == "put") {
        router.put(v.link, v.func)
    } else if (v.method == "get") {
        router.get(v.link, v.func)
    }
});

//file upoading routers

router.post("/applicant/regDocumentUpload",fileUploading.single("file"),Applicant.regDocumentUpload);
router.post("/applicant/omdDocumentUpload",fileUploading.single("file"),Applicant.omdDocumentUpload)

module.exports = router;
