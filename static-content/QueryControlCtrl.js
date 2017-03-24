/*
 * Used to render the tag value rows in the queries control panel.
 */
//noinspection JSLint
aardvark.directive('tagFilterSelection', function() {
    return {
        template: '<div mass-autocomplete><input type="text" ng-model="tag.value" mass-autocomplete-item="tagOptions[tag.name]" size="15" ng-blur="saveQueryIfAutoUpdate()" aardvark-enter="addOrSaveQuery()" /> {{tagValuesMatchCountFiltering(tag)}}</div>'
    }
})
/*
 * Query management:
 * - adding/removing
 * - graph association
 * - per query graphing options (timeseries selection, aggregation)
 * - graph type specific graphing options
 */
.controller('QueryControlCtrl', [ '$scope', '$rootScope', '$sce', 'idGenerator', 'tsdbClient', 'tsdbUtils', function QueryControlCtrl($scope, $rootScope, $sce, idGenerator, $tsdbClient, $tsdbUtils) {

    $scope.localModel = {};
    
    $scope.treeUpdateInProgress = false;
    $scope.allParentNodes = [];
    $scope.showFilterInput = false;
    $scope.selectedTreeNode = undefined;
    $scope.selectedMetric = "";
    $scope.filter = "";
    $scope.expandedNodes = [];
    $scope.tagOptions = {};
    $scope.tagValues = {};
    $scope.localModel.tagFilters = [];
        
    $scope.selectedQueryId = 0;
    $scope.nodeSelectionDisabled = false;

    // TODO load aggregators from /aggregators on tsdb..
    $scope.allAggregators = ["avg", "min", "max", "sum", "zimsum", "mimmax", "mimmin", "raw", "dev", "count", "p999", "p99", "p95", "p90", "p75", "p50", "ep999r7", "ep99r7", "ep95r7", "ep90r7", "ep75r7", "ep50r7", "ep999r3", "ep99r3", "ep95r3", "ep90r3", "ep75r3", "ep50r3"];

    $scope.localModel.graphId = "0";
    $scope.localModel.aggregator = "sum";
    $scope.localModel.rightAxis = false;
    $scope.localModel.rate = false;
    $scope.localModel.rateCounter = false;
    $scope.localModel.rateCounterMax = "";
    $scope.localModel.rateCounterReset = "";
    $scope.localModel.downsample = false;
    $scope.localModel.downsampleBy = "avg";
    $scope.localModel.downsampleTo = "";
        
    $scope.showingIgnoredPrefixes = false;

    $scope.globalDownsampling = false;

    $rootScope.$on('globalDownsamplingChanged', function (event, data) {
        $scope.globalDownsampling = data;
    });
        
    $scope.$watch('localModel.dygraph.drawLines', function(newVal, oldVal, scope) {
        // one of them must be true!
        if (newVal != oldVal && !newVal) {
            $scope.localModel.dygraph.drawPoints = true;
        }
    })
        
    $scope.$watch('localModel.dygraph.drawPoints', function(newVal, oldVal, scope) {
        // one of them must be true!
        if (newVal != oldVal && !newVal) {
            $scope.localModel.dygraph.drawLines = true;
        }
    })

    $scope.addButtonVisible = function() {
        var ret = $scope.selectedMetric != "";
        return ret;
    };
    $scope.deleteButtonVisible = function() {
        return $scope.selectedQueryId != "0";
    };
    $scope.saveButtonVisible = function() {
        return $scope.selectedQueryId != "0";
    };
    $scope.clearButtonEnabled = function() {
        return $scope.addButtonVisible() || $scope.saveButtonVisible();
    };
    $scope.expandAllVisible = function() {
        return $rootScope.config && $rootScope.config.ui.metrics.enableExpandAll;
    };
    $scope.tagFilteringSupported = function() {
        return $tsdbClient.versionNumber >= $tsdbClient.TSDB_2_2;
    };
    $scope.expressionQueriesSupported = function() {
        return $tsdbClient.versionNumber >= $tsdbClient.TSDB_2_3;
    }
    $scope.clearSelectedTreeNode = function() {
        $scope.selectedTreeNode = undefined;
    }
    $scope.graphType = function() {
        var graph = $scope.allocatedGraph();
        if (graph != null) {
            return graph.type;
        }
        return "";
    }
    $scope.currentMetricName = function() {
        if ($scope.selectedMetric != null && $scope.selectedMetric != "") {
            return $scope.selectedMetric;
        }

        var queryId = $scope.selectedQueryId;
        if (queryId == "0") {
            return "";
        }
        for (var i=0; i<$rootScope.model.queries.length; i++) {
            var q = $rootScope.model.queries[i];
            if (q.id == queryId) {
                return q.name;
            }
        }
        return "";
    }
    $scope.addOrSaveQuery = function() {
        if ($scope.addButtonVisible()) {
            $scope.addQuery();
        }
        else {
            $scope.saveQuery();
        }
    }
    $scope.saveQueryIfAutoUpdate = function() {
        if (!$scope.addButtonVisible() && $rootScope.autoUpdateEnabled()) {
            $scope.saveQuery();
        }
    }
        
    $scope.allocatedGraph = function() {
        var graph = null;
        if ($rootScope.model.graphs != null) {
            for (var g=0; g<$rootScope.model.graphs.length; g++) {
                if ($rootScope.model.graphs[g].id == $scope.localModel.graphId) {
                    graph = $rootScope.model.graphs[g];
                }
            }
        }
        return graph;
    }

    $scope.downsampleByEnabled = function() {
        var graph = $scope.allocatedGraph();
        return $scope.localModel.downsample || $scope.globalDownsampling 
            || (graph != null && (graph.type == "horizon" || graph.type == "heatmap"));
    }

    $scope.treeOptions = {
        nodeChildren: "children",
        dirSelectable: true,
        injectClasses: {
            ul: "a1",
            li: "a2",
            liSelected: "a7",
            iExpanded: "a3",
            iCollapsed: "a4",
            iLeaf: "a5",
            label: "a6",
            labelSelected: "a8"
        }
    };

    $scope.nodeSelectedForAddition = function (node,selected) {
        var valid = selected && node.isMetric;
        $scope.selectedMetric = valid ? node.id : '';
        $scope.nodeSelectionDisabled = valid;
        if (valid) {
            $scope.selectedQueryId = "0";
            if ($rootScope.model.graphs.length == 1) {
                $scope.localModel.graphId = $rootScope.model.graphs[0].id;
            }
            else {
                $scope.localModel.graphId = "0";
            }
            $scope.metricSelected($scope.selectedMetric.trim(), true);
        }
        else {
            $scope.metricDeselected();
        }
    };

    $scope.nodeSelectedForEditing = function() {
        var queryId = $scope.selectedQueryId;
        if (queryId == "0") {
            return;
        }
        var query = null;
        for (var i=0; i<$rootScope.model.queries.length; i++) {
            var q = $rootScope.model.queries[i];
            if (q.id == queryId) {
                query = q;
                break;
            }
        }

        if (query == null) {
            alert("couldn't find query "+queryId);
            return;
        }

        // load the tag names / possible values
        $scope.metricSelected(query.name, false);
        // populate tag chosen values / re flags
        $scope.localModel.tagFilters = query.tags;
        for (var t=0; t<$scope.localModel.tagFilters.length; t++) {
            var tag = $scope.localModel.tagFilters[t];
            $scope.tag[tag.name] = tag.value;
            if (tag.id == null) {
                tag.id = idGenerator.nextId(); 
            }
        }
        // populate graph options
        if (query.graphOptions) {
            $scope.localModel.graphId = query.graphOptions.graphId + "";
            $scope.localModel.rate = query.graphOptions.rate;
            $scope.localModel.rateCounter = query.graphOptions.rateCounter;
            $scope.localModel.rateCounterReset = query.graphOptions.rateCounterReset;
            $scope.localModel.rateCounterMax = query.graphOptions.rateCounterMax;
            $scope.localModel.aggregator = query.graphOptions.aggregator;
            $scope.localModel.rightAxis = query.graphOptions.axis == "x1y2";
            $scope.localModel.downsample = query.graphOptions.downsample;
            $scope.localModel.downsampleBy = query.graphOptions.downsampleBy;
            $scope.localModel.downsampleTo = query.graphOptions.downsampleTo;
            if (query.graphOptions.dygraph) {
                $scope.localModel.dygraph.drawLines = query.graphOptions.dygraph.drawLines;
                $scope.localModel.dygraph.drawPoints = query.graphOptions.dygraph.drawPoints;
            }
        }
    }
        
    $scope._alwaysShowTreeFilterInput = function() {
        if ($rootScope.config && $rootScope.config.ui && $rootScope.config.ui.metrics && $rootScope.config.ui.metrics.alwaysShowMetricFilter != null) {
            return $rootScope.config.ui.metrics.alwaysShowMetricFilter;
        }
        return false;
    }

    $scope.treeFilterButtonVisible = function() {
        return !$scope._alwaysShowTreeFilterInput();
    }

    $scope.treeFilterVisible = function() {
        return $scope.showFilterInput || $scope._alwaysShowTreeFilterInput();
    }

    $scope.showHideFilterInput = function() {
        if (!$scope._alwaysShowTreeFilterInput()) {
            if ($scope.showFilterInput) {
                $scope.clearFilterInput();
            }
            $scope.showFilterInput = !$scope.showFilterInput;
        }
    }

    $scope.clearFilterInput = function() {
        $scope.filter = '';
    }


    $scope.collapseAll = function() {
        $scope.expandedNodes = [];
    };

    $scope.expandAll = function() {
        $scope.expandedNodes = $scope.allParentNodes;
    };

    $scope.showIgnoredPrefixes = function() {
        $scope.showingIgnoredPrefixes = true;
        $scope.updateTree();
    }

    $scope.hideIgnoredPrefixes = function() {
        $scope.showingIgnoredPrefixes = false;
        $scope.updateTree();
    }

    $scope.configContainsIgnoredPrefixes = function() {
        if ($rootScope.config == null) {
            return false;
        }
        var ignorePrefixes = $rootScope.config.hidePrefixes;
        return ignorePrefixes != null && ignorePrefixes.length > 0;
    }

    $scope.showIgnoredPrefixesVisible = function() {
        return $scope.configContainsIgnoredPrefixes() && !$scope.showingIgnoredPrefixes;
    }

    $scope.hideIgnoredPrefixesVisible = function() {
        return $scope.configContainsIgnoredPrefixes() && $scope.showingIgnoredPrefixes;
    }

    $scope.nodeDecoration = function(node) {
        return node.isMetric ? "underline" : "none";
    };

    $scope.addQuery = function() {
        var query = {
            id: idGenerator.nextId(),
            name: $scope.selectedMetric
        };
        $rootScope.model.queries.push(query);
        $scope.persistViewToExistingQuery(query);
    }

    $scope.saveQuery = function() {
        // unlike the function above, this wants to save the state into the existing query
        for (var i=0; i<$rootScope.model.queries.length; i++) {
            if ($rootScope.model.queries[i].id == $scope.selectedQueryId) {
                $scope.persistViewToExistingQuery($rootScope.model.queries[i]);
                return;
            }
        }
    }

    $scope.deleteQuery = function() {
        for (var i=0; i<$rootScope.model.queries.length; i++) {
            if ($rootScope.model.queries[i].id == $scope.selectedQueryId) {
                $rootScope.model.queries.splice(i,1);
                $rootScope.saveModel(true);
                $scope.clearQuery();
                return;
            }
        }
    }

    $scope.clearQuery = function() {
        $scope.metricDeselected();
        $scope.clearSelectedTreeNode();
    }

    $scope.persistViewToExistingQuery = function(query) {
        query.type = "metric"; // all we support right now
        query.tags = [];
        for (var t=0; t<$scope.localModel.tagFilters.length; t++) {
            var tag = {name:$scope.localModel.tagFilters[t].name,value:$scope.localModel.tagFilters[t].value};
            if ($scope.localModel.tagFilters[t].groupBy != null) {
                tag.groupBy = $scope.localModel.tagFilters[t].groupBy;
            }
            else { // older versions
                tag.groupBy = true;
            }
            query.tags.push(tag);
        }
        query.graphOptions = {
            graphId: $scope.localModel.graphId,
            rate: $scope.localModel.rate,
            rateCounter: $scope.localModel.rateCounter,
            rateCounterMax: $scope.localModel.rateCounterMax,
            rateCounterReset: $scope.localModel.rateCounterReset,
            aggregator: $scope.localModel.aggregator,
            axis: $scope.localModel.rightAxis ? "x1y2" : "x1y1",
            downsample: $scope.localModel.downsample,
            downsampleBy: $scope.localModel.downsampleBy,
            downsampleTo: $scope.localModel.downsampleTo,
            dygraph: {
                drawLines: $scope.localModel.dygraph.drawLines,
                drawPoints: $scope.localModel.dygraph.drawPoints
            }
        };
        $rootScope.saveModel(true);
        $scope.selectedMetric = "";
        $scope.selectedQueryId = "" + query.id;
    }

    $scope.addTagRow = function(tagk) {
        if (!$scope.tagFilteringSupported()) {
            for (var t=0; t<$scope.localModel.tagFilters.length; t++) {
                if ($scope.localModel.tagFilters[t].name == tagk) {
                    return;
                }
            }
        }
        $scope.localModel.tagFilters.push({id:idGenerator.nextId(),name:tagk,value:"",groupBy:true});
    }

    $scope.deleteTagRow = function(id) {
        var index = -1;
        for (var i=0; i<$scope.localModel.tagFilters.length; i++) {
            if ($scope.localModel.tagFilters[i].id == id) {
                index = i;
                break;
            }
        }
        if (index != -1) {
            $scope.localModel.tagFilters.splice(index, 1);
        }
    }

    // todo: this needs to have some failure handling
    $scope.updateTree = function() {
        if ($scope.treeUpdateInProgress) {
            return;
        }
        $scope.treeUpdateInProgress = true;
        $tsdbClient.suggest("metrics", "", null, function(json) {
            $scope.treeUpdateInProgress = false;
            // right we need to build our tree, we have an array of name, we need to split by "."

            var roots = [];
            var nodes = {};
            var allNodes = [];
            var parentNodes = [];
            
            var prefixProcessing = $scope.configContainsIgnoredPrefixes() && !$scope.showingIgnoredPrefixes;
            
            var ignorePrefixes = $rootScope.config.hidePrefixes;
            if (prefixProcessing) {
                if (ignorePrefixes == null) {
                    ignorePrefixes = [];
                }
                for (var p=0; p<ignorePrefixes.length; p++) {
                    if (ignorePrefixes[p].indexOf(".") != ignorePrefixes[p].length-1) {
                        ignorePrefixes[p] += ".";
                    }
                }
            }

            for (var i = 0; i < json.length; i++) {
                if (prefixProcessing) {
                    var ignoreThis = false;
                    for (var p=0; p<ignorePrefixes.length; p++) {
                        if ((json[i]+".").indexOf(ignorePrefixes[p]) == 0) {
                            ignoreThis = true;
                            break;
                        }
                    }
                    if (ignoreThis) {
                        continue;
                    }
                }
                
                var path = json[i].split(".");
                var parent = roots;
                var id = "";
                for (var j = 0; j < path.length; j++) {
                    if (j > 0) {
                        id += ".";
                    }
                    id += path[j];
                    var node = nodes[id];
                    if (!node) {
                        node = {id: id, name:path[j], isMetric:false, children: []};
                        if (parent == roots) {
                            parent.push(node);
                        }
                        else {
                            parent.children.push(node);
                        }
                        nodes[id] = node;
                        allNodes.push(node);
                    }
                    parent = node;
                }
                parent.isMetric = true;
            }

            $scope.dataForTheTree = roots;
            for (var k=0; k<allNodes.length; k++) {
                if (allNodes[k].children.length > 0) {
                    parentNodes.push(allNodes[k]);
                }
            }
            $scope.allParentNodes = parentNodes;
        }, function() {
            $scope.treeUpdateInProgress = false;
        });
    };

    $scope.metricSelected = function(metricName, isNewMetric) {
        $scope.tagOptions = {};
        $scope.tag = {};
        $scope.resetUserQueryOptions();
        
        $tsdbUtils.getTags(metricName, function(tagValues) {
            var tagNames = [];

            for (var key in tagValues) {
                if (tagValues.hasOwnProperty(key)) {
                    tagNames.push(key);
                }
            }

            // setup tagk options prior to making them available
            for (var i=0; i<tagNames.length; i++) {
                // nasty inner function to get around closure issues
                var fn = function(localKey) {
                    $scope.tagOptions[localKey] = {
                        suggest: function(term) {
                            return $scope.suggestTagValues(term, localKey);
                        }
                    };
                    if (isNewMetric) {
                        $scope.tag[localKey] = '';
                    }
                }
                fn(tagNames[i]);
            }
            $scope.tagNames = tagNames;
            $scope.tagValues = tagValues;
        }, function(results) {
            // todo: error handling
        });
    };
        
    // reset user entered query state, used when switching between queries
    $scope.resetUserQueryOptions = function() {
        $scope.localModel.tagFilters = [];
        $scope.localModel.rate = false;
        $scope.localModel.rateCounter = false;
        $scope.localModel.rateCounterMax = "";
        $scope.localModel.rateCounterReset = "";
        $scope.localModel.downsample = false;
        $scope.localModel.downsampleBy = "avg";
        $scope.localModel.downsampleTo = "";
        $scope.localModel.rightAxis = false;
        $scope.localModel.aggregator = "sum";
        if (!$scope.localModel.dygraph) {
            $scope.localModel.dygraph = {};
        }
        $scope.localModel.dygraph.drawLines = true;
        $scope.localModel.dygraph.drawPoints = false;
    }

    // todo: need better way of defining defaulting and copying between scope and model on per graph type basis
    //           perhaps using skeleton style approach
    $scope.metricDeselected = function() {
        $scope.tagOptions = {};
        $scope.tagValues = {};
        $scope.tagNames = [];
        $scope.tag = {};
        $scope.selectedMetric = "";
        $scope.selectedQueryId = "0";
        $scope.resetUserQueryOptions();
        $scope.nodeSelectionDisabled = false;
    };

    $scope.tagValuesMatchCount = function(tag) {
        var inputText = $scope.tag[tag];
        return $scope.tagValuesMatchCountInternal(tag, inputText, false);
    };

    $scope.tagValuesMatchCountFiltering = function(tagFilter) {
        var tag = tagFilter.name;
        
        var inputText = tagFilter.value;
        return $scope.tagValuesMatchCountInternal(tag, inputText, true);
    };
        
    $scope.tagValuesMatchCountInternal = function(tag, inputText, filtering) {
        if (inputText=="" || inputText==null){
            return "";
        }
        var allValues = $scope.tagValues[tag];
        if (allValues == null) {
            return "";
        }
        var count = 0;
        if (inputText=="*") {
            return "("+allValues.length+")";
        }
        if (filtering && (inputText=="wildcard(*)" || inputText=="iwildcard(*)" || inputText=="regexp(.*)")) {
            return "("+allValues.length+")";
        }
        
        if (inputText.indexOf(")") == inputText.length - 1) {
            var fn = null;
            var ignoreCase = false;
            var negate = false;
            var openBraceIndex = inputText.indexOf("(");
            if (openBraceIndex > -1) {
                var closeBraceIndex = inputText.indexOf(")");
                if (closeBraceIndex == inputText.length - 1) {
                    var filterFn = inputText.substring(0, openBraceIndex);
                    negate = filterFn.indexOf("not_") == 0;
                    var filterValue = inputText.substring(openBraceIndex+1, closeBraceIndex);
                    fn = function(candidateValue) {
                        return $tsdbClient.tagFilterMatchesValue({fn:filterFn,value:filterValue}, candidateValue);
                    }
                }
                if (fn != null && allValues != null) {
                    for (var j=0; j<allValues.length; j++) {
                        if (fn(allValues[j])) {
                            count++;
                        }
                    }
                    var result = negate ? allValues.length - count : count;
                    return "("+result+")";
                }
                
            }
        }
        // old school query
        if (allValues != null) {
            var allTags = inputText.split("|");
            for (var j=0; j<allValues.length; j++) {
                var ind = allTags.indexOf(allValues[j]);
                if (ind >= 0) {
                    count++;
                }
            }
        }

        return "("+count+")";
    }
        

    $scope.suggestTagValues = function(term, tag) {
        var q = term.toLowerCase().trim();

        var lastPipe = q.lastIndexOf("|");
        var prefix = "";

        var haveValues = [];
        if (lastPipe >= 0) {
            prefix = q.substring(0,lastPipe+1);
            q = q.substring(lastPipe+1);

            var haveValuesString = prefix.substring(0, lastPipe);
            haveValues = haveValuesString.split("|");
        }

        var results = [];

        var allValues = $scope.tagValues[tag];
        for (var i=0; i<allValues.length; i++) {
            if (haveValues.indexOf(allValues[i])<0) {
                if (allValues[i].toLowerCase().startsWith(q)) {
                    results.push({label: allValues[i], value: prefix+allValues[i]});
                }
            }
        }
        return results;
    };
        
    $scope.expressionQueryCount = function(graph) {
        return 0; // todo
    }

    $scope.openQueryDialog = function() {
        alert('TODO');
    }

    $scope.updateModel = function() {
        $scope.updateTree();
        // init internal copy
        $scope.globalDownsampling = $rootScope.model.global.globalDownsampling && true; // force to boolean
    }
        
    $rootScope.$on("modelUpdated", function(event,data) {
        //console.log("rootScope.modelUpdated received, updating GraphControlCtrl model")
        $scope.updateModel();
    });

    // tell the main app controller to call us on any update of the config
    // it will call us if it's already loaded too
    $rootScope.onConfigUpdate($scope.updateModel);
}]);
