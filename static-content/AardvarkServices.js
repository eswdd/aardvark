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
    // id generation
    .factory('idGenerator', function() {
        var generator = {};
        var maxId = 0;
        generator.nextId = function() {
            return (++maxId) + "";
        }
        generator.prev = function() {
            return maxId + "";
        }
        generator.updateMax = function(candidateMax) {
            var p = parseInt(candidateMax);
            if (p >= maxId) {
                maxId = p;
            }
        }
        return generator;
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
                if (value == null) {
                    return null;
                }
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
        strings.getResolver = function(string,sep) {
            if (!strings.hasOwnProperty("mgr")) {
                strings.mgr = strings.getWriteManager();
            }
            return strings.mgr.addString(string,sep);
        };
        // go down the whole tree, find all the values which are strings, replace them with resolvers.
        // then calculate the optimal serialised form
        // go down the whole tree, find all the resolvers, and translate their values into references for later deserialisation
        // also adds the reference dictionary to the graph
        strings.compactStringsForWrite = function(objectGraph, pathsAndSeps) {
            if (!strings.hasOwnProperty("mgr")) {
                strings.mgr = strings.getWriteManager();
            }
            strings.autoReplaceInternal(objectGraph, pathsAndSeps, "");
            var dict = strings.mgr.complete();
            strings.autoResolveInternal(objectGraph);
            objectGraph.aaStringSerialisedForm = new strings.StringSerialisationData(dict);
        }
        strings.autoReplaceInternal = function(objectGraph, pathsAndSeps, pathSoFar) {
            if (objectGraph == null) {
                return;
            }
            for (k in objectGraph) {
                if (objectGraph.hasOwnProperty(k) && objectGraph[k] != null) {
                    switch (typeof objectGraph[k]) {
                        case 'number':
                            break;
                        case 'object':
                            var newPath = pathSoFar;
                            if (!Array.isArray(objectGraph)) {
                                newPath += k + "."; 
                            }
                            strings.autoReplaceInternal(objectGraph[k], pathsAndSeps, newPath);
                            break;
                        case 'string':
                            var newPath = pathSoFar;
                            if (!Array.isArray(objectGraph)) {
                                newPath += k + ".";
                            }
                            var sep = null;
                            for (var i=0; i<pathsAndSeps.length; i++) {
//                                console.log("Comparing "+newPath+" == "+pathsAndSeps[i].path)
                                if (newPath == pathsAndSeps[i].path) {
                                    sep = pathsAndSeps[i].sep;
                                    break;
                                }
                            }
                            if (sep == null) {
                                throw "Couldn't find pathAndSep for '"+newPath+"'";
                            }
                            objectGraph[k] = strings.getResolver(objectGraph[k], sep);
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
            mgr.addString = function(string,sep) {
                mgr.state.totalStringLengths += string.length;
                if (sep == null) {
                    throw "Null sep for string: "+string;
                }
                var segments = string.split(sep);
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
                mgr.state.stringDefinitions.push({pointers:pointers,sep:sep});
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
                    bytesForChains += mgr.state.stringDefinitions[s].pointers.length;
                    // chain ref lengths
                    bytesForChainReferences++;
                }
                
                var constructOriginalString = function(stringDefIndex) {
                    var key = "";
                    var sep = "";
                    for (var i=0; i<mgr.state.stringDefinitions[stringDefIndex].pointers.length; i++) {
                        key += sep + mgr.state.segments[mgr.state.stringDefinitions[stringDefIndex].pointers[i]];
                        sep = mgr.state.stringDefinitions[stringDefIndex].sep;
                    }
                    return key;
                }
                
                // unique chain lengths
                var seenChains = {};
                for (var s=0; s<mgr.state.stringDefinitions.length; s++) {
                    var key = constructOriginalString(s);
                    if (!seenChains.hasOwnProperty(key)) {
                        bytesForStringReferences += key.length;
                        bytesForChainReferences += mgr.state.stringDefinitions[s].pointers.length;
                        // store for later
                        seenChains[key] = mgr.state.stringDefinitions[s].pointers;
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
                            mgr.state.referencedChains.push({chain:seenChains[key]});
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
                        return mgr.state.stringDefinitions[stringIndex].pointers; // array indexing into strings
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
            var unpackString = function(obj, pathAndPrefix) {
                if (Array.isArray(obj) && obj.length>0 && (typeof obj[0] != 'Number')) {
                    for (var i=0; i<obj.length; i++) {
                        unpackString(obj[i], pathAndPrefix);
                    }
                }
                else {
                    var property = pathAndPrefix.path.substring(0, pathAndPrefix.path.indexOf("."));
                    if (obj.hasOwnProperty(property) && obj[property] != null) {
                        // targeted property
                        if (pathAndPrefix.path.indexOf(".") == pathAndPrefix.path.length - 1) {
                            if (Array.isArray(obj[property]) && obj[property].length>0 && Array.isArray(obj[property][0])) {
                                var arr = obj[property];
                                for (var i=0; i<arr.length; i++) {
                                    arr[i] = mgr.getString(arr[i],pathAndPrefix.sep);
                                }
                            }
                            else {
                                obj[property] = mgr.getString(obj[property],pathAndPrefix.sep);
                            }
                        }
                        else {
                            var remainder = pathAndPrefix.path.substring(pathAndPrefix.path.indexOf(".")+1);
                            unpackString(obj[property], {path:remainder,sep:pathAndPrefix.sep});
                        }
                    }
                }
            }
            mgr.unpackStrings = function(objectGraph, pathsAndSeps) {
                // new school..
                for (var p=0; p<pathsAndSeps.length; p++) {
                    var path = pathsAndSeps[p];
                    unpackString(objectGraph, pathsAndSeps[p]);
                }
            }
            mgr.constructOriginalString = function(chain,configuredSep) {
                if (chain.length == 0) {
                    return null;
                }
                var key = "";
                var sep = "";
                for (var i=0; i<chain.length; i++) {
                    key += sep + mgr.state.strings[chain[i]];
                    sep = configuredSep;
                }
                return key;
            }
            mgr.getString = function(value,sep) {
                var mode = strings.modeMapping.idToValue(mgr.state.mode);
                switch (mode) {
                    case "chains":
                        return mgr.constructOriginalString(value,sep); // array indexing into strings
                    case "chainReferences":
                        if (value.length == 0) {
                            return mgr.constructOriginalString([],sep);
                        }
                        return mgr.constructOriginalString(mgr.state.references[value[0]].chain,sep); // array of len 1 indexing into references
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
    .factory('serialisation', [ 'blitting', 'mapping', 'strings', 'idGenerator', function(blitting, mapping, strings, idGenerator) {
        var serialiser = {};
        // Issue #110 - debug now dead
        var graphTypes = mapping.generateBiDiMapping(["debug", "gnuplot", "horizon", "dygraph", "scatter", "heatmap"]);
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
        var gnuplotStyles = mapping.generateBiDiMapping(["linespoint","points","circles","dots"]);
        var countFilterEnds = mapping.generateBiDiMapping(["top","bottom"]);
        var countFilterMeasures = mapping.generateBiDiMapping(["min","mean","max"]);
        var valueFilterMeasures = mapping.generateBiDiMapping(["any","min","mean","max"]);
        var aggregationFunctions = mapping.generateBiDiMapping(["min","avg","max","sum","zimsum","mimmax","mimmin"]); // todo: flesh out
        var axes = mapping.generateBiDiMapping(["x1y1","x1y2"]);
        var scatterAxes = mapping.generateBiDiMapping(["x","y"]);
        var units = mapping.generateBiDiMapping(["s", "m", "h", "d", "w", "y"]); // todo: incomplete
        var datumStyles = mapping.generateBiDiMapping(["relative","from","to"]);
        var heatmapStyles = mapping.generateBiDiMapping(["auto","week_day","day_hour"]);
        var ProtoBuf = dcodeIO.ProtoBuf;
        var builder = ProtoBuf.loadJson(intermediateModelJson);
        // helper data structures
        var rawIntermediateModelByType = {};
        for (var i=0; i<rawIntermediateModelJson.messages.length; i++) {
            var message = rawIntermediateModelJson.messages[i];
            if (message.name != "StringSerialisationData") {
                rawIntermediateModelByType[message.name] = message;
                var fieldsByName = {};
                for (var j=0; j<message.fields.length; j++) {
                    fieldsByName[message.fields[j].name] = message.fields[j];
                }
                message.fieldsByName = fieldsByName;

            }
        }
        // now replace defaults where appropriate
        var updateDefaultToLookupValue = function(fieldDef, lookup) {
            fieldDef.options.default = lookup.valueToId(fieldDef.options.default);
        }
        updateDefaultToLookupValue(rawIntermediateModelByType.Gnuplot.fieldsByName.keyLocation, gnuplotKeyLocations);
        updateDefaultToLookupValue(rawIntermediateModelByType.Gnuplot.fieldsByName.style, gnuplotStyles);
        updateDefaultToLookupValue(rawIntermediateModelByType.Metric.fieldsByName.aggregator, aggregationFunctions);
        updateDefaultToLookupValue(rawIntermediateModelByType.Metric.fieldsByName.downsampleBy, aggregationFunctions);
        updateDefaultToLookupValue(rawIntermediateModelByType.Metric.fieldsByName.scatterAxis, scatterAxes);
        updateDefaultToLookupValue(rawIntermediateModelByType.Metric.fieldsByName.axis, axes);
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
            var interesting = {};
            for (var k in rawIntermediateModelByType) {
                if (rawIntermediateModelByType.hasOwnProperty(k)) {
                    var message = rawIntermediateModelByType[k];
                    var interestingFields = [];
                    for (var f=0; f<message.fields.length; f++) {
                        var field = message.fields[f];
                        if (field.type == "string" || rawIntermediateModelByType.hasOwnProperty(field.type)) {
                            interestingFields.push(field);
                        }
                    }
                    interesting[k] = interestingFields;
                }
            }
            var paths = [];
            buildStringPaths(interesting.IntermediateModel, "", interesting, paths);
            // default is space
            var stringSepByPrefix = [
                {prefix:"metrics",sep:"."},
                {prefix:"graphs.gnuplot.yAxisRange",sep:":"},
                {prefix:"graphs.gnuplot.y2AxisRange",sep:":"},
                {prefix:"graphs.dygraph.yAxisRange",sep:":"},
                {prefix:"graphs.dygraph.y2AxisRange",sep:":"},
                {prefix:"graphs",sep:" "}
            ];
            var ret = [];
            for (var i=0; i<paths.length; i++) {
//                console.log("string path = "+paths[i]);
                var sep = null;
                for (var j=0; j<stringSepByPrefix.length; j++) {
                    if (paths[i].indexOf(stringSepByPrefix[j].prefix)==0) {
                        sep = stringSepByPrefix[j].sep;
                        break;
                    }
                }
                if (sep == null) {
                    throw "Can't resolve sep for path: "+paths[i];
                }
                ret.push({path:paths[i],sep:sep});
//                console.log("pathAndSep = "+JSON.stringify(ret[i]));
            }
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
            var countString = value.substring(0, value.length-1);
            if (countString == "") {
                return {};
            }
            var count = toInt(countString);
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
        var toSingleDate = function(fromDate, fromTime) {
            var dateTimeMoment = moment.utc(fromDate+" "+fromTime, "YYYY/MM/DD HH:mm:ss");
            return dateTimeMoment.toDate();
        }
        var fromSingleDateToDatePart = function(singleDate) {
            return moment.utc(singleDate).format("YYYY/MM/DD");
        }
        var fromSingleDateToTimePart = function(singleDate) {
            return moment.utc(singleDate).format("HH:mm:ss");
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
                }
                model.metrics[i].id = ++idSource;
            }
        }
        serialiser.decompactIds = function(model) {
            for (var i=0; i<model.graphs.length; i++) {
                idGenerator.updateMax(model.graphs[i].id);
            }
            for (var i=0; i<model.metrics.length; i++) {
                idGenerator.updateMax(model.metrics[i].id);
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
                model.global.autoGraphHeight,
                model.global.globalDownsampling,
                model.global.baselining
            ]);
            if (model.global.absoluteTimeSpecification) {
                intermediateModel.global.fromDateTime = toSingleDate(model.global.fromDate, model.global.fromTime).getTime();
                if (!model.global.autoReload) {
                    intermediateModel.global.toDateTime = toSingleDate(model.global.toDate, model.global.toTime).getTime();
                }
            }
            else {
                intermediateModel.global.relativePeriod = toTimePeriod(model.global.relativePeriod);
            }
            if (model.global.autoReload) {
                if (model.global.autoReloadPeriod != null && model.global.autoReloadPeriod != "") {
                    intermediateModel.global.autoReloadPeriod = toInt(model.global.autoReloadPeriod);
                }
                else {
                    intermediateModel.global.autoReloadPeriod = null;
                }
            }
            if (model.global.autoGraphHeight) {
                intermediateModel.global.minGraphHeight = toInt(model.global.minGraphHeight);
            }
            else {
                intermediateModel.global.graphHeight = toInt(model.global.graphHeight);
            }
            if (model.global.globalDownsampling) {
                intermediateModel.global.globalDownsampleTo = toTimePeriod(model.global.globalDownsampleTo);
            }
            if (model.global.baselining) {
                intermediateModel.global.baselineDatumStyle = datumStyles.valueToId(model.global.baselineDatumStyle);
                switch (model.global.baselineDatumStyle) {
                    case "relative":
                        intermediateModel.global.baselineRelativePeriod = toTimePeriod(model.global.baselineRelativePeriod);
                        break;
                    case "from":
                        intermediateModel.global.baselineFromDateTime = toSingleDate(model.global.baselineFromDate, model.global.baselineFromTime).getTime();
                        break;
                    case "to":
                        intermediateModel.global.baselineToDateTime = toSingleDate(model.global.baselineToDate, model.global.baselineToTime).getTime();
                        break;
                }
            }

            // minimally populate graphs
            for (var i=0; i<model.graphs.length; i++) {
                var graph = model.graphs[i];
                var intermediateGraph = {
                    id: toInt(graph.id),
                    type: graphTypes.valueToId(graph.type)
                }
                if (graph.title != "Graph "+(i+1)) {
                    intermediateGraph.title = graph.title;
                }
                // strip serialised model down to only relevant info for the selected graph type
                switch (graph.type) {
                    case "gnuplot":
                        if (graph.gnuplot != null) {
                            intermediateGraph.flags = blitting.toBlittedInt([
                                graph.gnuplot.y1AxisLogScale,
                                graph.gnuplot.y2AxisLogScale,
                                graph.gnuplot.showKey,
                                graph.gnuplot.keyBox,
                                graph.gnuplot.lineSmoothing,
                                graph.gnuplot.keyAlignment=="columnar",
                                graph.gnuplot.globalAnnotations
                            ]);
                            intermediateGraph.gnuplot = {
                                yAxisLabel: graph.gnuplot.y1AxisLabel,
                                y2AxisLabel: graph.gnuplot.y2AxisLabel,
                                yAxisFormat: graph.gnuplot.y1AxisFormat, // todo: can be a mapping
                                y2AxisFormat: graph.gnuplot.y2AxisFormat, // todo: can be a mapping
                                yAxisRange: graph.gnuplot.y1AxisRange,
                                y2AxisRange: graph.gnuplot.y2AxisRange
                            };
                            if (graph.gnuplot.showKey) {
                                intermediateGraph.gnuplot.keyLocation = gnuplotKeyLocations.valueToId(graph.gnuplot.keyLocation);
                            }
                            intermediateGraph.gnuplot.style = gnuplotStyles.valueToId(graph.gnuplot.style);
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
                            intermediateGraph.dygraph = {
                                yAxisRange: graph.dygraph.y1AxisRange,
                                y2AxisRange: graph.dygraph.y2AxisRange
                            };
                            intermediateGraph.flags = blitting.toBlittedInt([
                                graph.dygraph.interpolateGaps,
                                graph.dygraph.highlightLines,
                                graph.dygraph.stackedLines,
                                graph.dygraph.y1SquashNegative,
                                graph.dygraph.y1AutoScale,
                                graph.dygraph.y1Log,
                                graph.dygraph.meanAdjusted,
                                graph.dygraph.ratioGraph,
                                graph.dygraph.annotations,
                                graph.dygraph.globalAnnotations,
                                graph.dygraph.y2SquashNegative,
                                graph.dygraph.y2AutoScale,
                                graph.dygraph.y2Log
                            ]);
                            if (graph.dygraph.countFilter != null && graph.dygraph.countFilter.count != null && graph.dygraph.countFilter.count != "") {
                                intermediateGraph.dygraph.countFilterEnd = countFilterEnds.valueToId(graph.dygraph.countFilter.end);
                                intermediateGraph.dygraph.countFilterCount = toInt(graph.dygraph.countFilter.count);
                                intermediateGraph.dygraph.countFilterMeasure = countFilterMeasures.valueToId(graph.dygraph.countFilter.measure)
                            }
                            if (graph.dygraph.valueFilter != null && 
                                ((graph.dygraph.valueFilter.lowerBound != null && graph.dygraph.valueFilter.lowerBound != "") || 
                                (graph.dygraph.valueFilter.upperBound != null && graph.dygraph.valueFilter.upperBound != ""))) {
                                if (graph.dygraph.valueFilter.lowerBound != null && graph.dygraph.valueFilter.lowerBound != "") {
                                    intermediateGraph.dygraph.valueFilterLowerBound = toInt(graph.dygraph.valueFilter.lowerBound);
                                }
                                if (graph.dygraph.valueFilter.upperBound != null && graph.dygraph.valueFilter.upperBound != "") {
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
                    case "heatmap":
                        if (graph.heatmap != null) {
                            intermediateGraph.flags = blitting.toBlittedInt([
                                graph.heatmap.excludeNegative,
                                graph.heatmap.ylog
                            ]);
                            intermediateGraph.heatmap = {
                                style: heatmapStyles.valueToId(graph.heatmap.style)
                            };
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
                        var tag = metric.tags[t];
                        if (tag.value != "") {
                            var flags = blitting.toBlittedInt([tag.groupBy==null || tag.groupBy]);
                            tagsToWrite.push({
                                name: tag.name,
                                value: tag.value,
                                flags: flags
                            });
                        }
                    }
                }
                intermediateMetric.tags = tagsToWrite;
                if (metric.graphOptions != null ) {
                    intermediateMetric.flags = blitting.toBlittedInt([
                        metric.graphOptions.rate,
                        metric.graphOptions.rateCounter,
                        metric.graphOptions.downsample
                    ]);
                    if (metric.graphOptions.graphId == null) {
                        metric.graphOptions.graphId = "0";
                    }
                    intermediateMetric.graphId = toInt(metric.graphOptions.graphId);
                    if (metric.graphOptions.rate && metric.graphOptions.rateCounter) {
                        intermediateMetric.rateCounterReset = toInt(metric.graphOptions.rateCounterReset);
                        intermediateMetric.rateCounterMax = toInt(metric.graphOptions.rateCounterMax);
                    }
                    intermediateMetric.aggregator = aggregationFunctions.valueToId(metric.graphOptions.aggregator);
                    if (metric.graphOptions.downsample) {
                        intermediateMetric.downsampleBy = aggregationFunctions.valueToId(metric.graphOptions.downsampleBy);
                        intermediateMetric.downsampleTo = toTimePeriod(metric.graphOptions.downsampleTo);
                    }
                    if (metric.graphOptions.scatter != null) {
                        intermediateMetric.scatterAxis = scatterAxes.valueToId(metric.graphOptions.scatter.axis);
                    }
                    intermediateMetric.axis = axes.valueToId(metric.graphOptions.axis);
                }
                intermediateModel.metrics.push(intermediateMetric);
            }

            serialiser.removeDefaults(intermediateModel, rawIntermediateModelByType["IntermediateModel"]);
            // serialise all the strings into optimal form
            strings.compactStringsForWrite(intermediateModel, serialiser.stringPaths);

            return intermediateModel;
        };
        String.prototype.replaceAll = function(from, to) {
            return this.split(from).join(to);
        }
        serialiser.serialise = function(model) {
//            var origLen = JSON.stringify(model).length;
            var intermediate = serialiser.generateIntermediateModel(model);
            
            var proto = new serialiser.IntermediateModel(intermediate);
//            var buffer = proto.encode().toArrayBuffer();
            var encoded = proto.toBase64().replaceAll("+","-").replaceAll("/","_").replaceAll("=",",");
            
//            console.log("buffer = "+encoded);
//            console.log("buflen = "+encoded.length);
//            console.log("orilen = "+origLen);

            /*
            var compressjs = require('compressjs');
            var algorithm = compressjs.Lzp3;
            var data = new Buffer('Example data', 'utf8');
            var compressed = algorithm.compressFile(data);
            var decompressed = algorithm.decompressFile(compressed);
            // convert from array back to string
            var data2 = new Buffer(decompressed).toString('utf8');
            console.log(data2);*/


            // - version '0' is initial
            return "0"+encoded;
        }
        serialiser.removeDefaults = function(intermediateModel, rawProtoObject) {
            if (Array.isArray(intermediateModel)) {
                for (var i=0; i<intermediateModel.length; i++) {
                    serialiser.removeDefaults(intermediateModel[i], rawProtoObject);
                }
                return;
            }
//            console.log("Removing defaults from type: "+rawProtoObject.name)
            for (var i=0; i<rawProtoObject.fields.length; i++) {
                var field = rawProtoObject.fields[i];
                if (intermediateModel.hasOwnProperty(field.name)) {
//                    console.log(" Both model and proto have field: "+field.name+" which has type: "+field.type);
                    if (field.options != null && field.options.default != null) {
//                        console.log(" And has a default supplied!")
                        switch (field.type) {
                            case 'int32':
                            case 'int64':
                            case 'string':
                                if (intermediateModel[field.name] == field.options.default) {
//                                    console.log("  Removed default value of "+field.options.default+" on field "+field.name);
                                    intermediateModel[field.name] = null;
                                }
                                continue;
                            case 'TimePeriod':
                                if (fromTimePeriod(intermediateModel[field.name], field.options.default) == field.options.default) {
//                                    console.log("  Removed default value of "+field.options.default+" on field "+field.name);
                                    intermediateModel[field.name] = null;
                                }
                                continue;
                        }
                        if (rawIntermediateModelByType.hasOwnProperty(field.type)) {
                            serialiser.removeDefaults(intermediateModel[field.name], rawIntermediateModelByType[field.type]);
                        } 
                    }
                    else {
                        if (rawIntermediateModelByType.hasOwnProperty(field.type)) {
                            serialiser.removeDefaults(intermediateModel[field.name], rawIntermediateModelByType[field.type]);
                        }
                    }
                }
            }
        }
        serialiser.fillInDefaults = function(intermediateModel, rawProtoObject) {
            if (Array.isArray(intermediateModel)) {
                for (var i=0; i<intermediateModel.length; i++) {
                    serialiser.fillInDefaults(intermediateModel[i], rawProtoObject);
                }
                return;
            }
//            console.log("Filling in defaults for type: "+rawProtoObject.name)
            for (var i=0; i<rawProtoObject.fields.length; i++) {
                var field = rawProtoObject.fields[i];
//                    console.log(" Both model and proto have field: "+field.name+" which has type: "+field.type);
                if (intermediateModel.hasOwnProperty(field.name) && intermediateModel[field.name] != null) {
                    if (rawIntermediateModelByType.hasOwnProperty(field.type)) {
//                        console.log("  Inserted default value of "+field.options.default+" on field "+field.name);
                        serialiser.fillInDefaults(intermediateModel[field.name], rawIntermediateModelByType[field.type]);
                    }
                }
                else if (field.options != null && field.options.default != null) {
//                        console.log(" And has a default supplied!")
                    switch (field.type) {
                        case 'int32':
                        case 'int64':
                        case 'string':
                            intermediateModel[field.name] = field.options.default;
                            continue;
                        case 'TimePeriod':
                            intermediateModel[field.name] = toTimePeriod(field.options.default);
                            continue;
                    }
                    if (rawIntermediateModelByType.hasOwnProperty(field.type)) {
//                        console.log("  Inserted default value of "+field.options.default+" on field "+field.name);
                        serialiser.fillInDefaults(intermediateModel[field.name], rawIntermediateModelByType[field.type]);
                    }
                }
            }
        }
        serialiser.readIntermediateModel = function(intermediateModel) {
//            console.log("String mode = "+intermediateModel.aaStringSerialisedForm.mode);
            
            
            strings.getReadManager(intermediateModel.aaStringSerialisedForm).unpackStrings(intermediateModel, serialiser.stringPaths);
            intermediateModel.aaStringSerialisedForm = null;
            
            serialiser.fillInDefaults(intermediateModel, rawIntermediateModelByType["IntermediateModel"]);
            
            var model = {
                global: {},
                graphs: [],
                metrics: []
            };
            
            var globalFlags = blitting.fromBlittedInt(intermediateModel.global.flags, [false,false,true,false,false]);
            model.global.absoluteTimeSpecification = globalFlags[0];
            model.global.autoReload = globalFlags[1];
            model.global.autoGraphHeight = globalFlags[2];
            model.global.globalDownsampling = globalFlags[3];
            model.global.baselining = globalFlags[4];
            if (model.global.absoluteTimeSpecification) {
                model.global.fromDate = fromSingleDateToDatePart(intermediateModel.global.fromDateTime.toNumber());
                model.global.fromTime = fromSingleDateToTimePart(intermediateModel.global.fromDateTime.toNumber());
                if (!model.global.autoReload) {
                    model.global.toDate = fromSingleDateToDatePart(intermediateModel.global.toDateTime.toNumber());
                    model.global.toTime = fromSingleDateToTimePart(intermediateModel.global.toDateTime.toNumber());
                }
            }
            else {
                model.global.relativePeriod = fromTimePeriod(intermediateModel.global.relativePeriod, "2h");
            }
            if (model.global.autoReload) {
                model.global.autoReloadPeriod = intermediateModel.global.autoReloadPeriod;
            }
            if (model.global.autoGraphHeight) {
                model.global.minGraphHeight = intermediateModel.global.minGraphHeight;
            }
            else {
                model.global.graphHeight = intermediateModel.global.graphHeight;
            }
            if (model.global.globalDownsampling) {
                model.global.globalDownsampleTo = fromTimePeriod(intermediateModel.global.globalDownsampleTo, "5m");
            }
            if (model.global.baselining) {
                
                model.global.baselineDatumStyle = datumStyles.idToValue(intermediateModel.global.baselineDatumStyle);
                switch (model.global.baselineDatumStyle) {
                    case "relative":
                        model.global.baselineRelativePeriod = fromTimePeriod(intermediateModel.global.baselineRelativePeriod);
                        break;
                    case "from":
                        model.global.baselineFromDate = fromSingleDateToDatePart(intermediateModel.global.baselineFromDateTime.toNumber());
                        model.global.baselineFromTime = fromSingleDateToTimePart(intermediateModel.global.baselineFromDateTime.toNumber());
                        break;
                    case "to":
                        model.global.baselineToDate = fromSingleDateToDatePart(intermediateModel.global.baselineToDateTime.toNumber());
                        model.global.baselineToTime = fromSingleDateToTimePart(intermediateModel.global.baselineToDateTime.toNumber());
                        break;
                }
            }
            
            for (var i=0; i<intermediateModel.graphs.length; i++) {
                var intermediateGraph = intermediateModel.graphs[i];
                var graph = {
                    id: intermediateGraph.id,
                    type: graphTypes.idToValue(intermediateGraph.type)
                }
                graph.title = intermediateGraph.title != null ? intermediateGraph.title : "Graph "+(i+1);
                
                switch (graph.type) {
                    case "gnuplot":
                        var gnuplotFlags = blitting.fromBlittedInt(intermediateGraph.flags, [false, false, true, false, false, true, false]);
                        graph.gnuplot = {};
                        graph.gnuplot.y1AxisLogScale = gnuplotFlags[0];
                        graph.gnuplot.y2AxisLogScale = gnuplotFlags[1];
                        graph.gnuplot.showKey = gnuplotFlags[2];
                        graph.gnuplot.keyBox = gnuplotFlags[3];
                        graph.gnuplot.lineSmoothing = gnuplotFlags[4];
                        graph.gnuplot.keyAlignment = gnuplotFlags[5] ? "columnar" : "horizontal";
                        graph.gnuplot.globalAnnotations = gnuplotFlags[6];
                        graph.gnuplot.y1AxisLabel = intermediateGraph.gnuplot.yAxisLabel;
                        graph.gnuplot.y2AxisLabel = intermediateGraph.gnuplot.y2AxisLabel;
                        graph.gnuplot.y1AxisFormat = intermediateGraph.gnuplot.yAxisFormat;
                        graph.gnuplot.y2AxisFormat = intermediateGraph.gnuplot.y2AxisFormat;
                        graph.gnuplot.y1AxisRange = intermediateGraph.gnuplot.yAxisRange;
                        graph.gnuplot.y2AxisRange = intermediateGraph.gnuplot.y2AxisRange;
                        if (graph.gnuplot.showKey) {
                            graph.gnuplot.keyLocation = gnuplotKeyLocations.idToValue(intermediateGraph.gnuplot.keyLocation);
                        }
                        graph.gnuplot.style = gnuplotStyles.idToValue(intermediateGraph.gnuplot.style);
                        break;
                    case "horizon":
                        var horizonFlags = blitting.fromBlittedInt(intermediateGraph.flags, [true, false]);
                        graph.horizon = {};
                        graph.horizon.interpolateGaps = horizonFlags[0];
                        graph.horizon.squashNegative = horizonFlags[1];
                        break;
                    case "dygraph":
                        var dygraphFlags = blitting.fromBlittedInt(intermediateGraph.flags, [true, false, false, true, false, false, false, false, true, false, false, false, false]);
                        graph.dygraph = {};
                        graph.dygraph.interpolateGaps = dygraphFlags[0];
                        graph.dygraph.highlightLines = dygraphFlags[1];
                        graph.dygraph.stackedLines = dygraphFlags[2];
                        graph.dygraph.y1SquashNegative = dygraphFlags[3];
                        graph.dygraph.y1AutoScale = dygraphFlags[4];
                        graph.dygraph.y1Log = dygraphFlags[5];
                        graph.dygraph.meanAdjusted = dygraphFlags[6];
                        graph.dygraph.ratioGraph = dygraphFlags[7];
                        graph.dygraph.annotations = dygraphFlags[8];
                        graph.dygraph.globalAnnotations = dygraphFlags[9];
                        graph.dygraph.y2SquashNegative = dygraphFlags[10];
                        graph.dygraph.y2AutoScale = dygraphFlags[11];
                        graph.dygraph.y2Log = dygraphFlags[12];
                        graph.dygraph.y1AxisRange = intermediateGraph.dygraph.yAxisRange;
                        graph.dygraph.y2AxisRange = intermediateGraph.dygraph.y2AxisRange;
                        graph.dygraph.countFilter = {
                            end: countFilterEnds.idToValue(intermediateGraph.dygraph.countFilterEnd),
                            measure: countFilterMeasures.idToValue(intermediateGraph.dygraph.countFilterMeasure)
                        };
                        if (intermediateGraph.dygraph.countFilterCount != null) {
                            graph.dygraph.countFilter.count = intermediateGraph.dygraph.countFilterCount + "";
                        }
                        graph.dygraph.valueFilter = {
                            measure: valueFilterMeasures.idToValue(intermediateGraph.dygraph.valueFilterMeasure)
                        };
                        if (intermediateGraph.dygraph.valueFilterLowerBound != null) {
                            graph.dygraph.valueFilter.lowerBound = intermediateGraph.dygraph.valueFilterLowerBound + "";
                        }
                        if (intermediateGraph.dygraph.valueFilterUpperBound != null) {
                            graph.dygraph.valueFilter.upperBound = intermediateGraph.dygraph.valueFilterUpperBound + "";
                        }
                        break;
                    case "scatter":
                        var scatterFlags = blitting.fromBlittedInt(intermediateGraph.flags, [false]);
                        graph.scatter = {};
                        graph.scatter.excludeNegative = scatterFlags[0];
                        break;
                    case "heatmap":
                        var heatmapFlags = blitting.fromBlittedInt(intermediateGraph.flags, [false,false]);
                        graph.heatmap = {};
                        graph.heatmap.excludeNegative = heatmapFlags[0];
                        graph.heatmap.ylog = heatmapFlags[1];
                        graph.heatmap.style = heatmapStyles.idToValue(intermediateGraph.heatmap.style);
                        break;
                }
                
                model.graphs.push(graph);   
            }

            for (var i=0; i<intermediateModel.metrics.length; i++) {
                var intermediateMetric = intermediateModel.metrics[i];

                var metric = {
                    id: toInt(intermediateMetric.id),
                    name: intermediateMetric.name,
                    tags: [],
                    graphOptions: {
                        scatter: null
                    }
                };
                
                for (var t=0; t<intermediateMetric.tags.length; t++) {
                    var iTag = intermediateMetric.tags[t];
                    var tagFlags = blitting.fromBlittedInt(iTag.flags, [true]);
                    metric.tags.push({
                        name: iTag.name,
                        value: iTag.value,
                        groupBy: tagFlags[0]
                    });
                }

                var metricFlags = blitting.fromBlittedInt(intermediateMetric.flags, [false,false,false]);
                metric.graphOptions.rate = metricFlags[0];
                metric.graphOptions.rateCounter = metricFlags[1];
                metric.graphOptions.downsample = metricFlags[2];
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
                metric.graphOptions.axis = axes.idToValue(intermediateMetric.axis);
                
                model.metrics.push(metric);
            }
            
            return model;
        }
        serialiser.deserialise = function(ser) {
            var b64str = ser.replaceAll(",","=").replaceAll("_","/").replaceAll("-","+");
            // first char is an indicator into serialisation mode - 0 = version 0
            b64str = b64str.substring(1); 
            var intermediateModel = serialiser.IntermediateModel.decode64(b64str);
            var model = serialiser.readIntermediateModel(intermediateModel);
            // so generator knows where to continue
            serialiser.decompactIds(model);
            return model;
        }
        return serialiser;
    }]);