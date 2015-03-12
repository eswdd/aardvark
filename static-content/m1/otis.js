angular
    .module('Otis', ['ui.layout','treeControl','ngSanitize','MassAutoComplete'])
    /*
     * Otis controller is responsible for the main app, providing config
     * and model<-> hash functionality for the other controllers
     */
    .controller('OtisCtrl', [ '$rootScope', '$http', '$location', function OtisCtrl($rootScope, $http, $location) {
        /*
         * Model persistence - ensures that persistent data is saved to the hash whilst leaving
         * controllers free to litter their own scope with volatile data. Controllers are responsible
         * for correctly populating any derivable volatile data from persistent on page load
         */
        $rootScope.model = {
            metrics: []
        };

        var hash = $location.hash();
        if (hash != null && hash!="") {
            while (hash.indexOf("#") == 0) {
                hash = hash.substring(1);
            }
            hash = decodeURI(hash);
            $rootScope.model = JSON.parse(hash);
        }

        $rootScope.saveModel = function() {
            $location.hash(JSON.stringify($rootScope.model));
        }

        /*
         * Config management - we have config loaded from the server, plus a capability to enable
         * controllers to register for notifications of updates to the config
         */
        $rootScope.configListeners = [];

        /**
         * Register a listener for updates to config. Will call the given callback:
         * 1. When the config object is successfully loaded from the server
         * 2. If the config object was already loaded when this method was called
         * Note this might result in 2 calls in quick succession due to race conditions, callers
         * must be able to handle this.
         * @param func The callback
         */
        $rootScope.onConfigUpdate = function(func) {
            $rootScope.configListeners.push(func);
            if ($rootScope.config) {
                func();
            }
        }

        $rootScope.config = null;


        $rootScope.updateConfig = function() {
            $http.get('/otis/config').success(function(json) {
                $rootScope.config = json;
                for (var i=$rootScope.configListeners.length-1; i>=0; i--) {
                    $rootScope.configListeners[i]();
                }
            });
        };

        $rootScope.updateConfig();
    }])
    /*
     *
     */
    .controller('GraphControlCtrl', [ '$scope', function GraphControlCtrl($scope) {

    }])
    /*
     *
     */
    .controller('GraphCtrl', [ '$scope', function GraphCtrl($scope) {

    }])
    /*
     *
     */
    .directive('tagSelection', function() {
        return {
            template: '<div><input type="text" ng-model="tag[tagk]" size="15" /> RE? <input type="checkbox" ng-model="re[tagk]"/> {{tagValuesMatchCount(tagk)}}</div>'
            // todo: put this back when issue#27 is fixed
            //template: '<div mass-autocomplete><input type="text" ng-model="tag[tagk]" mass-autocomplete-item="tagOptions[tagk]" size="15" /> RE? <input type="checkbox" ng-model="re[tagk]"/> {{tagValuesMatchCount(tagk)}}</div>'
        }
    })
    .controller('MetricControlCtrl', [ '$scope', '$rootScope', '$sce', '$http', function MetricControlCtrl($scope, $rootScope, $sce, $http) {

        $scope.showTreeFilter = false;
        $scope.allParentNodes = [];
        $scope.showFilterInput = false;
        $scope.addButtonEnabled = false;
        $scope.selectedMetric = "";
        $scope.filter = "";
        $scope.expandedNodes = [];
        $scope.tag = {};
        $scope.re = {};
        $scope.tagOptions = {};
        $scope.rate = false;
        $scope.downsample = false;
        $scope.downsampleBy = "";
        $scope.tagNames = [];
        $scope.tagValues = {};
        $scope.lastId = 0;


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

        $scope.nodeSelected = function (node,selected) {
            var valid = selected && node.isMetric;
            $scope.addButtonEnabled = valid;
            $scope.selectedMetric = valid ? node.id : '';
            $scope.metricSelected();

        };

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

        $scope.nodeDecoration = function(node) {
            return node.isMetric ? "underline" : "none";
        };

        $scope.nextId = function() {
            var next = $scope.lastId+1;
            $scope.lastId = next;
            return next;
        }

        $scope.addMetric = function() {
            var tArray = [];
            for (var i=0; i<$scope.tagNames.length; i++) {
                tArray.push({
                    name: $scope.tagNames[i],
                    value: $scope.tag[$scope.tagNames[i]],
                    re: $scope.re[$scope.tagNames[i]]
                });
            }
            $rootScope.model.metrics.push({
                id: $scope.nextId(),
                name: $scope.selectedMetric,
                tags: tArray,
                graphOptions: {
                    rate: $scope.rate,
                    downsample: $scope.downsample,
                    downsampleBy: $scope.downsampleBy
                }

            });
            $rootScope.saveModel();
        }

        // todo: this needs to not do any work if it's already running a request
        // todo: this needs to have some failure handling
        $scope.updateTree = function() {
            $http.get('/api/suggest').success(function(json) {
                //$http.get('http://localhost:4242/api/suggest?type=metrics&max=1000000').success(function(json) {
                // right we need to build our tree, we have an array of name, we need to split by "."

                var roots = [];
                var nodes = {};
                var allNodes = [];
                var parentNodes = [];

                for (var i = 0; i < json.length; i++) {
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

            $scope.metricSelected = function() {
                $http.get("/otis/tags?metric="+$scope.selectedMetric.trim()).success(function (json) {
                    var tagNames = [];

                    for (var key in json) {
                        if (json.hasOwnProperty(key)) {
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
                            $scope.re[localKey] = true;
                        }
                        fn(tagNames[i]);
                    }
                    $scope.tagNames = tagNames;
                    $scope.tagValues = json;
                });
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
                    if (allValues[i].toLowerCase().startsWith(q) && haveValues.indexOf(allValues[i])<0) {
                        results.push({label: allValues[i], value: prefix+allValues[i]});
                    }
                }
                return results;
            }

            $scope.tagValuesMatchCount = function(tag) {
                var inputText = $scope.tag[tag];
                if (inputText=="" || inputText==null){
                    return "";
                }
                if (inputText.endsWith("|") && $scope.re[tag]) {
                    inputText = inputText.substring(0, inputText.length-1);
                }
                var allValues = $scope.tagValues[tag];
                var count = 0;
                if (!$scope.re[tag] && inputText=="*") {
                    return "("+allValues.length+")";
                }
                for (var i=0; i<allValues.length; i++) {
                    if ($scope.re[tag]) {
                        if (new RegExp(inputText).test(allValues[i])) {
                            count++;
                        }
                    }
                    else if (inputText == allValues[i]) {
                        count++;
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
                        if ($scope.re[tag]) {
                            if (new RegExp(q).test(allValues[i])) {
                                results.push({label: allValues[i], value: prefix+allValues[i]});
                            }
                        }
                        else {
                            if (allValues[i].toLowerCase().startsWith(q)) {
                                results.push({label: allValues[i], value: prefix+allValues[i]});
                            }
                        }
                    }
                }
                return results;
            }
        };

        // tell the main app controller to call us on any update of the scope
        // it will call us if it's already loaded too
        $rootScope.onConfigUpdate($scope.updateTree);
    }]);