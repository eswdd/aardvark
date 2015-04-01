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
        var txt = graph.title;
        for (var i=0; i<metrics.length; i++) {
            var m = metrics[i];
            txt += "\n["+i+"] " + m.id + ": " + m.name;
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
        $scope.renderedContent[graph.id] = graph.title;
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
    $rootScope.renderGraphs();
}]);