/*
 * Graph rendering
 */
aardvark.controller('GraphCtrl', [ '$scope', '$rootScope', '$http', function GraphCtrl($scope, $rootScope, $http) {
    $scope.renderedContent = {};
    $scope.renderErrors = {};
    $scope.renderWarnings = {};
    $scope.renderMessages = {};
    $scope.imageRenderCount = 0;
    $scope.lastId = 0;
    $scope.hiddenElements = {};
    $scope.renderListeners = {};
    $scope.dygraphs = {};

    $scope.nextId = function() {
        var next = new Date().getTime();
        if (next <= $scope.lastId) {
            next = $scope.lastId+1;
        }
        $scope.lastId = next;
        return next + "";
    }

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
            return global.fromDate+" "+global.fromTime;
        }
        else {
            if (global.relativePeriod == null || global.relativePeriod == "") {
                return "";
            }
            return global.relativePeriod+"-ago";
        }
    }
    $scope.tsdb_toTimestampAsTsdbString = function(global) {
        if (global.absoluteTimeSpecification) {
            return global.toDate+" "+global.toTime;
        }
        else {
            return null;
        }
    }
    $scope.tsdb_fromTimestampAsDate = function(global, datum) {
        if (global.absoluteTimeSpecification) {
            return moment(global.fromDate+" "+global.fromTime,
                "YYYY/MM/DD HH:mm:ss").toDate();
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
        if (global.absoluteTimeSpecification) {
            return moment(global.toDate+" "+global.toTime,
                "YYYY/MM/DD HH:mm:ss").toDate();
        }
        else {
            return datum ? datum : new Date();
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
            return ret;
        });
    };

    $scope.tsdb_queryString = function(global, graph, metrics, perLineFn) {

        var fromTimestamp = $scope.tsdb_fromTimestampAsTsdbString(global);
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
        if (global.autoReload) {
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
            var toString = $scope.tsdb_toTimestampAsTsdbString(global);
            if (toString != null) {
                url += "&end=" + toString;
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
            if (options.downsample) {
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
                if (tag.value != "") {
                    url += sep + tag.name + "=" + tag.value;
                    sep = ",";
                }
            }
            if (sep == ",") {
                url += "}";
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
            for (var tk = 0; tk < tagNames.length; tk++) {
                name += tagNames[tk] + "=" + metric.tags[tagNames[tk]];
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
    $scope.renderers["dygraph"] = function(global, graph, metrics) {
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

        $scope.renderMessages[graph.id] = "Loading...";
        
        var dygraphOptions = graph.dygraph;
        if (!dygraphOptions) {
            dygraphOptions = {};
        }

        // url construction
        var url = "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/api/query";

        url += $scope.tsdb_queryString(global, graph, metrics);
        
        if (dygraphOptions.annotations || dygraphOptions.globalAnnotations) {
            if (dygraphOptions.globalAnnotations) {
                url += "&global_annotations=true";
            }
        }
        else {
            url += "&no_annotations=true";
        }

        url += "&ms=true&arrays=true";

        // now we have the url, so call it!
        $http.get(url).success(function (json) {

            var width = Math.floor(graph.graphWidth);
            var height = Math.floor(graph.graphHeight);

            var graphData = [];
            var minTime = json[0].dps[0][0];
            var maxTime = json[0].dps[json[0].dps.length-1][0];
            for (var s=1; s<json.length; s++) {
                minTime = Math.min(minTime, json[s].dps[0][0]);
                maxTime = Math.max(maxTime, json[s].dps[json[s].dps.length-1][0]);
            }
            var indices = new Array(json.length);
            for (var s=0; s<json.length; s++) {
                indices[s] = 0;
            }

            var labels = ["x"];
            for (var t=0; t<json.length; t++) {
                var name = $scope.timeSeriesName(json[t]);
                labels.push(name);
            }
            
            var scaleFactors = new Array(json.length);
            if (dygraphOptions.autoScale) {
                var maxValues = new Array(json.length);
                for (var s=0; s<json.length; s++) {
                    scaleFactors[s] = 1;
                    var max = 0;
                    var min = Number.MAX_VALUE;
                    for (var p=0; p<json[s].dps.length; p++) {
                        max = Math.max(max, json[s].dps[p][1]);
                    }
                    if (!dygraphOptions.squashNegative && min < 0) {
                        max = Math.max(max, Math.abs(min));
                    }
                    maxValues[s] = max;
                }

                // loops through to update the maxs array based on base metric name...
                // this is so we scale same base metric to same scale
                var checkedMetrics = new Array();
                for (var s=0; s<json.length; s++) {
                    var metricName = json[s].metric;
                    if (checkedMetrics.indexOf(metricName) == -1) {
                        checkedMetrics.push(metricName);
                        // find the max value for all instances of this metric name
                        var maxThisMetric = maxValues[s];
                        for (var k=s+1; k<json.length; k++) {
                            if (json[k].metric == metricName) {
                                maxThisMetric = Math.max(maxThisMetric, maxValues[k]);
                            }
                        }
                        // set the global max as the max for each instance of this metric name
                        for (var k=s; k<json.length; k++) {
                            if (json[k].metric == metricName) {
                                maxValues[k] = maxThisMetric;
                            }
                        }
                    }
                }



                var maxl = 0;
                for (var s=0; s<maxValues.length; s++) {
                    maxValues[s] = parseInt(Math.log(maxValues[s])/Math.log(10));
                    if (maxValues[s]>maxl) {
                        maxl = maxValues[s];
                    }
                }

                for (var s=0;s<json.length;s++) {
                    var l = maxl - maxValues[s];
                    if (l>0) {
                        scaleFactors[s] = Math.pow(10, l);
                        labels[s] = scaleFactors[s]+"x "+labels[s];
                    }
                }
            }
            for (var t=minTime; t<=maxTime; ) {
                console.log("t = "+t);
                var row = [new Date(t)];
                var nextTime = maxTime + 1; // break condition
                var sum = 0; // for mean adjusted graphs
                for (var s=0; s<json.length; s++) {
                    if (indices[s] >= json[s].dps.length) {
                        row.push(null);
                    }
                    else if (json[s].dps[indices[s]][0] == t) {
                        var val = json[s].dps[indices[s]][1];
                        if (dygraphOptions.squashNegative && val < 0) {
                            val = 0;
                        }
                        row.push(val);
                        indices[s]++;
                        if (indices[s] < json[s].dps.length) {
                            nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                        }
                        if (dygraphOptions.meanAdjusted) {
                            sum += val;
                        }
                    }
                    else {
                        row.push(null);
                    }
                }
                if (dygraphOptions.meanAdjusted) {
                    var mean = sum / json.length;
                    for (var s=0; s<json.length; s++) {
                        if (row[s+1]!=null && !isNaN(row[s+1])) {
                            row[s+1] -= mean;
                        }
                    } 
                }
                if (dygraphOptions.autoScale) {
                    for (var s=0; s<json.length; s++) {
                        if (row[s+1]!=null && !isNaN(row[s+1])) {
                            row[s+1] *= scaleFactors[s];
                        }
                    }
                    
                }
                graphData.push(row);
                t = nextTime;
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

            $scope.dygraph_render("dygraphDiv_"+graph.id, graph.id, graphData, config);
            
            $scope.renderMessages[graph.id] = "";
            $scope.graphRendered(graph.id);
            return;
        })
        .error(function (arg) {
            $scope.renderMessages[graph.id] = "Error loading data: "+arg;
            return;
        });
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

        url += "&ms=true";

        // now we have the url, so call it!
        $http.get(url).success(function (json) {
            if (json.length != 2) {
                $scope.renderErrors[graph.id] = "TSDB results doesn't contain exactly 2 metrics, was "+json.length;
                $scope.renderMessages[graph.id] = "";
                return;
            }
            
            var xSeries;
            var ySeries;
            if (metrics[0].graphOptions.scatter.axis == "x") {
                xSeries = json[0];
                ySeries = json[1];
            }
            else {
                xSeries = json[1];
                ySeries = json[0];
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

    $rootScope.renderGraphs = function() {
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