/*
 * Graph management:
 * - adding/removing
 * - global graph options
 * - per-graph options (shared and type specific)
 */
aardvark.controller('GraphControlCtrl', [ '$scope', '$rootScope', 'idGenerator', 'tsdbClient', function GraphControlCtrl($scope, $rootScope, idGenerator, $tsdbClient) {
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
    
    $scope.showGnuplotStyles = function() {
        return $tsdbClient.versionNumber >= $tsdbClient.TSDB_2_2;
    }
    
    $scope.showGnuplotAnnotationOptions = function() {
        return $tsdbClient.versionNumber >= $tsdbClient.TSDB_2_3;
    }
    

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
            $scope.toDate = moment.utc().format("YYYY/MM/DD");
            $scope.toTime = moment.utc().format("HH:mm:ss");
            $scope.saveAndRenderGraphsIfAutoUpdate();
        }
        
    }

    $scope.loadModel = function(datum) {
        // initial state
        $scope.isOpen={};
        $scope.graphs = [];
        $scope.showEdit={};
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
        
        // now load the model
        var model = $rootScope.model;
        if (model.graphs == null || model.graphs.length == 0) {
            model.graphs = [];
            $scope.addGraph();
        }
        else {
            $scope.graphs = $scope.deepClone(model.graphs);
    
            if (model.global != null) {
                var now = datum ? datum.clone() : moment.utc();
                var twoHoursAgo = now.subtract(2, "hours");
                if (model.global.absoluteTimeSpecification) {
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
                    $scope.relativePeriod = "";
                }
                else {
                    if (model.global.relativePeriod != null && model.global.relativePeriod != "") {
                        $scope.relativePeriod = model.global.relativePeriod;
                    }
                    else {
                        $scope.relativePeriod = "2h";
                    }
                    $scope.fromDate = "";
                    $scope.fromTime = "";
                }
                $scope.autoReload = model.global.autoReload;
                $scope.autoReloadPeriod = model.global.autoReloadPeriod;
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
                $scope.graphHeight = model.global.graphHeight;
                $scope.minGraphHeight = model.global.minGraphHeight;
                $scope.autoGraphHeight = model.global.autoGraphHeight;
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
                keyBox: true,
                style: "linespoint"
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
            baselineToTime: $scope.baselineToTime,
            graphHeight: $scope.graphHeight,
            minGraphHeight: $scope.minGraphHeight,
            autoGraphHeight: $scope.autoGraphHeight
        };
        $rootScope.saveModel(true);
    }
    $rootScope.onConfigUpdate($scope.loadModel);
}]);