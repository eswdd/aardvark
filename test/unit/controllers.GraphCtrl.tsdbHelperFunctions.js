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
        
        it('should return the correct tsdb string for the "from" field for baseline queries when using "relative" baseline datum', function() {
            // absolute from date/time - subtract relative period from "from" field
            var result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData("2016/02/23 12:23:22");

            // absolute from and to date/time - subtract relative period from "from" field (same as prev)
            result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/02/26",
                "toTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData("2016/02/23 12:23:22");
            
            // relative time specification
            var datum = new Date(2016,1,24,12,23,22);
            result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, datum);
            expect(result).toEqualData("2016/02/23 10:23:22");
        });
        
        it('should return the correct tsdb string for the "from" field for baseline queries when using "from" date/time baseline datum', function() {
            // absolute from date/time - use baseline from
            var result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/23 10:10:10");
            
            // absolute from and to date/time - use baseline from (same as prev)
            result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/02/26",
                "toTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/23 10:10:10");

            // relative time specification - use baseline from (same as prev)
            var datum = new Date(2016,1,24,12,23,22);
            result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, datum);
            expect(result).toEqualData("2016/01/23 10:10:10");
        });
        
        it('should return the correct tsdb string for the "from" field for baseline queries when using "to" date/time baseline datum', function() {
            var datum = new Date(2016,1,26,12,23,22);
            // absolute from date/time - null "to" means now, so diff time between "from" and datum and subtract from baseline "to" date/time
            var result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                "baselineToDate": "2016/02/23",
                "baselineToTime": "13:13:13"
            }, datum);
            expect(result).toEqualData("2016/02/21 13:13:13");
            
            // absolute from and to date/time - diff time between from and to and subtract from baseline "to"
            result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/02/26",
                "toTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                "baselineToDate": "2016/02/23",
                "baselineToTime": "13:13:13"
            }, null);
            expect(result).toEqualData("2016/02/21 13:13:13");
            
            // relative time specification - relative to datum. subtract relative time from baseline "to"
            result = scope.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "to",
                "baselineToDate": "2016/02/23",
                "baselineToTime": "13:13:13"
            }, null);
            expect(result).toEqualData("2016/02/23 11:13:13");
        });
        
        it('should return the correct tsdb string for the "to" field for baseline queries when using "relative" baseline datum', function() {
            var datum = new Date(2016,1,24,12,23,22);
            // absolute from date/time - null means now so will be baselineRelativePeriod prior to datum
            var result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/23",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, datum);
            expect(result).toEqualData("2016/02/23 12:23:22");
            
            // absolute from and to date/time - subtract period from to date/time
            result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/03/23",
                "toTime": "13:13:13",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData("2016/03/22 13:13:13");
            
            // relative time specification - will be baselineRelativePeriod prior to datum
            result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, datum);
            expect(result).toEqualData("2016/02/23 12:23:22");
        });
        
        it('should return the correct tsdb string for the "to" field for baseline queries when using "from" date/time baseline datum', function() {
            var datum = new Date(2016,1,24,12,23,22);
            // absolute from date/time - "to" means now, so calc datum - from and add this to baseline "from"
            var result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/21",
                baselineFromTime: "10:10:10"
            }, datum);
            expect(result).toEqualData("2016/02/23 10:10:10");
            
            // absolute from and to date/time - calc to - from and add this to baseline "from"
            result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                "toDate": "2016/01/23",
                "toTime": "13:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/21",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/22 11:10:10");
            
            // relative time specification - add relative time to baseline "from"
            result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/21",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/21 12:10:10");
        });
        
        it('should return the correct tsdb string for the "to" field for baseline queries when using "to" date/time baseline datum', function() {
            // absolute from date/time - null "to" means now, so just use baseline "to" date/time
            var result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/21 10:10:10");
            
            // absolute from and to date/time - will just be absolute "to", so just use baseline "to" date/time
            result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                "toDate": "2016/01/23",
                "toTime": "13:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/21 10:10:10");
            
            // relative time specification - relative to now, so just use baseline "to" date/time
            result = scope.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/21 10:10:10");
        });
        
        
        // todo: url generation
        // todo: validate baseline is before standard when using absolute datums
    });
});

