aardvark
    .factory('GraphServices', [ 'tsdbClient', 'tsdbUtils', '$http', function($tsdbClient, $tsdbUtils, $http) {

        var ret = {};

        ret.imageRenderCount = 0;
        ret.dygraphs = {};


        
        ret.parseDygraphAxisRange = function(renderContext,graph,axisRangeString) {
            var toReturn = [null, null];
            if (axisRangeString != null && axisRangeString != "") {
                var s = axisRangeString.replace("[","").replace("]","");
                var colon = s.indexOf(":");
                var error = false;
                if (colon >= 0) {
                    try {
                        var low = s.substring(0,colon);
                        if (low != "") {
                            toReturn[0] = parseInt(low);
                        }
                        var high = s.substring(colon+1);
                        if (high != "") {
                            toReturn[1] = parseInt(high);
                        }
                    }
                    catch (parseError) {
                        error = true;
                    }
                }
                else {
                    error = true;
                }
                if (error) {
                    renderContext.renderWarnings[graph.id] = "Y-axis value range invalid, defaulting to [:]";
                    toReturn = [null,null];
                }
            }
            return toReturn;
        }
        ret.dygraphAxisRangeToString = function(axisRange) {
            var string = "[";
            if (axisRange == null || axisRange.length == 0) {
                string += ":";
            }
            else {
                string += axisRange[0] == null ? "" : axisRange[0];
                string += ":";
                if (axisRange.length > 1) {
                    string += axisRange[1] == null ? "" : axisRange[1];
                }
            }
            string += "]";
            return string;
        }

        ret.formEncode = function(val) {
            var newVal = val.replace(" ","+");
            if (newVal != val) {
                return ret.formEncode(newVal);
            }
            return newVal;
        }

        ret.periodToDiff = function(period) {
            var numberComponent1 = period.match(/^[0-9]+/);
            var stringComponent1 = period.match(/[a-zA-Z]+$/);
            if (numberComponent1.length == 1 && stringComponent1.length == 1) {
                return moment.duration(parseInt(numberComponent1[0]), stringComponent1[0]);
            }
            else {
                return null;
            }
        }

        ret.baselineOffset = function(global, datum) {
            switch (global.baselineDatumStyle) {
                case "from":
                    var mainFromDateTime = ret.tsdb_fromTimestampAsMoment(global, datum);
                    var fromDate = moment.utc(global.baselineFromDate, "YYYY/MM/DD");
                    var fromTime = moment.utc(global.baselineFromTime, "HH:mm:ss");
                    var baselineFromDateTime = moment.utc(fromDate.format("YYYY/MM/DD") + " " + fromTime.format("HH:mm:ss"), "YYYY/MM/DD HH:mm:ss");
                    return moment.duration(mainFromDateTime.diff(baselineFromDateTime));
                case "to":
                    var mainToDateTime = ret.tsdb_toTimestampAsMoment(global, datum);
                    var toDate = moment.utc(global.baselineToDate, "YYYY/MM/DD");
                    var toTime = moment.utc(global.baselineToTime, "HH:mm:ss");
                    var baselineToDateTime = moment.utc(toDate.format("YYYY/MM/DD") + " " + toTime.format("HH:mm:ss"), "YYYY/MM/DD HH:mm:ss");
                    return moment.duration(mainToDateTime.diff(baselineToDateTime));
                case "relative":
                    return ret.periodToDiff(global.baselineRelativePeriod);
                default:
                    throw "Unrecognized baseline datum style: "+global.baselineDatumStyle;
            }
        }

        ret.tsdb_fromTimestampAsTsdbString = function(global) {
            if (global.absoluteTimeSpecification) {
                var date = moment.utc(global.fromDate, "YYYY/MM/DD");
                var time = moment.utc(global.fromTime, "HH:mm:ss");
                return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
            }
            else {
                if (global.relativePeriod == null || global.relativePeriod == "") {
                    return "";
                }
                return global.relativePeriod+"-ago";
            }
        }

        ret.tsdb_toTimestampAsTsdbString = function(global) {
            if (!global.absoluteTimeSpecification
                || global.toDate == null || global.toDate == ""
                || global.toTime == null || global.toTime == "") {
                return null;
            }
            else {
                var date = moment.utc(global.toDate, "YYYY/MM/DD");
                var time = moment.utc(global.toTime, "HH:mm:ss");
                return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
            }
        }

        ret.tsdb_fromTimestampAsMoment = function(global, datum) {
            var now = datum ? datum.clone() : moment.utc();
            if (global.absoluteTimeSpecification) {
                var date = moment.utc(global.fromDate, "YYYY/MM/DD");
                var time = moment.utc(global.fromTime, "HH:mm:ss");
                var dateTime = date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
                return moment.utc(dateTime, "YYYY/MM/DD HH:mm:ss");
            }
            else {
                if (global.relativePeriod == null || global.relativePeriod == "") {
                    return now;
                }
                var numberComponent = global.relativePeriod.match(/^[0-9]+/);
                var stringComponent = global.relativePeriod.match(/[a-zA-Z]+$/);
                if (numberComponent.length == 1 && stringComponent.length == 1) {
                    return now.subtract(numberComponent[0], stringComponent[0]);
                }
                return now;
            }
        }

        ret.tsdb_toTimestampAsMoment = function(global, datum) {
            var now = datum ? datum.clone() : moment.utc();
            if (!global.absoluteTimeSpecification
                || global.toDate == null || global.toDate == ""
                || global.toTime == null || global.toTime == "") {
                return now;
            }
            else {
                var date = moment.utc(global.toDate, "YYYY/MM/DD");
                var time = moment.utc(global.toTime, "HH:mm:ss");
                var dateTime = date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
                return moment.utc(dateTime, "YYYY/MM/DD HH:mm:ss");
            }
        }

        ret.tsdb_baselineFromTimestampAsTsdbString = function(global, datum) {
            switch (global.baselineDatumStyle) {
                case "from":
                    var date = moment.utc(global.baselineFromDate, "YYYY/MM/DD");
                    var time = moment.utc(global.baselineFromTime, "HH:mm:ss");
                    return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
                case "to":
                    var diff;
                    if (global.absoluteTimeSpecification) {
                        var mainFromDateTime1 = ret.tsdb_fromTimestampAsMoment(global, datum);
                        var mainToDateTime1 = ret.tsdb_toTimestampAsMoment(global, datum);
                        diff = moment.duration(mainToDateTime1.diff(mainFromDateTime1));
                    }
                    else {
                        diff = ret.periodToDiff(global.relativePeriod);
                        if (diff == null) {
                            return null;
                        }
                    }
                    //0, 2d, 2h
                    var toDate = moment.utc(global.baselineToDate, "YYYY/MM/DD");
                    var toTime = moment.utc(global.baselineToTime, "HH:mm:ss");
                    var toDateTimeString = toDate.format("YYYY/MM/DD") + " " + toTime.format("HH:mm:ss");
                    var toDateTime = moment.utc(toDateTimeString, "YYYY/MM/DD HH:mm:ss");
                    var fromDateTime = toDateTime.subtract(diff);
                    return fromDateTime.format("YYYY/MM/DD HH:mm:ss");
                case "relative":
                    var mainFromDateTime2 = ret.tsdb_fromTimestampAsMoment(global, datum);
                    var diff1 = ret.periodToDiff(global.baselineRelativePeriod);
                    if (diff1 != null) {
                        var dateTime = mainFromDateTime2.subtract(diff1);
                        return dateTime.format("YYYY/MM/DD HH:mm:ss");
                    }
                    return null;
            }
        }

        ret.tsdb_baselineToTimestampAsTsdbString = function(global, datum) {
            switch (global.baselineDatumStyle) {
                case "from":
                    var diff;
                    if (global.absoluteTimeSpecification) {
                        var mainFromDateTime1 = ret.tsdb_fromTimestampAsMoment(global, datum);
                        var mainToDateTime1 = ret.tsdb_toTimestampAsMoment(global, datum);
                        diff = moment.duration(mainToDateTime1.diff(mainFromDateTime1));
                    }
                    else {
                        diff = ret.periodToDiff(global.relativePeriod);
                        if (diff == null) {
                            return null;
                        }
                    }
                    var fromDate = moment.utc(global.baselineFromDate, "YYYY/MM/DD");
                    var fromTime = moment.utc(global.baselineFromTime, "HH:mm:ss");
                    var fromDateTimeString = fromDate.format("YYYY/MM/DD") + " " + fromTime.format("HH:mm:ss");
                    var fromDateTime = moment.utc(fromDateTimeString, "YYYY/MM/DD HH:mm:ss");
                    var toDateTime = fromDateTime.add(diff);
                    return toDateTime.format("YYYY/MM/DD HH:mm:ss");
                case "to":
                    var date = moment.utc(global.baselineToDate, "YYYY/MM/DD");
                    var time = moment.utc(global.baselineToTime, "HH:mm:ss");
                    return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
                case "relative":
                    var mainToDateTime = ret.tsdb_toTimestampAsMoment(global, datum);
                    var diff1 = ret.periodToDiff(global.baselineRelativePeriod);
                    if (diff1 != null) {
                        var dateTime = mainToDateTime.subtract(diff1);
                        return dateTime.format("YYYY/MM/DD HH:mm:ss");
                    }
                    return null;
            }
        }

        ret.tsdb_queryStringForBaseline = function(renderContext, global, graph, metrics, perLineFn, datum, downsampleOverrideFn, noIgnore, gexpSubQueriesById) {
            var fromTimestamp = ret.tsdb_baselineFromTimestampAsTsdbString(global, datum);
            var toTimestamp = ret.tsdb_baselineToTimestampAsTsdbString(global, datum);
            return ret.tsdb_queryStringInternal(renderContext, datum, fromTimestamp, toTimestamp, global.autoReload, false, global.globalDownsampling, global.globalDownsampleTo, graph, metrics, perLineFn, downsampleOverrideFn, noIgnore, gexpSubQueriesById);
        }

        ret.tsdb_queryString = function(renderContext, global, graph, metrics, perLineFn, datum, downsampleOverrideFn, noIgnore, gexpSubQueriesById) {
            var fromTimestamp = ret.tsdb_fromTimestampAsTsdbString(global);
            var toTimestamp = ret.tsdb_toTimestampAsTsdbString(global);
            return ret.tsdb_queryStringInternal(renderContext, datum, fromTimestamp, toTimestamp, global.autoReload, true, global.globalDownsampling, global.globalDownsampleTo, graph, metrics, perLineFn, downsampleOverrideFn, noIgnore, gexpSubQueriesById);
        }

        ret.tsdb_queryStringInternal = function(renderContext, datum, fromTimestamp, toTimestamp, autoReload, allowAutoReloadOverrideEndDate, globalDownsampling, globalDownsampleTo, graph, queries, perLineFn, downsampleOverrideFn, noIgnore, gexpSubQueriesById) {
            // validation
            if (fromTimestamp == null || fromTimestamp == "") {
                renderContext.renderErrors[graph.id] = "No start date specified";
                return "";
            }
            if (queries == null || queries.length == 0) {
                renderContext.renderErrors[graph.id] = "No queries specified";
                return "";
            }
            var queryType = null;
            for (var q=0; q<queries.length; q++) {
                if (queryType == null) {
                    queryType = queries[q].type;
                }
                else if (queryType != queries[q].type) {
                    throw "Can't mix query types, have both "+queryType+" and "+queries[q].type;
                }
            }

            // url construction
            var url = "";

            url += "start=" + fromTimestamp;
            if (autoReload && allowAutoReloadOverrideEndDate) {
                var now = datum ? datum.clone() : moment.utc();
                url += "&end="+now.format("YYYY/MM/DD HH:mm:ss");
            }
            else {
                if (toTimestamp != null) {
                    url += "&end=" + toTimestamp;
                }
                else if (!(noIgnore && true)) {
                    url += "&ignore="+(++ret.imageRenderCount);
                }
            }

            for (var i=0; i<queries.length; i++) {
                // agg:[interval-agg:][rate[{counter[,max[,reset]]}:]metric[{tag=value,...}]
                switch (queries[i].type) {
                    case "metric":
                        var metricQuery = queries[i];
                        var metricString = $tsdbUtils.metricQuery(
                            metricQuery, globalDownsampling, globalDownsampleTo, downsampleOverrideFn,
                            function(s) {
                                // todo: warnings should be appended..
                                renderContext.renderWarnings[graph.id] = s;
                            }
                        );
                        url += "&m=" + metricString;
                        break;
                    case "gexp":
                        var gexpQuery = queries[i];
                        var gexpString = $tsdbUtils.gexpQuery(
                            gexpQuery, gexpSubQueriesById, globalDownsampling, globalDownsampleTo, downsampleOverrideFn,
                            function(s) {
                                // todo: warnings should be appended..
                                renderContext.renderWarnings[graph.id] = s;
                            }
                        );
                        url += "&exp=" + gexpString;
                        break;
                    default:
                        throw "Unsupported query type: "+queries[i].type
                }

                if (perLineFn) {
                    url += perLineFn(queries[i]);
                }
            }

            return url;
        }

        ret.tsdbGraphUrl = function(path, renderContext, config, global, graph, queries, forceAxis, downsampleOverrideFn, yAxisParams, y2AxisParams, keyParams, lineSmoothing, style, globalAnnotations, addIgnore) {
            if (path == null) {
                // gui
                path = "/#";
            }
            var metrics = [];
            // tsdb graph only supports metric queries
            for (var q=0; q<queries.length; q++) {
                if (queries[q].type == "metric") {
                    metrics.push(queries[q]);
                }
            }
            var url = config.tsdbBaseReadUrl+path;
            var qs = ret.tsdb_queryString(renderContext, global, graph, metrics, function(metric) {
                if (forceAxis != null) {
                    return "&o=axis+"+forceAxis;
                }
                if (metric.graphOptions.axis == null) {
                    return "&o=axis+x1y1";
                }
                return "&o=axis+"+metric.graphOptions.axis;
            }, null/*datum*/, downsampleOverrideFn, !addIgnore, {}/*metricsByMetricId*/);

            if (qs == "") {
                return;
            }

            url += qs;

            var usingLeftAxis = false;
            var usingRightAxis = false;
            for (var i=0; i<queries.length; i++) {
                if (queries[i].graphOptions.axis == null || queries[i].graphOptions.axis == "x1y1" || forceAxis == "x1y1") {
                    usingLeftAxis = true;
                }
                else if (queries[i].graphOptions.axis == "x1y2" || forceAxis == "x1y2") {
                    usingRightAxis = true;
                }
                else {
                    renderContext.renderErrors[graph.id] = "Invalid axis specified";
                    return;
                }
            }

            if (usingLeftAxis && yAxisParams != null) {
                if (yAxisParams.label != null) {
                    url += "&ylabel=" + ret.formEncode(yAxisParams.label);
                }
                if (yAxisParams.format != null) {
                    url += "&yformat=" + ret.formEncode(yAxisParams.format);
                }
                if (yAxisParams.range != null) {
                    url += "&yrange=" + ret.formEncode(yAxisParams.range);
                }
                else if (yAxisParams.squashNegative != null && yAxisParams.squashNegative) {
                    url += "&yrange=" + ret.formEncode("[0:]");
                }
                if (yAxisParams.logscale != null && yAxisParams.logscale) {
                    url += "&ylog";
                }
            }

            if (usingRightAxis && y2AxisParams != null) {
                if (y2AxisParams.label != null) {
                    url += "&y2label=" + ret.formEncode(y2AxisParams.label);
                }
                if (y2AxisParams.format != null) {
                    url += "&y2format=" + ret.formEncode(y2AxisParams.format);
                }
                if (y2AxisParams.range != null) {
                    url += "&y2range=" + ret.formEncode(y2AxisParams.range);
                }
                else if (y2AxisParams.squashNegative != null && y2AxisParams.squashNegative) {
                    url += "&y2range=" + ret.formEncode("[0:]");
                }
                if (y2AxisParams.logscale != null && y2AxisParams.logscale) {
                    url += "&y2log";
                }
            }

            if (keyParams != null) {
                var keyPos = keyParams.keyLocation;
                if (keyPos == null || keyPos == "") {
                    keyPos = "top left";
                }
                if (keyParams.keyAlignment == "horizontal") {
                    keyPos += " horiz";
                }
                if (keyParams.keyBox) {
                    keyPos += " box";
                }
                url += "&key=" + ret.formEncode(keyPos);
            }
            else {
                url += "&nokey";
            }

            if (lineSmoothing) {
                url += "&smooth=csplines";
            }


            if (style != null) {
                url += "&style="+style;
            }

            if (globalAnnotations) {
                url += "&global_annotations";
            }
            return url;

        }

        ret.timeSeriesName = function(metric) {
            var name = metric.metric;
            var ungroupedString = "";
            var ungroupedSep = "";
            var tagNames = [];
            if (metric.query != null) {
                // metric.query.tags is deprecated
                if (metric.query.filters != null) {
                    var filtersByTagk = {};
                    for (var f=0; f<metric.query.filters.length; f++) {
                        if (!filtersByTagk.hasOwnProperty(metric.query.filters[f].tagk)) {
                            filtersByTagk[metric.query.filters[f].tagk] = [];
                        }
                        filtersByTagk[metric.query.filters[f].tagk].push(metric.query.filters[f]);
                    }
                    // type/tagk/filter/group_by
                    for (var tagk in filtersByTagk) {
                        var exclude = false;
                        var groupBy = false;
                        var tagkUngroupedString = "";
                        var tagkUngroupedSep = "";
                        for (var f=0; f<filtersByTagk[tagk].length; f++) {
                            if (filtersByTagk[tagk][f].group_by) {
                                groupBy = true;
                            }
                            tagkUngroupedString += tagkUngroupedSep + tagk + "=" + filtersByTagk[tagk][f].type + "(" + filtersByTagk[tagk][f].filter + ")";
                            tagkUngroupedSep = ",";
                        }
                        if (!groupBy) {
                            exclude = true;
                            ungroupedString += ungroupedSep + tagkUngroupedString;
                            ungroupedSep = ",";
                        }
                        if (!exclude) {
                            tagNames.push(tagk);
                        }
                    }
                }
            }
            else {
                for (var tk in metric.tags) {
                    if (metric.tags.hasOwnProperty(tk)) {
                        tagNames.push(tk);
                    }
                }
            }
            tagNames.sort();
            if (tagNames.length > 0 || ungroupedString != "") {
                name += "{";
                tagNames.sort();
                var sep = "";
                for (var tk = 0; tk < tagNames.length; tk++) {
                    name += sep + tagNames[tk] + "=" + metric.tags[tagNames[tk]];
                    sep = ",";
                }
                name += "}";
                if (ungroupedString != "") {
                    name += "{" + ungroupedString + "}";
                }
            }
            return name;
        }

        ret.dygraph_render = function(divId, graphId, data, config) {
            var div = document.getElementById(divId);
            // dygraph uses these as gospel, unfortunately it also sets them, so making it impossible to change size later
            div.style.width = '';
            div.style.height = '';
            var g = new Dygraph(
                // containing div
                div,
                data,
                config
            );

            ret.dygraphs[graphId] = g;

            return g;
        }

        ret.dygraph_setAnnotations = function(g, annotations) {
            //annotations.sort(function(a,b){return a.xval - b.xval;})
            g.setAnnotations(annotations);
        }
        
        ret.perform_queries = function(renderContext, config, global, graph, queries, options, datum) {

            var constructQueriesAndUrls = function(queryStringFn, datum, queryType) {
                
                var typedQueries = [];
                for (var q=0; q<queries.length; q++) {
                    if (queries[q].type == queryType) {
                        typedQueries.push(queries[q]);
                    }
                }
                
                if (queryType == "gexp" && typedQueries.length>0 && !config.supports_expressions) {
                    renderContext.renderMessages[graph.id] = "Graph renderer doesn't support expressions yet being asked to render them.";
                    return [];
                }
                
                var gexpSubQueriesById = {};
                if (queryType == "gexp") {
                    for (var q=0; q<queries.length; q++) {
                        if (queries[q].type == "metric" && queries[q].type == "gexp") {
                            gexpSubQueriesById[queries[q].id] = queries[q];
                        }
                    }
                }
                
                var splitProperty = null;
                switch (queryType) {
                    case "metric":
                        splitProperty = "name";
                        break;
                    case "gexp":
                        splitProperty = "function";
                        break;
                    default:
                        throw 'Unsupported query type: '+queryType
                }
                
                // split metrics up so that we end up with only a single instance of each metric in each set of queries
                var queryIndexes = {};
                var maxCount = 0;
                for (var q=0; q<typedQueries.length; q++) {
                    if (!queryIndexes.hasOwnProperty(typedQueries[q][splitProperty])) {
                        queryIndexes[typedQueries[q][splitProperty]] = [];
                    }
                    queryIndexes[typedQueries[q][splitProperty]].push(q);
                    maxCount = Math.max(maxCount, queryIndexes[typedQueries[q][splitProperty]].length);
                }
                var seperatedQueriesDicts = [];
                var seperatedQueriesArrays = [];
                for (var i=0; i<maxCount; i++) {
                    var dict = {};
                    var arr = [];
                    for (var splitName in queryIndexes) {
                        if (queryIndexes.hasOwnProperty(splitName)) {
                            if (queryIndexes[splitName].length > i) {
                                var query = typedQueries[queryIndexes[splitName][i]];
                                dict[splitName] = query;
                                arr.push(query)
                            }
                        }
                    }
                    seperatedQueriesDicts.push(dict);
                    seperatedQueriesArrays.push(arr);
                }

                var ret = [];
                for (var i=0; i<maxCount; i++) {

                    var url = config.tsdbBaseReadUrl+"/api/query";
                    
                    if (queryType == "gexp") {
                        url += "/gexp";
                    } 
                    
                    url += "?";

                    url += queryStringFn(renderContext, global, graph, seperatedQueriesArrays[i], null/*perLineFn*/, datum, options.downsampleOverrideFn, false/*noIgnore*/, gexpSubQueriesById);

                    if (options.supports_annotations && (options.annotations || options.globalAnnotations)) {
                        url += "&show_tsuids=true";
                        if (options.globalAnnotations) {
                            url += "&global_annotations=true";
                        }
                    }
                    else {
                        url += "&no_annotations=true";
                    }

                    url += "&ms=true";
                    // todo: put this after show query append when we don't have renderer tests expecting http calls
                    if (options.require_arrays) {
                        url += "&arrays=true";
                    }
                    url += "&show_query=true";
                    ret.push({queries: seperatedQueriesDicts[i], url: url});
                }
                return ret;
            }

            var mainJson = null;
            var baselineJson = null;
            var errorResponse = false;
            
            var metricQueriesAndUrls = constructQueriesAndUrls(ret.tsdb_queryString, datum, "metric");
            var baselineMetricQueriesAndUrls = global.baselining && options.supports_baselining ? constructQueriesAndUrls(ret.tsdb_queryStringForBaseline, datum, "metric") : null;
            var gexpQueriesAndUrls = constructQueriesAndUrls(ret.tsdb_queryString, datum, "gexp");
            var baselineGexpQueriesAndUrls = global.baselining && options.supports_baselining ? constructQueriesAndUrls(ret.tsdb_queryStringForBaseline, datum, "gexp") : null;
            var expectedNormalResponses = metricQueriesAndUrls.length;
            var receivedNormalResponses = 0;
            var expectedBaselineResponses = global.baselining && options.supports_baselining ? metricQueriesAndUrls.length : 0;
            var receivedBaselineResponses = 0;

            var mainJsons = [];
            var baselineJsons = [];

            var mergeJsons = function(jsons, queryType) {
                var ret = [];
                for (var j=0; j<jsons.length; j++) {
                    var metricsAndJson = jsons[j];
                    var json = metricsAndJson.response;
                    if (queryType == "metric") {
                        var queriesByMetric = metricsAndJson.queries;
                        for (var i=0; i<json.length; i++) {
                            var metric = json[i].metric;
                            json[i].aardvark_query = queriesByMetric[metric];
                            ret.push(json[i]);
                        }
                    }
                    else if (queryType == "gexp") {
                        var queriesByFunction = metricsAndJson.queries;
                        for (var i=0; i<json.length; i++) {
                            // todo: where do we get this from
                            var f = json[i].metric.substring(0, Math.max(0, json[i].metric.indexOf("(")));
                            json[i].aardvark_query = queriesByFunction[f];
                            ret.push(json[i]);
                        }
                    }
                    else {
                        throw "Unsupported query type: "+queryType;
                    }
                }
                return ret;
            };

            var doMain = function(queriesAndUrl, queryType) {
                $http.get(queriesAndUrl.url, {withCredentials:config.authenticatedReads})
                    .then(
                        function onSuccess(response) {
                            var json = response.data;
                            if (errorResponse) {
                                return;
                            }
                            mainJsons.push({queries:queriesAndUrl.queries, response: json});
                            receivedNormalResponses++;
                            if (expectedNormalResponses == receivedNormalResponses) {
                                //console.log("got all my responses")
                                mainJson = mergeJsons(mainJsons, queryType);
                                if (expectedBaselineResponses == receivedBaselineResponses) {
                                    options.processJson(mainJson, baselineJson);
                                }
                            }
                            // else wait for baseline data
                        },
                        function onError(response) {
                            var data = response.data;
                            renderContext.renderMessages[graph.id] = "Error loading data: "+data;
                            errorResponse = true;
                            options.errorResponse();
                            return;
                        }
                    );

            }
            var doBaseline = function(metricsAndUrl, queryType) {
                $http.get(metricsAndUrl.url, {withCredentials:config.authenticatedReads})
                    .then(
                        function onSuccess(response) {
                            var json = response.data;
                            if (errorResponse) {
                                return;
                            }
                            baselineJsons.push({queries:metricsAndUrl.queries, response: json});
                            receivedBaselineResponses++;
                            if (expectedBaselineResponses == receivedBaselineResponses) {
                                baselineJson = mergeJsons(baselineJsons, queryType);
                                if (expectedNormalResponses == receivedNormalResponses) {
                                    options.processJson(mainJson, baselineJson);
                                }
                            }
                            // else wait for baseline data
                        },
                        function onError(response) {
                            var arg = response.data;
                            renderContext.renderMessages[graph.id] = "Error loading data: "+arg;
                            errorResponse = true;
                            options.errorResponse();
                            return;
                        }
                    );
            }

            for (var u=0; u<metricQueriesAndUrls.length; u++) {
                doMain(metricQueriesAndUrls[u], "metric");
            }

            for (var u=0; u<gexpQueriesAndUrls.length; u++) {
                doMain(gexpQueriesAndUrls[u], "gexp");
            }

            if (global.baselining && options.supports_baselining) {
                for (var u=0; u<baselineMetricQueriesAndUrls.length; u++) {
                    doBaseline(baselineMetricQueriesAndUrls[u], "metric");
                }
                
                for (var u=0; u<baselineGexpQueriesAndUrls.length; u++) {
                    doBaseline(baselineGexpQueriesAndUrls[u], "gexp");
                }
            }
        }
        /*
        perform_queries_config = {
            supports_expressions: false,
            supports_annotations: false,
            supports_baselining: false,
            annotations: false,
            globalAnnotations: false,
            processJson: function(json) {},
            errorResponse: function(json) {}
        }
        */
        return ret;
    }]);