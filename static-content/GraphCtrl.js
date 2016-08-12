/*
 * Graph rendering
 */
aardvark.controller('GraphCtrl', [ '$scope', '$rootScope', '$http', function GraphCtrl($scope, $rootScope, $http) {
    $scope.renderedContent = {};
    $scope.renderErrors = {};
    $scope.renderWarnings = {};
    $scope.renderMessages = {};
    $scope.imageRenderCount = 0;
    $scope.hiddenElements = {};
    $scope.renderListeners = {};
    $scope.dygraphs = {};

    $scope.graphRendered = function (graphId) {
        for (var k in $scope.renderListeners) {
            if ($scope.renderListeners.hasOwnProperty(k)) {
                var fn = $scope.renderListeners[k];
                if (fn != null && typeof fn == "function") {
                    fn(graphId);
                }
            }
        }
    }

    $scope.addGraphRenderListener = function(listenerId, listenerFn) {
        $scope.renderListeners[listenerId] = listenerFn;
    }

    $scope.clearGraphRenderListeners = function() {
        $scope.renderListeners = {};
    }

    $scope.hiddenElement = function (divId) {
        if ($scope.hiddenElements.hasOwnProperty(divId)) {
            return $scope.hiddenElements[divId];
        }
        return false;
    }

    $scope.periodToDiff = function(period) {
        var numberComponent1 = period.match(/^[0-9]+/);
        var stringComponent1 = period.match(/[a-zA-Z]+$/);
        if (numberComponent1.length == 1 && stringComponent1.length == 1) {
            return moment.duration(parseInt(numberComponent1[0]), stringComponent1[0]);
        }
        else {
            return null;
        }
    }
    
    $scope.baselineOffset = function(global, datum) {
        switch (global.baselineDatumStyle) {
            case "from":
                var mainFromDateTime = moment($scope.tsdb_fromTimestampAsDate(global, datum));
                var fromDate = moment(global.baselineFromDate, "YYYY/MM/DD");
                var fromTime = moment(global.baselineFromTime, "HH:mm:ss");
                var baselineFromDateTime = moment(fromDate.format("YYYY/MM/DD") + " " + fromTime.format("HH:mm:ss"), "YYYY/MM/DD HH:mm:ss");
                return moment.duration(mainFromDateTime.diff(baselineFromDateTime));
            case "to":
                var mainToDateTime = moment($scope.tsdb_toTimestampAsDate(global, datum));
                var toDate = moment(global.baselineToDate, "YYYY/MM/DD");
                var toTime = moment(global.baselineToTime, "HH:mm:ss");
                var baselineToDateTime = moment(toDate.format("YYYY/MM/DD") + " " + toTime.format("HH:mm:ss"), "YYYY/MM/DD HH:mm:ss");
                return moment.duration(mainToDateTime.diff(baselineToDateTime));
            case "relative":
                return $scope.periodToDiff(global.baselineRelativePeriod);
            default:
                throw "Unrecognized baseline datum style: "+global.baselineDatumStyle;
        }
    }

    // helper functions for dealing with tsdb data
    $scope.tsdb_rateString = function(metricOptions) {
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
    $scope.tsdb_fromTimestampAsTsdbString = function(global) {
        if (global.absoluteTimeSpecification) {
            var date = moment(global.fromDate, "YYYY/MM/DD");
            var time = moment(global.fromTime, "HH:mm:ss");
            return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
        }
        else {
            if (global.relativePeriod == null || global.relativePeriod == "") {
                return "";
            }
            return global.relativePeriod+"-ago";
        }
    }
    $scope.tsdb_toTimestampAsTsdbString = function(global) {
        if (!global.absoluteTimeSpecification
            || global.toDate == null || global.toDate == ""
            || global.toTime == null || global.toTime == "") {
            return null;
        }
        else {
            var date = moment(global.toDate, "YYYY/MM/DD");
            var time = moment(global.toTime, "HH:mm:ss");
            return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
        }
    }
    $scope.tsdb_fromTimestampAsDate = function(global, datum) {
        if (global.absoluteTimeSpecification) {
            var date = moment(global.fromDate, "YYYY/MM/DD");
            var time = moment(global.fromTime, "HH:mm:ss");
            var dateTime = date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
            return moment(dateTime, "YYYY/MM/DD HH:mm:ss").toDate();
        }
        else {
            if (global.relativePeriod == null || global.relativePeriod == "") {
                return new Date();
            }
            var numberComponent = global.relativePeriod.match(/^[0-9]+/);
            var stringComponent = global.relativePeriod.match(/[a-zA-Z]+$/);
            if (numberComponent.length == 1 && stringComponent.length == 1) {
                var now = datum ? moment(datum) : moment();
                return now.subtract(numberComponent[0], stringComponent[0]).toDate();
            }
            return new Date();
        }
    }
    $scope.tsdb_toTimestampAsDate = function(global, datum) {
        if (!global.absoluteTimeSpecification
            || global.toDate == null || global.toDate == ""
            || global.toTime == null || global.toTime == "") {
            return datum ? datum : new Date();
        }
        else {
            var date = moment(global.toDate, "YYYY/MM/DD");
            var time = moment(global.toTime, "HH:mm:ss");
            var dateTime = date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
            return moment(dateTime, "YYYY/MM/DD HH:mm:ss").toDate();
        }
    }
    $scope.tsdb_baselineFromTimestampAsTsdbString = function(global, datum) {
        switch (global.baselineDatumStyle) {
            case "from":
                var date = moment(global.baselineFromDate, "YYYY/MM/DD");
                var time = moment(global.baselineFromTime, "HH:mm:ss");
                return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
            case "to":
                var diff;
                if (global.absoluteTimeSpecification) {
                    var mainFromDateTime1 = moment($scope.tsdb_fromTimestampAsDate(global, datum));
                    var mainToDateTime1 = moment($scope.tsdb_toTimestampAsDate(global, datum));
                    diff = moment.duration(mainToDateTime1.diff(mainFromDateTime1));
                }
                else {
                    diff = $scope.periodToDiff(global.relativePeriod);
                    if (diff == null) {
                        return null;
                    }
                }
                //0, 2d, 2h
                var toDate = moment(global.baselineToDate, "YYYY/MM/DD");
                var toTime = moment(global.baselineToTime, "HH:mm:ss");
                var toDateTimeString = toDate.format("YYYY/MM/DD") + " " + toTime.format("HH:mm:ss");
                var toDateTime = moment(toDateTimeString, "YYYY/MM/DD HH:mm:ss");
                var fromDateTime = toDateTime.subtract(diff);
                return fromDateTime.format("YYYY/MM/DD HH:mm:ss");
            case "relative":
                var mainFromDateTime2 = $scope.tsdb_fromTimestampAsDate(global, datum);
                var diff1 = $scope.periodToDiff(global.baselineRelativePeriod);
                if (diff1 != null) {
                    var dateTime = moment(mainFromDateTime2).subtract(diff1);
                    return dateTime.format("YYYY/MM/DD HH:mm:ss");
                }
                return null;
        }
    }
    $scope.tsdb_baselineToTimestampAsTsdbString = function(global, datum) {
        switch (global.baselineDatumStyle) {
            case "from":
                var diff;
                if (global.absoluteTimeSpecification) {
                    var mainFromDateTime1 = moment($scope.tsdb_fromTimestampAsDate(global, datum));
                    var mainToDateTime1 = moment($scope.tsdb_toTimestampAsDate(global, datum));
                    diff = moment.duration(mainToDateTime1.diff(mainFromDateTime1));
                }
                else {
                    diff = $scope.periodToDiff(global.relativePeriod);
                    if (diff == null) {
                        return null;
                    }
                }
                var fromDate = moment(global.baselineFromDate, "YYYY/MM/DD");
                var fromTime = moment(global.baselineFromTime, "HH:mm:ss");
                var fromDateTimeString = fromDate.format("YYYY/MM/DD") + " " + fromTime.format("HH:mm:ss");
                var fromDateTime = moment(fromDateTimeString, "YYYY/MM/DD HH:mm:ss");
                var toDateTime = fromDateTime.add(diff);
                return toDateTime.format("YYYY/MM/DD HH:mm:ss");
            case "to":
                var date = moment(global.baselineToDate, "YYYY/MM/DD");
                var time = moment(global.baselineToTime, "HH:mm:ss");
                return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
            case "relative":
                var mainToDateTime = $scope.tsdb_toTimestampAsDate(global, datum);
                var diff1 = $scope.periodToDiff(global.baselineRelativePeriod);
                if (diff1 != null) {
                    var dateTime = moment(mainToDateTime).subtract(diff1);
                    return dateTime.format("YYYY/MM/DD HH:mm:ss");
                }
                return null;
        }
    }

// Helper method for parsing opentsdb's json response
    $scope.cubism_parser = function(json, start, step, stop, interpolate, squashNegatives) {
        // no data
        if (json.length == 0) {
            return [[]];
        }
        return json.map(function (ts) {
            if (ts.dps.length == 0) {
                return [];
            }
            var firstTime = ts.dps[0][0];
            var ret = [];
            for (var v=start; v<firstTime; v+=step) {
                ret.push(null);
            }
            var lastValue;
            var lastValueTime;
            var nextIndex = 0;
            var startFrom = Math.max(firstTime, start);
            for (var v=startFrom; nextIndex<ts.dps.length && v<=stop; v+=step) {
                while (nextIndex < ts.dps.length && ts.dps[nextIndex][0] < v) {
                    nextIndex++;
                }
                if (nextIndex < ts.dps.length) {
                    if (ts.dps[nextIndex][0] == v) {
                        lastValue = ts.dps[nextIndex][1];
                        lastValueTime = ts.dps[nextIndex][0];
                        ret.push(squashNegatives && lastValue < 0 ? 0 : lastValue);
                        nextIndex++;
                        if (nextIndex>=ts.dps.length) {
                            break;
                        }
                    }
                    else if (ts.dps[nextIndex][0] > v) {
                        // interpolate
                        if (interpolate) {
                            var nextValue = ts.dps[nextIndex][1];
                            var nextTime = ts.dps[nextIndex][0];
                            var timeDiffLastToNext = nextTime - lastValueTime;
                            var timeDiffLastToNow = v - lastValueTime;
                            var value = lastValue + ((nextValue - lastValue) * (timeDiffLastToNow / timeDiffLastToNext));
                            ret.push(squashNegatives && value < 0 ? 0 : value);
                        }
                        else {
                            ret.push(null);
                        }
                    }
                }
            }
            return ret;
        });
    };

    $scope.tsdb_queryStringForBaseline = function(global, graph, metrics, perLineFn, datum) {
        var fromTimestamp = $scope.tsdb_baselineFromTimestampAsTsdbString(global, datum);
        var toTimestamp = $scope.tsdb_baselineToTimestampAsTsdbString(global, datum);
        return $scope.tsdb_queryStringInternal(fromTimestamp, toTimestamp, global.autoReload, global.globalDownsampling, global.globalDownsampleTo, graph, metrics, perLineFn);
    }

    $scope.tsdb_queryString = function(global, graph, metrics, perLineFn) {
        var fromTimestamp = $scope.tsdb_fromTimestampAsTsdbString(global);
        var toTimestamp = $scope.tsdb_toTimestampAsTsdbString(global);
        return $scope.tsdb_queryStringInternal(fromTimestamp, toTimestamp, global.autoReload, global.globalDownsampling, global.globalDownsampleTo, graph, metrics, perLineFn);
    }

    $scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {

        // validation
        if (fromTimestamp == null || fromTimestamp == "") {
            $scope.renderErrors[graph.id] = "No start date specified";
            return "";
        }
        if (metrics == null || metrics.length == 0) {
            $scope.renderErrors[graph.id] = "No metrics specified";
            return "";
        }

        // url construction
        var url = "";

        url += "?start=" + fromTimestamp;
        if (autoReload) {
            // todo: do we need to do a conversion to utc?
            var now = new Date();
            var y = now.getFullYear();
            var mo = now.getMonth()+1;
            var d = now.getDate();
            var h = now.getHours();
            var mi = now.getMinutes();
            var s = now.getSeconds();
            url += "&end="+y+"/"+(mo<10?("0"+mo):mo)+"/"+(d<10?("0"+d):d)+"-"+(h<10?("0"+h):h)+":"+(mi<10?("0"+mi):mi)+":"+(s<10?("0"+s):s);
        }
        else {
            if (toTimestamp != null) {
                url += "&end=" + toTimestamp;
            }
            else {
                url += "&ignore="+(++$scope.imageRenderCount);
            }
        }


        for (var i=0; i<metrics.length; i++) {
            // agg:[interval-agg:][rate[{counter[,max[,reset]]}:]metric[{tag=value,...}]
            var metric = metrics[i];
            var options = metric.graphOptions;
            url += "&m=" + options.aggregator + ":";
            if (globalDownsampling) {
                url += globalDownsampleTo + "-" + options.downsampleBy + ":";
            }
            else if (options.downsample) {
                url += options.downsampleTo + "-" + options.downsampleBy + ":";
            }
            if (options.rate) {
                url += $scope.tsdb_rateString(options) + ":";
            }
            else if (options.rateCounter) {
                // todo: warnings should be appended..
                $scope.renderWarnings[graph.id] = "You have specified a rate counter without a rate, ignoring";
            }
            url += metric.name;
            var sep = "{";
            for (var t=0; t<metric.tags.length; t++) {
                var tag = metric.tags[t];
                if (tag.value != "" && (tag.groupBy == null || tag.groupBy)) {
                    url += sep + tag.name + "=" + tag.value;
                    sep = ",";
                }
            }
            if (sep == ",") {
                url += "}";
            }
            // tsdb 2.2+ supports filters
            if ($rootScope.tsdbVersion >= $rootScope.TSDB_2_2) {
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
                        url += sep + tag.name + "=" + tag.value;
                        sep = ",";
                    }
                }
                if (sep == ",") {
                    url += "}";
                }
            }

            if (perLineFn) {
                url += perLineFn(metric)
            }

            // ready for next metric
        }

        return url;
    }

    $scope.timeSeriesName = function(metric) {
        var name = metric.metric;
        var tagNames = [];
        for (var tk in metric.tags) {
            if (metric.tags.hasOwnProperty(tk)) {
                tagNames.push(tk);
            }
        }
        if (tagNames.length > 0) {
            name += "{";
            tagNames.sort();
            var sep = "";
            for (var tk = 0; tk < tagNames.length; tk++) {
                name += sep + tagNames[tk] + "=" + metric.tags[tagNames[tk]];
                sep = ",";
            }
            name += "}";
        }
        return name;
    }
    $scope.dygraph_render = function(divId, graphId, data, config) {
        var g = new Dygraph(
            // containing div
            document.getElementById(divId),
            data,
            config
        );

        $scope.dygraphs[graphId] = g;
        
        return g;
    }
    $scope.dygraph_setAnnotations = function(g, annotations) {
        g.setAnnotations(annotations);
    }

    // pre-defined in unit tests
    if (!$scope.renderers) {
        $scope.renderers = {};
    }
    $scope.renderers["debug"] = function(global, graph, metrics) {
        var lineSep = "";
        var txt = "";
        for (var i=0; i<metrics.length; i++) {
            var m = metrics[i];
            txt += lineSep + "["+i+"] " + m.id + ": " + m.name;
            lineSep = "\n";
            var sep = " {";
            for (var t=0; t< m.tags.length; t++) {
                var tag = m.tags[t];
                if (tag.value != '') {
                    txt += sep + " " + tag.name + "='" + tag.value + "'";
                    sep = ",";
                }
            }
            if (sep != " {") {
                txt += " }";
            }
            if (metrics[i].graphOptions.axis == "x1y2") {
                txt += " [rightAxis]";
            }
        }
        $scope.renderedContent[graph.id] = txt;
    };
    $scope.renderers["gnuplot"] = function(global, graph, metrics) {
        if ($scope.renderedContent[graph.id] == null) {
            $scope.renderedContent[graph.id] = { src: "", width: 0, height: 0 };
        }
        $scope.renderMessages[graph.id] = "Loading...";


        var url = "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/q";
        var qs = $scope.tsdb_queryString(global, graph, metrics, function(metric) {
            return "&o=axis+"+metric.graphOptions.axis;
        });

        if (qs == "") {
            return;
        }

        url += qs;

        var usingLeftAxis = false;
        var usingRightAxis = false;
        for (var i=0; i<metrics.length; i++) {
            if (metrics[i].graphOptions.axis == "x1y1") {
                usingLeftAxis = true;
            }
            else if (metrics[i].graphOptions.axis == "x1y2") {
                usingRightAxis = true;
            }
            else {
                $scope.renderErrors[graph.id] = "Invalid axis specified";
                return;
            }
        }

        if (usingLeftAxis) {
            if (graph.gnuplot != null && graph.gnuplot.yAxisLabel != null && graph.gnuplot.yAxisLabel != "") {
                url += "&ylabel=" + $rootScope.formEncode(graph.gnuplot.yAxisLabel);
            }
            if (graph.gnuplot != null && graph.gnuplot.yAxisFormat != null && graph.gnuplot.yAxisFormat != "") {
                url += "&yformat=" + $rootScope.formEncode(graph.gnuplot.yAxisFormat);
            }
            if (graph.gnuplot != null && graph.gnuplot.yAxisRange != null && graph.gnuplot.yAxisRange != "") {
                url += "&yrange=" + $rootScope.formEncode(graph.gnuplot.yAxisRange);
            }
            if (graph.gnuplot != null && graph.gnuplot.yAxisLogScale != null && graph.gnuplot.yAxisLogScale) {
                url += "&ylog";
            }

        }

        if (usingRightAxis) {
            if (graph.gnuplot != null && graph.gnuplot.y2AxisLabel != null && graph.gnuplot.y2AxisLabel != "") {
                url += "&y2label=" + $rootScope.formEncode(graph.gnuplot.y2AxisLabel);
            }
            if (graph.gnuplot != null && graph.gnuplot.y2AxisFormat != null && graph.gnuplot.y2AxisFormat != "") {
                url += "&y2format=" + $rootScope.formEncode(graph.gnuplot.y2AxisFormat);
            }
            if (graph.gnuplot != null && graph.gnuplot.y2AxisRange != null && graph.gnuplot.y2AxisRange != "") {
                url += "&y2range=" + $rootScope.formEncode(graph.gnuplot.y2AxisRange);
            }
            if (graph.gnuplot != null && graph.gnuplot.y2AxisLogScale != null && graph.gnuplot.y2AxisLogScale) {
                url += "&y2log";
            }

        }

        if (graph.gnuplot != null && graph.gnuplot.showKey != null) {
            if (graph.gnuplot.showKey) {
                var keyPos = graph.gnuplot.keyLocation;
                if (keyPos == null || keyPos == "") {
                    // todo: warnings should be appended..
                    $scope.renderWarnings[graph.id] = "Invalid key location specified '"+keyPos+"', defaulting to top left";
                    keyPos = "top left";
                }
                if (graph.gnuplot.keyAlignment != null && graph.gnuplot.keyAlignment == "horizontal") {
                    keyPos += " horiz";
                }
                if (graph.gnuplot.keyBox != null && graph.gnuplot.keyBox) {
                    keyPos += " box";
                }
                url += "&key=" + $rootScope.formEncode(keyPos);
            }
            else {
                url += "&nokey";
            }
        }


        if (graph.gnuplot != null && graph.gnuplot.lineSmoothing != null && graph.gnuplot.lineSmoothing) {
            url += "&smooth=csplines";
        }


        if (graph.gnuplot != null && graph.gnuplot.style != null && graph.gnuplot.style != "") {
            url += "&style="+graph.gnuplot.style;
        }
        
        if (graph.gnuplot != null && graph.gnuplot.globalAnnotations) {
            url += "&global_annotations";
        }

        url += "&png";

        var width = Math.floor(graph.graphWidth);
        var height = Math.floor(graph.graphHeight);

        url += "&wxh="+width+"x"+height;

        $scope.renderedContent[graph.id] = { src: url, width: width, height: height };
    };
    $scope.renderers["horizon"] = function(global, graph, metrics) {
        $scope.renderMessages[graph.id] = "Loading...";
        var divSelector = "#horizonDiv_"+graph.id;

        var s = 1000;
        var m = s * 60;
        var h = m * 60;
        var d = h * 24;
        var w = d * 7;

        var steps = [s,10*s,20*s,30*s,m,1*m,2*m,5*m,10*m,15*m,20*m,30*m,h,2*h,3*h,4*h,6*h,12*h,d,2*d,w];
        for (var i=2; i<=52; i++) {
            steps.push(i*w);
        }

        // cubism plots a pixel per step, so we need to calculate step size (we ignore downsampling time measure)
        var width = Math.floor(graph.graphWidth);
        var height = Math.floor(graph.graphHeight);
        var start = $scope.tsdb_fromTimestampAsDate(global);
        var stop = $scope.tsdb_toTimestampAsDate(global);
        var diff = new Date() - start.getTime();
        var timeWidth = stop.getTime() - start.getTime();
        var rawStepSize = timeWidth / width;
        var stepSize = steps[0];
        for (var i=0; i<steps.length-1; i++) {
            //console.log("considering "+steps[i]+" < " + rawStepSize + " <= "+steps[i+1]);
            if (steps[i] < rawStepSize && rawStepSize <= steps[i+1]) {
                stepSize = steps[i+1];
                break;
            }
        }

        // now recalculate width so we get the time range requested
        width = Math.ceil(timeWidth / stepSize);

        // construct the query string for these metrics, when we have a response, then use that to construct
        //    constant metrics (data already loaded) for time series which are returned.

        var fromTimestamp = $scope.tsdb_fromTimestampAsTsdbString(global);
        // validation
        if (fromTimestamp == null || fromTimestamp == "") {
            $scope.renderErrors[graph.id] = "No start date specified";
            return;
        }
        if (metrics == null || metrics.length == 0) {
            $scope.renderErrors[graph.id] = "No metrics specified";
            return;
        }

        // url construction
        var url = "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/api/query";

        url += $scope.tsdb_queryString(global, graph, metrics);

        url += "&ms=true&arrays=true";

        // now we have the url, so call it!
        $http.get(url).success(function (json) {
            // now we have an array of lines, so let's convert them to metrics

            var interpolate = graph.horizon && graph.horizon.interpolateGaps;
            var squash = graph.horizon && graph.horizon.squashNegatives;

            var parsed = $scope.cubism_parser(json, start, stepSize, stop, interpolate, squash); // array response
            // construct cMetrics
            var cMetrics = [];

            var context = cubism.context()
                .serverDelay(diff)
                .step(stepSize)
                .size(width)
                .stop();

            var addMetric = function(cMetrics, metricData, name)
            {
                cMetrics.push(context.metric(function (start, stop, step, callback) {
                    callback(null, metricData);
                }, name));
            }



            for (var i=0; i<parsed.length; i++) {
                var name = $scope.timeSeriesName(json[i]);
                addMetric(cMetrics, parsed[i], name);
            }


            // remove old horizon charts
            d3.select(divSelector)
                .selectAll(".horizon")
                .remove();
            // remove everything else
            d3.select(divSelector)
                .selectAll(".axis")
                .remove();
            d3.select(divSelector)
                .selectAll(".rule")
                .remove();
            d3.select(divSelector)
                .selectAll(".value")
                .remove();

            var cubism_axisFormatSeconds = d3.time.format("%H:%M:%S"),
                cubism_axisFormatMinutes = d3.time.format("%H:%M"),
                cubism_axisFormatDays = d3.time.format("%B %d");

            var axisFormat = context.step() < 6e4 ? cubism_axisFormatSeconds
                : context.step() < 864e5 ? cubism_axisFormatMinutes
                : cubism_axisFormatDays;

            d3.select(divSelector).selectAll(".axis")
                .data(["top", "bottom"])
                .enter().append("div")
                .attr("id", function(d) { return "horizonAxis_" + d + "_" + graph.id; })
                .attr("class", function(d) { return d + " axis"; })
                .each(function(d) { d3.select(this).call(context.axis().focusFormat(axisFormat).ticks(12).orient(d)); });

            context.on("focus", function(i) {
                d3.selectAll(".value").style("right", "10px");
            });

            var topAxisBox = d3.select("#horizonAxis_top_"+graph.id).node().getBoundingClientRect();
            var bottomAxisBox = d3.select("#horizonAxis_bottom_"+graph.id).node().getBoundingClientRect();

            var topAxisHeight = topAxisBox.height;
            var bottomAxisHeight = bottomAxisBox.height;
            var totalAxesHeight = topAxisHeight + bottomAxisHeight;

            var minLineHeight = 25;
            var maxLineHeight = 60;

            var perLineHeight = ((height - totalAxesHeight)/cMetrics.length)-2;
            perLineHeight = Math.min(Math.max(perLineHeight,minLineHeight),maxLineHeight);
            d3.select(divSelector).selectAll(".horizon")
                .data(cMetrics)
                .enter().insert("div", ".bottom")
                .attr("class", "horizon")
                .call(context.horizon().height(perLineHeight));

            // now we can add rule safely as we know height as well
            d3.select(divSelector).append("div")
                .attr("class", "rule")
                .attr("id","horizonRule_"+graph.id)
                .call(context.rule());

            var resizeFocusRule = function() {
                var graphPanelBox = d3.select("#scrollable-graph-panel").node().getBoundingClientRect();
                var topAxisBox = d3.select("#horizonAxis_top_"+graph.id).node().getBoundingClientRect();
                // top needs to be relative to this panel, not whole window
                var ruleTop = topAxisBox.top - graphPanelBox.top;
                var ruleHeight = totalAxesHeight + (perLineHeight * cMetrics.length);
                // and now we just go find the rule we added and set the top/height
                d3.select("#horizonRule_"+graph.id).select(".line").style("top", ruleTop+"px").style("height",ruleHeight+"px").style("bottom",null);
            }

            resizeFocusRule();

            $scope.addGraphRenderListener(function (graphId) {
                if (graphId != graph.id) {
                    resizeFocusRule();
                }
            });

            $scope.renderMessages[graph.id] = "";
            $scope.graphRendered(graph.id);
            return;
        })
        .error(function (arg) {
            $scope.renderMessages[graph.id] = "Error loading data: "+arg;
            return;
        });
    };
    // todo: specifying ratio and auto scale is going to look darn odd - need to decide what to do - add issue for this..
    $scope.renderers["dygraph"] = function(global, graph, metrics, datum) {
        var fromTimestamp = $scope.tsdb_fromTimestampAsTsdbString(global);
        // validation
        if (fromTimestamp == null || fromTimestamp == "") {
            $scope.renderErrors[graph.id] = "No start date specified";
            return;
        }
        if (metrics == null || metrics.length == 0) {
            $scope.renderErrors[graph.id] = "No metrics specified";
            return;
        }
        
        var dygraphOptions = graph.dygraph;
        if (!dygraphOptions) {
            dygraphOptions = {};
        }

        if (dygraphOptions.countFilter != null && dygraphOptions.countFilter.count + "" != "" && dygraphOptions.countFilter.count < 1) {
            $scope.renderErrors[graph.id] = "Minimum count for filtering is 1";
            return;
        }
        if (dygraphOptions.valueFilter != null && dygraphOptions.valueFilter.lowerBound != "" && dygraphOptions.valueFilter.upperBound != "" && dygraphOptions.valueFilter.lowerBound > dygraphOptions.valueFilter.upperBound) {
            $scope.renderErrors[graph.id] = "Upper bound on value filter is less than lower bound";
            return;
        }
        if (dygraphOptions.valueFilter != null && dygraphOptions.valueFilter.lowerBound != "" && dygraphOptions.valueFilter.upperBound != "" && dygraphOptions.valueFilter.lowerBound == dygraphOptions.valueFilter.upperBound) {
            $scope.renderWarnings[graph.id] = "Lower bound on value filter is same as upper bound";
        }

        $scope.renderMessages[graph.id] = "Loading...";
        
        var constructUrl = function(queryStringFn, datum) {
            var ret = "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/api/query";

            ret += queryStringFn(global, graph, metrics, null, datum);

            if (dygraphOptions.annotations || dygraphOptions.globalAnnotations) {
                if (dygraphOptions.globalAnnotations) {
                    ret += "&global_annotations=true";
                }
            }
            else {
                ret += "&no_annotations=true";
            }

            ret += "&ms=true&arrays=true";
            if (global.baselining) {
                ret += "&show_query=true";
            }
            return ret;
        }
        
        
        var mainJson = null;
        var baselineJson = null;
        
        var errorResponse = false;

        // baseline approach
        // 1. make both queries
        // 2. link results together so that we have a way of mapping from main to baseline
        // 3. perform filtering based on main, but remove matching baseline if exclude (todo removal)
        // 4. initial label setting (both sets)
        // 5. auto-scaling and label adjustment (both together)
        // 6. baseline time adjustment
        // 7. min/max time calculations (together)
        // 8. seperate processing
        //  a. ratio graphs
        //  b. mean adjustment
        //  c. negative squashing
        // 9. gap filling / merge timeseries (together)
        // 10. merge labels
        // 11. render graph
        
        var processJson = function() {
            if (!mainJson || mainJson.length == 0) {
                $scope.renderErrors[graph.id] = "Empty response from TSDB";
                $scope.renderMessages[graph.id] = "";
                return;
            }
            var baselining = global.baselining;
            if ((baselining && (!baselineJson || baselineJson.length == 0))) {
                $scope.renderWarnings[graph.id] = "Empty response from TSDB for baseline query";
                baselining = false;
            }

            var width = Math.floor(graph.graphWidth);
            var height = Math.floor(graph.graphHeight);

            var graphData = [];

            // 3. perform filtering based on main, but remove matching baseline if exclude 
            var filteredOut = [];
            var measured = null;
            if (dygraphOptions.countFilter != null && dygraphOptions.countFilter.count != "" && dygraphOptions.countFilter.count < mainJson.length) {
                measured = new Array(mainJson.length);
                var sorted = new Array(mainJson.length);
                for (var i=0; i<mainJson.length; i++) {
                    switch (dygraphOptions.countFilter.measure) {
                        case "mean":
                            measured[i] = 0;
                            for (var p=0; p<mainJson[i].dps.length; p++) {
                                measured[i] +=  mainJson[i].dps[p][1];
                            }
                            measured[i] /= mainJson[i].dps.length;
                            break;
                        case "min":
                            measured[i] = Number.MAX_VALUE;
                            for (var p=0; p<mainJson[i].dps.length; p++) {
                                measured[i] = Math.min(measured[i], mainJson[i].dps[p][1]);
                            }
                            break;
                        case "max":
                            measured[i] = Number.MIN_VALUE;
                            for (var p=0; p<mainJson[i].dps.length; p++) {
                                measured[i] = Math.max(measured[i], mainJson[i].dps[p][1]);
                            }
                            break;
                    }
                    sorted[i] = measured[i];
                }
                // increasing order
                sorted.sort(function(a,b){return a-b;}); // default sort is alphanumeric!
                if (dygraphOptions.countFilter.end == "top") {
                    var thresholdIndex1 = (mainJson.length - dygraphOptions.countFilter.count);
                    var threshold1 = sorted[thresholdIndex1];
                    for (var i=mainJson.length-1; i>=0; i--) {
                        if (measured[i] < threshold1) {
                            filteredOut.push(mainJson[i]);
                            mainJson.splice(i,1);
                            measured.splice(i,1);
                        }
                    }
                }
                else if (dygraphOptions.countFilter.end == "bottom") {
                    var thresholdIndex2 = dygraphOptions.countFilter.count - 1;
                    var threshold2 = sorted[thresholdIndex2];
                    for (var i=mainJson.length-1; i>=0; i--) {
                        if (measured[i] > threshold2) {
                            filteredOut.push(mainJson[i]);
                            mainJson.splice(i,1);
                            measured.splice(i,1);
                        }
                    }
                }
            }
            if (dygraphOptions.valueFilter != null && (dygraphOptions.valueFilter.lowerBound != "" || dygraphOptions.valueFilter.upperBound != "")) {
                if ((dygraphOptions.countFilter && dygraphOptions.valueFilter.measure != dygraphOptions.countFilter.measure) || measured == null) {
                    measured = new Array(mainJson.length);
                    for (var i=0; i<mainJson.length; i++) {
                        switch (dygraphOptions.valueFilter.measure) {
                            case "mean":
                                measured[i] = 0;
                                for (var p=0; p<mainJson[i].dps.length; p++) {
                                    measured[i] +=  mainJson[i].dps[p][1];
                                }
                                measured[i] /= mainJson[i].dps.length;
                                break;
                            case "min":
                                measured[i] = Number.MAX_VALUE;
                                for (var p=0; p<mainJson[i].dps.length; p++) {
                                    measured[i] = Math.min(measured[i], mainJson[i].dps[p][1]);
                                }
                                break;
                            case "max":
                                measured[i] = Number.MIN_VALUE;
                                for (var p=0; p<mainJson[i].dps.length; p++) {
                                    measured[i] = Math.max(measured[i], mainJson[i].dps[p][1]);
                                }
                                break;
                        }
                    }
                }
                var include = new Array(mainJson.length);
                for (var i=mainJson.length-1; i>=0; i--) {
                    include[i] = true;
                    switch (dygraphOptions.valueFilter.measure) {
                        case "mean":
                        case "min":
                        case "max":
                            if (dygraphOptions.valueFilter.lowerBound != "") {
                                if (measured[i] < dygraphOptions.valueFilter.lowerBound) {
                                    include[i] = false;
                                }
                            }
                            if (dygraphOptions.valueFilter.upperBound != "") {
                                if (measured[i] > dygraphOptions.valueFilter.upperBound) {
                                    include[i] = false;
                                }
                            }
                            break;
                        case "any":
                            include[i] = false;
                            for (var p=0; p<mainJson[i].dps.length; p++) {
                                var includePoint = true;
                                if (dygraphOptions.valueFilter.lowerBound != "") {
                                    if (mainJson[i].dps[p][1] < dygraphOptions.valueFilter.lowerBound) {
                                        includePoint = false;
                                    }
                                }
                                if (dygraphOptions.valueFilter.upperBound != "") {
                                    if (mainJson[i].dps[p][1] > dygraphOptions.valueFilter.upperBound) {
                                        includePoint = false;
                                    }
                                }
                                if (includePoint) {
                                    include[i] = true;
                                    break;
                                }

                            }
                    }
                    if (!include[i]) {
                        filteredOut.push(mainJson[i]);
                        mainJson.splice(i,1);
                        measured.splice(i,1);
                    }
                }
            }

            if (mainJson.length == 0) {
                $scope.renderErrors[graph.id] = "Value filtering excluded all time series";
                $scope.renderMessages[graph.id] = "";
                return;
            }
            
            // now filter out of baselineJson based on filteredOut
            if (baselining && measured != null) {
                var filteredOutByQuery = {};
                for (var s=0; s<filteredOut.length; s++) {
                    var str = JSON.stringify(filteredOut[s].query);
                    if (!(str in filteredOutByQuery)) {
                        filteredOutByQuery[str] = [];
                    }
                    filteredOutByQuery[str].push(filteredOut[s]);
                }
                
                var allTagsMatch = function(tags1, tags2) {
                    var tagsArray1 = [];
                    for (var k in tags1) {
                        if (tags1.hasOwnProperty(k)) {
                            tagsArray1.push(k);
                        }
                    }
                    var tagsArray2 = [];
                    for (var k in tags2) {
                        if (tags2.hasOwnProperty(k)) {
                            tagsArray2.push(k);
                        }
                    }
                    if (tagsArray1.length != tagsArray2.length) {
                        return false;
                    }
                    for (var i=0; i<tagsArray1.length; i++) {
                        var k = tagsArray1[i];
                        if (tags2.hasOwnProperty(k)) {
                            if (tags1[k] != tags2[k]) {
                                return false;
                            }
                        }
                        else {
                            return false;
                        }
                    }
                    return true;
                }
                
                for (var s=baselineJson.length-1; s>=0; s--) {
                    var str = JSON.stringify(baselineJson[s].query);
                    // ok, we have definitely removed some results from this query
                    if (str in filteredOutByQuery) {
                        for (var i=0; i<filteredOutByQuery[str].length; i++) {
                            if (allTagsMatch(baselineJson[s].tags, filteredOutByQuery[str].tags)) {
                                baselineJson.splice(s,1);
                                delete filteredOutByQuery[str];
                                break;
                            }
                        }
                    }
                }
            }


            // indices, used to track progress through dps arrays
            var mainIndices1 = new Array(mainJson.length);
            var mainIndices2 = new Array(mainJson.length);
            var mainIndices3 = new Array(mainJson.length);
            for (var s=0; s<mainJson.length; s++) {
                mainIndices1[s] = 0;
                mainIndices2[s] = 0;
                mainIndices3[s] = 0;
            }
            var baselineIndices1;
            var baselineIndices2;
            var baselineIndices3;
            if (baselining) {
                baselineIndices1 = new Array(baselineJson.length);
                baselineIndices2 = new Array(baselineJson.length);
                baselineIndices3 = new Array(baselineJson.length);
                for (var s=0; s<baselineJson.length; s++) {
                    baselineIndices1[s] = 0;
                    baselineIndices2[s] = 0;
                    baselineIndices3[s] = 0;
                }
            }
            
            // now we've filtered we can work out the set of annotations which need rendering
            var annotations = [];
            var discoverAnnotations = function(json, indices, isBaseline) {
                var globalAnnotations = [];
                for (var s=0; s<json.length; s++) {
                    json[s].annotations.sort(function(a,b){
                        var ret = a.startTime - b.startTime;
                        if (ret == 0) {
                            if (a.endTime == null || b.endTime == null) {
                                return 0;
                            }
                            return a.endTime - b.endTime;
                        }
                        return ret;
                    });
                    for (var p= 0, a=0; p<json[s].dps.length && a<json[s].annotations.length; ) {
                        var t = json[s].dps[p][0];
                        var annT = json[s].annotations[a].startTime; // todo: how do we represent endTime with dygraph?
                        if (t < annT) {
                            // annotation after last point
                            if (p == json[s].dps.length - 1) {
                                // add a point at the end
                                // let dygraphs interpolate
                                json[s].dps.push([annT,null]);
                                // insert annotation
                                annotations.push([json[s], json[s].annotations[a], isBaseline]);
                                // next annotation
                                a++;
                            }
                            // annotation after a mid point
                            else {
                                p++;
                            }
                        }
                        else if (t == annT) {
                            // we have a point at the correct time, this is good
//                            console.log("inserting annotation at existing point")
                            annotations.push([json[s], json[s].annotations[a], isBaseline]);
                            a++;
                        }
                        else { // t > annT
                            // annotation needs to go in here
                            // let dygraphs interpolate
                            json[s].dps.splice(p,0,[annT,null]);
                            // insert annotation
                            annotations.push([json[s], json[s].annotations[a], isBaseline]);
                            // next annotation
                            a++;
                        }
                    }
                    if (dygraphOptions.globalAnnotations && globalAnnotations.length == 0 && json[s].globalAnnotations.length > 0) {
                        globalAnnotations = json[s].globalAnnotations;
                        globalAnnotations.sort(function(a,b){
                            var ret = a.startTime - b.startTime;
                            if (ret == 0) {
                                if (a.endTime == null || b.endTime == null) {
                                    return 0;
                                }
                                return a.endTime - b.endTime;
                            }
                            return ret;
                        });
                    }
                }
                if (dygraphOptions.globalAnnotations && globalAnnotations.length > 0) {
                    for (var a=0; a<globalAnnotations.length; a++) {
                        var annT = globalAnnotations[a].startTime;
                        var hitAtTime = false;
                        for (var s=0; s<json.length; s++) {
                            while (indices[s] < json[s].dps.length && json[s].dps[indices[s]][0] < annT) {
                                indices[s]++;
                            }
                            if (indices[s] < json[s].dps.length && json[s].dps[indices[s]][0] == annT) {
                                hitAtTime = true;
                            }
                        }
                        // now each index is either past the end of the points, or dps[index].time >= annotation.startTime
                        var annotationAdded = false;
                        for (var s=0; s<json.length; s++) {
                            var p = indices[s];
                            if (p < json[s].dps.length) {
                                var t = json[s].dps[indices[s]][0];
                                if (t == annT) {
                                    if (!annotationAdded) {
                                        annotations.push([json[s], globalAnnotations[a], isBaseline]);
                                        annotationAdded = true;
                                    }
                                }
                                else { // t > annT
                                    // ensure it gets added somewhere, so here is good enough
                                    if (!hitAtTime && !annotationAdded) {
                                        annotations.push([json[s], globalAnnotations[a], isBaseline]);
                                        // put in a null point here
                                        json[s].dps.splice(p,0,[annT,null]);
                                        annotationAdded = true;
                                    }
                                }
                            }
                            // past end of dps
                            else if (!annotationAdded) {
                                annotations.push([json[s], globalAnnotations[a], isBaseline]);
                                json[s].dps.push([annT, null]);
                                annotationAdded = true;
                            }
                        }
                    }
                }
            }
            if (dygraphOptions.annotations) {
                discoverAnnotations(mainJson, mainIndices1, false);
                if (baselining) {
                    discoverAnnotations(baselineJson, baselineIndices1, true);
                }
            }

            // 4. initial label setting (both sets)
            var mainLabels = ["x"];
            var baselineLabels = ["x"];
            for (var t=0; t<mainJson.length; t++) {
                var name = $scope.timeSeriesName(mainJson[t]);
                mainLabels.push(name);
            }
            if (baselining) {
                for (var t=0; t<baselineJson.length; t++) {
                    var name = $scope.timeSeriesName(baselineJson[t]);
                    baselineLabels.push(name+"[BL]");
                }
            }

            // 5. auto-scaling and label adjustment (both together)
            var scaleMultiplierByMetricName = {}; // default 1
            
            var initScaleMultipliers = function(json) {
                for (var s=0; s<json.length; s++) {
                    scaleMultiplierByMetricName[json[s].metric] = 1;
                }
            }
            initScaleMultipliers(mainJson);
            if (baselining) {
                initScaleMultipliers(baselineJson);
            }
            
            if (dygraphOptions.autoScale) {
                var maxValueByMetricName = {};
                
                var calcMaxValues = function(json) {
                    for (var s=0; s<json.length; s++) {
                        scaleMultiplierByMetricName[json[s].metric] = 1;
                        var max = 0;
                        var min = Number.MAX_VALUE;
                        for (var p=0; p<json[s].dps.length; p++) {
                            max = Math.max(max, json[s].dps[p][1]);
                            min = Math.min(min, json[s].dps[p][1]);
                        }
                        if (!dygraphOptions.squashNegative && min < 0) {
                            max = Math.max(max, Math.abs(min));
                        }
                        if (maxValueByMetricName[json[s].metric] == null)
                        {
                            maxValueByMetricName[json[s].metric] = max;
                        }
                        else {
                            maxValueByMetricName[json[s].metric] = Math.max(maxValueByMetricName[json[s].metric], max);
                        }
                    }
                }
                
                calcMaxValues(mainJson);
                if (baselining) {
                    calcMaxValues(baselineJson);
                }

                var maxl = 0;
                for (var metric in maxValueByMetricName) {
                    var logMax = parseInt(Math.log(maxValueByMetricName[metric])/Math.log(10));
                    if (logMax>maxl) {
                        maxl = logMax;
                    }
                }
                
                for (var metric in maxValueByMetricName) {
                    var pow = parseInt(Math.log(maxValueByMetricName[metric])/Math.log(10));
                    var l = maxl - pow;
                    if (l > 0) {
                        scaleMultiplierByMetricName[metric] = Math.pow(10, l);
                    }
                }

                var updateScaleFactors = function(json, labels) {
                    for (var s=0;s<json.length;s++) {
                        var scale = scaleMultiplierByMetricName[json[s].metric];
                        if (scale > 1) {
                            labels[s+1] = scale+"x "+labels[s+1];
                        }
                    }
                }
                updateScaleFactors(mainJson, mainLabels);
                if (baselining) {
                    updateScaleFactors(baselineJson, baselineLabels);
                }
            }

            // 6. baseline time adjustment
            if (baselining) {
                var baselineOffset = $scope.baselineOffset(global, datum).asMilliseconds();
                for (var s=0; s<baselineJson.length; s++) {
                    for (var p=0; p<baselineJson[s].dps.length; p++) {
                        baselineJson[s].dps[p][0] += baselineOffset;
                    }
                }
            }

            // 7. min/max time calculations (together)
            var minTime = mainJson[0].dps[0][0];
            var maxTime = mainJson[0].dps[mainJson[0].dps.length-1][0];
            for (var s=1; s<mainJson.length; s++) {
                minTime = Math.min(minTime, mainJson[s].dps[0][0]);
                maxTime = Math.max(maxTime, mainJson[s].dps[mainJson[s].dps.length-1][0]);
            }
            if (baselineJson != null) {
                for (var s=0; s<baselineJson.length; s++) {
                    minTime = Math.min(minTime, baselineJson[s].dps[0][0]);
                    maxTime = Math.max(maxTime, baselineJson[s].dps[baselineJson[s].dps.length-1][0]);
                }
            }
            
            var ignoredOptions = [];
            if (dygraphOptions.ratioGraph) {
                if (dygraphOptions.meanAdjusted) {
                    ignoredOptions.push("mean adjustment");
                }
                if (dygraphOptions.autoScale) {
                    ignoredOptions.push("auto scaling");
                }
            }
            else if (dygraphOptions.meanAdjusted) {
                if (dygraphOptions.autoScale) {
                    ignoredOptions.push("auto scaling");
                }
            }
            var ignoredBecause = null;

            // 8. seperate processing
            //  a. ratio graphs
            //  b. mean adjustment
            //  c. negative squashing
            var seperateProcessing = function(json, indices) {
//                console.log("seperateProcessing:");
//                console.log("json = "+JSON.stringify(json));
                for (var t=minTime; t<=maxTime; ) {
//                    console.log("t = "+t);
                    var nextTime = maxTime + 1; // break condition
                    var sum = 0; // for mean adjusted graphs
                    var hadValue = [];
                    for (var s=0; s<json.length; s++) {
                        hadValue.push(false);
                        if (indices[s] >= json[s].dps.length) {
                            // skip this one
                        }
                        else if (json[s].dps[indices[s]][0] == t) {
                            hadValue[s] = true;
                            var val = json[s].dps[indices[s]][1];
                            if (dygraphOptions.squashNegative && val < 0) {
                                json[s].dps[indices[s]][1] = 0;
                                val = 0;
                            }
                            indices[s]++;
                            if (indices[s] < json[s].dps.length) {
                                nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                            }
                            if (dygraphOptions.ratioGraph) {
                                sum += Math.abs(val);
                            }
                            else if (dygraphOptions.meanAdjusted) {
                                sum += val;
                            }
                        }
                        else {
                            nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                        }
                    }
                    if (dygraphOptions.ratioGraph) {
                        for (var s=0; s<json.length; s++) {
                            if (hadValue[s] && json[s].dps[indices[s]-1][1]!=null && !isNaN(json[s].dps[indices[s]-1][1])) {
                                json[s].dps[indices[s]-1][1] = (json[s].dps[indices[s]-1][1] * 100) / sum;
                            }
                        }
                        ignoredBecause = "ratio graphs";
                    }
                    else if (dygraphOptions.meanAdjusted) {
                        var mean = sum / json.length;
                        for (var s=0; s<json.length; s++) {
//                            console.log("s = "+s);
//                            console.log("indices[s] = "+indices[s]);
                            if (hadValue[s] && json[s].dps[indices[s]-1][1]!=null && !isNaN(json[s].dps[indices[s]-1][1])) {

//                                console.log("val = "+json[s].dps[indices[s]-1][1]);
//                                console.log("mean = "+mean);
                                json[s].dps[indices[s]-1][1] -= mean;
                            }
                        }
                        ignoredBecause = "mean adjustment";
                    }
                    else if (dygraphOptions.autoScale) {
                        for (var s=0; s<json.length; s++) {
                            if (hadValue[s] && json[s].dps[indices[s]-1][1]!=null && !isNaN(json[s].dps[indices[s]-1][1])) {
                                json[s].dps[indices[s]-1][1] *= scaleMultiplierByMetricName[json[s].metric];
                            }
                        }
                        ignoredBecause = "auto scaling";
                    }
                    t = nextTime;
                }
            }
            
            seperateProcessing(mainJson, mainIndices2);
            if (baselining) {
                seperateProcessing(baselineJson, baselineIndices2);
            }
          
            // ie we had some clashes and some data..
            if (ignoredBecause != null && ignoredOptions.length > 0) {
                var buff = "";
                var sep = "Ignored ";
                for (var i=0; i<ignoredOptions.length; i++) {
                    buff += sep + ignoredOptions[i];
                    sep = " and ";
                }
                buff += " as not compatible with " + ignoredBecause;
                
                $scope.renderWarnings[graph.id] = buff;
            }

            // 9. gap filling / merge timeseries (together)
            for (var t=minTime; t<=maxTime; ) {
                var row = [new Date(t)];
                var nextTime = maxTime + 1; // break condition
                var gapFillAndMergeJson = function(json, indices) {
                    for (var s=0; s<json.length; s++) {
                        // gap filling
                        if (indices[s] >= json[s].dps.length) {
                            row.push(null);
                        }
                        else if (json[s].dps[indices[s]][0] == t) {
                            var val = json[s].dps[indices[s]][1];
                            row.push(val);
                            indices[s]++;
                            if (indices[s] < json[s].dps.length) {
                                nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                            }
                        }
                        else {
                            row.push(null);
                            nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                        }
                    }
                }
                gapFillAndMergeJson(mainJson, mainIndices3);
                if (baselining) {
                    gapFillAndMergeJson(baselineJson, baselineIndices3);
                }
                graphData.push(row);
                t = nextTime;
            }

            var positionLegend = function() {
                var container = d3.select("#scrollable-graph-panel").node();
                // null in unt tests
                if (container != null) {
                    var graphPanelBox = container.getBoundingClientRect();
                    var graphBox = d3.select("#dygraphDiv_"+graph.id).node().getBoundingClientRect();
                    // top needs to be relative to this panel, not whole window
                    var legendTop = graphBox.top - graphPanelBox.top;
                    // and now we just go find the rule we added and set the top/height
                    d3.select("#dygraphLegend_"+graph.id)
                      .style("top", legendTop+"px")
                      .style("height",graphBox.height+"px")
                      .style("width",graphBox.width+"px");
                }
            }

            positionLegend();

            $scope.addGraphRenderListener(function (graphId) {
                if (graphId != graph.id) {
                    positionLegend();
                }
            });

            // 10. merge labels
            var labels = mainLabels;
            if (baselining) {
                for (var s=1; s<baselineLabels.length; s++) {
                    labels.push(baselineLabels[s]);
                }
            }

            var labelsDiv = document.getElementById("dygraphLegend_"+graph.id);
            var config = {
                labels: labels,
                width: width,
                height: height,
                legend: "always",
                logscale: dygraphOptions.ylog,
                stackedGraph: dygraphOptions.stackedLines,
                connectSeparatedPoints: dygraphOptions.interpolateGaps,
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: { fontSize: 9, textAlign: 'right' },
                labelsSeparateLines: true,
                labelsDiv: labelsDiv,
                labelsDivWidth: 1000,
                axes: {
                    y: {
                        valueFormatter: function(y) {
                            if (isNaN(y) || y < 1000) {
                                return "" + y;
                            }
                            return y.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",")
                        },
                        axisLabelFormatter: function(y) {
                            if (isNaN(y) || y < 1000) {
                                return "" + Dygraph.round_(y, 3);
                            }
                            return y.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",")
                        }
                    }
                }
            };
            if (dygraphOptions.highlightLines) {
                config.highlightSeriesOpts = {
                    strokeWidth: 3,
                    strokeBorderWidth: 1,
                    highlightCircleSize: 5
                };
                config.highlightCallback = function(event, x, points, row, seriesName) {
                    if (labelsDiv) {
                        //find the y val
                        var yval = '';
                        for (var i=0;i<points.length;i++) {
                            if (points[i].name==seriesName) {
                                yval = points[i].yval;
                                break;
                            }
                        }
                        labelsDiv.innerHTML = "<span><b>" + seriesName + "</b>" + " "
                            + Dygraph.hmsString_(x) + ", " + yval + "</span>";
                    }
                }

            }

            var dygraph = $scope.dygraph_render("dygraphDiv_"+graph.id, graph.id, graphData, config);

            dygraph.canvas_.style["z-index"] = "20";

            var createDygraphAnnotation = function(g, seriesAndAnnotation) {
                var series = seriesAndAnnotation[0];
                var annotation = seriesAndAnnotation[1];
                var icon = "unknown.jpg";
                if (annotation.custom && annotation.custom.type) {
                    if (annotation.custom.type.toUpperCase() == "CONFIG") {
                        icon = "config.jpg"
                    }
                    else if (annotation.custom.type.toUpperCase() == "DEPLOYMENT") {
                        icon = "deployment.jpg"
                    }
                    else if (annotation.custom.type.toUpperCase() == "PROBLEM") {
                        icon = "problem.jpg"
                    }
                }
                
                var label = $scope.timeSeriesName(series);
                var scale = scaleMultiplierByMetricName[seriesAndAnnotation[0].metric];
                if (scale > 1) {
                    label = scale+"x "+label;
                }
                var baseline = seriesAndAnnotation[2];
                var offsetMs = 0;
                if (baseline) {
                    label += "[BL]";
                    offsetMs = $scope.baselineOffset(global, datum).asMilliseconds();
                }

                var ret = {
                    series: label,
                    xval: annotation.startTime + offsetMs,
                    height: 16,
                    width: 16,
                    icon: icon,
                    attachAtBottom: true,
                    tickHeight: g.height - 16,
                    text: annotation.description
                };


                return ret;
            }
            
            if (dygraphOptions.annotations) {
                var dygraphAnnotations = [];
                for (var a=0; a<annotations.length; a++) {
                    dygraphAnnotations.push(createDygraphAnnotation(dygraph, annotations[a]));
                }
                $scope.dygraph_setAnnotations(dygraph, dygraphAnnotations);
            }



            $scope.renderMessages[graph.id] = "";
            $scope.graphRendered(graph.id);
            return;
            
        }

        // 1. make both queries
        var url = constructUrl($scope.tsdb_queryString, null);
        var baselineUrl = global.baselining ? constructUrl($scope.tsdb_queryStringForBaseline, datum) : null;

        // now we have the url, so call it!
        $http.get(url).success(function (json) {
            if (errorResponse) {
                return;
            }
            mainJson = json;
            if (!global.baselining || baselineJson != null) {
                processJson();
            }
            // else wait for baseline data
        }).error(function (arg) {
            $scope.renderMessages[graph.id] = "Error loading data: "+arg;
            errorReponse = true;
            return;
        });
        
        if (global.baselining) {
            $http.get(baselineUrl).success(function (json) {
                if (errorResponse) {
                    return;
                }
                baselineJson = json;
                if (mainJson != null) {
                    processJson();
                }
                // else wait for main data
            }).error(function (arg) {
                $scope.renderMessages[graph.id] = "Error loading data: "+arg;
                errorReponse = true;
                return;
            });
        }
    };
    $scope.renderers["scatter"] = function(global, graph, metrics) {
        var fromTimestamp = $scope.tsdb_fromTimestampAsTsdbString(global);
        // validation
        if (fromTimestamp == null || fromTimestamp == "") {
            $scope.renderErrors[graph.id] = "No start date specified";
            return;
        }
        if (metrics == null || metrics.length == 0) {
            $scope.renderErrors[graph.id] = "No metrics specified";
            return;
        }
        if (metrics.length != 2) {
            $scope.renderErrors[graph.id] = "Require exactly 2 metrics, currently have "+metrics.length;
            return;
        }

        var scatterOptions = graph.scatter;
        if (!scatterOptions) {
            scatterOptions = {};
        }
        
        $scope.renderMessages[graph.id] = "Loading...";

        // url construction
        var url = "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/api/query";

        url += $scope.tsdb_queryString(global, graph, metrics);

        url += "&no_annotations=true&ms=true";

        // now we have the url, so call it!
        $http.get(url).success(function (json) {
            if (json.length != 2) {
                $scope.renderErrors[graph.id] = "TSDB results doesn't contain exactly 2 metrics, was "+json.length;
                $scope.renderMessages[graph.id] = "";
                return;
            }
            
            var xSeries;
            var ySeries;
            if (metrics[0].graphOptions.scatter.axis == "y" || metrics[1].graphOptions.scatter.axis == "x") {
                xSeries = json[1];
                ySeries = json[0];
            }
            else if (metrics[0].graphOptions.scatter.axis == "x" || metrics[1].graphOptions.scatter.axis == "y") {
                xSeries = json[0];
                ySeries = json[1];
            }
            // by default first metric is x
            else {
                xSeries = json[0];
                ySeries = json[1];
            }
            
            var data = [];
            for (var t in xSeries.dps) {
                if (xSeries.dps.hasOwnProperty(t) && ySeries.dps.hasOwnProperty(t)) {
                    if (scatterOptions.excludeNegative && (xSeries.dps[t] < 0 || ySeries.dps[t] < 0)) {
                        continue;
                    }
                    data.push([xSeries.dps[t], ySeries.dps[t]]);
                }
            }
            data.sort(function (a,b) {
                return a[0] - b[0];
            });

            var positionLegend = function() {
                var container = d3.select("#scrollable-graph-panel").node();
                // null in unt tests
                if (container != null) {
                    var graphPanelBox = container.getBoundingClientRect();
                    var graphBox = d3.select("#scatterDiv_"+graph.id).node().getBoundingClientRect();
                    // top needs to be relative to this panel, not whole window
                    var legendTop = graphBox.top - graphPanelBox.top;
                    // and now we just go find the rule we added and set the top/height
                    d3.select("#scatterLegend_"+graph.id).style("top", legendTop+"px");
                }
            }

            positionLegend();
            
            var labels = ["x", $scope.timeSeriesName(xSeries) + " (x) vs " + $scope.timeSeriesName(ySeries) + " (y)"];
            var labelsDiv = document.getElementById("scatterLegend_"+graph.id);
            
            var width = Math.floor(graph.graphWidth);
            var height = Math.floor(graph.graphHeight);
            var config = {
                labels: labels,
                width: width,
                height: height,
                legend: "always",
                drawPoints: true,
                strokeWidth: 0.0,
//                logscale: scatterOptions.ylog,
                axisLabelFontSize: 9,
                labelsDivStyles: { fontSize: 9, textAlign: 'right' },
                labelsSeparateLines: true,
                labelsDiv: labelsDiv,
                labelsDivWidth: 1000
            };

            $scope.dygraph_render("scatterDiv_"+graph.id, graph.id, data, config);

            $scope.renderMessages[graph.id] = "";
            $scope.graphRendered(graph.id);
            return;
        })
        .error(function (arg) {
            $scope.renderMessages[graph.id] = "Error loading data: "+arg;
            return;
        });
    };

    $rootScope.renderGraphs = function(boundingBox) {
        // set width / height
        var width = 0;
        var height = 0;
        // simple for now - this would have to change if we do dashboarding
        if (boundingBox == null) {
            boundingBox = document.getElementById("graph-panel");
        }
        if (boundingBox != null) {
            // extra 20px off in both dirs to account for scroll bars
            width = boundingBox.clientWidth-24;
            height = boundingBox.clientHeight-($rootScope.model.graphs.length*20)-20; // for titles
        }
        var eachHeight = 0;
        if ($rootScope.model.global.autoGraphHeight) {
            eachHeight = height / $rootScope.model.graphs.length;
            var minGraphHeight = $rootScope.model.global.minGraphHeight == "" ? 0 : parseInt($rootScope.model.global.minGraphHeight);
            if (eachHeight < minGraphHeight) {
                eachHeight = minGraphHeight;
            }
        }
        else {
            eachHeight = $rootScope.model.global.graphHeight;
        }
        // not global to allow rendering code to be shared with future dashboards
        for (var i=0; i<$rootScope.model.graphs.length; i++) {
            var graph = $rootScope.model.graphs[i];
            graph.graphWidth = width;
            graph.graphHeight = eachHeight;
        }
        // todo: could be cleverer about clearing in case some graphs haven't changed
        // ie track ids found and delete others
        $scope.clearGraphRenderListeners();
        for (var graphId in $scope.dygraphs) {
            if ($scope.dygraphs.hasOwnProperty(graphId)) {
                $scope.dygraphs[graphId].destroy();
            }
        }
        $scope.dygraphs = {};
        $scope.renderedContent = {};
        $scope.renderErrors = {};
        $scope.renderWarnings = {};
        $scope.renderMessages = {};
        var global = $rootScope.model.global || {};
        for (var i=0; i<$rootScope.model.graphs.length; i++) {
            var graph = $rootScope.model.graphs[i];
            var renderer = $scope.renderers[graph.type];
            if (renderer) {
                var metrics = [];
                for (var j=0; j<$rootScope.model.metrics.length; j++) {
                    var metricGraphId = $rootScope.model.metrics[j].graphOptions.graphId;
                    if (metricGraphId==graph.id) {
                        metrics.splice(metrics.length, 0, $rootScope.model.metrics[j]);
                    }
                }
                renderer(global, graph, metrics);
            }
        }
    };
    $rootScope.onConfigUpdate(function() {
        $rootScope.renderGraphs();
    });
}]);
