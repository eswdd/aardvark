/*
 * Graph management:
 * - adding/removing
 * - global graph options
 * - per-graph options (shared and type specific)
 */
otis.controller('GraphControlCtrl', [ '$scope', '$rootScope', function GraphControlCtrl($scope, $rootScope) {
    $scope.lastGraphId = 0;
    $scope.showEdit={};
    $scope.isOpen={};
    $scope.firstOpen = true;

    $scope.loadModel = function() {
        var model = $rootScope.model;
        if (model.graphs == null || model.graphs.length == 0) {
            model.graphs = [
                {
                    id: new Date().getTime()+"",
                    title: "Graph 1",
                    type: $rootScope.graphTypes.length == 1 ? $rootScope.graphTypes[0] : null,
                    showTitle: false
                }
            ];
        }
        for (var i=0; i<model.graphs.length; i++) {
            var item = model.graphs[i];
            if (item.id>$scope.lastGraphId) {
                $scope.lastGraphId = parseInt(item.id);
            }
        }
    }

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
        //todo: should stage new graphs and edits into an internal model and only push to model when click a save button
        var id = $scope.nextId();
        $rootScope.model.graphs.push({
            id: id,
            title: "Graph "+($rootScope.model.graphs.length+1),
            type: $rootScope.graphTypes.length == 1 ? $rootScope.graphTypes[0] : null,
            showTitle: true
        });
        $rootScope.saveModel();
        $scope.showEdit[id] = true;
        // Q: is it always this one open?
        // A: yes - currently you can only add a graph from the top section
        $scope.firstOpen = false;
        $scope.isOpen[id] = true;
    };
    $scope.deleteGraph = function(id) {
        var index = -1;
        for (var i=0; i<$rootScope.model.graphs.length; i++) {
            if ($rootScope.model.graphs[i].id == id) {
                index = i;
                break;
            }
        }
        if (index == -1) {
            return;
        }
        $rootScope.model.graphs.splice(index, 1);
        $rootScope.saveModel();
    }
    $scope.renderGraphs = function() {
        $rootScope.saveModel(true);
    }
    $rootScope.onConfigUpdate($scope.loadModel);
}]);