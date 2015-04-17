/*
 * Graph rendering
 */
otis.controller('GraphCtrl', [ '$scope', '$rootScope', function GraphCtrl($scope, $rootScope) {
    $scope.renderedContent = {};
    // pre-defined in unit tests
    if (!$scope.renderers) {
        $scope.renderers = {};
    }
    $scope.renderers["debug"] = function(graph, metrics) {
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
    $scope.renderers["gnuplot"] = function(graph, metrics) {
        var url = "http://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/q";
        var sep = "?";
        for (var i=0; i<metrics.length; i++) {
            // agg:[interval-agg:][rate[{counter[,max[,reset]]}:]metric[{tag=value,...}]
            var metric = metrics[i];
            url += sep + "m=" + metric.aggregator + ":";
            if (metric.downsample) {
                url += metric.downsampleTo + "-" + metric.downsampleBy + ":";
            }
            if (metric.rate) {
                url += "rate:";
            }
            else if (metric.rateCounter) {
                url += "ratecounter";
                if (metric.rateCounterMax != "") {
                    url += "," + metric.rateCounterMax;
                    if (metric.rateCounterReset != "") {
                        url += "," + metric.rateCounterReset;
                    }
                }
                url += ":";
            }
            url += metric.name;
            sep = "{";
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

            // ready for next metric
            sep = "&";
        }

        $scope.renderedContent[graph.id] = url;
    };

    $rootScope.renderGraphs = function() {
        // todo: could be cleverer about clearing in case some graphs haven't changed
        // ie track ids found and delete others
        $scope.renderedContent = {};
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
                renderer(graph, metrics);
            }
        }
    };
    $rootScope.onConfigUpdate(function() {
        $rootScope.renderGraphs();
    });
}]);