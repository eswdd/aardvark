/*
 * Graph rendering
 */
aardvark.controller('GraphCtrl', [ '$scope', '$rootScope', '$http', '$uibModal', 'tsdbClient', 'tsdbUtils', '$injector', 'deepUtils', function GraphCtrl($scope, $rootScope, $http, $uibModal, $tsdbClient, $tsdbUtils, $injector, deepUtils) {
    
    $scope.renderedContent = {};
    $scope.renderErrors = {};
    $scope.renderWarnings = {};
    $scope.renderMessages = {};
    $scope.renderListeners = {};

    // pre-defined in unit tests
    if (!$scope.renderers) {
        $scope.renderers = {};
    }
    if (!$scope.renderedGraphs) {
        $scope.renderedGraphs = {};
    }

    $scope.graphRendered = function (graphId) {
        for (var k in $scope.renderListeners) {
            if ($scope.renderListeners.hasOwnProperty(k)) {
                var fn = $scope.renderListeners[k];
                if (fn != null && typeof fn == "function") {
                    fn(graphId);
                }
            }
        }
    }

    $scope.addGraphRenderListener = function(listenerId, listenerFn) {
        $scope.renderListeners[listenerId] = listenerFn;
    }

    $scope.clearGraphRenderListeners = function() {
        $scope.renderListeners = {};
    }
    
    $scope.tsdbExportLink = function(graph) {
        if (graph.type == null) {
            return "";
        }
        if (!$scope.renderedGraphs.hasOwnProperty(graph.id)) {
            return "";
        }
        if (!$scope.renderedGraphs[graph.id].supports_tsdb_export) {
            return "";
        }
        var url = $scope.renderedGraphs[graph.id].tsdb_export_link;
        return url;
    }
    
    $scope.supportsTsdbExport = function(graph) {
        if (graph.type == null) {
            return false;
        }
        if (!$scope.renderedGraphs.hasOwnProperty(graph.id)) {
            return false;
        }
        return $scope.renderedGraphs[graph.id].supports_tsdb_export;
    }
    
    $scope.grafanaExportText = function(graph) {
        if (graph.type == null) {
            return "";
        }
        if (!$scope.renderedGraphs.hasOwnProperty(graph.id)) {
            return "";
        }
        if (!$scope.renderedGraphs[graph.id].supports_grafana_export) {
            return "";
        }
        var url = $scope.renderedGraphs[graph.id].grafana_export_text;
        return url;
    }
    
    $scope.supportsGrafanaExport = function(graph) {
        if (graph.type == null) {
            return false;
        }
        if (!$scope.renderedGraphs.hasOwnProperty(graph.id)) {
            return false;
        }
        return $scope.renderedGraphs[graph.id].supports_grafana_export;
    }
    
    $scope.loadRenderers = function() {
        for (var i=0; i<$rootScope.graphTypes.length; i++) {
            var t = $rootScope.graphTypes[i];
            var serviceName = t.substring(0,1).toUpperCase()+ t.substring(1)+"Renderer";
            if ($injector.has(serviceName)) {
                $scope.renderers[t] = $injector.get(serviceName);
            }
        }
    }

    $rootScope.renderGraphs = function(boundingBox) {
        // set width / height
        var width = 0;
        var height = 0;
        // simple for now - this would have to change if we do dashboarding
        if (boundingBox == null) {
            boundingBox = document.getElementById("graph-content-panel");
        }
        if (boundingBox != null) {
            // extra 20px off in both dirs to account for scroll bars
            width = boundingBox.clientWidth-24;
            height = boundingBox.clientHeight-($rootScope.model.graphs.length*20)-20; // for titles
        }
        var eachHeight = 0;
        if ($rootScope.model.global.autoGraphHeight) {
            eachHeight = height / $rootScope.model.graphs.length;
            var minGraphHeight = $rootScope.model.global.minGraphHeight == "" ? 0 : parseInt($rootScope.model.global.minGraphHeight);
            if (eachHeight < minGraphHeight) {
                eachHeight = minGraphHeight;
            }
        }
        else {
            eachHeight = $rootScope.model.global.graphHeight;
        }
        // not global to allow rendering code to be shared with future dashboards
        for (var i=0; i<$rootScope.model.graphs.length; i++) {
            var graph = $rootScope.model.graphs[i];
            graph.graphWidth = width;
            graph.graphHeight = eachHeight;
        }
        // todo: could be cleverer about clearing in case some graphs haven't changed
        // ie track ids found and delete others
        $scope.clearGraphRenderListeners();
        for (var graphId in $scope.dygraphs) {
            if ($scope.dygraphs.hasOwnProperty(graphId)) {
                $scope.dygraphs[graphId].destroy();
            }
        }
        $scope.dygraphs = {};
        $scope.renderedContent = {};
        $scope.renderErrors = {};
        $scope.renderWarnings = {};
        $scope.renderMessages = {};
        
        var renderContext = {
            renderedContent: $scope.renderedContent,
            renderErrors: $scope.renderErrors,
            renderWarnings: $scope.renderWarnings,
            renderMessages: $scope.renderMessages,
            addGraphRenderListener: $scope.addGraphRenderListener,
            graphRendered: $scope.graphRendered
        };
        
        var getUpdateGraphModelFunction = function(graph) {
            var id = graph.id;
            return function(preReqSkeleton, toApplySkeleton, fromOutsideAngular) {
                var g = null;
                for (var i=0; i<$rootScope.model.graphs.length; i++) {
                    if ($rootScope.model.graphs[i].id == id) {
                        g = $rootScope.model.graphs[i];
                        break;
                    }
                }
                if (g == null) {
                    //console.log("Couldn't find graph with id "+id+" has it been deleted?");
                    return;
                }
                var f = function() {
                    if (deepUtils.deepCheck(g,preReqSkeleton)) {
                        if (deepUtils.deepApply(g,toApplySkeleton)) {
                            // run this until we can get $apply to work
                            $rootScope.$emit("modelUpdated");
                        }
                    }
                };
                // for some reason this doesn't seem to work!
                if (fromOutsideAngular) {
                    $scope.$apply(f);
                }
                else {
                    f();
                }
            }
        };
        
        var updateGlobalModel = function(preReqSkeleton, toApplySkeleton, fromOutsideAngular) {
            var f = function() {
                if (deepUtils.deepCheck($rootScope.model.global,preReqSkeleton)) {
                    if (deepUtils.deepApply($rootScope.model.global,toApplySkeleton)) {
                        // run this until we can get $apply to work
                        $rootScope.$emit("modelUpdated");
                    }
                }
            };
            // for some reason this doesn't seem to work!
            if (fromOutsideAngular) {
                $scope.$apply(f);
            }
            else {
                f();
            }
        };
        
        var global = $rootScope.model.global || {};
        for (var i=0; i<$rootScope.model.graphs.length; i++) {
            var graph = $rootScope.model.graphs[i];

            renderContext.updateGlobalModel = updateGlobalModel;
            renderContext.updateGraphModel = getUpdateGraphModelFunction(graph);
                
            var renderer = null;
            // have we already got an instance of the correct renderer for this graph
            if ($scope.renderedGraphs.hasOwnProperty(graph.id) && $scope.renderedGraphs[graph.id].type == graph.type) {
                renderer = $scope.renderedGraphs[graph.id];
            }
            else if (graph.type && $scope.renderers.hasOwnProperty(graph.type)) {
                renderer = $scope.renderers[graph.type].create();
                $scope.renderedGraphs[graph.id] = renderer;
            }
            if (renderer) {
                var metrics = [];
                for (var j=0; j<$rootScope.model.metrics.length; j++) {
                    var metricGraphId = $rootScope.model.metrics[j].graphOptions.graphId;
                    if (metricGraphId==graph.id) {
                        metrics.splice(metrics.length, 0, $rootScope.model.metrics[j]);
                    }
                }
                renderer.render(renderContext, $rootScope.config, global, graph, metrics);
            }
        }
    };
    
    $rootScope.onConfigUpdate(function() {
        $scope.loadRenderers();
        $rootScope.renderGraphs();
    });
}]);