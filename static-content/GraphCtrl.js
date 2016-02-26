/*
 * Graph rendering
 */
otis.controller('GraphCtrl', [ '$scope', '$rootScope', '$http', 'bsLoadingOverlayService', function GraphCtrl($scope, $rootScope, $http, bsLoadingOverlayService) {
    $scope.renderedContent = {};
    $scope.renderErrors = {};
    $scope.renderWarnings = {};
    $scope.imageRenderCount = 0;
    // loading overlays
    $scope.showOverlay = function (referenceId) {
//        alert('showOverlay: '+referenceId);
        bsLoadingOverlayService.start({
            referenceId: referenceId
        });
    };

    $scope.hideOverlay = function (referenceId) {
//        alert('hideOverlay: '+referenceId);
        bsLoadingOverlayService.stop({
            referenceId: referenceId
        });
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
    $scope.tsdb_distinctGraphLines = function(metric, fn) {
        // returns a map of string to metric with tag set which represents a single line (fully defined tags only, tag omissions allowed to aggregate)
        // string will be the metric name and interesting tags only (ie won't include aggregate tags)
        var tagsAndValues = [];
        var tagsToGetFromServer = [];
        for (var i=0; i<metric.tags.length; i++) {
            var tag = metric.tags[i];
            var tagk = tag.name;
            var tagv = tag.value;
            if (tagv == null || tagv == undefined || tagv == "") {
                continue;
            }
            if (tagv == "*") {
                tagsToGetFromServer.push(tagk);
            }
            else if (tagv.indexOf("|") >= 0) {
                tagsAndValues.push({tagk: tagk, tagvs: tagv.split("|")});
            }
            else {
                tagsAndValues.push({tagk: tagk, tagvs: [tagv]});
            }
        }


        var iterateTagSets = function(metric, tagsAndValues, tagMap, index, lineMap) {
            // and now call the fn
            if (index >= tagsAndValues.length) {
                var tagsArg = {};
                var tagString = "{";
                var sep = "";
                for (var tagk in tagMap) {
                    if (tagMap.hasOwnProperty(tagk)) {
                        var tagv = tagMap[tagk];
                        tagsArg[tagk] = tagv;
                        tagString += sep + tagk + "=" + tagv;
                        sep=",";
                    }
                }
                tagString += "}";
                if (tagString == "{}") {
                    tagString = "";
                }
                lineMap[metric.name+tagString] = tagsArg;
                return;
            }

            var tagAndValues = tagsAndValues[index];
            for (var v=0; v<tagAndValues.tagvs.length; v++) {
                var tagv = tagAndValues.tagvs[v];
                tagMap[tagAndValues.tagk] = tagv;
                iterateTagSets(metric, tagsAndValues, tagMap, index+1, lineMap);
                tagMap[tagAndValues.tagk] = null;
            }
        }

        var httpCallback = function(json, tagsToFill, metric, tagsAndValues, lineMap) {
            // fill in blanks
            if (tagsToFill.length != 0) {
                for (var t=0; t<tagsToFill.length; t++) {
                    var tagk = tagsToFill[t];
                    tagsAndValues.push({tagk: tagk, tagvs: json[tagk]});
                }
            }

            // now we can safely construct the array
            iterateTagSets(metric, tagsAndValues, {}, 0, lineMap);
        }

        if (tagsToGetFromServer.length > 0) {
            $http.get("/otis/tags?metric="+metric.name)
                .success(function (json) {
                    var lineMap = {};
                    httpCallback(json, tagsToGetFromServer, metric, tagsAndValues, lineMap);
                    for (var key in lineMap) {
                        if (lineMap.hasOwnProperty(key)) {
                            fn(lineMap);
                            return;
                        }
                    }
                    // no tag sets - shouldn't get here
                    var ret = {};
                    ret[metric.name] = {};
                    fn(ret);
                })
                .error(function (arg) {
                    console.log("error in http call: "+arg);
                    // default response
                    var ret = {};
                    ret[metric.name] = {};
                    fn(ret);
                });
        }
        else {
            var lineMap = {};
            iterateTagSets(metric, tagsAndValues, {}, 0, lineMap);
            fn(lineMap);
        }
    }
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


    $scope.cubism_opentsdb = function (context, address) {
        if (!arguments.length) {
            address = "";
        }
        var source = {};

        source.metric = function (metric, rateString, tagMap, name) {
            var aggregator = "sum";
            var downsampler = "avg";
            var interpolate = false;
            var squashNegatives = false;

            var ret = context.metric(function (start, stop, step, callback) {
                // m=<aggregator>:[rate[{counter[,<counter_max>[,<reset_value>]]]}:][<down_sampler>:]<metric_name>[{<tag_name1>=<grouping filter>[,...<tag_nameN>=<grouping_filter>]}][{<tag_name1>=<non grouping filter>[,...<tag_nameN>=<non_grouping_filter>]}]
                var target = aggregator + (rateString ? ":" + rateString : "");

//            if (step !== 1e4) {
                target += ":" + (!(step % 36e5) ? step / 36e5 + "h" : !(step % 6e4) ? step / 6e4 + "m" : step / 1e3 + "s") + "-" + downsampler;
//            }

                target += ":" + metric;
                if (tagMap) {
                    target += "{";
                    var sep = "";
                    for (var tagk in tagMap) {
                        if (tagMap.hasOwnProperty(tagk)) {
                            target += sep + tagk + "=" + tagMap[tagk];
                            sep = ",";
                        }
                    }
                    target += "}";
                }

                var url = address + "/api/query"
                    + "?m=" + encodeURIComponent(target)
                    + "&start=" + $scope.cubism_opentsdbFormatDate(start)
                    + "&end=" + $scope.cubism_opentsdbFormatDate(stop)
                    + "&ms=true"
                    + "&global_annotations=true"
                    + "&arrays=true";

                d3.json(url, function (json) {
                    if (!json) {
                        return callback(new Error("unable to load data"));
                    }
                    var parsed = $scope.cubism_opentsdbParse(json, start, step, interpolate, squashNegatives); // array response
                    callback(null, parsed[0]);
                });
            }, name);

            ret.aggregate = function (_) {
                aggregator = _;
                return ret;
            };

            ret.downsample = function (_) {
                downsampler = _;
                return ret;
            };

            ret.interpolate = function (_) {
                interpolate = _;
                return ret;
            }

            ret.squashNegatives = function(_) {
                squashNegatives = _;
                return ret;
            }

            return ret;
        }

        source.find = function (pattern, callback) {
            d3.json(address + "/api/suggest?type=metrics&max=1000"
                + "&q=" + encodeURIComponent(pattern), function (result) {
                if (!result) {
                    return callback(new Error("unable to find metrics"));
                }
                callback(null, result.metrics.map(function (d) {
                    return d;
                }));
            });
        };

        // Returns the tsdb address.
        source.toString = function () {
            return host;
        };

        return source;
    };

// Opentsdb understands seconds since UNIX epoch.
    $scope.cubism_opentsdbFormatDate = function(time) {
        return Math.floor(time / 1000);
    }

// Helper method for parsing opentsdb's json response
    $scope.cubism_opentsdbParse = function(json, start, step, interpolate, squashNegatives) {
        // no data
        if (json.length == 0) {
            return [[]];
        }
        return json.map(function (ts) {
            if (ts.dps.length == 0) {
                return [];
            }
            if (interpolate) {
                var firstTime = ts.dps[0][0];
                var ret = [];
                for (var v=start; v<firstTime; v+=step) {
                    ret.push(null);
                }
                var lastValue;
                var lastValueTime;
                var nextIndex = 0;
                for (var v=firstTime; nextIndex<ts.dps.length; v+=step) {
                    if (ts.dps[nextIndex][0] == v) {
                        lastValue = ts.dps[nextIndex][1];
                        lastValueTime = ts.dps[nextIndex][0];
                        ret.push(squashNegatives && lastValue < 0 ? 0 : lastValue);
                        nextIndex++;
                        if (nextIndex>=ts.dps.length) {
                            break;
                        }
                    }
                    else {
                        // interpolate
                        var nextValue = ts.dps[nextIndex][1];
                        var nextTime = ts.dps[nextIndex][0];
                        var timeDiffLastToNext = nextTime - lastValueTime;
                        var timeDiffLastToNow = v - lastValueTime;
                        var value = nextValue + ((nextValue - lastValue) * (timeDiffLastToNow / timeDiffLastToNext));
                        ret.push(squashNegatives && value < 0 ? 0 : value)
                    }
                }
                return ret;
            }
            else {
                if (squashNegatives) {
                    return ts.dps.map(function (array) {
                        return array[1] < 0 ? 0 : array[1];
                    });
                }
                else {
                    return ts.dps.map(function (array) {
                        return array[1];
                    });
                }
            }
        });
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
        $scope.renderedContent[graph.id] = { src: "", width: 0, height: 0 };

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

        // url construction
        var url = "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/q";

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

            url += "&o=axis+"+options.axis;

            // ready for next metric
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

        $scope.showOverlay("graphOverlay_"+graph.id);
        $scope.renderedContent[graph.id] = { src: url, width: width, height: height };
    };
    $scope.renderers["horizon"] = function(global, graph, metrics) {
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


        // todo: clean out old stuff
        // d3.select(divSelector)

//        var diff = 800*86400000;
//        console.log("diff="+diff);

//    console.log("width="+(86400000*800));

        // cubism plots a pixel per step, so we need to calculate step size (we ignore downsampling time measure)
        var width = Math.floor(graph.graphWidth);
        var height = Math.floor(graph.graphHeight);
        var start = $scope.tsdb_fromTimestampAsDate(global);
        var stop = $scope.tsdb_toTimestampAsDate(global);
        var diff = new Date() - start.getTime();
        var timeWidth = stop.getTime() - start.getTime();
        var rawStepSize = timeWidth / width;
        //console.log("raw step = "+rawStepSize);
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

        //console.log("step = "+stepSize);


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


        var context = cubism.context()
            .serverDelay(diff)
            .step(stepSize)
            .size(width)
            .stop();
        var tsdb = $scope.cubism_opentsdb(context, "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort);


        var cubism_axisFormatSeconds = d3.time.format("%H:%M:%S"),
            cubism_axisFormatMinutes = d3.time.format("%H:%M"),
            cubism_axisFormatDays = d3.time.format("%B %d");

        var axisFormat = context.step() < 6e4 ? cubism_axisFormatSeconds
            : context.step() < 864e5 ? cubism_axisFormatMinutes
            : cubism_axisFormatDays;

        d3.select(divSelector).selectAll(".axis")
            .data(["top", "bottom"])
            .enter().append("div")
            .attr("class", function(d) { return d + " axis"; })
            .each(function(d) { d3.select(this).call(context.axis().focusFormat(axisFormat).ticks(12).orient(d)); });

        d3.select(divSelector).append("div")
            .attr("class", "rule")
            .call(context.rule());


        context.on("focus", function(i) {
//        d3.selectAll(".value").style("right", i == null ? null : context.size() - i + "px");
            d3.selectAll(".value").style("right", "10px");
        });

        var cMetrics = [];

        function buildMetrics(metrics, index, cMetrics) {
            var interpolate = graph.horizon && graph.horizon.interpolateGaps;
            var squash = graph.horizon && graph.horizon.squashNegatives;

            if (index >= metrics.length) {

                var perLineHeight = ((height - 62)/cMetrics.length)-2;
                perLineHeight = Math.min(Math.max(perLineHeight,60),25);
                d3.select(divSelector).selectAll(".horizon")
                    .data(cMetrics)
                    .enter().insert("div", ".bottom")
                    .attr("class", "horizon")
                    .call(context.horizon().height(perLineHeight));
                return;
            }

            $scope.tsdb_distinctGraphLines(metrics[index], function(graphLines) {
                for (var lineKey in graphLines) {
                    if (graphLines.hasOwnProperty(lineKey)) {
                        var rateString = metrics[index].graphOptions.rate ? $scope.tsdb_rateString(metrics[index].graphOptions) : "";
                        var m = tsdb.metric(metrics[index].name, rateString, graphLines[lineKey], lineKey)
                                    .interpolate(interpolate)
                                    .squashNegatives(squash);
                        cMetrics.push(m);
                    }
                }

                buildMetrics(metrics, index+1, cMetrics);
            });
        }

        buildMetrics(metrics, 0, cMetrics);
    };

    $rootScope.renderGraphs = function() {
        // todo: could be cleverer about clearing in case some graphs haven't changed
        // ie track ids found and delete others
        $scope.renderedContent = {};
        $scope.renderErrors = {};
        $scope.renderWarnings = {};
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