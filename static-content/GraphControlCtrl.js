/*
 * Graph management:
 * - adding/removing
 * - global graph options
 * - per-graph options (shared and type specific)
 */
aardvark.controller('GraphControlCtrl', [ '$scope', '$rootScope', 'idGenerator', function GraphControlCtrl($scope, $rootScope, idGenerator) {
    // accordion openings
    $scope.isOpen={};

    // misc logic
    $scope.graphs = [];

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
    
    $scope.globalDownsampling = false;
    $scope.globalDownsampleTo = "5m";
    
    $scope.baselining = false;
    $scope.baselineDatumStyle = "relative";
    $scope.baselineRelativePeriod = "1d";
    $scope.baselineFromDate = "";
    $scope.baselineFromTime = "";
    $scope.baselineToDate = "";
    $scope.baselineToTime = "";
    

    $scope.$watch('globalDownsampling', function() {
        $rootScope.$emit('globalDownsamplingChanged', $scope.globalDownsampling);
    });

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

    $scope.now = function() {
        if ($scope.autoReload) {
            $scope.saveAndRenderGraphs();
        }
        else {
            $scope.toDate = moment(new Date()).format("YYYY/MM/DD");
            $scope.toTime = moment(new Date()).format("HH:mm:ss");
            $scope.saveAndRenderGraphsIfAutoUpdate();
        }
        
    }

    $scope.loadModel = function() {
        var model = $rootScope.model;
        if (model.graphs == null || model.graphs.length == 0) {
            model.graphs = [];
            $scope.addGraph();
        }
        else {
            $scope.graphs = $scope.deepClone(model.graphs);
    
            if (model.global != null) {
                var twoHoursAgo = moment(new Date()-7200000);
                if (model.global.fromDate != null && model.global.fromDate != "") {
                    $scope.fromDate = model.global.fromDate;
                }
                else {
                    $scope.fromDate = twoHoursAgo.format("YYYY/MM/DD");
                }
                if (model.global.fromTime != null && model.global.fromTime != "") {
                    $scope.fromTime = model.global.fromTime;
                }
                else {
                    $scope.fromTime = twoHoursAgo.format("HH:mm:ss");
                }
                $scope.autoReload = model.global.autoReload;
                $scope.autoReloadPeriod = model.global.autoReloadPeriod;
                $scope.relativePeriod = model.global.relativePeriod;
                $scope.absoluteTimeSpecification = model.global.absoluteTimeSpecification;
                $scope.toDate = model.global.toDate;
                $scope.toTime = model.global.toTime;
                $scope.globalDownsampling = model.global.globalDownsampling;
                $scope.globalDownsampleTo = model.global.globalDownsampleTo;
                $scope.baselining = model.global.baselining;
                $scope.baselineDatumStyle = model.global.baselineDatumStyle;
                $scope.baselineRelativePeriod = model.global.baselineRelativePeriod;
                $scope.baselineFromDate = model.global.baselineFromDate;
                $scope.baselineFromTime = model.global.baselineFromTime;
                $scope.baselineToDate = model.global.baselineToDate;
                $scope.baselineToTime = model.global.baselineToTime;
            }
        }
        $scope.saveAndRenderGraphs();
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

    $scope.addGraph = function() {
        var id = idGenerator.nextId();
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
    $scope.saveAndRenderGraphsIfAutoUpdate = function() {
        if ($rootScope.autoUpdateEnabled()) {
            $scope.saveAndRenderGraphs();
        }
    }
    $scope.saveAndRenderGraphs = function() {
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
            toTime: $scope.toTime,
            globalDownsampling: $scope.globalDownsampling,
            globalDownsampleTo: $scope.globalDownsampleTo,
            baselining: $scope.baselining,
            baselineDatumStyle: $scope.baselineDatumStyle,
            baselineRelativePeriod: $scope.baselineRelativePeriod,
            baselineFromDate: $scope.baselineFromDate,
            baselineFromTime: $scope.baselineFromTime,
            baselineToDate: $scope.baselineToDate,
            baselineToTime: $scope.baselineToTime
        };
        $rootScope.saveModel(true);
    }
    $rootScope.onConfigUpdate($scope.loadModel);
}]);