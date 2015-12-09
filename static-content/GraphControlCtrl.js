/*
 * Graph management:
 * - adding/removing
 * - global graph options
 * - per-graph options (shared and type specific)
 */
otis.controller('GraphControlCtrl', [ '$scope', '$rootScope', function GraphControlCtrl($scope, $rootScope) {
    // accordion openings
    $scope.isOpen={};

    // misc logic
    $scope.graphs = [];
    $scope.lastGraphId = 0;

    // per graph settings
    $scope.showEdit={};

    // global settings
    $scope.fromTimestamp = "2h-ago";
    $scope.autoReload = false;
    $scope.autoReloadPeriod = "15";
    $scope.toTimestamp = "";

    $scope.autoGraphHeight = true;
    $scope.minGraphHeight = 0;
    $scope.graphHeight = 300;

    // gnuplot stuff - nothing global in here
//    $scope.gnuplot = {};
    // axes
//    $scope.gnuplot.yAxisLabel = "";
//    $scope.gnuplot.y2AxisLabel = "";
//    $scope.gnuplot.yAxisFormat = "";
//    $scope.gnuplot.y2AxisFormat = "";
//    $scope.gnuplot.yAxisRange = "[:]";
//    $scope.gnuplot.y2AxisRange = "[:]";
//    $scope.gnuplot.yAxisLogScale = false;
//    $scope.gnuplot.y2AxisLogScale = false;
    // key
//    $scope.gnuplot.showKey = true;
//    $scope.gnuplot.keyAlignment = "columnar";
//    $scope.gnuplot.keyLocation = "top left";
    // style
//    $scope.gnuplot.lineSmoothing = false;

    // todo: m1: implement this properly, with correct formatting
    $scope.now = function() {
        if ($scope.autoReload) {
            $scope.renderGraphs();
        }
        else {
            $scope.toTimestamp = new Date().toString();
        }
    }

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

        if (model.global != null) {
            $scope.fromTimestamp = model.global.fromTimestamp;
            $scope.autoReload = model.global.autoReload;
            $scope.autoReloadPeriod = model.global.autoReloadPeriod;
            $scope.toTimestamp = model.global.toTimestamp;
        }
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
            // gnuplot defaults
            gnuplot: {
                yAxisRange: "[0:]",
                y2AxisRange: "[0:]",
                showKey: true,
                keyAlignment: "columnar",
                keyLocation: "top left",
                keyBox: true
            }
        });
        $scope.showEdit[id] = true;
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
    }
    $scope.renderGraphs = function() {
        // todo: move height calculations to rendering pane and send parameters through
        // set width / height
        var width = 0;
        var height = 0;
        // simple for now - this would have to change if we do dashboarding
        var boundingBox = document.getElementById("graph-panel");
        if (boundingBox != null) {
            width = boundingBox.clientWidth-4;
            height = boundingBox.clientHeight-($scope.graphs.length*20); // for titles
        }
        var eachHeight = 0;
        if ($scope.autoGraphHeight) {
            eachHeight = height / $scope.graphs.length;
            var minGraphHeight = $scope.minGraphHeight == "" ? 0 : parseInt($scope.minGraphHeight);
            if (eachHeight < minGraphHeight) {
                eachHeight = minGraphHeight;
            }
        }
        else {
            eachHeight = $scope.graphHeight;
        }
        // not global to allow rendering code to be shared with future dashboards
        for (var i=0; i<$scope.graphs.length; i++) {
            var graph = $scope.graphs[i];
            graph.graphWidth = width;
            graph.graphHeight = eachHeight;
        }
        // now save for rendering
        $rootScope.model.graphs = $scope.deepClone($scope.graphs);

        $rootScope.model.global = {
            fromTimestamp: $scope.fromTimestamp,
            autoReload: $scope.autoReload,
            autoReloadPeriod: $scope.autoReloadPeriod,
            toTimestamp: $scope.toTimestamp
        };
        $rootScope.saveModel(true);
    }
    $rootScope.onConfigUpdate($scope.loadModel);
}]);