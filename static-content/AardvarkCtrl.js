/*
 * Responsible for the main app, providing config and model<-> hash
 * functionality for the other controllers
 */
aardvark.directive('aardvarkEnter', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
               if (event.which == 13) {
                   scope.$apply(function() {
                       scope.$eval(attrs.aardvarkEnter);
                   })

                   event.preventDefault();
               }
            });
        }
    })
    .directive('aardvarkLoad', function() {
        return function(scope, element, attrs) {
            element.bind("load", function (event) {
               scope.$apply(function() {
                   scope.$eval(attrs.aardvarkLoad);
               })

               event.preventDefault();
            });
        }
    })
    .controller('AardvarkCtrl', [ '$rootScope', '$http', '$location', 'serialisation', function AardvarkCtrl($rootScope, $http, $location, $serialisation) {
        /*
         * Model persistence - ensures that persistent data is saved to the hash whilst leaving
         * controllers free to litter their own scope with volatile data. Controllers are responsible
         * for correctly populating any derivable volatile data from persistent on page load
         */
        $rootScope.model = {
            metrics: [],
            graphs: []
        };

        /*
         * Config management - we have config loaded from the server, plus a capability to enable
         * controllers to register for notifications of updates to the config
         */
        $rootScope.configListeners = [];

        $rootScope.config = null;
        $rootScope.graphTypes = [ "gnuplot", "horizon", "dygraph", "scatter" ];

        $rootScope.loadModel = function() {
            var hash = $location.hash();
            if (hash != null && hash!="") {
                while (hash.indexOf("#") == 0) {
                    hash = hash.substring(1);
                }
                hash = decodeURI(hash);
                $rootScope.model = $serialisation.deserialise(hash);
            }
        }
        
        $rootScope.saveModel = function(render) {
            console.log("slimmed ser:");
            var originalLen = JSON.stringify($rootScope.model).length;
            var serialised = $serialisation.serialise($rootScope.model);
            $location.hash(serialised);
            var slimmedLen = serialised.length;
            console.log("from "+originalLen+" to "+slimmedLen);
            
            if (render && $rootScope.renderGraphs) {
                $rootScope.renderGraphs();
            }
        }
    
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
    
    
        $rootScope.updateConfig = function() {
            $http.get('/aardvark/config').success(function(json) {
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
    
        $rootScope.loadModel();
        $rootScope.updateConfig();
    }]);