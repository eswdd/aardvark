
angular.module('x', ['ui.layout'])
    .directive('graphImage', function() {
        return {
            restrict: 'A',
            link: function ( scope, elem, attrs ) {
                //replace test with whatever myFunction() does
                var id = attrs["graphId"];
                var src = scope.tsdbSrc(id);
                if (src == null) {
                    src = "http://placehold.it/350x150/ffffff/000000&text=FAIL";
                }
                elem.attr('src', src);
            }
        };
    })
    .controller('GraphCtrl', ['$scope', function($scope) {

        $scope.graphIds = ["abc","def"];
        $scope.graphs = [
            {
                id: "abc",
                title: "Graph 1"
            },
            {
                id: "def",
                title: "Graph 2"
            }
        ];
        $scope.urls = {
            "abc":"http://placehold.it/350x150/ff0000/000000&text=abc",
            "def":"http://placehold.it/350x150/ff0000/000000&text=def"
        };

        $scope.changeSrc = function() {
            for (var idx in $scope.graphIds) {
                var id = $scope.graphIds[idx];
                $scope.urls[id] = "http://placehold.it/350x150/ff0000/000000&text="+id+":+"+Math.random();
            }
        }

        $scope.tsdbSrc = function(graphId) {
            return $scope.urls[graphId];
        }
    }]);
