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
            
            rootScope.TSDB_2_0 = 2000;
            rootScope.TSDB_2_1 = 2001;
            rootScope.TSDB_2_2 = 2002;
            rootScope.TSDB_2_3 = 2003;
            // default to 2.0
            rootScope.tsdbVersion = 2000;

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
        
        it('should return the correct duration when using the "from" baseline datum style', function() {
            // absolute from date/time - use baseline from
            var result = scope.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/24",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:23:10"
            }, null);
            expect(result).toEqualData(moment.duration(26,'h').add(moment.duration(12,'s')));

            // absolute from and to date/time - use baseline from (same as prev)
            result = scope.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/24",
                "fromTime": "12:23:22",
                "toDate": "2016/02/26",
                "toTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData(moment.duration(26,'h').add(moment.duration(13,'m').add(moment.duration(12,'s'))));

            // relative time specification - use baseline from (same as prev)
            var datum = new Date(2016,0,24,12,23,22);
            result = scope.baselineOffset({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, datum);
            expect(result).toEqualData(moment.duration(24,'h').add(moment.duration(13,'m').add(moment.duration(12,'s'))));
        });
        
        it('should return the correct duration when using the "to" baseline datum style', function() {
            var datum = new Date(2016,0,22,14,10,10);
            // absolute from date/time - null "to" means now
            var result = scope.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, datum);
            expect(result).toEqualData(moment.duration(28,'h'));

            // absolute from and to date/time
            result = scope.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                "toDate": "2016/01/23",
                "toTime": "10:10:10",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, null);
            expect(result).toEqualData(moment.duration(48,'h'));

            // relative time specification, to is null == datum
            result = scope.baselineOffset({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, datum);
            expect(result).toEqualData(moment.duration(28,'h'));
        });
        
        it('should return the correct duration when using the "relative" baseline datum style', function() {
            // absolute from date/time - null means now so will be baselineRelativePeriod prior to datum
            var result = scope.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/23",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData(moment.duration(1,'d'));

            // absolute from and to date/time - subtract period from to date/time
            result = scope.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/03/23",
                "toTime": "13:13:13",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData(moment.duration(1,'d'));

            // relative time specification - will be baselineRelativePeriod prior to datum
            result = scope.baselineOffset({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData(moment.duration(1,'d'));
        });
        
        it('expects the url generation to record a warning if there is no fromTimestamp', function() {
            expect(scope.tsdb_queryStringInternal(null,"1h",false, false, null, {id:"abc"}, [], null)).toEqualData("");
            expect(scope.renderErrors.abc).toEqualData("No start date specified");

            delete scope.renderErrors["abc"];
            expect(scope.tsdb_queryStringInternal("","1h",false, false, null, {id:"abc"}, [], null)).toEqualData("");
            expect(scope.renderErrors.abc).toEqualData("No start date specified");
        });
        
        it('expects the url generation to record a warning if there are no metrics', function() {
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, null, null)).toEqualData("");
            expect(scope.renderErrors.abc).toEqualData("No metrics specified");

            delete scope.renderErrors["abc"];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, [], null)).toEqualData("");
            expect(scope.renderErrors.abc).toEqualData("No metrics specified");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with no tags', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            var metrics = [{name: "metric1", tags: [], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with tags with empty values', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            var metrics = [{name: "metric1", tags: [{name: "key", value: ""}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with some tags with values', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            var metrics = [{name: "metric1", tags: [{name: "key", value: ""},{name:"host", value: "host1"}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1{host=host1}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with some tags with values with group by false on v2.0.0', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            var metrics = [{name: "metric1", tags: [{name: "key", value: "value", groupBy: true},{name:"host", value: "host1", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1{key=value}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with a tag with 2 values with group by false and true on v2.2.0', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            rootScope.tsdbVersion = 2002;
            var metrics = [{name: "metric1", tags: [{name: "key", value: "wildcard(a*)", groupBy: true},{name:"key", value: "wildcard(*a)", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1{key=wildcard(a*)}{key=wildcard(*a)}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with a tag with 2 values with group by true on v2.2.0', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            rootScope.tsdbVersion = 2002;
            var metrics = [{name: "metric1", tags: [{name: "key", value: "wildcard(a*)", groupBy: true},{name:"key", value: "wildcard(*a)", groupBy: true}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1{key=wildcard(a*),key=wildcard(*a)}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with a tag with 2 values with group by false on v2.2.0', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            rootScope.tsdbVersion = 2002;
            var metrics = [{name: "metric1", tags: [{name: "key", value: "wildcard(a*)", groupBy: false},{name:"key", value: "wildcard(*a)", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1{}{key=wildcard(a*),key=wildcard(*a)}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with some tags with values with group by false on v2.2.0', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            rootScope.tsdbVersion = 2002;
            var metrics = [{name: "metric1", tags: [{name: "key", value: "value", groupBy: true},{name:"host", value: "host1", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1{key=value}{host=host1}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with tags with values only with group by false on v2.2.0', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            rootScope.tsdbVersion = 2002;
            var metrics = [{name: "metric1", tags: [{name:"host", value: "host1", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1{}{host=host1}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with tags with filter values of all', function() {
            //$scope.tsdb_queryStringInternal = function(fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn) {
            rootScope.tsdbVersion = 2002;
            var metrics = [{name: "metric1", tags: [{name:"host", value: "*", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1");

            metrics = [{name: "metric1", tags: [{name:"host", value: "wildcard(*)", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(scope.tsdb_queryStringInternal("1d","1h",false, false, null, {id:"abc"}, metrics, null)).toEqualData("?start=1d&end=1h&m=sum:metric1");
        });
        
        it('should generate a legacy time series name when no query is provided', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"]
            };
            expect(scope.timeSeriesName(ts)).toEqualData("fred{tag1=value1,tag2=value2,tag3=value3,tag4=value4}");
        })
        
        it('should generate a reduced time series name when the query is provided', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [],
                    rateOptions: null,
                    tags: {
                        tag2: "value2",
                        tag4: "*"
                    }
                }
            };
            expect(scope.timeSeriesName(ts)).toEqualData("fred{tag2=value2,tag4=value4}");
        });
        
        it('should generate a reduced time series name when the query is provided using filters', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [
                        {tagk:"tag2",type:"wildcard",filter:"value*",groupBy:true},
                        {tagk:"tag4",type:"literal_or",filter:"value4",groupBy:true}
                    ],
                    rateOptions: null,
                    tags: {}
                }
            };
            expect(scope.timeSeriesName(ts)).toEqualData("fred{tag2=value2,tag4=value4}");
        });
        
        it('should generate a reduced time series name when the query is provided using ungrouped filters', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [
                        {tagk:"tag2",type:"wildcard",filter:"value*",groupBy:false},
                        {tagk:"tag4",type:"regexp",filter:"value4",groupBy:false}
                    ],
                    rateOptions: null,
                    tags: {}
                }
            };
            expect(scope.timeSeriesName(ts)).toEqualData("fred{}{tag2=wildcard(value*),tag4=regexp(value4)}");
        });
        
        it('should generate a reduced time series name when the query is provided using mixed grouped filters', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [
                        {tagk:"tag2",type:"wildcard",filter:"value*",groupBy:true},
                        {tagk:"tag2",type:"regexp",filter:"value4",groupBy:false}
                    ],
                    rateOptions: null,
                    tags: {}
                }
            };
            expect(scope.timeSeriesName(ts)).toEqualData("fred{tag2=value2}");
        });
        
        it('should generate a reduced time series name when the query is provided using mixed filters and tags', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [
                        {tagk:"tag2",type:"wildcard",filter:"value*",groupBy:true}
                    ],
                    rateOptions: null,
                    tags: {
                        tag4: "*"
                    }
                }
            };
            expect(scope.timeSeriesName(ts)).toEqualData("fred{tag2=value2,tag4=value4}");
        });
        
        // todo: finish url generation
        // todo: validate baseline is before standard when using absolute datums
    });
});

