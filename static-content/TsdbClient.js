aardvark
    // Standard interface for calling tsdb
    .factory('tsdbClient', [ '$http', function($http) {
        var tsdb = {};
        // 1000*major + minor
        tsdb.TSDB_2_0 = 2000;
        tsdb.TSDB_2_1 = 2001;
        tsdb.TSDB_2_2 = 2002;
        tsdb.TSDB_2_3 = 2003;
        // default
        tsdb.versionNumber = tsdb.TSDB_2_0;
        tsdb.versionInfo = null;
        tsdb.config = null;
        tsdb.init = function(rootConfig) {
            tsdb.tsdbBaseReadUrl = rootConfig.tsdbBaseReadUrl;
            tsdb.tsdbBaseWriteUrl = rootConfig.tsdbBaseWriteUrl;
            tsdb.authenticatedReads = rootConfig.authenticatedReads;
            tsdb.authenticatedWrites = rootConfig.authenticatedWrites;
            tsdb.allowBulkAnnotationsCall = rootConfig.allowBulkAnnotationsCall;
            // ignore outputs in both cases, ensures we cache the responses 
            tsdb.getConfig(null, null, true);
            tsdb.getVersion(null, null, true);
        }
        tsdb.getConfig = function(successFn, errorFn, force) {
            if (tsdb.config != null && !force) {
                successFn(tsdb.config);
                return;
            }

            $http.get(tsdb.tsdbBaseReadUrl+'/api/config', {withCredentials:tsdb.authenticatedReads}).success(function(json) {
                tsdb.config = json;
                if (successFn) {
                    successFn(json);
                }
            }).error(errorFn ? errorFn : function() {});
        };
        tsdb.searchLookup = function(metric, tagsCanBeFilters, limit, successFn, errorFn) {
            var doSearchLookup = function(useMeta) { 
                var url = tsdb.tsdbBaseReadUrl+"/api/search/lookup";
                var requestJson = {"metric": metric.name, "limit": limit, "useMeta": useMeta};
                if (!tagsCanBeFilters) {
                    requestJson.tags = [];
                    for (var t=0; t<metric.tags.length; t++) {
                        requestJson.tags.push({key: metric.tags[t].name, value: metric.tags[t].value});
                    }
                }
                var postFilteringRequired = false;
                var tagsRequiringPostFiltering = {};
                var tagsAsFilters = [];
                if (tagsCanBeFilters) {
                    var tags = {};
                    for (var t=0; t<metric.tags.length; t++) {
                        var filter = metric.tags[t];
                        var type = "literal_or";
                        var value = filter.value;
                        if (value.indexOf("(") > 0) {
                            var openBrace = value.indexOf("(");
                            type = value.substring(0, openBrace);
                            value = value.substring(openBrace+1, value.indexOf(")", openBrace));
                        }
                        tagsAsFilters.push({name:filter.name, value:value, type:type});
                        if (type == "literal_or") {
                            if (tags[filter.name] == null) {
                                tags[filter.name] = value;
                            }
                            else if (tagsRequiringPostFiltering[filter.name] == null) {
                                // filters ANDed together
                                // first if it was a * then this filter wins
                                if (tags[filter.name] == "*") {
                                    tags[filter.name] = value;
                                }
                                // otherwise we need to only include the elements in boths lists
                                else {
                                    var list1 = tags[filter.name].split("|");
                                    var list2 = value.split("|");
                                    var sep = "";
                                    var result = "";
                                    for (var l1=0; l1<list1.length; l1++) {
                                        var inList2 = false;
                                        for (var l2=0; l2<list2.length; l2++) {
                                            if (list1[l1] == list2[l2]) {
                                                inList2 = true;
                                                break;
                                            }
                                        }
                                        if (inList2) {
                                            result += sep + list1[l1];
                                            sep = "|";
                                        }
                                    }
                                    tags[filter.name] = result;
                                }
                            }
                        }
                        else if (type == "wildcard" && value == "*") {
                            if (tags[filter.name] == null) {
                                tags[filter.name] = value;
                            }
                        }
                        else {
                            tags[filter.name] = "*";
                            tagsRequiringPostFiltering[filter.name] = true;
                            postFilteringRequired = true;
                        }
                    }
                    requestJson.tags = [];
                    for (var tagk in tags) {
                        requestJson.tags.push({key: tagk, value: tags[tagk]});
                    }
                }
                
                if (requestJson.tags.length == 0) {
                    delete requestJson["tags"];
                }
                
                var filterResultsFn = function(data) {
                    var removedCount = 0;
                    for (var r=data.results.length-1; r>=0; r--) {
                        var ts = data.results[r];
                        var filteredOut = false;
                        for (var tagk in tagsRequiringPostFiltering) {
                            if (tagsRequiringPostFiltering.hasOwnProperty(tagk)) {
                                if (!ts.tags.hasOwnProperty(tagk)) {
                                    filteredOut = true;
                                    break;
                                }
                                else {
                                    for (var t=0; t<tagsAsFilters.length; t++) {
                                        var filter = tagsAsFilters[t];
                                        if (filter.name == tagk) {
                                            if (!tsdb.tagFilterMatchesValue({fn:filter.type, value:filter.value}, ts.tags[tagk])) {
                                                filteredOut = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (filteredOut) {
                            data.results.splice(r, 1);
                            removedCount++;
                        }
                    }
                    data.results.totalResults -= removedCount;
                    successFn(data);
                }
                 
                // search/lookup doesn't support filter queries: todo: raise this
                // so for now we have to request all and then filter in client. sigh.
                var postData = JSON.stringify(requestJson);
                $http.post(url, postData, {withCredentials:tsdb.authenticatedReads}).success(postFilteringRequired ? filterResultsFn : successFn)
                    .error(errorFn);
            }
            tsdb.getConfig(function(config) {
                var useMeta = config && (config["tsd.core.meta.enable_tsuid_tracking"] == "true"
                                      || config["tsd.core.meta.enable_tsuid_incrementing"] == "true"
                                      || config["tsd.core.meta.enable_realtime_ts"] == "true");
                doSearchLookup(useMeta);
            }, function() {
                // play it safe
                doSearchLookup(false);
            })
        };
        tsdb.tagFilterMatchesValue = function(filter, value) {
            var fn = null;
            var ignoreCase = false;
            var negate = false;
            if (filter.fn == "literal_or" || filter.fn == "iliteral_or"
                || filter.fn == "not_literal_or" || filter.fn == "not_iliteral_or") {
                ignoreCase = filter.fn.indexOf("iliteral") >= 0;
                negate = filter.fn.indexOf("not_") == 0;
                var toMatch = filter.value.split("|");
                if (ignoreCase) {
                    for (var m=0; m<toMatch.length; m++) {
                        toMatch[m] = toMatch[m].toLowerCase();
                    }
                }
                fn = function(candidateValue) {
                    var v = ignoreCase ? candidateValue.toLowerCase() : candidateValue;
                    return toMatch.indexOf(v) >= 0;
                };
            }
            if (filter.fn == "wildcard" || filter.fn == "iwildcard" || filter.fn == "regexp") {
                ignoreCase = filter.fn == "iwildcard";
                var regexp = filter.value;
                if (filter.fn.indexOf("wildcard") >= 0) {
                    regexp = regexp.replaceAll(".","\\\\.");
                    regexp = regexp.replaceAll("*",".*");
                    regexp = regexp.replaceAll("\\\\..*","\\\\.");
                }
                if (ignoreCase) {
                    regexp = regexp.toLowerCase();
                }
                fn = function(candidateValue) {
                    var v = ignoreCase ? candidateValue.toLowerCase() : candidateValue;
                    try {
                        return v.match(new RegExp(regexp)) != null;
                    }
                    catch (regexpError) {
                        // typical user error
                        if (regexp != "*") {
                            console.log("regexp("+regexp+") caused an error: "+regexpError);
                        }
                        return false;
                    }
                };
            }
            if (fn != null) {
                return fn(value);
            }
            return false;
        }
        // todo: raise tsdb issue to add a bulk call
        tsdb.searchLookupBulk = function(queries, perResultFn, successFn, errorFn) {
            var results = [];
            var expectedResponses = queries.length;
            var receivedResponses = 0;
            var errorsReceived = [];


            for (var i=0; i<queries.length; i++) {
                // nasty inner function to get around closure issues
                var fn = function(query) {
                    tsdb.searchLookup(query, function (data) {
                        receivedResponses++;
                        results.push(perResultFn(query,data));
                        if (receivedResponses == expectedResponses) {
                            if (errorsReceived.length == 0) {
                                successFn(results);
                            }
                            else {
                                errorFn(errorsReceived, results);
                            }

                        }
                    }, function (error) {
                        receivedResponses++;
                        errorsReceived.push({query:query,msg:error});
                        if (receivedResponses == expectedResponses) {
                            errorFn(errorsReceived, results);
                        }
                    });
                }
                fn(queries[i]);
            }

            if (queries.length == 0) {
                successFn([]);
            }
        };
        tsdb.saveAnnotation = function(annotation, successFn, errorFn) {
            var url = tsdb.tsdbBaseWriteUrl+"/api/annotation";
            var postData = JSON.stringify(annotation);
            $http.post(url, postData, {withCredentials:tsdb.authenticatedWrites}).success(successFn).error(errorFn);
        };
        tsdb.getTSMetaByTsuid = function(tsuid, successFn, errorFn) {
            var url = tsdb.tsdbBaseReadUrl+"/api/uid/tsmeta?tsuid="+tsuid;
            $http.get(url, {withCredentials:tsdb.authenticatedReads}).success(successFn).error(errorFn);
        };
        tsdb.getUidMeta = function(uid, type, successFn, errorFn) {
            switch (type) {
                case 'metric':
                case 'tagk':
                case 'tagv':
                    break;
                default:
                    errorFn("Unrecognised type: "+type);
                    return;
            }
            var url = tsdb.tsdbBaseReadUrl+"/api/uid/uidmeta?uid="+uid+"&type="+type;
            $http.get(url, {withCredentials:tsdb.authenticatedReads}).success(successFn).error(errorFn);
        };
        tsdb.deleteAnnotation = function(tsuid, successFn, errorFn) {
            var url = tsdb.tsdbBaseWriteUrl+"/api/annotation?tsuid="+tsuid;
            $http.delete(url, {withCredentials:tsdb.authenticatedWrites}).success(successFn).error(errorFn);
        };
        tsdb.bulkSaveAnnotations = function(annotations, successFn, errorFn) {
            var synthesisedBulkCall = function() {
                var expectedResponses = annotations.length;
                var receivedResponses = 0;
                var errorsReceived = [];

                for (var a=0; a<annotations.length; a++) {
                    // nasty inner function to get around closure issues
                    var fn = function(index) {
                        tsdb.saveAnnotation(annotations[index], function(data) {
                            annotations[index] = data;
                            receivedResponses++;
                            if (receivedResponses == expectedResponses) {
                                if (errorsReceived.length > 0) {
                                    errorFn(annotations, errorsReceived);
                                }
                                else {
                                    successFn(annotations);
                                }
                            }
                        }, function(error) {
                            receivedResponses++;
                            errorsReceived.push(error);
                            if (receivedResponses == expectedResponses) {
                                errorFn(annotations, errorsReceived);
                            }
                        })
                    }
                    fn(a);
                }
            }
            
            if (tsdb.allowBulkAnnotationsCall) {
                // make sure we have the version available
                tsdb.getVersion(function(versionInfo, versionNumber) {
                    if (versionNumber >= tsdb.TSDB_2_1) {
                        var url = tsdb.tsdbBaseWriteUrl+"/api/annotation/bulk";
                        var postData = JSON.stringify(annotations);
                        $http.post(url, postData, {withCredentials:tsdb.authenticatedWrites}).success(successFn).error(errorFn);
                    }
                    else {
                        synthesisedBulkCall();
                    }
                }, errorFn);
            }
            else {
                synthesisedBulkCall();
            }
        }
        tsdb.getVersion = function(successFn, failFn, force) {
            if (tsdb.versionInfo != null && !force) {
                successFn(tsdb.versionInfo, tsdb.versionNumber);
                return;
            }
            $http.get(tsdb.tsdbBaseReadUrl+'/api/version', {withCredentials:tsdb.authenticatedReads}).success(function(json) {
                try {
                    var versionFromServer = json.version;
                    var firstDot = versionFromServer.indexOf(".");
                    var secondDot = versionFromServer.indexOf(".", firstDot+1);
                    var major = parseInt(versionFromServer.substring(0,firstDot));
                    var minor = parseInt(versionFromServer.substring(firstDot+1, secondDot));
                    var version = (major * 1000) + minor;
                    tsdb.versionInfo = {major:major, minor:minor};
                    tsdb.versionNumber = version;
                    if (successFn) {
                        successFn(tsdb.versionInfo, tsdb.versionNumber);
                    }
                }
                catch (e) {
                    // ignore, use default version
                    if (failFn) {
                        failFn();
                    }
                }
            }).error(failFn ? failFn : function() {});
        };
        return tsdb;
    }]);