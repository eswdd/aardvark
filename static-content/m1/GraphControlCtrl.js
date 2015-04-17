/*
 * Graph management:
 * - adding/removing
 * - global graph options
 * - per-graph options (shared and type specific)
 */
otis.controller('GraphControlCtrl', [ '$scope', '$rootScope', function GraphControlCtrl($scope, $rootScope) {
    // accordion openings
    $scope.isOpen={};
    $scope.firstOpen = true;

    // misc logic
    $scope.graphs = [];
    $scope.lastGraphId = 0;

    // per graph settings
    $scope.showEdit={};

    // global settings
    $scope.fromTimestamp = "";
    $scope.autoReload = false;
    $scope.toTimestamp = "";

    // gnuplot stuff - nothing global
    $scope.gnuplot = {};
    // axes
    $scope.gnuplot.yAxisLabel = "";
    $scope.gnuplot.y2AxisLabel = "";
    $scope.gnuplot.yAxisFormat = "";
    $scope.gnuplot.y2AxisFormat = "";
    $scope.gnuplot.yAxisRange = "[:]";
    $scope.gnuplot.y2AxisRange = "[:]";
    $scope.gnuplot.yAxisLogScale = false;
    $scope.gnuplot.y2AxisLogScale = false;
    // key
    $scope.gnuplot.showKey = true;
    $scope.gnuplot.keyAlignment = "columnar";
    $scope.gnuplot.keyLocation = "top left";
    // style
    $scope.gnuplot.lineSmoothing = false;

    $scope.loadModel = function() {
        var model = $rootScope.model;
        if (model.graphs == null || model.graphs.length == 0) {
            model.graphs = [];
            $scope.addGraph();
            $scope.renderGraphs();
        }
        else {
            for (var i=0; i<model.graphs.length; i++) {
                var item = model.graphs[i];
                if (item.id>$scope.lastGraphId) {
                    $scope.lastGraphId = parseInt(item.id);
                }
            }
        }
        $scope.graphs = $scope.deepClone(model.graphs);
    }

    $scope.deepClone = function(incoming) {
        var ret;
        if (incoming == null) {
            return null;
        }
        switch (typeof incoming)
        {
            case 'string':
            case 'number':
            case 'boolean':
                return incoming;
            case 'object':
                if (incoming instanceof Array)
                {
                    ret = [];
                    for (var i=0; i<incoming.length; i++) {
                        ret[i] = $scope.deepClone(incoming[i]);
                    }
                }
                else {
                    ret = {};
                    for (var k in incoming) {
                        if (incoming.hasOwnProperty(k)) {
                            ret[k] = $scope.deepClone(incoming[k]);
                        }
                    }
                }
                break;
            default:
                throw 'Unrecognized type: '+(typeof incoming);
        }


        return ret;
    };


    // extracted for testing
    $scope.timeInMillis = function()
    {
        return new Date().getTime();
    }

    $scope.nextId = function() {
        var next = $scope.timeInMillis();
        if (next <= $scope.lastGraphId) {
            next = $scope.lastGraphId+1;
        }
        $scope.lastGraphId = next;
        return next+"";
    }

    $scope.addGraph = function() {
        var id = $scope.nextId();
        $scope.graphs.push({
            id: id,
            title: "Graph "+($scope.graphs.length+1),
            showTitle: true,
            type: $rootScope.graphTypes.length == 1 ? $rootScope.graphTypes[0] : null,
            showTitle: true,
            // gnuplot defaults
            gnuplot: {
                yAxisRange: "[:]",
                y2AxisRange: "[:]",
                showKey: true,
                keyAlignment: "columnar",
                keyLocation: "top left"
            }
        });
        $scope.showEdit[id] = true;
        $scope.firstOpen = false;
        for (var i=0; i<$scope.graphs.length; i++) {
            $scope.isOpen[$scope.graphs[i].id] = false;
        }
        $scope.isOpen[id] = true;
    };
    $scope.deleteGraph = function(id) {
        var index = -1;
        for (var i=0; i<$scope.graphs.length; i++) {
            if ($scope.graphs[i].id == id) {
                index = i;
                break;
            }
        }
        if (index == -1) {
            return;
        }
        $scope.graphs.splice(index, 1);
        $scope.isOpen[id] = false;
        if ($scope.graphs.length > 0) {
            var prevGraph = index == 0 ? 0 : index-1;
            $scope.isOpen[$scope.graphs[prevGraph].id] = true;
        }
        else {
            $scope.firstOpen = true;
        }
    }
    $scope.renderGraphs = function() {
        $rootScope.model.graphs = $scope.deepClone($scope.graphs);
        $rootScope.saveModel(true);
    }
    $rootScope.onConfigUpdate($scope.loadModel);
}]);