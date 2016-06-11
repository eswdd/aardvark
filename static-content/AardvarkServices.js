aardvark
    // Bitset functionality with optional flags - used for serialisation
    .factory('blitting', function() {
        var blitting = {};
        blitting.toBlittedInt = function(arr) {
            if (arr.length > 16) {
                throw "arr too long, max is 16, but is "+arr.length;
            }
            var ret = 0;
            var i = 1;
            for (var ind=0; ind<arr.length; ind++) {
                // is present
                ret |= i;
                i <<= 1;
                // actual value
                if (arr[ind]) {
                    ret |= i;
                }
                i <<= 1;
            }
            return ret;
        }
        blitting.fromBlittedInt = function(blit, defaults) {
            if (defaults.length > 16) {
                throw "arr too long, max is 16, but is "+defaults.length;
            }
            var ret = new Array(defaults.length);
            var i = 1;
            for (var ind=0; ind<defaults.length; ind++) {
                var present = ((blit & i) == i);
                i <<= 1;
                if (present) {
                    ret[ind] = ((blit & i) == i);
                }
                else {
                    ret[ind] = defaults[ind];
                }
                i <<= 1;
            }
            return ret;
        }
        return blitting;
    })
    // mapping strings to ids and back again - used for serialisation
    .factory('mapping', function() {
        var mapping = {};
        mapping.generateBiDiMapping = function(valueArray) {
            var ret = {};
            var v2Id = {};
            var id2V = [null];
            for (var v=0; v<valueArray.length; v++) {
                v2Id[valueArray[v]] = v+1;
                id2V.push(valueArray[v]);
            }
            ret.valueToId = function(value) {
                if (!v2Id.hasOwnProperty(value)) {
                    return null;
                }
                return v2Id[value];
            }
            ret.idToValue = function(id) {
                if (id < 0 || id >= id2V.length) {
                    return null;
                }
                return id2V[id];
            }
            return ret;
        }
        return mapping;
    })
    // efficient string serialisation
    .factory('strings', [ 'mapping', function(mapping) {
        var strings = {};
        var ProtoBuf = dcodeIO.ProtoBuf;
        var builder = ProtoBuf.loadJson(stringSerialisationJson);
        strings.StringSerialisationData = builder.build("StringSerialisationData");
        strings.modeMapping = mapping.generateBiDiMapping([
            "stringReferences", "chains", "chainReferences"
        ]);
        var resolverKeyVal = "aa_strings_keyval";
        strings.getResolver = function(string) {
            if (!strings.hasOwnProperty("mgr")) {
                strings.mgr = strings.getWriteManager();
            }
            return strings.mgr.addString(string);
        };
        // go down the whole tree, find all the values which are strings, replace them with resolvers.
        // then calculate the optimal serialised form
        // go down the whole tree, find all the resolvers, and translate their values into references for later deserialisation
        // also adds the reference dictionary to the graph
        strings.compactStringsForWrite = function(objectGraph) {
            if (!strings.hasOwnProperty("mgr")) {
                strings.mgr = strings.getWriteManager();
            }
            strings.autoReplaceInternal(objectGraph);
            var dict = strings.mgr.complete();
            strings.autoResolveInternal(objectGraph);
            objectGraph.aaStringSerialisedForm = new strings.StringSerialisationData(dict);
        }
        strings.autoReplaceInternal = function(objectGraph) {
            if (objectGraph == null) {
                return;
            }
            for (k in objectGraph) {
                if (objectGraph.hasOwnProperty(k) && objectGraph[k] != null) {
                    switch (typeof objectGraph[k]) {
                        case 'number':
                            break;
                        case 'object':
                            strings.autoReplaceInternal(objectGraph[k]);
                            break;
                        case 'string':
                            objectGraph[k] = strings.getResolver(objectGraph[k]);
                            break;
                        default:
                            throw "Unsupported type: '"+(typeof objectGraph[k])+"'"
                    }
                }
            }
        }
        strings.autoResolveInternal = function(objectGraph) {
            if (objectGraph == null) {
                return null;
            }
            if (objectGraph[resolverKeyVal] == resolverKeyVal) {
                return objectGraph.resolve();
            }
            for (k in objectGraph) {
                if (objectGraph.hasOwnProperty(k) && objectGraph[k] != null) {
                    switch (typeof objectGraph[k]) {
                        case 'number':
                        case 'string':
                            break;
                        case 'object':
                            objectGraph[k] = strings.autoResolveInternal(objectGraph[k]);
                            break;
                        default:
                            throw "Unsupported type: '"+(typeof objectGraph[k])+"'"
                    }
                }
            }
            return objectGraph;
        }
        strings.getWriteManager = function() {
            var mgr = {};
            mgr.state = {
                // in theory could support others later, will only impl in decode for now
                sep: ".",
                segments: [],
                totalStringLengths: 0,
                stringDefinitions: [],
                completed: false
            };
            mgr.addString = function(string) {
                mgr.state.totalStringLengths += string.length;
                var segments = string.split(".");
                var pointers = new Array(segments.length);

                for (var s=0; s<segments.length; s++) {
                    var found = false;
                    for (var k=0; k<mgr.state.segments.length; k++) {
                        if (segments[s] == mgr.state.segments[k]) {
                            pointers[s] = k;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        mgr.state.segments.push(segments[s]);
                        pointers[s] = mgr.state.segments.length - 1;
                    }
                }
                mgr.state.stringDefinitions.push(pointers);
                var ret = {};
                ret[resolverKeyVal] = resolverKeyVal;
                ret.stringIndex = mgr.state.stringDefinitions.length - 1;
                ret.resolve = function() {
                    mgr.complete();
                    return mgr.resolve(ret.stringIndex);
                }
                return ret;
            };
            mgr.complete = function() {
                if (!mgr.state.completed) {
                    mgr.state.completed = true;
                }
                // work out most efficient way of serialising
                var bytesForStringReferences = mgr.state.stringDefinitions.length;
                var bytesForChains = 0;
                var bytesForChainReferences = 0;
                // str lengths
                for (var s=0; s<mgr.state.segments.length; s++) {
                    bytesForChains += mgr.state.segments[s].length;
                    bytesForChainReferences += mgr.state.segments[s].length;
                }
                
                for (var s=0; s<mgr.state.stringDefinitions.length; s++) {
                    // chain lengths: assume each segment ref will be stored in 1 byte (int vle = 7 bits = 127 unique segments) - might be invalid, but close enough
                    bytesForChains += mgr.state.stringDefinitions[s].length;
                    // chain ref lengths
                    bytesForChainReferences++;
                }
                
                var constructOriginalString = function(stringDefIndex) {
                    var key = "";
                    var sep = "";
                    for (var i=0; i<mgr.state.stringDefinitions[stringDefIndex].length; i++) {
                        key += sep + mgr.state.segments[mgr.state.stringDefinitions[stringDefIndex][i]];
                        sep = ".";
                    }
                    return key;
                }
                
                // unique chain lengths
                var seenChains = {};
                for (var s=0; s<mgr.state.stringDefinitions.length; s++) {
                    var key = constructOriginalString(s);
                    if (!seenChains.hasOwnProperty(key)) {
                        bytesForStringReferences += key.length;
                        bytesForChainReferences += mgr.state.stringDefinitions[s].length;
                        // store for later
                        seenChains[key] = mgr.state.stringDefinitions[s];
                    }
                }
                
                mgr.state.bytes = {
                    chains: bytesForChains,
                    chainReferences: bytesForChainReferences,
                    stringReferences: bytesForStringReferences
                };
                
                var completeResult = {};
                // now work out min of these
                if (bytesForChains < bytesForChainReferences && bytesForChains < bytesForStringReferences) {
                    mgr.state.serialisationMode = "chains";
                    completeResult.strings = mgr.state.segments;
                }
                else if (bytesForChainReferences < bytesForChains && bytesForChainReferences < bytesForStringReferences) {
                    mgr.state.serialisationMode = "chainReferences";
                    completeResult.strings = mgr.state.segments;

                    mgr.state.referencedChains = new Array();
                    for (var key in seenChains) {
                        if (seenChains.hasOwnProperty(key)) {
                            mgr.state.referencedChains.push(seenChains[key]);
                            seenChains[key] = mgr.state.referencedChains.length - 1;
                        }
                    }
                    completeResult.references = mgr.state.referencedChains;

                    // put these into chainReferences now
                    mgr.state.chainReferences = new Array(mgr.state.stringDefinitions.length);
                    for (var s=0; s<mgr.state.stringDefinitions.length; s++) {
                        var key = constructOriginalString(s);
                        mgr.state.chainReferences[s] = [seenChains[key]];
                    }
                }
                // stringReferences
                else {
                    mgr.state.serialisationMode = "stringReferences";

                    mgr.state.referencedStrings = [];
                    mgr.state.stringReferences = new Array(mgr.state.stringDefinitions.length);
                    for (var key in seenChains) {
                        if (seenChains.hasOwnProperty(key)) {
                            mgr.state.referencedStrings.push(key);
                            for (var t=0; t<mgr.state.stringDefinitions.length; t++) {
                                var testKey = constructOriginalString(t);
                                if (testKey == key) {
                                    mgr.state.stringReferences[t] = mgr.state.referencedStrings.length - 1;
                                }
                            }
                        }
                    }
                    completeResult.strings = mgr.state.referencedStrings;
                }
                
                completeResult.mode = strings.modeMapping.valueToId(mgr.state.serialisationMode);
                return completeResult;
            }
            mgr.resolve = function(stringIndex) {
                switch (mgr.state.serialisationMode) {
                    case "chains":
                        return mgr.state.stringDefinitions[stringIndex]; // array indexing into strings
                    case "chainReferences":
                        return mgr.state.chainReferences[stringIndex]; // array of len 1 indexing into references
                    case "stringReferences":
                        return [mgr.state.stringReferences[stringIndex]]; // array of len 1 indexing into strings
                    default:
                        throw 'not supported: '+mgr.state.serialisationMode;
                }
            }
            return mgr;
            
        }
        // get the reference dictionary from the passed object graph
        strings.getReadManager = function(dict) {
            var mgr = {state:dict};
            var unpackString = function(obj, path) {
                if (Array.isArray(obj) && obj.length>0 && (typeof obj[0] != 'Number')) {
                    for (var i=0; i<obj.length; i++) {
                        unpackString(obj[i], path);
                    }
                }
                else {
                    var property = path.substring(0, path.indexOf("."));
                    if (obj.hasOwnProperty(property) && obj[property] != null) {
                        // targeted property
                        if (path.indexOf(".") == path.length - 1) {
                            if (Array.isArray(obj[property]) && obj[property].length>0 && Array.isArray(obj[property][0])) {
                                var arr = obj[property];
                                for (var i=0; i<arr.length; i++) {
                                    arr[i] = mgr.getString(arr[i]);
                                }
                            }
                            else {
                                obj[property] = mgr.getString(obj[property]);
                            }
                        }
                        else {
                            var remainder = path.substring(path.indexOf(".")+1);
                            unpackString(obj[property], remainder);
                        }
                    }
                }
            }
            mgr.unpackStrings = function(objectGraph, paths) {
                // new school..
                for (var p=0; p<paths.length; p++) {
                    var path = paths[p];
                    unpackString(objectGraph, path);
                }
                
                // old school
                /*
                for (var k in objectGraph) {
                    if (objectGraph.hasOwnProperty(k) && objectGraph[k] != null) {
                        switch (typeof objectGraph[k]) {
                            case 'number':
                            case 'string':
                                break;
                            case 'object':
                                if (objectGraph[k].hasOwnProperty("aa_serialised_string") && objectGraph[k].aa_serialised_string == "aa_serialised_string") {
                                    objectGraph[k] = mgr.getString(objectGraph[k]);
                                }
                                else {
                                    mgr.unpackStrings(objectGraph[k]);
                                }
                               
                        }
                    }
                }*/
            }
            mgr.constructOriginalString = function(chain) {
                var key = "";
                var sep = "";
                for (var i=0; i<chain.length; i++) {
                    key += sep + mgr.state.strings[chain[i]];
                    sep = ".";
                }
                return key;
            }
            mgr.getString = function(value) {
                var mode = strings.modeMapping.idToValue(mgr.state.mode);
                switch (mode) {
                    case "chains":
                        return mgr.constructOriginalString(value); // array indexing into strings
                    case "chainReferences":
                        return mgr.constructOriginalString(mgr.state.references[value[0]]); // array of len 1 indexing into references
                    case "stringReferences":
                        return mgr.state.strings[value[0]]; // array of len 1 indexing into strings
                    default:
                        throw 'not supported: '+mode;
                }
            }
            return mgr;
        }

        return strings;
    }])
    // aardvark (de)serialisation - via an intermediate model 
    .factory('serialisation', [ 'blitting', 'mapping', 'strings', function(blitting, mapping, strings) {
        var serialiser = {};
        var graphTypes = mapping.generateBiDiMapping(["debug", "gnuplot", "horizon", "dygraph", "scatter"]);
        var gnuplotKeyLocations = mapping.generateBiDiMapping([
            "out top left",
            "out top center",
            "out top right",
            "top left",
            "top center",
            "top right",
            "out center left",
            "center left",
            "center center",
            "center right",
            "out center right",
            "bottom left",
            "bottom center",
            "bottom right",
            "out bottom left",
            "out bottom center",
            "out bottom right"
        ]);
        var countFilterEnds = mapping.generateBiDiMapping(["top","bottom"]);
        var countFilterMeasures = mapping.generateBiDiMapping(["min","mean","max"]);
        var valueFilterMeasures = mapping.generateBiDiMapping(["any","min","mean","max"]);
        var aggregationFunctions = mapping.generateBiDiMapping(["min","avg","max","sum","zimsum","mimmax","mimmin"]); // todo: flesh out
        var scatterAxes = mapping.generateBiDiMapping(["x","y"]);
        var units = mapping.generateBiDiMapping(["s", "m", "h", "d", "w", "y"]); // todo: incomplete
        var ProtoBuf = dcodeIO.ProtoBuf;
        var builder = ProtoBuf.loadJson(intermediateModelJson);
        // todo: move this into a pre-processing step
        var buildStringPaths = function(obj, pathSoFar, interesting, ret) {
            for (var f=0; f<obj.length; f++) {
                var thisPath = pathSoFar+obj[f].name+".";
                if (obj[f].type == "string") {
                    ret.push(thisPath);
                }
                else {
                    buildStringPaths(interesting[obj[f].type], thisPath, interesting, ret);
                }
            }
        }
        var stringPaths = function() {
            var stringPaths = [];
            var interesting = {};
            for (var i=0; i<rawIntermediateModelJson.messages.length; i++) {
                var message = rawIntermediateModelJson.messages[i];
                if (message.name != "StringSerialisationData") {
                    interesting[message.name] = message;
                }
            }
            for (var k in interesting) {
                if (interesting.hasOwnProperty(k)) {
                    var message = interesting[k];
                    var interestingFields = [];
                    for (var f=0; f<message.fields.length; f++) {
                        var field = message.fields[f];
                        if (field.type == "string" || interesting.hasOwnProperty(field.type)) {
                            interestingFields.push(field);
                        }
                    }
                    interesting[k] = interestingFields;
                }
            }
            var ret = [];
            buildStringPaths(interesting.IntermediateModel, "", interesting, ret);
            return ret;
        }
        serialiser.stringPaths = stringPaths();
        var isDecimalDigit = function(ch) {
            return 0x30 <= ch && ch <= 0x39;  // 0..9
        }
        var toTimePeriod = function(value) {
            if (value == null) {
                return null;
            }
            var unit = value.substring(value.length-1);
            if (isDecimalDigit(unit)) {
                return {}; 
            }
            var count = toInt(value.substring(0, value.length-1));
            return {
                count: count,
                unit: units.valueToId(unit)
            }
        }
        var fromTimePeriod = function(value, defaultValue) {
            if (value == null) {
                return defaultValue;
            }
            var unit = units.idToValue(value.unit);
            var count = value.count;
            return count + "" + unit;
        }
        var toInt = function(value) {
            if (typeof value == "string") {
                return parseInt(value);
            }
            return value;
        }
        serialiser.IntermediateModel = builder.build("IntermediateModel");
        serialiser.compactIds = function(model) {
            // compact the ids!
            var origToNew = {};
            var idSource = 0;
            for (var i=0; i<model.graphs.length; i++) {
                origToNew[model.graphs[i].id] = ++idSource;
                model.graphs[i].id = idSource;
            }
            for (var i=0; i<model.metrics.length; i++) {
                if (model.metrics[i].graphOptions != null) {
                    model.metrics[i].graphOptions.graphId = origToNew[model.metrics[i].graphOptions.graphId];
                    model.metrics[i].id = ++idSource;
                }
            }
        }
        serialiser.generateIntermediateModel = function(m) {
            // take copy of model
            var model = JSON.parse(JSON.stringify(m));

            serialiser.compactIds(model);
            
            var intermediateModel = {
                global: {},
                graphs: [],
                metrics: []
            };

            // minimally populate global
            intermediateModel.global.flags = blitting.toBlittedInt([
                // always add to the bottom of this
                model.global.absoluteTimeSpecification,
                model.global.autoReload,
                model.global.autoGraphHeight
            ]);
            // todo: can we combine these into 2?
            if (model.global.absoluteTimeSpecification) {
                intermediateModel.global.fromDate = model.global.fromDate;
                intermediateModel.global.fromTime = model.global.fromTime;
                if (!model.global.autoReload) {
                    intermediateModel.global.toDate = model.global.toDate;
                    intermediateModel.global.toTime = model.global.toTime;
                }
            }
            else {
                intermediateModel.global.relativePeriod = toTimePeriod(model.global.relativePeriod);
            }
            if (model.global.autoGraphHeight) {
                intermediateModel.global.minGraphHeight = model.global.minGraphHeight;
            }
            else {
                intermediateModel.global.graphHeight = model.global.graphHeight;
            }

            // minimally populate graphs
            for (var i=0; i<model.graphs.length; i++) {
                var graph = model.graphs[i];
                var intermediateGraph = {
                    id: toInt(graph.id),
                    type: graphTypes.valueToId(graph.type),
                    title: graph.title
                }
                // strip serialised model down to only relevant info for the selected graph type
                switch (graph.type) {
                    case "gnuplot":
                        if (graph.gnuplot != null) {
                            intermediateGraph.flags = blitting.toBlittedInt([
                                graph.gnuplot.yAxisLogScale,
                                graph.gnuplot.y2AxisLogScale,
                                graph.gnuplot.showKey,
                                graph.gnuplot.keyBox,
                                graph.gnuplot.lineSmoothing,
                                graph.gnuplot.keyAlignment=="columnar"
                            ]);
                            intermediateGraph.gnuplot = {
                                yAxisLabel: graph.gnuplot.yAxisLabel,
                                y2AxisLabel: graph.gnuplot.y2AxisLabel,
                                yAxisFormat: graph.gnuplot.yAxisFormat, // todo: can be a mapping
                                y2AxisFormat: graph.gnuplot.y2AxisFormat, // todo: can be a mapping
                                yAxisRange: graph.gnuplot.yAxisRange,
                                y2AxisRange: graph.gnuplot.y2AxisRange
                            };
                            if (graph.gnuplot.showKey) {
                                intermediateGraph.gnuplot.keyLocation = gnuplotKeyLocations.valueToId(graph.gnuplot.keyLocation);
                            }
                        }
                        else {
                            intermediateGraph.gnuplot = {};
                        }
                        break;
                    case "horizon":
                        if (graph.horizon != null) {
                            intermediateGraph.flags = blitting.toBlittedInt([
                                graph.horizon.interpolateGaps,
                                graph.horizon.squashNegative
                            ]);
                        }
                        break;
                    case "dygraph":
                        if (graph.dygraph != null) {
                            intermediateGraph.dygraph = {};
                            intermediateGraph.flags = blitting.toBlittedInt([
                                graph.dygraph.interpolateGaps,
                                graph.dygraph.highlightLines,
                                graph.dygraph.stackedLines,
                                graph.dygraph.squashNegative,
                                graph.dygraph.autoScale,
                                graph.dygraph.ylog,
                                graph.dygraph.meanAdjusted
                            ]);
                            if (graph.dygraph.countFilter != null && graph.dygraph.countFilter.count != "") {
                                intermediateGraph.dygraph.countFilterEnd = countFilterEnds.valueToId(graph.dygraph.countFilter.end);
                                intermediateGraph.dygraph.countFilterCount = toInt(graph.dygraph.countFilter.count);
                                intermediateGraph.dygraph.countFilterMeasure = countFilterMeasures.valueToId(graph.dygraph.countFilter.measure)
                            }
                            if (graph.dygraph.valueFilter != null && graph.dygraph.valueFilter.lowerBound != "" || graph.dygraph.valueFilter.upperBound != "") {
                                if (graph.dygraph.valueFilter.lowerBound != "") {
                                    intermediateGraph.dygraph.valueFilterLowerBound = toInt(graph.dygraph.valueFilter.lowerBound);
                                }
                                if (graph.dygraph.valueFilter.upperBound != "") {
                                    intermediateGraph.dygraph.valueFilterUpperBound = toInt(graph.dygraph.valueFilter.upperBound);
                                }
                                intermediateGraph.dygraph.valueFilterMeasure = valueFilterMeasures.valueToId(graph.dygraph.valueFilter.measure)
                            }
                        }
                        else {
                            intermediateGraph.dygraph = {};
                            
                        }
                        break;
                    case "scatter":
                        if (graph.scatter != null) {
                            intermediateGraph.flags = blitting.toBlittedInt([
                                graph.scatter.excludeNegative
                            ]);
                        }
                        break;
                }
                intermediateModel.graphs.push(intermediateGraph);
            }

            for (var i=0; i<model.metrics.length; i++) {
                var metric = model.metrics[i];
                
                var intermediateMetric = {
                    id: toInt(metric.id),
                    name: metric.name
                };
                var tagsToWrite = [];
                if (metric.tags != null) {
                    for (var t=0; t<metric.tags.length; t++) {
                        if (metric.tags[t].value != "") {
                            tagsToWrite.push(metric.tags[t]);
                        }
                    }
                }
                intermediateMetric.tags = tagsToWrite;
                if (metric.graphOptions != null ) {
                    intermediateMetric.flags = blitting.toBlittedInt([
                        metric.graphOptions.rate,
                        metric.graphOptions.rateCounter,
                        metric.graphOptions.rightAxis,
                        metric.graphOptions.downsample
                    ]);
                    if (metric.graphOptions.graphId == null) {
                        metric.graphOptions.graphId = "0";
                    }
                    intermediateMetric.graphId = parseInt(metric.graphOptions.graphId);
                    if (metric.graphOptions.rate && metric.graphOptions.rateCounter) {
                        intermediateMetric.rateCounterReset = parseInt(metric.graphOptions.rateCounterReset);
                        intermediateMetric.rateCounterMax = parseInt(metric.graphOptions.rateCounterMax);
                    }
                    intermediateMetric.aggregator = aggregationFunctions.valueToId(metric.graphOptions.aggregator);
                    if (metric.graphOptions.downsample) {
                        intermediateMetric.downsampleBy = aggregationFunctions.valueToId(metric.graphOptions.downsampleBy);
                        intermediateMetric.downsampleTo = toTimePeriod(metric.graphOptions.downsampleTo);
                    }
                    if (metric.graphOptions.scatter != null) {
                        intermediateMetric.scatterAxis = scatterAxes.valueToId(metric.graphOptions.scatter.axis);
                    }
                }
                intermediateModel.metrics.push(intermediateMetric);
            }
            
            // serialise all the strings into optimal form
            strings.compactStringsForWrite(intermediateModel);

            return intermediateModel;
        };
        serialiser.serialise = function(model) {
            var origLen = JSON.stringify(model).length;
            var intermediate = serialiser.generateIntermediateModel(model);
            
            var proto = new serialiser.IntermediateModel(intermediate);
            var buffer = proto.encode().toArrayBuffer();
            var encoded = proto.toBase64().replace("+","-").replace("/","_").replace("=",",");
            console.log("buffer = "+encoded);
            console.log("buflen = "+encoded.length);
            console.log("orilen = "+origLen);

            /*
            var compressjs = require('compressjs');
            var algorithm = compressjs.Lzp3;
            var data = new Buffer('Example data', 'utf8');
            var compressed = algorithm.compressFile(data);
            var decompressed = algorithm.decompressFile(compressed);
// convert from array back to string
            var data2 = new Buffer(decompressed).toString('utf8');
            console.log(data2);*/


            return encoded;
        }
        serialiser.readIntermediateModel = function(intermediateModel) {
            console.log("String mode = "+intermediateModel.aaStringSerialisedForm.mode);
            
            
            strings.getReadManager(intermediateModel.aaStringSerialisedForm).unpackStrings(intermediateModel, serialiser.stringPaths);
            intermediateModel.aaStringSerialisedForm = null;
            // todo
            var model = {
                global: {},
                graphs: [],
                metrics: []
            };
            
            var globalFlags = blitting.fromBlittedInt(intermediateModel.global.flags, [false,false,true]);
            model.global.absoluteTimeSpecification = globalFlags[0];
            model.global.autoReload = globalFlags[1];
            model.global.autoGraphHeight = globalFlags[2];
            if (model.global.absoluteTimeSpecification) {
                model.global.fromDate = intermediateModel.global.fromDate;
                model.global.fromTime = intermediateModel.global.fromTime;
                if (!model.global.autoReload) {
                    model.global.toDate = intermediateModel.global.toDate;
                    model.global.toTime = intermediateModel.global.toTime;
                }
            }
            else {
                model.global.relativePeriod = fromTimePeriod(intermediateModel.global.relativePeriod, "2h");
            }
            if (model.global.autoGraphHeight) {
                model.global.minGraphHeight = intermediateModel.global.minGraphHeight;
            }
            else {
                model.global.graphHeight = intermediateModel.global.graphHeight;
            }
            
            for (var i=0; i<intermediateModel.graphs.length; i++) {
                var intermediateGraph = intermediateModel.graphs[i];
                var graph = {
                    id: intermediateGraph.id,
                    type: graphTypes.idToValue(intermediateGraph.type),
                    title: intermediateGraph.title
                }
                
                switch (graph.type) {
                    case "gnuplot":
                        var gnuplotFlags = blitting.fromBlittedInt(intermediateGraph.flags, [false, false, true, false, false, true]);
                        graph.gnuplot = {};
                        graph.gnuplot.yAxisLogScale = gnuplotFlags[0];
                        graph.gnuplot.y2AxisLogScale = gnuplotFlags[1];
                        graph.gnuplot.showKey = gnuplotFlags[2];
                        graph.gnuplot.keyBox = gnuplotFlags[3];
                        graph.gnuplot.lineSmoothing = gnuplotFlags[4];
                        graph.gnuplot.keyAlignment = gnuplotFlags[5] ? "columnar" : "horizontal";
                        graph.gnuplot.yAxisLabel = intermediateGraph.gnuplot.yAxisLabel;
                        graph.gnuplot.y2AxisLabel = intermediateGraph.gnuplot.y2AxisLabel;
                        graph.gnuplot.yAxisFormat = intermediateGraph.gnuplot.yAxisFormat;
                        graph.gnuplot.y2AxisFormat = intermediateGraph.gnuplot.y2AxisFormat;
                        graph.gnuplot.yAxisRange = intermediateGraph.gnuplot.yAxisRange;
                        graph.gnuplot.y2AxisRange = intermediateGraph.gnuplot.y2AxisRange;
                        if (graph.gnuplot.showKey) {
                            graph.gnuplot.keyLocation = gnuplotKeyLocations.idToValue(intermediateGraph.gnuplot.keyLocation);
                        }
                        break;
                    case "horizon":
                        var horizonFlags = blitting.fromBlittedInt(intermediateGraph.flags, [true, false]);
                        graph.horizon = {};
                        graph.horizon.interpolateGaps = horizonFlags[0];
                        graph.horizon.squashNegative = horizonFlags[1];
                        break;
                    case "dygraph":
                        var dygraphFlags = blitting.fromBlittedInt(intermediateGraph.flags, [true, false, false, true, false, false, false]);
                        graph.dygraph = {};
                        graph.dygraph.interpolateGaps = dygraphFlags[0];
                        graph.dygraph.highlightLines = dygraphFlags[1];
                        graph.dygraph.stackedLines = dygraphFlags[2];
                        graph.dygraph.squashNegative = dygraphFlags[3];
                        graph.dygraph.autoScale = dygraphFlags[4];
                        graph.dygraph.ylog = dygraphFlags[5];
                        graph.dygraph.meanAdjusted = dygraphFlags[6];
                        graph.dygraph.countFilter = {
                            end: countFilterEnds.idToValue(intermediateGraph.dygraph.countFilterEnd),
                            count: intermediateGraph.dygraph.countFilterCount + "",
                            measure: countFilterMeasures.idToValue(intermediateGraph.dygraph.countFilterMeasure)
                        };
                        graph.dygraph.valueFilter = {
                            lowerBound: intermediateGraph.dygraph.valueFilterLowerBound + "",
                            upperBound: intermediateGraph.dygraph.valueFilterUpperBound + "",
                            measure: valueFilterMeasures.idToValue(intermediateGraph.dygraph.valueFilterMeasure)
                        };
                        break;
                    case "scatter":
                        var scatterFlags = blitting.fromBlittedInt(intermediateGraph.flags, [false]);
                        graph.scatter = {};
                        graph.scatter.excludeNegative = scatterFlags[0];
                        break;
                }
                
                model.graphs.push(graph);   
            }

            for (var i=0; i<intermediateModel.metrics.length; i++) {
                var intermediateMetric = intermediateModel.metrics[i];

                var metric = {
                    id: toInt(intermediateMetric.id),
                    name: intermediateMetric.name,
                    tags: intermediateMetric.tags,
                    graphOptions: {
                        scatter: null
                    }
                };

                var metricFlags = blitting.fromBlittedInt(intermediateMetric.flags, [false,false,false,false]);
                metric.graphOptions.rate = metricFlags[0];
                metric.graphOptions.rateCounter = metricFlags[1];
                metric.graphOptions.rightAxis = metricFlags[2];
                metric.graphOptions.downsample = metricFlags[3];
                metric.graphOptions.graphId = intermediateMetric.graphId;
                if (metric.graphOptions.rate && metric.graphOptions.rateCounter) {
                    metric.graphOptions.rateCounterReset = intermediateMetric.rateCounterReset.toNumber();
                    metric.graphOptions.rateCounterMax = intermediateMetric.rateCounterMax.toNumber();
                }
                else {
                    metric.graphOptions.rateCounterReset = "";
                    metric.graphOptions.rateCounterMax = "";
                }
                metric.graphOptions.aggregator = aggregationFunctions.idToValue(intermediateMetric.aggregator);
                if (metric.graphOptions.downsample) {
                    metric.graphOptions.downsampleBy = aggregationFunctions.idToValue(intermediateMetric.downsampleBy);
                    metric.graphOptions.downsampleTo = fromTimePeriod(intermediateMetric.downsampleTo, "");
                }
                else {
                    metric.graphOptions.downsampleBy = "";
                    metric.graphOptions.downsampleTo = "";
                }
                var scatterAxis = scatterAxes.idToValue(intermediateMetric.scatterAxis);
                if (scatterAxis != null) {
                    metric.graphOptions.scatter = {
                        axis: scatterAxis
                    };
                }
                
                // todo: metrics
                model.metrics.push(metric);
            }
            
            return model;
        }
        serialiser.deserialise = function(ser) {
            var b64str = ser.replace(",","=").replace("_","/").replace("-","+");
            var intermediateModel = serialiser.IntermediateModel.decode64(b64str);
            return serialiser.readIntermediateModel(intermediateModel);
        }
        return serialiser;
    }]);