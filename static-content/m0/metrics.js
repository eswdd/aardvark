
angular
    .module('myApp', ['ngSanitize','MassAutoComplete'])
    .directive('tagSelection', function() {
        return {
            template: '<div mass-autocomplete><input type="text" ng-model="tag[tagk]" mass-autocomplete-item="tagOptions[tagk]" /> RE? <input type="checkbox" ng-checked="re[tagk]"/> {{tagValuesMatchCount(tagk)}}</div>'
        }
    })
    .controller('MetricsCtrl', ['$scope', '$sce', '$http', function($scope, $sce, $http) {
        $scope.tag = {};
        $scope.re = {};
        $scope.tagOptions = {};
        $scope.tag_options_fn = {
            options: function(key) {
                return $scope.tagOptions[key];
            }
        };
        $scope.selectedMetric = '';

        $http.get('/api/suggest').success(function(json) {
            //$http.get('http://localhost:4242/api/suggest?type=metrics&max=1000000').success(function(json) {
            // right we need to build our tree, we have an array of name, we need to split by "."
            $scope.metrics = json;
        });

        $scope.metricSelected = function() {
            $http.get("/api/tags?metric="+$scope.selectedMetric.trim()).success(function (json) {
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
                return allValues.length();
            }
            for (var i=0; i<allValues.length; i++) {
                if ($scope.re[tag]) {
                    if (new RegExp(inputText).test(allValues[i])) {
                        count++;
                    }
                }
                else {
                    if (inputText == allValues[i]) {
                        count++;
                    }
                }

            }
            return "("+count+")";
        }
    }]);