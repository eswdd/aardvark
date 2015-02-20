var http = require('http'),
    fs = require('fs');

var config = {
    sourceBuild: false,
    tsdbHost: "localhost",
    tsdbPort: 4242
};
var args = process.argv.slice(2);
for (var i=0; i<args.length; i++) {
    switch (args[i]) {
        case '-d':
            config.sourceBuild = true;
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

function staticContent(filename, callback) {
    fs.readFile("static-content/"+filename, 'utf8', function(err,data) {
        if (err) {
            callback(null);
        }
        else {
            callback(data);
        }
    });
}
function bowerContent(filename, callback) {
    var file = config.sourceBuild ? "bower_components/" + filename : null; // todo: what else here?
    fs.readFile(file, 'utf8', function(err,data) {
        if (err) {
            callback(null);
        }
        else {
            callback(data);
        }
    });
}

var server = http.createServer(function(req,res) {
    var uri = req.url;
    var qs = "";
    if (uri.indexOf("?") >= 0) {
        qs = uri.substring(uri.indexOf("?")+1);
        uri = uri.substring(0, uri.indexOf("?"));
    }
    var handled = false;
    if (uri.indexOf("/api/") == 0) {
        if (uri.indexOf("/api/suggest") == 0) {
            handled = true;
            res.writeHead(200);
            res.end(JSON.stringify([
                "cpu.percent",
                "cpu.queue",
                "ifstat.bytes",
                "dave",
                "fred",
                "dave.fred"
            ]));
        }
        if (uri.indexOf("/api/tags") == 0) {
            handled = true;
            res.writeHead(200);
            var tagValues = {};
            tagValues["host"] = ["host1","host2","host3"];
            tagValues["user"] = ["jon","dave","joe","simon","fred"];
            tagValues["method"] = ["put","post","get","head","options","delete"];
            res.end(JSON.stringify(tagValues));
        }
        if (uri.indexOf("/api/config") == 0) {
            handled = true;
            res.writeHead(200);
            res.end(JSON.stringify(config));
        }
    }
    if (!handled) {
        if (uri=="/") {
            uri = "/index.html";
        }
        var contentFunction = function(data) {
            if (data == null) {
                res.writeHead(404);
                res.end("File not found: "+uri);
            }
            else {
                res.writeHead(200);
                res.end(data);
            }
        };
        console.log(uri);
        if (uri.indexOf("/bower_components/")==0) {
            bowerContent(uri.substring(18), contentFunction);
        }
        else {
            staticContent(uri.substring(1), contentFunction);
        }
    }
});

staticContent("index.html", function(data) {
    if (data != null) {
        server.listen(8000);
    }
})


