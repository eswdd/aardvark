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
        }
        else {
            for (var i=0; i<model.graphs.length; i++) {
                var item = model.graphs[i];
                if (item.id>$scope.lastGraphId) {
                    $scope.lastGraphId = parseInt(item.id);
                }
            }
        }
    }

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
        //todo: should stage new graphs and edits into an internal model and only push to model when click a save button
        var id = $scope.nextId();
        $rootScope.model.graphs.push({
            id: id,
            title: "Graph "+($rootScope.model.graphs.length+1),
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
        $rootScope.saveModel();
        $scope.showEdit[id] = true;
        // Q: is it always this one open?
        // A: yes - currently you can only add a graph from the top section
        $scope.firstOpen = false;
        $scope.isOpen[id] = true;
    };
    $scope.deleteGraph = function(id) {
        var index = -1;
        for (var i=0; i<$rootScope.model.graphs.length; i++) {
            if ($rootScope.model.graphs[i].id == id) {
                index = i;
                break;
            }
        }
        if (index == -1) {
            return;
        }
        $rootScope.model.graphs.splice(index, 1);
        $rootScope.saveModel();
    }
    $scope.renderGraphs = function() {
        $rootScope.saveModel(true);
    }
    $rootScope.onConfigUpdate($scope.loadModel);
}]);