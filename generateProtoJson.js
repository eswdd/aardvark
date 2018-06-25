var os = require("os");
var path = require("path");
var fs = require("fs");
var pbjs = require("protobufjs/cli/pbjs");

String.prototype.replaceAll = function(from, to) {
    return this.split(from).join(to);
};

var runPbJs = function(protoName, protoPath) {
	if (!protoPath) {
		protoPath = protoName+".proto";
	}
	var jsonPath = os.tmpdir()+path.sep+protoName+".json";

	console.log("Generating "+jsonPath);
	var args = ["_ignore1", "_ignore2", protoPath, "-s", "proto", "-t", "json", "-m", "-o", jsonPath, "-q", "-p", "."];

	pbjs.main(args);
    console.log("Generated "+jsonPath);
	return jsonPath;
};

var writeProtoJs = function(variableName, jsonPath, jsPath) {
	var json = fs.readFileSync(jsonPath).toString();
	var jsContent = "var "+variableName+" = " + json + ";";
	fs.writeFileSync(jsPath, jsContent);
	console.log("Written "+jsPath);
};

var stringJsonPath = runPbJs("StringSerialisation");
writeProtoJs("stringSerialisationJson", stringJsonPath, "static-content/StringSerialisation.js");
console.log();

var intermediateJsonPath = runPbJs("IntermediateModel");
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

intermediateJsonPath = runPbJs("IntermediateModel", protoSourcePath);
writeProtoJs("intermediateModelJson", intermediateJsonPath, "static-content/IntermediateModel.js");

