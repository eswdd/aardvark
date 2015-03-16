
angular
    .module('myApp', ['treeControl'])

    .controller('TreeCtrl', ['$scope', '$http', function($scope, $http) {

        $scope.showTreeFilter = false;
        $scope.allParentNodes = [];
        $scope.showFilterInput = false;

        $scope.nodeSelected = function (node,selected) {
            var valid = selected && node.isMetric;
            $scope.addButtonEnabled = valid;
            $scope.selectedMetric = valid ? node.id : '';

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
    }]);