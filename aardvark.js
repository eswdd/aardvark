var http = require('http'),
    fs = require('fs');

var config = {};

var args = process.argv.slice(2);
for (var i=0; i<args.length; i++) {
    switch (args[i]) {
        case '-c':
            try {
                config = JSON.parse(fs.readFileSync(args[++i]));
            }
            catch (err) {
                console.error("Error reading config file '"+args[i]+"': "+err);
                process.exit(1);
            }

            break;
    }
}

for (var i=0; i<args.length; i++) {
    switch (args[i]) {
        case '-c':
            i++; // skip file name
            // already dealt with
            break;
        case '-d':
            config.devMode = true;
            break;
        case '-s':
            config.sourceBuild = true;
            break;
        case '-h':
            config.tsdbHost = args[++i];
            break;
        case '-p':
            config.tsdbPort = args[++i];
            break;
        case '-l':
            config.port = args[++i];
            break;
        default:
            console.error("Unrecognised option: "+args[i]);
    }
}

// config defaults
if (!config.hasOwnProperty('sourceBuild')) {
    config.sourceBuild = false;
}
if (!config.hasOwnProperty('devMode')) {
    config.devMode = false;
}
if (!config.hasOwnProperty('tsdbProtocol')) {
    config.tsdbProtocol = 'http';
}
if (!config.hasOwnProperty('tsdbHost')) {
    config.tsdbHost = 'localhost';
}
if (!config.hasOwnProperty('tsdbPort')) {
    config.tsdbPort = 4242;
}
if (!config.hasOwnProperty('port')) {
    config.port = 8000;
}
if (!config.hasOwnProperty('ui')) {
    config.ui = {};
}
if (!config.ui.hasOwnProperty('metrics')) {
    config.ui.metrics = {};
}
if (!config.ui.metrics.hasOwnProperty('enableExpandAll')) {
    config.ui.metrics.enableExpandAll = true;
}
// end of config defaults

if (config.devMode) {
    config.tsdbPort = config.port;
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

// prom-client
const prom_client = require('prom-client');
prom_client.collectDefaultMetrics({
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5] // These are the default buckets.
});
const register = prom_client.register;
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

// fake tsdb api
if (config.devMode) {
    var tsdb = require('faketsdb');
    var tsdbConfig = {
        verbose: false,
        probabilities: {
            annotation: 0.01,
            globalAnnotation: 0.5
        },
        version: "2.2.0"
    };
    tsdb.install(app, tsdbConfig);
    tsdb.addTimeSeries("tsd.rpc.received", { host: "host01", type: "put" }, "counter");
    tsdb.addTimeSeries("tsd.rpc.received", { host: "host01", type: "telnet" }, "counter");
    tsdb.addTimeSeries("tsd.rpc.errors", { host: "host01", type: "invalid_values" }, "counter");
    tsdb.addTimeSeries("tsd.rpc.errors", { host: "host01", type: "hbase_errors" }, "counter");
    tsdb.addTimeSeries("tsd.rpc.errors", { host: "host01", type: "illegal_arguments" }, "counter");
    tsdb.addTimeSeries("ifstat.bytes", { host: "host01", direction: "in" }, "counter");
    tsdb.addTimeSeries("ifstat.bytes", { host: "host01", direction: "out" }, "counter");
    tsdb.addTimeSeries("ifstat.bytes", { host: "host02", direction: "in" }, "counter");
    tsdb.addTimeSeries("ifstat.bytes", { host: "host02", direction: "out" }, "counter");
    tsdb.addTimeSeries("ifstat.bytes", { host: "host03", direction: "in" }, "counter");
    tsdb.addTimeSeries("ifstat.bytes", { host: "host03", direction: "out" }, "counter");
    tsdb.addTimeSeries("cpu.percent", { host: "host01" }, "gauge", {min:0, max:100});
    tsdb.addTimeSeries("cpu.percent", { host: "host02" }, "gauge", {min:0, max:100});
    tsdb.addTimeSeries("cpu.percent", { host: "host03" }, "gauge", {min:0, max:100});
    tsdb.addTimeSeries("cpu.queue", { host: "host01" }, "gauge", {min:0});
    tsdb.addTimeSeries("cpu.queue", { host: "host02" }, "gauge", {min:0});
    tsdb.addTimeSeries("cpu.queue", { host: "host03" }, "gauge", {min:0});
    tsdb.addTimeSeries("some.stat", { host: "host02" }, "gauge");
    tsdb.addTimeSeries("some.stat", { host: "host03" }, "gauge");
    tsdb.addTimeSeries("some.stat.min", { host: "host02" }, "gauge");
    tsdb.addTimeSeries("some.stat.min", { host: "host03" }, "gauge");
    tsdb.addTimeSeries("some.stat.max", { host: "host02" }, "gauge");
    tsdb.addTimeSeries("some.stat.max", { host: "host03" }, "gauge");

    // fake tsdb graph
    var tsdbGraph = require('./mockTsdbGraph');
    app.use('/q',tsdbGraph);
}


// aardvark backend
var aardvark = express.Router();

// middleware specific to this router
aardvark.use(function timeLog(req, res, next) {
    console.log(new Date(Date.now())+': '+req.originalUrl);
    next();
})
aardvark.get('/config', function(req, res) {
    res.json(config);
});

app.use('/aardvark',aardvark);


var server = app.listen(config.port, function() {
    var host = server.address().address
    var port = server.address().port

    console.log('Aardvark running at http://%s:%s', host, port)
});


