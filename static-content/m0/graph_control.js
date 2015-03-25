
angular
    .module('myApp', ['ui.bootstrap'])
    .controller('GraphCtrl', ['$scope', function($scope) {
        $scope.lastGraphId = 2;
        $scope.graphTypes = ["gnuplot","dygraph"];
        $scope.graphs = [
            {
                "number": 1,
                "title": "Graph 1",
                "type": "gnuplot"
            }
        ];
        $scope.showEdit={};
        $scope.isOpen={};
        $scope.addGraph = function() {
            var num = $scope.nextGraphNumber++;
            $scope.graphs.push({
                "number": num,
                "title": "Graph "+num,
                "type": null
            });
            $scope.showEdit[num] = true;

            $scope.firstOpen = false;
            $scope.isOpen[num] = true;
        };
        $scope.deleteGraph = function(num) {
            var index = -1;
            for (var i=0; i<$scope.graphs.length; i++) {
                if ($scope.graphs[i].number == num) {
                    index = i;
                    break;
                }
            }
            if (index == -1) {
                return;
            }
            $scope.graphs.splice(index, 1);
        }
        $scope.firstOpen = true;
    }]);