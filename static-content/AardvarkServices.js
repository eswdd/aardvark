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
        var root = protobuf.Root.fromJSON(stringSerialisationJson);
        strings.StringSerialisationData = root.lookup("StringSerialisationData");
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
            objectGraph.aaStringSerialisedForm = strings.StringSerialisationData.create(dict);
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
    .factory('serialisation', [ 'blitting', 'mapping', 'strings', 'idGenerator', 'deepUtils', function(blitting, mapping, strings, idGenerator, deepUtils) {
        String.prototype.replaceAll = function(from, to) {
            return this.split(from).join(to);
        }
        var serialiser = {};
        serialiser.encode = function encode(uint8array) {
            var output = [];
        
            for (var i = 0, length = uint8array.length; i < length; i++) {
                output.push(String.fromCharCode(uint8array[i]));
            }
        
            return btoa(output.join(''));
        };
        serialiser.decode = function decode(chars) {
            return Uint8Array.from(atob(chars), function(c) {
                return c.charCodeAt(0);
            });
        };
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
        var aggregationFunctions = mapping.generateBiDiMapping(["min","avg","max","sum","zimsum","mimmax","mimmin","raw","dev","count","p999","p99","p95","p90","p75","p50","ep999r7","ep99r7","ep95r7","ep90r7","ep75r7","ep50r7","ep999r3","ep99r3","ep95r3","ep90r3","ep75r3","ep50r3"]);
        var axes = mapping.generateBiDiMapping(["x1y1","x1y2"]);
        var units = mapping.generateBiDiMapping(["s", "m", "h", "d", "w", "y", "ms", "n"]);
        var datumStyles = mapping.generateBiDiMapping(["relative","from","to"]);
        var heatmapStyles = mapping.generateBiDiMapping(["auto","week_day","day_hour"]);
        var heatmapColourSchemes = mapping.generateBiDiMapping(["RdYlGn","Gn","Bl","Rd"]);
        var horizonSortMethods = mapping.generateBiDiMapping(["name","avg","min","max"]);
        
        var root = protobuf.Root.fromJSON(intermediateModelJson);
        // helper data structures
        var rawIntermediateModelByType = {};
        for (var protoType in rawIntermediateModelJson.nested) {
            var message = rawIntermediateModelJson.nested[protoType];
            if (protoType != "StringSerialisationData") {
                // put name on type and fields
                message.name = protoType;
                for (var fieldName in message.fields) {
                    message.fields[fieldName].name = fieldName;
                }
                rawIntermediateModelByType[protoType] = message;
                console.log("Stashed protoType '"+protoType+": "+JSON.stringify(message));
            }
        }
        // now replace defaults where appropriate
        var updateDefaultToLookupValue = function(fieldDef, lookup) {
            if (!fieldDef.options) {
                fieldDef.options = {};
            }
            fieldDef.options.default = lookup.valueToId(fieldDef.options.default);
        }
        // all versions pre-dating the existence of a version property default to v1
        const MODEL_VERSION_LEGACY = 1; 
        const MODEL_VERSION_EXPRESSIONS = 2;
        const MODEL_VERSION_CURRENT = MODEL_VERSION_EXPRESSIONS;
        updateDefaultToLookupValue(rawIntermediateModelByType.Gnuplot.fields.keyLocation, gnuplotKeyLocations);
        updateDefaultToLookupValue(rawIntermediateModelByType.Gnuplot.fields.style, gnuplotStyles);
        updateDefaultToLookupValue(rawIntermediateModelByType.Metric.fields.aggregator, aggregationFunctions);
        updateDefaultToLookupValue(rawIntermediateModelByType.Metric.fields.downsampleBy, aggregationFunctions);
        updateDefaultToLookupValue(rawIntermediateModelByType.Metric.fields.axis, axes);
        // todo: move this into a pre-processing step
        var buildStringPaths = function(obj, pathSoFar, interesting, ret) {
            console.log("buildStringPaths(len("+obj.length+"),"+pathSoFar+", interesting, len("+ret.length+") )" );
            for (var f=0; f<obj.length; f++) {
                var thisPath = pathSoFar+obj[f].name+".";
                console.log("for path "+thisPath+", field has type "+obj[f].type)
                if (obj[f].type == "string") {
                    console.log("Adding string path: "+thisPath);
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
                    for (var fieldName in message.fields) {
                        var field = message.fields[fieldName];
                        if (field.type == "string" || rawIntermediateModelByType.hasOwnProperty(field.type)) {
                            interestingFields.push(field);
                        }
                    }
                    interesting[k] = interestingFields;
                }
            }
            console.log("interesting: "+JSON.stringify(interesting));
            var paths = [];
            console.log("building string paths for intermediate model: "+interesting.IntermediateModel)
            buildStringPaths(interesting.IntermediateModel, "", interesting, paths);
            // default is space
            var stringSepByPrefix = [
                {prefix:"metrics",sep:"."},
                {prefix:"queries",sep:" "},
                {prefix:"queries.gexp.name",sep:" "},
                {prefix:"queries.gexp.function",sep:" "},
                {prefix:"queries.gexp.argument",sep:"."},
                {prefix:"graphs.gnuplot.yAxisRange",sep:":"},
                {prefix:"graphs.gnuplot.y2AxisRange",sep:":"},
                {prefix:"graphs.dygraph.yAxisRange",sep:":"},
                {prefix:"graphs.dygraph.y2AxisRange",sep:":"},
                {prefix:"graphs.scatter.xAxisRange",sep:":"},
                {prefix:"graphs.scatter.yAxisRange",sep:":"},
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
        var fieldValueOrNull = function(obj, field) {
            if (!obj.hasOwnProperty(field)) {
                return null;
            }
            return obj[field];
        }
        var fromTimePeriod = function(obj, field, defaultValue) {
            if (!obj.hasOwnProperty(field)) {
                return defaultValue;
            }
            const value = obj[field];
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
        var toSingleDate = function(date, time) {
            if (date == null || date == "") {
                return null;
            }
            var dateTimeMoment = moment.utc(date+" "+time, "YYYY/MM/DD HH:mm:ss");
            return dateTimeMoment.toDate();
        }
        var toSingleDateAsLong = function(date, time) {
            var dateObj = toSingleDate(date, time);
            if (dateObj == null) {
                return -1;
            }
            return dateObj.getTime();
        }
        var fromSingleDateToDatePart = function(singleDate) {
            if (singleDate == -1) {
                return "";
            }
            return moment.utc(singleDate).format("YYYY/MM/DD");
        }
        var fromSingleDateToTimePart = function(singleDate) {
            if (singleDate == -1) {
                return "";
            }
            return moment.utc(singleDate).format("HH:mm:ss");
        }
        var graphForMetric = function(graphs, metric) {
            var graphId = metric.graphOptions && metric.graphOptions.graphId ? metric.graphOptions.graphId : 0;
            var graph = null;
            if (graphs != null) {
                for (var g=0; g<graphs.length; g++) {
                    if (graphs[g].id == graphId) {
                        graph = graphs[g];
                    }
                }
            }
            return graph;
        }
        serialiser.IntermediateModel = root.lookup("IntermediateModel");
        serialiser.compactIds = function(model) {
            // compact the ids!
            var origToNew = {};
            var idSource = 0;
            for (var i=0; i<model.graphs.length; i++) {
                origToNew[model.graphs[i].id] = ++idSource;
                model.graphs[i].id = idSource;
            }
            for (var i=0; i<model.queries.length; i++) {
                if (model.queries[i].graphOptions != null) {
                    model.queries[i].graphOptions.graphId = origToNew[model.queries[i].graphOptions.graphId];
                }
                model.queries[i].id = ++idSource;
            }
        }
        serialiser.decompactIds = function(model) {
            for (var i=0; i<model.graphs.length; i++) {
                idGenerator.updateMax(model.graphs[i].id);
            }
            for (var i=0; i<model.queries.length; i++) {
                idGenerator.updateMax(model.queries[i].id);
            }
        }
        serialiser.removeDefaults = function(intermediateModel, rawProtoObject) {
            if (intermediateModel == null) {
                console.log("intermediateModel for type "+rawProtoObject.name+" is null, skipping..")
                return;
            }
            if (Array.isArray(intermediateModel)) {
                for (var i=0; i<intermediateModel.length; i++) {
                    serialiser.removeDefaults(intermediateModel[i], rawProtoObject);
                }
                return;
            }
           console.log("Removing defaults from type: "+rawProtoObject.name)
            for (var fieldName in rawProtoObject.fields) {
                var field = rawProtoObject.fields[fieldName];
                if (intermediateModel.hasOwnProperty(fieldName)) {
                   console.log(" Both model and proto have field: "+fieldName+" which has type: "+field.type);
                    if (field.options != null && field.options.default != null) {
//                        console.log(" And has a default supplied!")
                        switch (field.type) {
                            case 'int32':
                            case 'int64':
                            case 'string':
                                if (intermediateModel[fieldName] == field.options.default) {
//                                    console.log("  Removed default value of "+field.options.default+" on field "+fieldName);
                                    intermediateModel[fieldName] = null;
                                }
                                continue;
                            case 'TimePeriod':
                                if (fromTimePeriod(intermediateModel, fieldName, field.options.default) == field.options.default) {
//                                    console.log("  Removed default value of "+field.options.default+" on field "+fieldName);
                                    intermediateModel[fieldName] = null;
                                }
                                continue;
                        }
                        if (rawIntermediateModelByType.hasOwnProperty(field.type)) {
                            serialiser.removeDefaults(intermediateModel[fieldName], rawIntermediateModelByType[field.type]);
                        }
                    }
                    else {
                        if (rawIntermediateModelByType.hasOwnProperty(field.type)) {
                            serialiser.removeDefaults(intermediateModel[fieldName], rawIntermediateModelByType[field.type]);
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
            for (var fieldName in rawProtoObject.fields) {
                var field = rawProtoObject.fields[fieldName];
//                    console.log(" Both model and proto have field: "+fieldName+" which has type: "+field.type);
                if (intermediateModel.hasOwnProperty(fieldName) && intermediateModel[fieldName] != null) {
                    if (rawIntermediateModelByType.hasOwnProperty(field.type)) {
//                        console.log("  Inserted default value of "+field.options.default+" on field "+fieldName);
                        serialiser.fillInDefaults(intermediateModel[fieldName], rawIntermediateModelByType[field.type]);
                    }
                }
                else if (field.options != null && field.options.default != null) {
//                        console.log(" And has a default supplied!")
                    switch (field.type) {
                        case 'int32':
                        case 'int64':
                        case 'string':
                            intermediateModel[fieldName] = field.options.default;
                            continue;
                        case 'TimePeriod':
                            intermediateModel[fieldName] = toTimePeriod(field.options.default);
                            continue;
                    }
                    if (rawIntermediateModelByType.hasOwnProperty(field.type)) {
//                        console.log("  Inserted default value of "+field.options.default+" on field "+fieldName);
                        serialiser.fillInDefaults(intermediateModel[fieldName], rawIntermediateModelByType[field.type]);
                    }
                }
            }
        }
        
        // we only support being able to deserialse one previous version (ie 1.6.0 should be able to deserialise a 1.5.0 model)
        // but to test we also need to be able to generate it. we wrap old style serialisation in a check forPreviousVersion
        // and then discard that code when we start coding the next version
        serialiser.generateIntermediateModel = function(m, forPreviousVersion) {
            // take copy of model
            var model = deepUtils.deepClone(m);

            serialiser.compactIds(model);
            
            var intermediateModel = {
                version: forPreviousVersion ? MODEL_VERSION_LEGACY : MODEL_VERSION_CURRENT,
                global: {},
                graphs: [],
                metrics: []
            };
            if (!forPreviousVersion) {
                intermediateModel.queries = [];
            }

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
                intermediateModel.global.fromDateTime = toSingleDateAsLong(model.global.fromDate, model.global.fromTime);
                if (!model.global.autoReload) {
                    intermediateModel.global.toDateTime = toSingleDateAsLong(model.global.toDate, model.global.toTime);
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
                        intermediateModel.global.baselineFromDateTime = toSingleDateAsLong(model.global.baselineFromDate, model.global.baselineFromTime);
                        break;
                    case "to":
                        intermediateModel.global.baselineToDateTime = toSingleDateAsLong(model.global.baselineToDate, model.global.baselineToTime);
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
                            intermediateGraph.horizon = {};
                            if (graph.horizon.sortMethod != null && graph.horizon.sortMethod != "") {
                                intermediateGraph.horizon.sortMethod = horizonSortMethods.valueToId(graph.horizon.sortMethod);
                            }
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
                            intermediateGraph.scatter = {
                                xAxisRange: graph.scatter.xRange,
                                yAxisRange: graph.scatter.yRange
                            };
                            intermediateGraph.flags = blitting.toBlittedInt([
                                graph.scatter.xSquashNegative || graph.scatter.ySquashNegative,
                                graph.scatter.swapAxes,
                                graph.scatter.xlog,
                                graph.scatter.ylog,
                                graph.scatter.xSquashNegative,
                                graph.scatter.ySquashNegative
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
                                style: heatmapStyles.valueToId(graph.heatmap.style),
                                colourScheme: heatmapColourSchemes.valueToId(graph.heatmap.colourScheme)
                            };
                            if (graph.heatmap.filterLowerBound != null && graph.heatmap.filterLowerBound != "") {
                                intermediateGraph.heatmap.valueFilterLowerBound = toInt(graph.heatmap.filterLowerBound);
                            }
                            if (graph.heatmap.filterUpperBound != null && graph.heatmap.filterUpperBound != "") {
                                intermediateGraph.heatmap.valueFilterUpperBound = toInt(graph.heatmap.filterUpperBound);
                            }
                            
                        }
                        break;
                }
                intermediateModel.graphs.push(intermediateGraph);
            }
            
            var serialiseMetric = function(metric) {
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
                    var graphFlag1 = false;
                    var graphFlag2 = false;
                    if (forPreviousVersion) {
                        var graph = graphForMetric(model.graphs, metric);
                        if (graph && graph.type == "dygraph" && metric.graphOptions.dygraph) {
                            graphFlag1 = metric.graphOptions.dygraph.drawLines;
                            graphFlag2 = metric.graphOptions.dygraph.drawPoints;
                        }
                    }

                    intermediateMetric.flags = blitting.toBlittedInt([
                        metric.graphOptions.rate,
                        metric.graphOptions.rateCounter,
                        metric.graphOptions.downsample,
                        // these could in theory be re-used in later versions
                        graphFlag1,
                        graphFlag2
                    ]);
                    if (metric.graphOptions.rate && metric.graphOptions.rateCounter) {
                        intermediateMetric.rateCounterReset = toInt(metric.graphOptions.rateCounterReset);
                        intermediateMetric.rateCounterMax = toInt(metric.graphOptions.rateCounterMax);
                    }
                    intermediateMetric.aggregator = aggregationFunctions.valueToId(metric.graphOptions.aggregator);
                    if (metric.graphOptions.downsample || model.global.globalDownsampling) {
                        intermediateMetric.downsampleBy = aggregationFunctions.valueToId(metric.graphOptions.downsampleBy);
                        intermediateMetric.downsampleTo = toTimePeriod(metric.graphOptions.downsampleTo);
                    }
                    if (forPreviousVersion) {
                        if (metric.graphOptions.graphId == null) {
                            metric.graphOptions.graphId = "0";
                        }
                        intermediateMetric.graphId = toInt(metric.graphOptions.graphId);
                        intermediateMetric.axis = axes.valueToId(metric.graphOptions.axis);
                    }
                }
                return intermediateMetric;
            }

            for (var i=0; i<model.queries.length; i++) {
                var query = model.queries[i];


                var intermediateQuery = {
                    id: toInt(query.id)
                };
                
                var queryType = forPreviousVersion ? "metric" : query.type;
                
                switch (queryType) {
                    case "metric":
                        var intermediateMetric = serialiseMetric(query);
                        intermediateModel.metrics.push(intermediateMetric);
                        if (!forPreviousVersion) {
                            intermediateQuery.metric = intermediateMetric.id;
                        }
                        break;
                    case "gexp":
                        intermediateQuery.gexp = {
                            name: query.name,
                            function: query.function,
                            subQueries: query.subQueries.map(function(id){return parseInt(id);}),
                            argument: query.extraArg
                        }
                        break;
                    case "exp":
                        console.log("Unsupported query type: exp");
                        // todo:
                        break;
                    default:
                        throw "Unrecognised query type: "+queryType;
                        
                }

                
                if (!forPreviousVersion) {
                    if (query.graphOptions.graphId == null) {
                        query.graphOptions.graphId = "0";
                    }
                    // todo: no graph = no graph association = no query, just a metric definition?
                    var graphId = toInt(query.graphOptions.graphId);
                    intermediateQuery.graphId = graphId;
                    intermediateQuery.axis = axes.valueToId(query.graphOptions.axis);
                    var graphFlag1 = false;
                    var graphFlag2 = false;
                    var graph = graphForMetric(model.graphs, query);
                    if (graph && graph.type == "dygraph" && query.graphOptions.dygraph) {
                        graphFlag1 = query.graphOptions.dygraph.drawLines;
                        graphFlag2 = query.graphOptions.dygraph.drawPoints;
                    }
                    intermediateQuery.renderFlags = blitting.toBlittedInt([
                        graphFlag1,
                        graphFlag2
                    ]);
                    
                    
                    intermediateModel.queries.push(intermediateQuery);
                }
            }

            serialiser.removeDefaults(intermediateModel, rawIntermediateModelByType["IntermediateModel"]);
            // serialise all the strings into optimal form
            strings.compactStringsForWrite(intermediateModel, serialiser.stringPaths);

            return intermediateModel;
        };
        serialiser.readIntermediateModel = function(intermediateModel) {
//            console.log("String mode = "+intermediateModel.aaStringSerialisedForm.mode);
            
            
            strings.getReadManager(intermediateModel.aaStringSerialisedForm).unpackStrings(intermediateModel, serialiser.stringPaths);
            intermediateModel.aaStringSerialisedForm = null;
            
            serialiser.fillInDefaults(intermediateModel, rawIntermediateModelByType["IntermediateModel"]);
            
            var version = intermediateModel.version;
            
            var model = {
                global: {},
                graphs: [],
                queries: []
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
                model.global.relativePeriod = fromTimePeriod(intermediateModel.global, "relativePeriod", "2h");
            }
            if (model.global.autoReload) {
                model.global.autoReloadPeriod = fieldValueOrNull(intermediateModel.global, "autoReloadPeriod");
            }
            if (model.global.autoGraphHeight) {
                model.global.minGraphHeight =  fieldValueOrNull(intermediateModel.global, "minGraphHeight");
            }
            else {
                model.global.graphHeight = fieldValueOrNull(intermediateModel.global, "graphHeight");
            }
            if (model.global.globalDownsampling) {
                model.global.globalDownsampleTo = fromTimePeriod(intermediateModel.global, "globalDownsampleTo", "5m");
            }
            if (model.global.baselining) {
                
                model.global.baselineDatumStyle = datumStyles.idToValue(intermediateModel.global.baselineDatumStyle);
                switch (model.global.baselineDatumStyle) {
                    case "relative":
                        model.global.baselineRelativePeriod = fromTimePeriod(intermediateModel.global, "baselineRelativePeriod");
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
                        graph.gnuplot.y1AxisLabel = fieldValueOrNull(intermediateGraph.gnuplot, "yAxisLabel");
                        graph.gnuplot.y2AxisLabel = fieldValueOrNull(intermediateGraph.gnuplot, "y2AxisLabel");
                        graph.gnuplot.y1AxisFormat = fieldValueOrNull(intermediateGraph.gnuplot, "yAxisFormat");
                        graph.gnuplot.y2AxisFormat = fieldValueOrNull(intermediateGraph.gnuplot, "y2AxisFormat");
                        graph.gnuplot.y1AxisRange = fieldValueOrNull(intermediateGraph.gnuplot, "yAxisRange");
                        graph.gnuplot.y2AxisRange = fieldValueOrNull(intermediateGraph.gnuplot, "y2AxisRange");
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
                        // added in 1.5.0
                        if (intermediateGraph.horizon != null) {
                            graph.horizon.sortMethod = horizonSortMethods.idToValue(intermediateGraph.horizon.sortMethod);
                        }
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
                        graph.dygraph.y1AxisRange = fieldValueOrNull(intermediateGraph.dygraph, "yAxisRange");
                        graph.dygraph.y2AxisRange = fieldValueOrNull(intermediateGraph.dygraph, "y2AxisRange");
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
                        var scatterFlags = blitting.fromBlittedInt(intermediateGraph.flags, [false, false, false, false]);
                        graph.scatter = {};
                        var excludeNegative = scatterFlags[0];
                        graph.scatter.swapAxes = scatterFlags[1];
                        graph.scatter.xlog = scatterFlags[2];
                        graph.scatter.ylog = scatterFlags[3];
                        scatterFlags = blitting.fromBlittedInt(intermediateGraph.flags, [false, false, false, false, excludeNegative, excludeNegative]);
                        // these 2 have been split out seperately from the old single excludeNegativeFlag
                        graph.scatter.xSquashNegative = scatterFlags[4];
                        graph.scatter.ySquashNegative = scatterFlags[5];
                        if (intermediateGraph.scatter != null) {
                            graph.scatter.xRange = fieldValueOrNull(intermediateGraph.scatter, "xAxisRange");
                            graph.scatter.yRange = fieldValueOrNull(intermediateGraph.scatter, "yAxisRange");
                        }
                        break;
                    case "heatmap":
                        var heatmapFlags = blitting.fromBlittedInt(intermediateGraph.flags, [false,false]);
                        graph.heatmap = {};
                        graph.heatmap.excludeNegative = heatmapFlags[0];
                        graph.heatmap.ylog = heatmapFlags[1];
                        if (intermediateGraph.heatmap != null) {
                            graph.heatmap.style = heatmapStyles.idToValue(intermediateGraph.heatmap.style);
                            graph.heatmap.colourScheme = heatmapColourSchemes.idToValue(intermediateGraph.heatmap.colourScheme);
                            if (intermediateGraph.heatmap.valueFilterLowerBound != null) {
                                graph.heatmap.filterLowerBound = intermediateGraph.heatmap.valueFilterLowerBound + "";
                            }
                            if (intermediateGraph.heatmap.valueFilterUpperBound != null) {
                                graph.heatmap.filterUpperBound = intermediateGraph.heatmap.valueFilterUpperBound + "";
                            }
                        }
                        break;
                }
                
                model.graphs.push(graph);   
            }

            var metricsById = {};
            for (var i=0; i<intermediateModel.metrics.length; i++) {
                var intermediateMetric = intermediateModel.metrics[i];

                var metric = {
                    id: toInt(intermediateMetric.id),
                    name: intermediateMetric.name,
                    tags: [],
                    graphOptions: {}
                };
                
                if (version == MODEL_VERSION_LEGACY) {
                    metric.type = "metric";
                    metric.graphOptions.graphId = intermediateMetric.graphId;
                }

                for (var t=0; t<intermediateMetric.tags.length; t++) {
                    var iTag = intermediateMetric.tags[t];
                    var tagFlags = blitting.fromBlittedInt(iTag.flags, [true]);
                    metric.tags.push({
                        name: iTag.name,
                        value: iTag.value,
                        groupBy: tagFlags[0]
                    });
                }


                // only persisted in legacy model serialisation
                var graphFlag1Default = false;
                var graphFlag2Default = false;
                if (version == MODEL_VERSION_LEGACY) {
                    var graph = graphForMetric(model.graphs, metric);
                    if (graph && graph.type == "dygraph") {
                        graphFlag1Default = true;  //metric.graphOptions.dygraph.drawLines;
                        graphFlag2Default = false; //metric.graphOptions.dygraph.drawPoints;
                    }
                }
                var metricFlags = blitting.fromBlittedInt(intermediateMetric.flags, [false,false,false,graphFlag1Default,graphFlag2Default]);
                metric.graphOptions.rate = metricFlags[0];
                metric.graphOptions.rateCounter = metricFlags[1];
                metric.graphOptions.downsample = metricFlags[2];
                // flags 3&4 available for use with non-legacy versions
                if (version == MODEL_VERSION_LEGACY) {
                    if (graph && graph.type == "dygraph") {
                        metric.graphOptions.dygraph = {
                            drawLines: metricFlags[3],
                            drawPoints: metricFlags[4]
                        }
                    }
                }

                if (metric.graphOptions.rate && metric.graphOptions.rateCounter) {
                    metric.graphOptions.rateCounterReset = intermediateMetric.rateCounterReset.toNumber();
                    metric.graphOptions.rateCounterMax = intermediateMetric.rateCounterMax.toNumber();
                }
                else {
                    metric.graphOptions.rateCounterReset = "";
                    metric.graphOptions.rateCounterMax = "";
                }
                metric.graphOptions.aggregator = aggregationFunctions.idToValue(intermediateMetric.aggregator);
                if (metric.graphOptions.downsample || model.global.globalDownsampling) {
                    metric.graphOptions.downsampleBy = aggregationFunctions.idToValue(intermediateMetric.downsampleBy);
                    if (metric.graphOptions.downsample) {
                        metric.graphOptions.downsampleTo = fromTimePeriod(intermediateMetric, "downsampleTo", "");
                    }
                }
                else {
                    metric.graphOptions.downsampleBy = "";
                    metric.graphOptions.downsampleTo = "";
                }
                if (version == MODEL_VERSION_LEGACY) {
                    metric.graphOptions.axis = axes.idToValue(intermediateMetric.axis);
                }

                if (version == MODEL_VERSION_LEGACY) {
                    model.queries.push(metric);
                }
                else {
                    metricsById[metric.id] = metric;
                }
            }

            if (version > MODEL_VERSION_LEGACY) {
                for (var i=0; i<intermediateModel.queries.length; i++) {
                    var intermediateQuery = intermediateModel.queries[i];
                    
                    var query;
                    var validQueryType = false;
                    if (intermediateQuery.gexp != null) {
                        validQueryType = true;
                        
                        query = {
                            id: intermediateQuery.id,
                            type: "gexp",
                            name: intermediateQuery.gexp.name,
                            function: intermediateQuery.gexp.function,
                            subQueries: intermediateQuery.gexp.subQueries.map(function (id) {return id.toString();}),
                            extraArg: intermediateQuery.gexp.argument,
                            graphOptions: {}
                        };
                    }
                    else if (intermediateQuery.exp != null) {
                        console.log("Unsupported query type: exp");
                        // todo: exp
                        //validQueryType = true;
                    }
                    else if (intermediateQuery.metric != null) {
                        var metricId = intermediateQuery.metric;
                        
                        var metric = metricsById[metricId];
                        if (metric != null) {
                            validQueryType = true;
                            query = deepUtils.deepClone(metric);
                            query.type = "metric";
                        }
                    }
                    
                    if (!validQueryType) {
                        console.log("Unrecognized query type, ignoring");
                    }
                    
                    if (validQueryType) {
                        query.graphOptions.graphId = intermediateQuery.graphId;
                        query.graphOptions.axis = axes.idToValue(intermediateQuery.axis);

                        var graphFlag1Default = false;
                        var graphFlag2Default = false;
                        var graph = graphForMetric(model.graphs, query);
                        if (graph && graph.type == "dygraph") {
                            graphFlag1Default = true;  //metric.graphOptions.dygraph.drawLines;
                            graphFlag2Default = false; //metric.graphOptions.dygraph.drawPoints;
                        }
                        var renderFlags = blitting.fromBlittedInt(intermediateQuery.renderFlags, [graphFlag1Default,graphFlag2Default]);
                        if (graph && graph.type == "dygraph") {
                            query.graphOptions.dygraph = {
                                drawLines: renderFlags[0],
                                drawPoints: renderFlags[1]
                            }
                        }
                        model.queries.push(query);
                    }
                }
            }
            
            return model;
        }
        serialiser.serialise = function(model, forPreviousVersion) {
//            var origLen = JSON.stringify(model).length;
            var intermediate = serialiser.generateIntermediateModel(model, forPreviousVersion);

            var proto = serialiser.IntermediateModel.create(intermediate);
            var buffer = serialiser.IntermediateModel.encode(proto).finish();
            
            var encoded = serialiser.encode(buffer).replaceAll("+","-").replaceAll("/","_").replaceAll("=",",");

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
        serialiser.deserialise = function(ser) {
            var b64str = ser.replaceAll(",","=").replaceAll("_","/").replaceAll("-","+");
            // first char is an indicator into serialisation mode - 0 = version 0
            b64str = b64str.substring(1); 
            var buffer = serialiser.decode(b64str);
            var intermediateModel = serialiser.IntermediateModel.decode(buffer);
            var model = serialiser.readIntermediateModel(intermediateModel);
            // so generator knows where to continue
            serialiser.decompactIds(model);
            return model;
        }
        return serialiser;
    }]);