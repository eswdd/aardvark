
angular
    .module('myApp', [])

    .controller('ModelCtrl', ['$scope', '$location', function($scope, $location) {

        $scope.persistent = {};
        $scope.volatile = {};

        var hash = $location.hash();
        if (hash != null && hash!="") {
            $scope.persistent = JSON.parse(hash);
        }

        $scope.save = function() {
            $location.hash(JSON.stringify($scope.persistent));
        }

    }]);