var http = require('http'),
    fs = require('fs');

var config = {
    sourceBuild: false,
    devMode: false,
    tsdbHost: "localhost",
    tsdbPort: 4242
};
var args = process.argv.slice(2);
for (var i=0; i<args.length; i++) {
    switch (args[i]) {
        case '-d':
            config.sourceBuild = true;
            config.devMode = true;
            break;
        case '-h':
            config.tsdbHost = args[++i];
            break;
        case '-p':
            config.tsdbPort = args[++i];
            break;
    }
}

console.log("Config: "+JSON.stringify(config));

var express = require('express');

var app = express();
var router = express.Router();

// todo: m1: need to sort this out
if (config.sourceBuild) {
    app.use(express.static('.'));
}
app.use(express.static('./static-content'));

// fake tsdb
var tsdb = require('./faketsdb');
app.use('/api',tsdb);

// otis backend
var otis = express.Router();

// middleware specific to this router
otis.use(function timeLog(req, res, next) {
//    console.log('Time: ', Date.now());
    next();
})
// define the about route
otis.get('/tags', function(req, res) {
    var tagValues = {};
    tagValues["host"] = ["host1","host2","host3"];
    tagValues["user"] = ["jon","dave","joe","simon","fred"];
    tagValues["method"] = ["put","post","get","head","options","delete"];
    res.json(tagValues);
});
otis.get('/config', function(req, res) {
    res.json(config);
});

app.use('/otis',otis);


var server = app.listen(8000, function() {
    var host = server.address().address
    var port = server.address().port

    console.log('Otis running at http://%s:%s', host, port)
});


