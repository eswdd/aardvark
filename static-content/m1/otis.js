angular
    .module('Otis', ['ui.layout'])
    /*
     * Otis controller is responsible for the main app, providing config
     * and model<-> hash functionality for the other controllers
     */
    .controller('OtisCtrl', [ '$scope', '$location', function($scope, $location) {
        /*
         * Model persistence - ensures that persistent data is saved to the hash whilst
         * giving us a volatile area which is not. Controllers are responsible for correctly
         * populating any derivable volatile data from persistent on page load
         */
        $scope.persistent = {};
        $scope.volatile = {};

        var hash = $location.hash();
        if (hash != null && hash!="") {
            $scope.persistent = JSON.parse(hash);
        }

        $scope.saveModel = function() {
            $location.hash(JSON.stringify($scope.persistent));
        }
    }])
    /*
     *
     */
    .controller('GraphControlCtrl', [ '$scope', function($scope) {

    }])
    /*
     *
     */
    .controller('GraphCtrl', [ '$scope', function($scope) {

    }])
    /*
     *
     */
    .controller('MetricControlCtrl', [ '$scope', function($scope) {

    }]);