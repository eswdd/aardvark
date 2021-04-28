var os = require("os");
var path = require("path");
var fs = require("fs");
var protobuf = require("protobufjs");
var exec = require("child_process").exec;

String.prototype.replaceAll = function(from, to) {
    return this.split(from).join(to);
};

var runPbJs = function(protoName, protoPath, onWrite) {
	if (!protoPath) {
		protoPath = protoName+".proto";
	}
    var dir = os.tmpdir();
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
	var jsonPath = dir+path.sep+protoName+".json";

	console.log("Generating "+jsonPath);

    exec("node_modules/protobufjs/bin/pbjs -t json -o "+jsonPath+" -p . " + protoPath, function (error, stdout, stderr) {
        if (error) {
            console.log("error running pbjs for "+protoName+": "+error.message);
            return;
        }
        if (stderr) {
            console.log("stderr running pbjs for "+protoName+": "+stderr);
            return;
        }
        console.log("Generated "+jsonPath);
        onWrite(jsonPath)
    });
};

var writeProtoJs = function(variableName, jsonPath, jsPath) {
	var json = fs.readFileSync(jsonPath).toString();
	var jsContent = "var "+variableName+" = " + json + ";";
	fs.writeFileSync(jsPath, jsContent);
	console.log("Written "+jsPath);
};

runPbJs("StringSerialisation", null, function(stringJsonPath) {
    writeProtoJs("stringSerialisationJson", stringJsonPath, "static-content/StringSerialisation.js");
    console.log();

    runPbJs("IntermediateModel", null, function(intermediateJsonPath) {
        writeProtoJs("rawIntermediateModelJson", intermediateJsonPath, "static-content/rawIntermediateModel.js");
        console.log();

        console.log("Tweaking IntermediateModel.proto");
        var intermediateModelProto = fs.readFileSync("IntermediateModel.proto").toString();
        intermediateModelProto = intermediateModelProto.replaceAll("optional string", "repeated int32");
        intermediateModelProto = intermediateModelProto.replaceAll("required string", "repeated int32");
        intermediateModelProto = intermediateModelProto.replaceAll(/\[ default.*;/, ";");
        var protoSourcePath = os.tmpdir()+path.sep+"IntermediateModel.proto";
        fs.writeFileSync(protoSourcePath, intermediateModelProto);
        console.log("Tweaked IntermediateModel.proto now in "+protoSourcePath);
        console.log();

        runPbJs("IntermediateModel", protoSourcePath, function(updatedIntermediateJsonPath) {
            writeProtoJs("intermediateModelJson", updatedIntermediateJsonPath, "static-content/IntermediateModel.js");
        });
    });
});