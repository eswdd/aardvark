/*
 * Responsible for the main app, providing config and model<-> hash
 * functionality for the other controllers
 */
otis.directive('otisEnter', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
               if (event.which == 13) {
                   scope.$apply(function() {
                       scope.$eval(attrs.otisEnter);
                   })

                   event.preventDefault();
               }
            });
        }
    })
    .controller('OtisCtrl', [ '$rootScope', '$http', '$location', function OtisCtrl($rootScope, $http, $location) {
    /*
     * Model persistence - ensures that persistent data is saved to the hash whilst leaving
     * controllers free to litter their own scope with volatile data. Controllers are responsible
     * for correctly populating any derivable volatile data from persistent on page load
     */
    $rootScope.model = {
        metrics: [],
        graphs: []
    };

    var hash = $location.hash();
    if (hash != null && hash!="") {
        while (hash.indexOf("#") == 0) {
            hash = hash.substring(1);
        }
        hash = decodeURI(hash);
        $rootScope.model = JSON.parse(hash);
    }

    $rootScope.saveModel = function(render) {
        $location.hash(JSON.stringify($rootScope.model));
        if (render && $rootScope.renderGraphs) {
            $rootScope.renderGraphs();
        }
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
    $rootScope.graphTypes = [ "gnuplot" ];


    $rootScope.updateConfig = function() {
        $http.get('/otis/config').success(function(json) {
            $rootScope.config = json;
            if (json.devMode && $rootScope.graphTypes.indexOf("debug") < 0) {
                $rootScope.graphTypes.splice(0, 0, "debug");
            }
            for (var i=$rootScope.configListeners.length-1; i>=0; i--) {
                $rootScope.configListeners[i]();
            }
        });
    };

    $rootScope.clearAll = function() {
        $location.url("");
    }

    $rootScope.formEncode = function(val) {
        var ret = val.replace(" ","+");
        if (ret != val) {
            return $rootScope.formEncode(ret);
        }
        return ret;
    }

//    $rootScope.undoAll = function() {
        // todo: m1: implement undo all
//        alert("Not implemented");
//    }

    $rootScope.updateConfig();
}]);