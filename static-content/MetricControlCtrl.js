/*
 * Used to render the tag value rows in the metrics control panel.
 */
aardvark.directive('tagSelection', function() {
    return {
        template: '<div mass-autocomplete><input type="text" ng-model="tag[tagk]" mass-autocomplete-item="tagOptions[tagk]" size="15" ng-blur="saveMetricIfAutoUpdate()" aardvark-enter="addOrSaveMetric()" /> {{tagValuesMatchCount(tagk)}}</div>'
    }
}).directive('tagFilterSelection', function() {
    return {
        template: '<div mass-autocomplete><input type="text" ng-model="tag.value" mass-autocomplete-item="tagOptions[tag.name]" size="15" ng-blur="saveMetricIfAutoUpdate()" aardvark-enter="addOrSaveMetric()" /> {{tagValuesMatchCountFiltering(tag)}}</div>'
    }
})
/*
 * Metric management:
 * - adding/removing
 * - graph association
 * - per metric graphing options (timeseries selection, aggregation)
 * - graph type specific graphing options
 */
.controller('MetricControlCtrl', [ '$scope', '$rootScope', '$sce', '$http', 'idGenerator', function MetricControlCtrl($scope, $rootScope, $sce, $http, idGenerator) {

    $scope.showTreeFilter = false;
    $scope.allParentNodes = [];
    $scope.showFilterInput = false;
    $scope.selectedTreeNode = undefined;
    $scope.selectedMetric = "";
    $scope.filter = "";
    $scope.expandedNodes = [];
    $scope.tag = {};
    $scope.tagOptions = {};
    $scope.tagNames = [];
    $scope.tagValues = {};
    $scope.tagFilters = [];
    $scope.selectedMetricId = 0;
    $scope.nodeSelectionDisabled = false;

    $scope.graphId = "0";
    $scope.aggregator = "sum";
    $scope.rightAxis = false;
    $scope.rate = false;
    $scope.rateCounter = false;
    $scope.rateCounterMax = "";
    $scope.rateCounterReset = "";
    $scope.downsample = false;
    $scope.downsampleBy = "avg";
    $scope.downsampleTo = "";
    $scope.scatterAxis = "";
        
    $scope.showingIgnoredPrefixes = false;

    $scope.globalDownsampling = false;

    $rootScope.$on('globalDownsamplingChanged', function (event, data) {
        $scope.globalDownsampling = data;
    });

    $scope.addButtonVisible = function() {
        return $scope.selectedMetric != "";
    };
    $scope.deleteButtonVisible = function() {
        return $scope.selectedMetricId != "0";
    };
    $scope.saveButtonVisible = function() {
        return $scope.selectedMetricId != "0";
    };
    $scope.clearButtonEnabled = function() {
        return $scope.addButtonVisible() || $scope.saveButtonVisible();
    };
    $scope.expandAllVisible = function() {
        return $rootScope.config && $rootScope.config.ui.metrics.enableExpandAll;
    };
    $scope.tagFilteringSupported = function() {
        return $rootScope.tsdbVersion >= $rootScope.TSDB_2_2;
    };
    $scope.clearSelectedTreeNode = function() {
        $scope.selectedTreeNode = undefined;
    }
    $scope.addOrSaveMetric = function() {
        if ($scope.addButtonVisible()) {
            $scope.addMetric();
        }
        else {
            $scope.saveMetric();
        }
    }
    $scope.saveMetricIfAutoUpdate = function() {
        if (!$scope.addButtonVisible() && $rootScope.autoUpdateEnabled()) {
            $scope.saveMetric();
        }
    }

    $scope.downsampleByEnabled = function() {
        var graph = null;
        if ($rootScope.model.graphs != null) {
            for (var g=0; g<$rootScope.model.graphs.length; g++) {
                if ($rootScope.model.graphs[g].id == $scope.graphId) {
                    graph = $rootScope.model.graphs[g];
                }
            }
        }
        return $scope.downsample || $scope.globalDownsampling 
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
            $scope.selectedMetricId = "0";
            if ($rootScope.model.graphs.length == 1) {
                $scope.graphId = $rootScope.model.graphs[0].id;
            }
            else {
                $scope.graphId = "0";
            }
            $scope.metricSelected($scope.selectedMetric.trim(), true);
        }
        else {
            $scope.metricDeselected();
        }
    };

    $scope.nodeSelectedForEditing = function() {
        var metricId = $scope.selectedMetricId;
        if (metricId == "0") {
            return;
        }
        var metric = null;
        for (var i=0; i<$rootScope.model.metrics.length; i++) {
            var m = $rootScope.model.metrics[i];
            if (m.id == metricId) {
                metric = m;
                break;
            }
        }

        if (metric == null) {
            alert("couldn't find metric "+metricId);
            return;
        }

        // load the tag names / possible values
        $scope.metricSelected(metric.name, false);
        // populate tag chosen values / re flags
        $scope.tagFilters = metric.tags;
        for (var t=0; t<$scope.tagFilters.length; t++) {
            var tag = $scope.tagFilters[t];
            $scope.tag[tag.name] = tag.value;
            if (tag.id == null) {
                tag.id = idGenerator.nextId(); 
            }
        }
        // populate graph options
        if (metric.graphOptions) {
            $scope.graphId = metric.graphOptions.graphId;
            $scope.rate = metric.graphOptions.rate;
            $scope.rateCounter = metric.graphOptions.rateCounter;
            $scope.rateCounterReset = metric.graphOptions.rateCounterReset;
            $scope.rateCounterMax = metric.graphOptions.rateCounterMax;
            $scope.aggregator = metric.graphOptions.aggregator;
            $scope.rightAxis = metric.graphOptions.rightAxis;
            $scope.downsample = metric.graphOptions.downsample;
            $scope.downsampleBy = metric.graphOptions.downsampleBy;
            $scope.downsampleTo = metric.graphOptions.downsampleTo;
            $scope.scatterAxis = metric.graphOptions.scatter.axis;
        }
    }

    $scope.showHideFilterInput = function() {
        if ($scope.showFilterInput) {
            $scope.clearFilterInput();
        }
        $scope.showFilterInput = !$scope.showFilterInput;
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

    $scope.addMetric = function() {
        var metric = {
            id: idGenerator.nextId(),
            name: $scope.selectedMetric
        };
        $rootScope.model.metrics.push(metric);
        $scope.persistViewToExistingMetric(metric);
    }

    $scope.saveMetric = function() {
        // unlike the function above, this wants to save the state into the existing metric
        for (var i=0; i<$rootScope.model.metrics.length; i++) {
            if ($rootScope.model.metrics[i].id == $scope.selectedMetricId) {
                $scope.persistViewToExistingMetric($rootScope.model.metrics[i]);
                return;
            }
        }
    }

    $scope.deleteMetric = function() {
        for (var i=0; i<$rootScope.model.metrics.length; i++) {
            if ($rootScope.model.metrics[i].id == $scope.selectedMetricId) {
                $rootScope.model.metrics.splice(i,1);
                $rootScope.saveModel(true);
                $scope.clearMetric();
                return;
            }
        }
    }

    $scope.clearMetric = function() {
        $scope.metricDeselected();
        $scope.clearSelectedTreeNode();
    }

    // todo: m1: how to do tag expansion with regexes? here or in graph rendering? here i suspect..
    $scope.persistViewToExistingMetric = function(metric) {
        var tArray = [];
        if ($scope.tagFilteringSupported()) {
            tArray = $scope.tagFilters;
        }
        else {
            for (var i=0; i<$scope.tagNames.length; i++) {
                var tName = $scope.tagNames[i];
                tArray.push({
                    name: tName,
                    value: $scope.tag[tName],
                    groupBy: true
                });
            }
        }
        metric.tags = tArray;
        metric.graphOptions = {
            graphId: $scope.graphId,
            rate: $scope.rate,
            rateCounter: $scope.rateCounter,
            rateCounterMax: $scope.rateCounterMax,
            rateCounterReset: $scope.rateCounterReset,
            aggregator: $scope.aggregator,
            axis: $scope.rightAxis ? "x1y2" : "x1y1",
            downsample: $scope.downsample,
            downsampleBy: $scope.downsampleBy,
            downsampleTo: $scope.downsampleTo,
            scatter: {
                axis: $scope.scatterAxis
            }
        };
        $rootScope.saveModel(true);
        $scope.selectedMetric = "";
        $scope.selectedMetricId = metric.id;
    }

    $scope.addTagRow = function(tagk) {
        $scope.tagFilters.push({id:idGenerator.nextId(),name:tagk,value:"",groupBy:true});
    }

    $scope.deleteTagRow = function(id) {
        var index = -1;
        for (var i=0; i<$scope.tagFilters.length; i++) {
            if ($scope.tagFilters[i].id == id) {
                index = i;
                break;
            }
        }
        if (index != -1) {
            $scope.tagFilters.splice(index, 1);
        }
    }

    // todo: this needs to not do any work if it's already running a request
    // todo: this needs to have some failure handling
    $scope.updateTree = function() {
        $http.get('http://'+$rootScope.config.tsdbHost+':'+$rootScope.config.tsdbPort+'/api/suggest?type=metrics&max=1000000').success(function(json) {
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
        });
    };

    $scope.metricSelected = function(metricName, newMetric) {
        $scope.tagOptions = {};
        $scope.tag = {};
        var url = $rootScope.config.tsdbProtocol+"://"+$rootScope.config.tsdbHost+":"+$rootScope.config.tsdbPort+"/api/search/lookup";
        var requestJson = {"metric": metricName, "limit": 100000, "useMeta": true}; // todo: useMeta should be based on tsdb config
        var postData = JSON.stringify(requestJson);
        $http.post(url, postData).success(function (data) {
            var tagValues = {};

//            var tsdbResponse = JSON.parse(data);
            var tsdbResponse = data;
            var results = tsdbResponse.results;
            for (var i=0; i<results.length; i++) {
                var ts = results[i];
                for (var tagk in ts.tags) {
                    if (ts.tags.hasOwnProperty(tagk)) {
                        if (!(tagk in tagValues)) {
                            tagValues[tagk] = [];
                        }
                        if (tagValues[tagk].indexOf(ts.tags[tagk]) < 0) {
                            tagValues[tagk].push(ts.tags[tagk]);
                        }
                    }
                }
            }
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
                    if (newMetric) {
                        $scope.tag[localKey] = '';
                    }
                }
                fn(tagNames[i]);
            }
            // todo: populate tag filters
            $scope.tagNames = tagNames;
            $scope.tagValues = tagValues;
            
        });
    };
        
    // reset user entered metric state, used when switching between metrics
    $scope.resetUserMetricOptions = function() {
        $scope.tagFilters = [];
        $scope.graphId = "0";
        $scope.rate = false;
        $scope.rateCounter = false;
        $scope.rateCounterMax = "";
        $scope.rateCounterReset = "";
        $scope.downsample = false;
        $scope.downsampleBy = "avg";
        $scope.downsampleTo = "";
        $scope.scatterAxis = "";
        $scope.rightAxis = false;
        $scope.aggregator = "sum";
    }

        // todo: m2: need better way of defining defaulting and copying between scope and model on per graph type basis
        //           perhaps using skeleton style approach
    $scope.metricDeselected = function() {
        $scope.tagOptions = {};
        $scope.tagValues = {};
        $scope.tagNames = [];
        $scope.tag = {};
        $scope.selectedMetric = "";
        $scope.selectedMetricId = "0";
        $scope.resetUserMetricOptions();
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
                if (inputText.indexOf("literal_or(") == 0 || inputText.indexOf("iliteral_or(") == 0
                    || inputText.indexOf("not_literal_or(") == 0 || inputText.indexOf("not_iliteral_or(") == 0) {
                    ignoreCase = inputText.indexOf("iliteral_or(") >= 0;
                    negate = inputText.indexOf("not_") == 0;
                    var toMatch = inputText.substring(openBraceIndex+1, inputText.length-1).split("|");
                    if (ignoreCase) {
                        for (var m=0; m<toMatch.length; m++) {
                            toMatch[m] = toMatch[m].toLowerCase();
                        }
                    }
                    fn = function(candidateValue) {
                        var v = ignoreCase ? candidateValue.toLowerCase() : candidateValue;
                        return toMatch.indexOf(v) >= 0;
                    };
                }
                if (inputText.indexOf("wildcard(") == 0 || inputText.indexOf("iwildcard(") == 0 || inputText.indexOf("regexp(") == 0) {
                    ignoreCase = inputText.indexOf("iwildcard(") == 0;
                    var regexp = inputText.substring(openBraceIndex+1, inputText.length-1);
                    if (inputText.indexOf("wildcard") >= 0) {
                        regexp = regexp.replaceAll(".","\\\\.");
                        regexp = regexp.replaceAll("*",".*");
                        regexp = regexp.replaceAll("\\\\..*","\\\\.");
                    }
                    if (ignoreCase) {
                        regexp = regexp.toLowerCase();
                    }
                    fn = function(candidateValue) {
                        var v = ignoreCase ? candidateValue.toLowerCase() : candidateValue;
                        try {
                            return v.match(new RegExp(regexp)) != null;
                        }
                        catch (regexpError) {
                            // typical user error
                            if (regexp != "*") {
                                console.log("regexp("+regexp+") caused an error: "+regexpError);
                            }
                            return false;
                        }
                    };
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

    $scope.updateModel = function() {
        $scope.updateTree();
        // init internal copy
        $scope.globalDownsampling = $rootScope.model.global.globalDownsampling && true;
        
    }

    // tell the main app controller to call us on any update of the scope
    // it will call us if it's already loaded too
    $rootScope.onConfigUpdate($scope.updateModel);
}]);
