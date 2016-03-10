var express = require('express');
var router = express.Router();

// middleware specific to this router
router.use(function timeLog(req, res, next) {
    console.log(new Date(Date.now())+': '+req.originalUrl);
//    console.log('Time: ', Date.now());
    next();
});
var qImpl = function(req,res) {
    if (req.baseUrl == "/q") {
        var queryParams = req.query;
        if (queryParams["png"] != null) {
            setTimeout(function(){res.sendfile("tsd-sample.png")}, 2000);
        }
        else {
            res.json({output:"json",params: req.query});
        }
    }
}
router.get("", qImpl);

module.exports = router;