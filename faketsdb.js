var express = require('express');
var router = express.Router();

// middleware specific to this router
router.use(function timeLog(req, res, next) {
//    console.log('Time: ', Date.now());
    next();
})
var searchLookup = function(req, res) {
    var tagValues = {};
    tagValues["host"] = ["host1","host2","host3"];
    tagValues["user"] = ["jon","dave","joe","simon","fred"];
    tagValues["method"] = ["put","post","get","head","options","delete"];
    res.json(
        {
            "type": "LOOKUP",
            "metric": "tsd.hbase.rpcs",
            "limit": 100000,
            "time": 565,
            "results": [
                {
                    "tags": {
                        "host": "host1",
                        "user": "jon",
                        "method": "put"
                    },
                    "metric": "tsd.hbase.rpcs",
                    "tsuid": "0000150000070010D0"
                },
                {
                    "tags": {
                        "host": "host1",
                        "user": "dave",
                        "method": "post"
                    },
                    "metric": "tsd.hbase.rpcs",
                    "tsuid": "0000150000070010D5"
                },
                {
                    "tags": {
                        "host": "host2",
                        "user": "joe",
                        "method": "get"
                    },
                    "metric": "tsd.hbase.rpcs",
                    "tsuid": "0000150000070010D6"
                },
                {
                    "tags": {
                        "host": "host3",
                        "user": "simon",
                        "method": "head"
                    },
                    "metric": "tsd.hbase.rpcs",
                    "tsuid": "0000150000070010D7"
                },
                {
                    "tags": {
                        "host": "host3",
                        "user": "fred",
                        "method": "delete"
                    },
                    "metric": "tsd.hbase.rpcs",
                    "tsuid": "0000150000070010D8"
                },
                {
                    "tags": {
                        "host": "host2",
                        "user": "fred",
                        "method": "options"
                    },
                    "metric": "tsd.hbase.rpcs",
                    "tsuid": "0000150000070010D9"
                }
            ],
            "startIndex": 0,
            "totalResults": 999
        }
    );
};
router.get('/search/lookup', searchLookup);
router.post('/search/lookup', searchLookup);
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