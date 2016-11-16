aardvark
    .factory('tsdbUtils', ['tsdbClient', function(tsdbClient) {
        var utils = {};
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
            tsdbClient.searchLookup({metric: metric, limit: 100000}, // todo: looks like a silly limit 
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
        }
        return utils;
    }]);
    