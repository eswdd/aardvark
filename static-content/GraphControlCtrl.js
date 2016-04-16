/*
 * Graph management:
 * - adding/removing
 * - global graph options
 * - per-graph options (shared and type specific)
 */
aardvark.controller('GraphControlCtrl', [ '$scope', '$rootScope', function GraphControlCtrl($scope, $rootScope) {
    // accordion openings
    $scope.isOpen={};

    // misc logic
    $scope.graphs = [];
    $scope.lastGraphId = 0;

    // per graph settings
    $scope.showEdit={};

    // global settings
    $scope.relativePeriod = "2h";
    $scope.absoluteTimeSpecification = false;
    $scope.autoReload = false;
    $scope.autoReloadPeriod = "15";
    $scope.fromDate = "";
    $scope.fromTime = "";
    $scope.toDate = "";
    $scope.toTime = "";

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
            // todo: proper formatting
            $scope.toDate = new Date().toString();
            $scope.toTime = new Date().toString();
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
            $scope.fromDate= model.global.fromDate;
            $scope.fromTime= model.global.fromTime;
            $scope.autoReload = model.global.autoReload;
            $scope.autoReloadPeriod = model.global.autoReloadPeriod;
            $scope.relativePeriod = model.global.relativePeriod;
            $scope.absoluteTimeSpecification = model.global.absoluteTimeSpecification;
            $scope.toDate = model.global.toDate;
            $scope.toTime = model.global.toTime;
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
            type: $rootScope.graphTypes.length == 1 ? $rootScope.graphTypes[0] : $rootScope.config ? $rootScope.config.defaultGraphType : null,
            // gnuplot defaults
            gnuplot: {
                yAxisRange: "[0:]",
                y2AxisRange: "[0:]",
                showKey: true,
                keyAlignment: "columnar",
                keyLocation: "top left",
                keyBox: true
            },
            // horizon defaults
            horizon: {
                interpolateGaps: true,
                squashNegative: true
            },
            // dygraph defaults
            dygraph: {
                interpolateGaps: true,
                highlightLines: true,
                annotations: true,
                countFilter: {
                    end: "top",
                    count: "",
                    measure: "mean"
                },
                valueFilter: {
                    lowerBound: "",
                    measure: "any",
                    upperBound: ""
                }
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
            // extra 20px off in both dirs to account for scroll bars
            width = boundingBox.clientWidth-24;
            height = boundingBox.clientHeight-($scope.graphs.length*20)-20; // for titles
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
            fromDate: $scope.fromDate,
            fromTime: $scope.fromTime,
            autoReload: $scope.autoReload,
            autoReloadPeriod: $scope.autoReloadPeriod,
            absoluteTimeSpecification: $scope.absoluteTimeSpecification,
            relativePeriod: $scope.relativePeriod,
            toDate: $scope.toDate,
            toTime: $scope.toTime
        };
        $rootScope.saveModel(true);
    }
    $rootScope.onConfigUpdate($scope.loadModel);
}]);