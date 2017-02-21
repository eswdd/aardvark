/*
 * Graph management:
 * - adding/removing
 * - global graph options
 * - per-graph options (shared and type specific)
 */
aardvark.controller('GraphControlCtrl', [ '$scope', '$rootScope', 'idGenerator', 'tsdbClient', 'deepUtils', function GraphControlCtrl($scope, $rootScope, idGenerator, $tsdbClient, deepUtils) {
    $scope.lastHash = "";
    $scope.hashModel = function(model) {
        // todo: something better?
        return JSON.stringify(model);
    }
    // accordion openings
    $scope.isOpen={};

    // misc logic
    $scope.graphs = [];

    // per graph settings
    $scope.showEdit={};
    
    // graph model
    $scope.graphs = [];

    // global model
    $scope.model = {};
    $scope.model.relativePeriod = "2h";
    $scope.model.absoluteTimeSpecification = false;
    $scope.model.autoReload = false;
    $scope.model.autoReloadPeriod = "15";
    $scope.model.fromDate = "";
    $scope.model.fromTime = "";
    $scope.model.toDate = "";
    $scope.model.toTime = "";

    $scope.model.autoGraphHeight = true;
    $scope.model.minGraphHeight = 0;
    $scope.model.graphHeight = 300;
    
    $scope.model.globalDownsampling = false;
    $scope.model.globalDownsampleTo = "5m";
    
    $scope.model.baselining = false;
    $scope.model.baselineDatumStyle = "relative";
    $scope.model.baselineRelativePeriod = "1d";
    $scope.model.baselineFromDate = "";
    $scope.model.baselineFromTime = "";
    $scope.model.baselineToDate = "";
    $scope.model.baselineToTime = "";

    $scope.fromDatePopupOpen = false;
    $scope.toDatePopupOpen = false;

    $scope.bindWatchExpressions = function() {
        $scope.$watch('model.globalDownsampling', function(newVal, oldVal, scope) {
            $rootScope.$emit('globalDownsamplingChanged', newVal);
        });

        $scope.$watch('model.absoluteTimeSpecification', function(newVal, oldVal, scope) {
            if (newVal != oldVal) {
                $scope.saveAndRenderGraphsIfAutoUpdate();
            }
        });

        /*
        // $apply(fn()) is not working in GraphCtrl so we do it manually via a custom event
        $rootScope.$watch('model.global', function(newVal, oldVal, scope) {
            console.log("rootScope.model.global changed, updating GraphControlCtrl model")
            $scope.loadModel(null, false);
        });
        $rootScope.$watch('model.graphs', function(newVal, oldVal, scope) {
            console.log("rootScope.model.graphs changed, updating GraphControlCtrl model")
            $scope.loadModel(null, false);
        });
        */
        $rootScope.$on("modelUpdated", function(event,data) {
            //console.log("rootScope.modelUpdated received, updating GraphControlCtrl model")
            $scope.loadModel(null, false);
        });
        $scope.loadModel(null, true);
    }

    $scope.openFromDatePopup = function() {
        $scope.fromDatePopupOpen = !$scope.fromDatePopupOpen;
    };
    $scope.openToDatePopup = function() {
        $scope.toDatePopupOpen = !$scope.toDatePopupOpen;
    };
    
    $scope.toggleGraphOpen = function(index) {
        if (index >= $scope.graphs.length) {
            return;
        }
        var graphId = $scope.graphs[index].id; 
        if ($scope.isOpen[graphId]) {
            $scope.isOpen[graphId] = false;
        }
        else {
            for (var i=0; i<$scope.graphs.length; i++) {
                $scope.isOpen[$scope.graphs[i].id] = false;
            }
            $scope.isOpen[graphId] = true;
        }
    }
    
    $scope.showGnuplotStyles = function() {
        return $tsdbClient.versionNumber >= $tsdbClient.TSDB_2_2;
    }
    
    $scope.showGnuplotAnnotationOptions = function() {
        return $tsdbClient.versionNumber >= $tsdbClient.TSDB_2_3;
    }
    
    $scope.now = function() {
        if ($scope.autoReload) {
            $scope.saveAndRenderGraphsInternal(true);
        }
        else {
            $scope.toDate = moment.utc().format("YYYY/MM/DD");
            $scope.toTime = new Date();
            $scope.saveAndRenderGraphsIfAutoUpdate();
        }
        
    }
    
    $scope.setGraphType = function(graph, type) {
        graph.type = type;
        $scope.saveAndRenderGraphsIfAutoUpdate();
    }
    
    $scope.setGnuplotStyle = function(graph, style) {
        graph.gnuplot.style = style;
        $scope.saveAndRenderGraphsIfAutoUpdate();
    }
    
    $scope.heatmapStyleLabels = {
        auto: "Automatic",
        week_day: "Week columns, day cells",
        day_hour: "Day columns, hour cells"
    }
    
    $scope.setHeatmapStyle = function(graph, style) {
        graph.heatmap.style = style;
        $scope.saveAndRenderGraphsIfAutoUpdate();
    }

    $scope.getHeatmapStyleLabel = function(graph) {
        if (graph.heatmap == null) {
            return null;
        }
        return $scope.heatmapStyleLabels[graph.heatmap.style];
    }
    
    $scope.heatmapColourSchemeLabels = {
        RdYlGn: "Diverging - Red/Yellow/Green",
        Gn: "Sequential - Green",
        Bl: "Sequential - Blue",
        Rd: "Sequential - Red"
    }
    
    $scope.setHeatmapColourScheme = function(graph, scheme) {
        graph.heatmap.colourScheme = scheme;
        $scope.saveAndRenderGraphsIfAutoUpdate();
    }
    
    $scope.getHeatmapColourSchemeLabel = function(graph) {
        if (graph.heatmap == null) {
            return null;
        }
        return $scope.heatmapColourSchemeLabels[graph.heatmap.colourScheme];
    }
    
    $scope.setCountFilterEnd = function(graph, end) {
        graph.dygraph.countFilter.end = end;
        $scope.saveAndRenderGraphsIfAutoUpdate();
    }
    
    $scope.setCountFilterMeasure = function(graph, measure) {
        graph.dygraph.countFilter.measure = measure;
        $scope.saveAndRenderGraphsIfAutoUpdate();
    }
    
    $scope.setValueFilterMeasure = function(graph, measure) {
        graph.dygraph.valueFilter.measure = measure;
        $scope.saveAndRenderGraphsIfAutoUpdate();
    }

    $scope.loadModel = function(datum, forceRender) {
        
        // now load the model
        var model = $rootScope.model;
        var hash = $scope.hashModel(model);
        // prevent recursion
        if (hash == $scope.lastHash) {
            //console.log("graph range 1: "+model.graphs[0].scatter.yRange);
            //console.log("Hash check fail - no change to apply");
            return;
        }
        $scope.lastHash = hash;

        // default state
        $scope.graphs = [];
        $scope.model.relativePeriod = "2h";
        $scope.model.absoluteTimeSpecification = false;
        $scope.model.autoReload = false;
        $scope.model.autoReloadPeriod = "15";
        $scope.model.fromDate = "";
        $scope.model.fromTime = "";
        $scope.model.toDate = "";
        $scope.model.toTime = "";
        $scope.model.autoGraphHeight = true;
        $scope.model.minGraphHeight = 0;
        $scope.model.graphHeight = 300;
        $scope.model.globalDownsampling = false;
        $scope.model.globalDownsampleTo = "5m";
        $scope.model.baselining = false;
        $scope.model.baselineDatumStyle = "relative";
        $scope.model.baselineRelativePeriod = "1d";
        $scope.model.baselineFromDate = "";
        $scope.model.baselineFromTime = "";
        $scope.model.baselineToDate = "";
        $scope.model.baselineToTime = "";
        
        if (model.graphs == null || model.graphs.length == 0) {
            model.graphs = [];
            $scope.addGraph();
        }
        else {
            $scope.graphs = deepUtils.deepClone(model.graphs);
            //console.log("graph range 2: "+model.graphs[0].scatter.yRange);
    
            if (model.global != null) {
                var now = datum ? datum.clone() : moment.utc();
                var twoHoursAgo = now.subtract(2, "hours");
                if (model.global.absoluteTimeSpecification) {
                    if (model.global.fromDate != null && model.global.fromDate != "") {
                        $scope.model.fromDate = model.global.fromDate;
                    }
                    else {
                        $scope.model.fromDate = twoHoursAgo.format("YYYY/MM/DD");
                    }
                    if (model.global.fromTime != null && model.global.fromTime != "") {
                        $scope.model.fromTime = model.global.fromTime;
                    }
                    else {
                        $scope.model.fromTime = twoHoursAgo.format("HH:mm:ss");
                    }
                    $scope.model.relativePeriod = "";
                }
                else {
                    if (model.global.relativePeriod != null && model.global.relativePeriod != "") {
                        $scope.model.relativePeriod = model.global.relativePeriod;
                    }
                    else {
                        $scope.model.relativePeriod = "2h";
                    }
                    $scope.model.fromDate = "";
                    $scope.model.fromTime = "";
                }
                $scope.model.autoReload = model.global.autoReload;
                $scope.model.autoReloadPeriod = model.global.autoReloadPeriod;
                $scope.model.absoluteTimeSpecification = model.global.absoluteTimeSpecification;
                $scope.model.toDate = model.global.toDate;
                $scope.model.toTime = model.global.toTime;
                $scope.model.globalDownsampling = model.global.globalDownsampling;
                $scope.model.globalDownsampleTo = model.global.globalDownsampleTo;
                $scope.model.baselining = model.global.baselining;
                $scope.model.baselineDatumStyle = model.global.baselineDatumStyle;
                $scope.model.baselineRelativePeriod = model.global.baselineRelativePeriod;
                $scope.model.baselineFromDate = model.global.baselineFromDate;
                $scope.model.baselineFromTime = model.global.baselineFromTime;
                $scope.model.baselineToDate = model.global.baselineToDate;
                $scope.model.baselineToTime = model.global.baselineToTime;
                $scope.model.graphHeight = model.global.graphHeight;
                $scope.model.minGraphHeight = model.global.minGraphHeight;
                $scope.model.autoGraphHeight = model.global.autoGraphHeight;
            }
        }
        $scope.saveAndRenderGraphsInternal(forceRender);
    }

    $scope.addGraph = function() {
        var id = idGenerator.nextId();
        $scope.graphs.push({
            id: id,
            title: "Graph "+($scope.graphs.length+1),
            type: $rootScope.graphTypes.length == 1 ? $rootScope.graphTypes[0] : $rootScope.config ? $rootScope.config.defaultGraphType : null,
            // gnuplot defaults
            gnuplot: {
                y1AxisRange: "[0:]",
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
                highlightLines: $rootScope.config ? $rootScope.config.ui.graphs.dygraph.highlightingDefault : true,
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
            },
            // heatmap defaults
            heatmap: {
                style: 'auto',
                filterLowerBound: "",
                filterUpperBound: "",
                colourScheme: 'RdYlGn'
            },
            scatter: {
                xRange: "[:]",
                yRange: "[:]"
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
            $scope.saveAndRenderGraphsInternal(true);
        }
    }
    // for button on ui
    $scope.saveAndRenderGraphs = function() {
        $scope.saveAndRenderGraphsInternal(true);
    }
    $scope.saveAndRenderGraphsInternal = function(forceRender) {
        // now save for rendering
        $rootScope.model.graphs = deepUtils.deepClone($scope.graphs);

        $rootScope.model.global = {
            fromDate: $scope.model.fromDate,
            fromTime: $scope.model.fromTime,
            autoReload: $scope.model.autoReload,
            autoReloadPeriod: $scope.model.autoReloadPeriod,
            absoluteTimeSpecification: $scope.model.absoluteTimeSpecification,
            relativePeriod: $scope.model.relativePeriod,
            toDate: $scope.model.toDate,
            toTime: $scope.model.toTime,
            globalDownsampling: $scope.model.globalDownsampling,
            globalDownsampleTo: $scope.model.globalDownsampleTo,
            baselining: $scope.model.baselining,
            baselineDatumStyle: $scope.model.baselineDatumStyle,
            baselineRelativePeriod: $scope.model.baselineRelativePeriod,
            baselineFromDate: $scope.model.baselineFromDate,
            baselineFromTime: $scope.model.baselineFromTime,
            baselineToDate: $scope.model.baselineToDate,
            baselineToTime: $scope.model.baselineToTime,
            graphHeight: $scope.model.graphHeight,
            minGraphHeight: $scope.model.minGraphHeight,
            autoGraphHeight: $scope.model.autoGraphHeight
        };
        $rootScope.saveModel(forceRender);
    }
    
    $scope.bindWatchExpressions();
}]);