/*
 * Graph rendering
 */
otis.controller('GraphCtrl', [ '$scope', '$rootScope', function GraphCtrl($scope, $rootScope) {
    $scope.renderedContent = {};
    $scope.renderErrors = {};
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
        $scope.renderedContent[graph.id] = "";
        if (global.fromTimestamp == null) {
            $scope.renderErrors[graph.id] = "No start date specified";
            return;
        }
        if (metrics == null || metrics.length == 0) {
            $scope.renderErrors[graph.id] = "No metrics specified";
            return;
        }


        var url = "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/q";

        url += "?start=" + global.fromTimestamp;
        if (global.toTimestamp != "" && global.toTimestamp != null && !global.autoReload) {
            url += "&end=" + global.toTimestamp;
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
                    if (options.rateCounterMax != "") {
                        url += "," + options.rateCounterMax;
                    }
                    else {
                        rctrSep = ",,";
                    }
                    if (options.rateCounterReset != "") {
                        url += rctrSep + options.rateCounterReset;
                    }
                    url += "}";
                }
                url += ":";
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

        $scope.renderedContent[graph.id] = url;
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