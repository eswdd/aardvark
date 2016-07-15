'use strict';

/* jasmine specs for controllers go here */
describe('Aardvark controllers', function () {

    beforeEach(function () {
        jasmine.addMatchers({
            toEqualData: function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        var passed = angular.equals(actual, expected);
                        return {
                            pass: passed,
                            message: 'Expected ' + JSON.stringify(actual) + '\nto equal ' + JSON.stringify(expected)
                        };
                    }
                };
            }
        });
    });

    beforeEach(module('Aardvark'));

    describe('GraphCtrl.tsdbHelperFunctions', function() {
        var rootScope, $httpBackend, scope;
        var globals, graphs, metricss;
        var configUpdateFunc;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $controller) {
            // hmm
            rootScope = $rootScope;
            $httpBackend = _$httpBackend_;
            scope = $rootScope.$new();
            globals = [];
            graphs = [];
            metricss = [];

            scope.renderers = {};
            scope.renderers["unittest"] = function(global,graph,metrics) {
                globals.push(global);
                graphs.push(graph);
                metricss.push(metrics);
            }

            rootScope.model = {
                graphs: [],
                metrics: []
            }

            rootScope.formEncode = function(val) {
                var ret = val.replace(" ","+");
                if (ret != val) {
                    return rootScope.formEncode(ret);
                }
                return ret;
            }

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }

            $controller('GraphCtrl', {$scope: scope, $rootScope: rootScope});
        }));

        // ---------- tsdb helper functions ------

        var objectLength = function(obj) {
            var count = 0;
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    count++;
                }
            }
            return count;
        }

        it('should return an empty tsdb string for the from field when time is relative and no time specified', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": ""
            });
            expect(result).toEqualData("");
        });

        it('should return a valid tsdb string for the to field when time is relative', function() {
            var result = scope.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            });
            expect(result).toEqualData(null);
        });

        it('should return a valid tsdb string for the from field when time is relative', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            });
            expect(result).toEqualData("2h-ago");
        });

        it('should return a valid date object for the from field when time is relative', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_fromTimestampAsDate({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            }, datum);
            expect(result).toEqualData(new Date(datum.getTime()-7200000));
        });

        it('should return a valid date object for the to field when time is relative', function() {
            var datum = new Date(116,1,24,12,23,22);

            var result = scope.tsdb_toTimestampAsDate({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid tsdb string for the from field when time is absolute and date/time inputs are not supported', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22"
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });

        it('should return a valid tsdb string for the to field when time is absolute and date/time inputs are not supported', function() {
            var result = scope.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "toDate": "2016/02/24",
                "toTime": "12:23:22"
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });
        
        it('should return a valid date object for the from field when time is absolute and date/time inputs are not supported', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_fromTimestampAsDate({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22"
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid date object for the to field when time is absolute and date/time inputs are not supported', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_toTimestampAsDate({
                "absoluteTimeSpecification": true,
                "toDate": "2016/02/24",
                "toTime": "12:23:22"
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid tsdb string for the from field when time is absolute and date/time inputs are supported', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": new Date(2016,1,24),
                "fromTime": new Date(2016,1,25,12,23,22) // assume querying on the 25th
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });

        it('should return a valid tsdb string for the to field when time is absolute and date/time inputs are supported', function() {
            var result = scope.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "toDate": new Date(2016,1,24),
                "toTime": new Date(2016,1,25,12,23,22) // assume querying on the 25th
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });
        
        it('should return a valid date object for the from field when time is absolute and date/time inputs are supported', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_fromTimestampAsDate({
                "absoluteTimeSpecification": true,
                "fromDate": new Date(2016,1,24),
                "fromTime": new Date(2016,1,25,12,23,22) // assume querying on the 25th
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid date object for the to field when time is absolute and date/time inputs are supported', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_toTimestampAsDate({
                "absoluteTimeSpecification": true,
                "toDate": new Date(2016,1,24),
                "toTime": new Date(2016,1,25,12,23,22) // assume querying on the 25th
            }, datum);
            expect(result).toEqualData(datum);
        });
        
        
        // todo: url generation
    });
});

