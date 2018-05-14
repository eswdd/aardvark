aardvark
    .factory('tsdbUtils', ['tsdbClient', 'deepUtils', function(tsdbClient, deepUtils) {
        var utils = {};
        
        utils.gexpFunctions = {
            absolute: {
                description: 'Emits the results as absolute values, converting negative values to positive.',
                maxSubQueries: 1
            },
            diffSeries: {
                description: 'Returns the difference of all series in the list. Performs a UNION across tags in each metric result sets, defaulting to a fill value of zero.',
                maxSubQueries: 26
            },
            divideSeries: {
                description: 'Returns the quotient of all series in the list. Performs a UNION across tags in each metric result sets, defaulting to a fill value of zero.',
                maxSubQueries: 26
            },
            highestCurrent: {
                description: 'Sorts all resulting time series by their most recent value and emits numSeries number of series with the highest values. numSeries must be a positive integer value.',
                maxSubQueries: 1,
                extraArg: 'numSeries'
            },
            highestMax: {
                description: 'Sorts all resulting time series by the maximum value for the time span and emits numSeries number of series with the highest values. numSeries must be a positive integer value.',
                maxSubQueries: 1,
                extraArg: 'numSeries'
            },
            movingAverage: {
                description: "Emits a sliding window moving average for each data point and series in the metric. The window parameter may either be a positive integer that reflects the number of data points to maintain in the window (non-timed) or a time span specified by an integer followed by time unit such as '60s' or '60m' or '24h'.",
                maxSubQueries: 1,
                extraArg: 'window'
            },
            multiplySeries: {
                description: 'Returns the product of all series in the list. Performs a UNION across tags in each metric result sets, defaulting to a fill value of zero.',
                maxSubQueries: 26
            },
            scale: {
                description: 'Multiplies each series by the factor where the factor can be a positive or negative floating point or integer value.',
                maxSubQueries: 1,
                extraArg: 'factor'
            },
            sumSeries: {
                description: 'Returns the sum of all series in the list. Performs a UNION across tags in each metric result sets, defaulting to a fill value of zero.',
                maxSubQueries: 26
            }
        };

        // helper functions for dealing with tsdb data
        utils.tsdb_rateString = function(metricOptions) {
            var ret = "rate";
            if (metricOptions.rateCounter) {
                ret += "{counter";
                var rctrSep = ",";
                if (metricOptions.rateCounterMax != null && metricOptions.rateCounterMax != "") {
                    ret += "," + metricOptions.rateCounterMax;
                }
                else {
                    rctrSep = ",,";
                }
                if (metricOptions.rateCounterReset != null && metricOptions.rateCounterReset != "") {
                    ret += rctrSep + metricOptions.rateCounterReset;
                }
                ret += "}";
            }
            return ret;
        }

        utils.metricQuery = function(metric, globalDownsampling, globalDownsampleTo, downsampleOverrideFn, warningFn) {
            var options = metric.graphOptions;
            var ret = options.aggregator + ":";
            if (downsampleOverrideFn) {
                ret += downsampleOverrideFn(options.downsampleBy) + ":";
            }
            else if (globalDownsampling) {
                ret += globalDownsampleTo + "-" + options.downsampleBy + ":";
            }
            else if (options.downsample) {
                ret += options.downsampleTo + "-" + options.downsampleBy + ":";
            }
            if (options.rate) {
                ret += utils.tsdb_rateString(options) + ":";
            }
            else if (options.rateCounter) {
                warningFn("You have specified a rate counter without a rate, ignoring");
            }
            ret += metric.name;
            var sep = "{";
            for (var t=0; t<metric.tags.length; t++) {
                var tag = metric.tags[t];
                if (tag.value != "" && (tag.groupBy == null || tag.groupBy)) {
                    ret += sep + tag.name + "=" + tag.value;
                    sep = ",";
                }
            }
            if (sep == ",") {
                ret += "}";
            }
            // tsdb 2.2+ supports filters
            if (tsdbClient.versionNumber >= tsdbClient.TSDB_2_2) {
                // filters section requires the group by section to have been written out, even if empty
                if (sep == ",") {
                    sep = "{";
                }
                else {
                    sep = "{}{";
                }
                for (var t=0; t<metric.tags.length; t++) {
                    var tag = metric.tags[t];
                    if (tag.value != "" && tag.value != "*" && tag.value != "wildcard(*)" && tag.groupBy != null && !tag.groupBy) {
                        ret += sep + tag.name + "=" + tag.value;
                        sep = ",";
                    }
                }
                if (sep == ",") {
                    ret += "}";
                }
            }
            return ret;
        };
        
        utils.gexpQuery = function(gexpQuery, subQueriesById, globalDownsampling, globalDownsampleTo, downsampleOverrideFn, warningFn) {
            if (gexpQuery.function == null) {
                return "";
            }
            var ret = gexpQuery.function + "(";
            var functionDefinition = utils.gexpFunctions[gexpQuery.function];
            var sep = "";
            for (var m=0; m<gexpQuery.subQueries.length && m<functionDefinition.maxSubQueries; m++) {
                var subQuery = subQueriesById[gexpQuery.subQueries[m]];
                if (subQuery != null) {
                    if (subQuery.type == "metric") {
                        ret += sep + utils.metricQuery(subQuery, globalDownsampling, globalDownsampleTo, downsampleOverrideFn, warningFn);
                    }
                    if (subQuery.type == "gexp") {
                        var newSubQueries = deepUtils.deepClone(subQueriesById);
                        if (newSubQueries.hasOwnProperty(gexpQuery.id)) {
                            delete newSubQueries[gexpQuery.id];
                        }
                        ret += sep + utils.gexpQuery(subQuery, subQueriesById, globalDownsampling, globalDownsampleTo, downsampleOverrideFn, warningFn);
                    }
                }
                sep = ", ";
            }
            if (functionDefinition.extraArg) {
                ret += sep;
                // if has a char then need to quote
                if (isNaN(Number.valueOf(gexpQuery.extraArg))) {
                    ret += "'" + gexpQuery.extraArg + "'";
                }
                else {
                    ret += gexpQuery.extraArg;
                }
            }
            ret += ")";
            return ret;
        }
        
        utils.getTags = function(metric, successFn, errorFn) {
            var resultsFn = function(tsdbResponse) {
                var tagValues = {};
                var results = tsdbResponse.results;
                for (var i=0; i<results.length; i++) {
                    var ts = results[i];
                    for (var tagk in ts.tags) {
                        if (ts.tags.hasOwnProperty(tagk)) {
                            if (!(tagk in tagValues)) {
                                tagValues[tagk] = [];
                            }
                            if (tagValues[tagk].indexOf(ts.tags[tagk]) < 0) {
                                tagValues[tagk].push(ts.tags[tagk]);
                            }
                        }
                    }
                }
                successFn(tagValues);
            }
            tsdbClient.searchLookup({name: metric, tags: []},false, null, 
                function (data) { resultsFn(data); }, 
                errorFn);
            
        };
        utils.tsuidToMetricAndTags = function(tsuid, successFn, errorFn) {
//            tsdbClient.getTSMetaByTsuid
//            tsdbClient.getUidMeta
            // first we need to know if tsmeta is enabled by reading config
            // if not we need to make individual requests for the uid data
            tsdbClient.getConfig(function (config) {
                var useTsMeta = config && (config["tsd.core.meta.enable_realtime_ts"] == "true");
                if (useTsMeta) {
                    tsdbClient.getTSMetaByTsuid(tsuid, function(data) {
                        successFn({metric: data.metric, tags: data.tags});
                    }, errorFn);
                }
                else {
                    var getUidWidth = function(type) {
                        return config && config["tsd.storage.uid.width."+type] != null ?
                            config["tsd.storage.uid.width."+type] : 3;
                    }
                    // width in bytes, we want hex chars
                    var metricUidWidth = getUidWidth("metric") * 2;
                    var tagkUidWidth = getUidWidth("tagk") * 2;
                    var tagvUidWidth = getUidWidth("tagv") * 2;
                    if ((tsuid.length - metricUidWidth) % (tagkUidWidth + tagvUidWidth) != 0) {
                        errorFn("Invalid tsuid: Doesn't match uid widths from OpenTSDB config");
                    }
                    var uidRequests = [];
                    var uidResponses = {};
                    var uidResponsesReceived = 0;
                    var uidErrorResponses = [];
                    var metricUid = tsuid.substring(0, metricUidWidth);
                    uidRequests.push({type:"metric", uid: metricUid});
                    var keyCounter = 1;
                    for (var i=metricUidWidth; i<tsuid.length; i+=(tagkUidWidth+tagvUidWidth)) {
                        var tagkUid = tsuid.substring(i, i+tagkUidWidth);
                        var tagvUid = tsuid.substring(i+tagkUidWidth,i+tagkUidWidth+tagvUidWidth);
                        uidRequests.push({type:"tagk", key:keyCounter, uid: tagkUid});
                        uidRequests.push({type:"tagv", key:keyCounter, uid: tagvUid});
                        keyCounter++;
                    }
                    
                    var mergeResponses = function() {
                        if (uidErrorResponses.length != 0) {
                            errorFn(uidErrorResponses.join("\n"));
                            return;
                        }
                        
                        var metricResponse = uidResponses.metric;
                        var tags = {};
                        for (var k=1; k<keyCounter; k++) {
                            var tagkResponse = uidResponses["tagk_"+k];
                            var tagvResponse = uidResponses["tagv_"+k];
                            tags[tagkResponse.name] = tagvResponse.name;
                        }
                        
                        // now we have to reconstitute things
                        successFn({metric: metricResponse.name, tags: tags});
                    }
                    
                    for (var i=0; i<uidRequests.length; i++) {
                        // nasty inner function to get around closure issues
                        var fn = function(request) {
                            tsdbClient.getUidMeta(request.uid, request.type, function(data) {
                                var responseKey = request.type;
                                if (request.key) {
                                    responseKey += "_" + request.key;
                                }
                                uidResponses[responseKey] = data;
                                uidResponsesReceived++;
                                if (uidResponsesReceived == uidRequests.length) {
                                    mergeResponses();
                                }
                            }, function(error) {
                                if (error.message) {
                                    uidErrorResponses.push(JSON.stringify(error.message));
                                }
                                else {
                                    uidErrorResponses.push(JSON.stringify(error));
                                }
                                uidResponsesReceived++;
                                if (uidResponsesReceived == uidRequests.length) {
                                    mergeResponses();
                                }
                            });
                        }
                        fn(uidRequests[i]);
                    }
                }
            }, errorFn);
        };
        return utils;
    }]);
    