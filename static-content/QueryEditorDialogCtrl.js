aardvark.controller('QueryEditorDialogCtrl', function QueryEditorDialogCtrl($uibModalInstance, idGenerator, tsdbUtils, deepUtils, graphs, queries) {
    var $ctrl = this;

    $ctrl.queries = deepUtils.deepClone(queries);
    $ctrl.gexpSubQueriesById = {};
    
    $ctrl.deletedQueries = [];
    
    $ctrl.currentQueryAdding = false;
    $ctrl.currentQuery = null;
    $ctrl.currentQueryId = null;
    
    // gexp stuff
    $ctrl.gexpFunctions = tsdbUtils.gexpFunctions;
    // single query arg:
    $ctrl.selectedSubQueryId = null;
    // multi query args:
    $ctrl.selectedAvailableSubQueries = [];
    $ctrl.selectedIncludedSubQueries = [];
    $ctrl.availableSubQueries = [];
    $ctrl.includedSubQueries = [];

    $ctrl.init = function() {
        for (var q=0; q<$ctrl.queries.length; q++) {
            if ($ctrl.queries[q].type == "metric" || $ctrl.queries[q].type == "gexp") {
                $ctrl.gexpSubQueriesById[queries[q].id + ""] = $ctrl.queries[q];
            }
        }
        $ctrl.initialiseAvailableSubQueries();
    }
    
    $ctrl.initialiseAvailableSubQueries = function() {
        $ctrl.availableSubQueries = [];
        
        function isDAG(query, seenIds) {
            if (seenIds == null) {
                seenIds = {};
            }

            var idStr = query.id.toString();
            if (seenIds.hasOwnProperty(idStr)) {
                return false;
            }
            // add to set
            seenIds[idStr] = idStr;
            if (query.type == "gexp") {
                for (var i=0; i<query.subQueries.length; i++) {
                    var subQueryId = query.subQueries[i];
                    var subQuery = $ctrl.gexpSubQueriesById[subQueryId];
                    if (subQuery != null) {
                        if (!isDAG(subQuery, seenIds)) {
                            return false;
                        }
                    }
                }
            }
            delete seenIds[idStr];
            return true;
        }
        
        for (var q=0; q<$ctrl.queries.length; q++) {
            if ($ctrl.queries[q].type == "metric" || $ctrl.queries[q].type == "gexp") {
                // todo: incomplete, doesn't handle nesting
                var seenIds = {};
                if ($ctrl.currentQuery != null) {
                    seenIds[$ctrl.currentQuery.id] = $ctrl.currentQuery.id;
                }
                if ($ctrl.currentQuery == null || isDAG($ctrl.queries[q], seenIds)) {
                    $ctrl.availableSubQueries.push($ctrl.queries[q]);
                }
            }
        }
        
    }
    
    $ctrl.availableGexpFunctionNames = function() {
        return Object.keys($ctrl.gexpFunctions);
    }

    $ctrl.querySelectionChanged = function() {
        // le grand reset
        $ctrl.currentQuery = null;
        $ctrl.selectedSubQueryId = null;
        $ctrl.selectedAvailableSubQueries = [];
        $ctrl.selectedIncludedSubQueries = [];
        $ctrl.availableSubQueries = [];
        $ctrl.includedSubQueries = [];
        // find the query
        for (var q=0; q<$ctrl.queries.length; q++) {
            if ($ctrl.queries[q].id == $ctrl.currentQueryId) {
                $ctrl.currentQuery = $ctrl.queries[q];
                break;
            }
        }
        // now init ui for this query
        if ($ctrl.currentQuery != null) {
            $ctrl.initialiseAvailableSubQueries();
            if ($ctrl.currentQuery.type == "gexp" && $ctrl.currentQuery.function != null) {
                var fn = $ctrl.gexpFunctions[$ctrl.currentQuery.function];
                if (fn != null) {
                    if (fn.maxSubQueries == 1) {
                        $ctrl.selectedSubQueryId = $ctrl.currentQuery.subQueries.length > 0 ? $ctrl.currentQuery.subQueries[0] : null;
                    }
                    if (fn.maxSubQueries > 1) {
                        $ctrl.includedSubQueries = $ctrl.currentQuery.subQueries.map(function (queryId) {
                            var query = $ctrl.gexpSubQueriesById[queryId + ""];
                            var wrapper = {
                                id: idGenerator.nextId(),
                                query: query
                            };
                            return wrapper;
                        });
                    }
                }
            }
        }
    }
    
    $ctrl.moveMetricUp = function() {
        // selectedIncludedSubQueries -> includedSubQueries
        var wrappersToMove = $ctrl.selectedIncludedSubQueries.map(function (id) {return id;});
        // for each item, whether it can be moved
        var indexesToMove = $ctrl.includedSubQueries.map(function (item) {
            var ind = wrappersToMove.indexOf(item.id);
            return (ind >= 0);
        });
       
        var startIndex = 0;
        // skip over items to move which are already at top
        while (indexesToMove[startIndex]) {
            startIndex++;
        }
        for (var i=Math.max(startIndex,1); i<indexesToMove.length; i++) {
            if (indexesToMove[i]) {
                var removed = $ctrl.includedSubQueries[i];
                $ctrl.includedSubQueries.splice(i, 1);
                $ctrl.includedSubQueries.splice(i-1, 0, removed);
            }
        }
    }
    
    $ctrl.moveMetricDown = function() {
        // selectedIncludedSubQueries -> includedSubQueries
        var wrappersToMove = $ctrl.selectedIncludedSubQueries.map(function (id) {return id;});
        // for each item, whether it can be moved
        var indexesToMove = $ctrl.includedSubQueries.map(function (item) {
            var ind = wrappersToMove.indexOf(item.id);
            return (ind >= 0);
        });

        var startIndex = indexesToMove.length-1;
        // skip over items to move which are already at top
        while (indexesToMove[startIndex]) {
            startIndex--;
        }
        for (var i=Math.min(startIndex,indexesToMove.length-2); i>=0; i--) {
            if (indexesToMove[i]) {
                var removed = $ctrl.includedSubQueries[i];
                $ctrl.includedSubQueries.splice(i, 1);
                $ctrl.includedSubQueries.splice(i+1, 0, removed);
            }
        }
    }
    
    $ctrl.moveMetricIn = function() {
        // selectedAvailableSubQueries -> includedSubQueries
        var includedMetricCount = $ctrl.includedSubQueries.length;
        var maxMetricCount = $ctrl.gexpFunctions[$ctrl.currentQuery.function].maxSubQueries;
        var newWrapperIds = [];
        for (var q=0; q<$ctrl.selectedAvailableSubQueries.length && includedMetricCount<maxMetricCount; q++) {
            var wrapper = {
                id: idGenerator.nextId(),
                query: $ctrl.gexpSubQueriesById[$ctrl.selectedAvailableSubQueries[q]]
            }
            $ctrl.includedSubQueries.push(wrapper);
            newWrapperIds.push(wrapper.id);
            includedMetricCount++;
        }
        $ctrl.selectedAvailableSubQueries = [];
        $ctrl.selectedIncludedSubQueries = newWrapperIds.map(function (id) {return id;});
    }
    
    $ctrl.moveMetricOut = function() {
        var wrappersToRemove = $ctrl.selectedIncludedSubQueries.map(function (id) {return id;});
        // selectedIncludedSubQueries -> out
        for (var q=$ctrl.includedSubQueries.length-1; q>=0; q--) {
            var ind = wrappersToRemove.indexOf($ctrl.includedSubQueries[q].id); 
            if (ind >= 0) {
                $ctrl.includedSubQueries.splice(q, 1);
            }
        }
    }

    $ctrl.queryTypeChanged = function() {
        // todo
    }
    
    $ctrl.queryString = function(query) {
        if (query.type == "metric") {
            return tsdbUtils.metricQuery(query, false, null/*globalDownsampleTo*/, null/*downsampleOverrideFn*/, function(s){});
        }
        if (query.type == "gexp") {
            return tsdbUtils.gexpQuery(query, $ctrl.gexpSubQueriesById, false, null/*globalDownsampleTo*/, null/*downsampleOverrideFn*/, function(s){});
        }
        return "Unsupported query type: "+query.type;
    }

    $ctrl.allocatedGraph = function() {
        if ($ctrl.currentQuery == null || $ctrl.currentQuery.graphOptions == null) {
            return null;
        }
        var graph = null;
        if (graphs != null) {
            for (var g=0; g<graphs.length; g++) {
                if (graphs[g].id == $ctrl.currentQuery.graphOptions.graphId) {
                    graph = graphs[g];
                }
            }
        }
        return graph;
    }
    
    $ctrl.graphType = function() {
        var graph = $ctrl.allocatedGraph();
        if (graph != null) {
            return graph.type;
        }
        return "";
    }
    
    $ctrl.newQuery = function() {
        $ctrl.currentQuery = {
            id: idGenerator.nextId(),
            type: "gexp",
            name: "Query "+($ctrl.queries.length+1),
            subQueries: [null],
            // defaults
            graphOptions: {
                graphId: "0",
                rightAxis: false,
                dygraph: {
                    drawLines: true,
                    drawPoints: false
                }
            }
        }
        $ctrl.queries.push($ctrl.currentQuery);
        $ctrl.currentQueryId = $ctrl.currentQuery.id;
        $ctrl.currentQueryAdding = true;
        $ctrl.initialiseAvailableSubQueries();
        $ctrl.selectedSubQueryId = null;
        $ctrl.includedSubQueries = [];
        $ctrl.selectedAvailableSubQueries = [];
        $ctrl.selectedIncludedSubQueries = [];
    }
    
    $ctrl.deleteCurrent = function() {
        var ind = -1;
        for (var m=0; m<$ctrl.queries.length; m++) {
            if ($ctrl.queries[m].id == $ctrl.currentQueryId) {
                ind = m;
            }
        }
        if (ind != -1) {
            var query = $ctrl.queries[ind];
            $ctrl.deletedQueries.push(query);
            $ctrl.queries.splice(ind, 1);
            if ($ctrl.gexpSubQueriesById.hasOwnProperty(query.id)) {
                delete $ctrl.gexpSubQueriesById[query.id];
            }
            $ctrl.currentQueryId = null;
            if (query.type == "metric") {
                // todo: delete references to this?
            }
        }
    }
    
    $ctrl.saveCurrent = function() {
        switch ($ctrl.currentQuery.type) {
            case "metric":
                // todo
                break;
            case "gexp":
                if ($ctrl.currentQuery.function == null) {
                    $ctrl.currentQuery.subQueries = [];
                }
                else {
                    var fn = $ctrl.gexpFunctions[$ctrl.currentQuery.function];
                    if (fn == null || fn.maxSubQueries > 1) {
                        $ctrl.currentQuery.subQueries = $ctrl.includedSubQueries.map(function (wrapper){return wrapper.query.id;});
                    }
                    else if (fn.maxSubQueries == 1) {
                        $ctrl.currentQuery.subQueries = [$ctrl.selectedSubQueryId];
                    }
                }
                break;
            case "exp":
                // todo
                break;
            default:
                throw "Unrecognised query type: "+$ctrl.currentQuery.type;
        }
        if ($ctrl.currentQueryAdding) {
            if ($ctrl.currentQuery.type == "gexp" || $ctrl.currentQuery.type == "metric") {
                $ctrl.gexpSubQueriesById[$ctrl.currentQuery.id] = $ctrl.currentQuery;
                $ctrl.initialiseAvailableSubQueries();
            }
            $ctrl.currentQueryAdding = false;
        }
        
    }

    $ctrl.save = function () {
        $uibModalInstance.close({changed:$ctrl.queries, deleted:$ctrl.deletedQueries});
    };

    $ctrl.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
    $ctrl.init();

    
});
