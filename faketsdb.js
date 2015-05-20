var express = require('express');
var router = express.Router();

// middleware specific to this router
router.use(function timeLog(req, res, next) {
//    console.log('Time: ', Date.now());
    next();
})
// define the about route
router.get('/suggest', function(req, res) {
    res.json([
        "cpu.percent",
        "cpu.queue",
        "ifstat.bytes",
        "dave",
        "fred",
        "dave.fred"
    ]);
});


router.get("", function(req,res) {
    if (req.baseUrl == "/q") {
        var queryParams = req.query;
        if (queryParams["png"] != null) {
            res.sendfile("tsd-sample.png");
        }
        else {
            res.json({output:"json",params: req.query});
        }
    }
})


module.exports = router;