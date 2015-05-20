/*
 * Graph rendering
 */
otis.controller('GraphCtrl', [ '$scope', '$rootScope', function GraphCtrl($scope, $rootScope) {
    $scope.renderedContent = {};
    $scope.renderErrors = {};
    $scope.renderWarnings = {};
    $scope.imageRenderCount = 0;
    // pre-defined in unit tests
    if (!$scope.renderers) {
        $scope.renderers = {};
    }
    $scope.renderers["debug"] = function(global, graph, metrics) {
        var txt = "";
        for (var i=0; i<metrics.length; i++) {
            var m = metrics[i];
            txt += "["+i+"] " + m.id + ": " + m.name;
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
        }
        $scope.renderedContent[graph.id] = txt;
    };
    $scope.renderers["gnuplot"] = function(global, graph, metrics) {
        $scope.renderedContent[graph.id] = { src: "", width: 0, height: 0 };

        // validation
        if (global.fromTimestamp == null || global.fromTimestamp == "") {
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

        url += "?start=" + global.fromTimestamp;
        if (global.autoReload) {
            // todo: put now in
        }
        else {
            if (global.toTimestamp != "" && global.toTimestamp != null) {
                url += "&end=" + global.toTimestamp;
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
                url += "rate";
                if (options.rateCounter) {
                    url += "{counter";
                    var rctrSep = ",";
                    if (options.rateCounterMax != null && options.rateCounterMax != "") {
                        url += "," + options.rateCounterMax;
                    }
                    else {
                        rctrSep = ",,";
                    }
                    if (options.rateCounterReset != null && options.rateCounterReset != "") {
                        url += rctrSep + options.rateCounterReset;
                    }
                    url += "}";
                }
                url += ":";
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

        var width = 0;
        var height = 0;
        // simple for now - this would have to change if we do dashboarding
        var boundingBox = document.getElementById("graph-panel");
        if (boundingBox != null) {
            width = boundingBox.scrollWidth-4;
            height = boundingBox.scrollHeight-20;
            url += "&wxh="+width+"x"+height;
        }

        $scope.renderedContent[graph.id] = { src: url, width: width, height: height };
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