'use strict';

/* jasmine specs for controllers go here */
describe('Aardvark controllers', function () {

    beforeEach(function () {
        this.addMatchers({
            toEqualData: function (expected) {
                return angular.equals(this.actual, expected);
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

        var test_tsdb_distinctGraphLines = function(metric, expectHttpRequests, expectationsFn) {
            var callBackComplete = false;
            var graphLines = {};
            scope.tsdb_distinctGraphLines(metric, function(m) {
                graphLines = m;
                callBackComplete = true;
            });
            if (expectHttpRequests) {
                $httpBackend.flush();
            }
            waitsFor(function () {
                return callBackComplete;
            }, "callback completed", 1000);
            runs(function() {
                expectationsFn(graphLines);
            });
        }

        it('should callback with a single entry when getting lines for a metric with no tags', function () {
            test_tsdb_distinctGraphLines({name:"some.metric", tags: [], graphOptions: {}}, false, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(1);
            });
        });

        it('should callback with two entries when getting lines for a metric with a single tag with two possible values', function () {
            $httpBackend.expectGET('/aardvark/tags?metric=some.metric').respond({host: ["host1", "host2"]});

            test_tsdb_distinctGraphLines({name:"some.metric", tags: [{name: "host", value: "*"}], graphOptions: {}}, true, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(2);
                expect(graphLines["some.metric{host=host1}"]).toEqualData({host: "host1"});
                expect(graphLines["some.metric{host=host2}"]).toEqualData({host: "host2"});
            });
        });

        it('should callback with four entries when getting lines for a metric with a two tags each with two possible values', function () {
            $httpBackend.expectGET('/aardvark/tags?metric=some.metric').respond({host: ["host1", "host2"], type: ["type1", "type2"]});

            test_tsdb_distinctGraphLines({name:"some.metric", tags: [{name: "host", value: "*"}, {name: "type", value: "*"}], graphOptions: {}}, true, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(4);
                expect(graphLines["some.metric{host=host1,type=type1}"]).toEqualData({host: "host1", type: "type1"});
                expect(graphLines["some.metric{host=host1,type=type2}"]).toEqualData({host: "host1", type: "type2"});
                expect(graphLines["some.metric{host=host2,type=type1}"]).toEqualData({host: "host2", type: "type1"});
                expect(graphLines["some.metric{host=host2,type=type2}"]).toEqualData({host: "host2", type: "type2"});
            });
        });

        it('should callback with four entries when getting lines for a metric with one tag with two possible values and the other with three, but only two selected', function () {
            $httpBackend.expectGET('/aardvark/tags?metric=some.metric').respond({host: ["host1", "host2"], type: ["type1", "type2", "type2"]});

            test_tsdb_distinctGraphLines({name:"some.metric", tags: [{name: "host", value: "*"}, {name: "type", value: "type1|type2"}], graphOptions: {}}, true, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(4);
                expect(graphLines["some.metric{type=type1,host=host1}"]).toEqualData({host: "host1", type: "type1"});
                expect(graphLines["some.metric{type=type2,host=host1}"]).toEqualData({host: "host1", type: "type2"});
                expect(graphLines["some.metric{type=type1,host=host2}"]).toEqualData({host: "host2", type: "type1"});
                expect(graphLines["some.metric{type=type2,host=host2}"]).toEqualData({host: "host2", type: "type2"});
            });
        });

        it('should callback with four entries when getting lines for a metric with a two tags each with two possible values, one tag with a fixed single value and one tag with no value', function () {
            $httpBackend.expectGET('/aardvark/tags?metric=some.metric').respond({host: ["host1", "host2"], type: ["type1", "type2"], direction: ["in","out"], application: ["app1","app2"]});

            test_tsdb_distinctGraphLines({name:"some.metric", tags: [{name: "host", value: "*"}, {name: "type", value: "*"}, {name: "direction", value: "in"}, {name: "application", value: ""}], graphOptions: {}}, true, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(4);
                expect(graphLines["some.metric{direction=in,host=host1,type=type1}"]).toEqualData({host: "host1", type: "type1", direction: "in"});
                expect(graphLines["some.metric{direction=in,host=host1,type=type2}"]).toEqualData({host: "host1", type: "type2", direction: "in"});
                expect(graphLines["some.metric{direction=in,host=host2,type=type1}"]).toEqualData({host: "host2", type: "type1", direction: "in"});
                expect(graphLines["some.metric{direction=in,host=host2,type=type2}"]).toEqualData({host: "host2", type: "type2", direction: "in"});
            });
        });

        it('should return an empty tsdb string for the from field when time is relative and no time specified', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": ""
            });
            expect(result).toEqualData("");
        });

        it('should return a valid tsdb string for the from field when time is absolute', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22"
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });

        it('should return a valid tsdb string for the from field when time is relative', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            });
            expect(result).toEqualData("2h-ago");
        });

        it('should return a valid tsdb string for the to field when time is absolute', function() {
            var result = scope.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "toDate": "2016/02/24",
                "toTime": "12:23:22"
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });

        it('should return a valid tsdb string for the to field when time is relative', function() {
            var result = scope.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            });
            expect(result).toEqualData(null);
        });
        it('should return a valid date object for the from field when time is absolute', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_fromTimestampAsDate({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22"
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid date object for the from field when time is relative', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_fromTimestampAsDate({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            }, datum);
            expect(result).toEqualData(new Date(datum.getTime()-7200000));
        });

        it('should return a valid date object for the to field when time is absolute', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_toTimestampAsDate({
                "absoluteTimeSpecification": true,
                "toDate": "2016/02/24",
                "toTime": "12:23:22"
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid date object for the to field when time is relative', function() {
            var datum = new Date(116,1,24,12,23,22);

            var result = scope.tsdb_toTimestampAsDate({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            }, datum);
            expect(result).toEqualData(datum);
        });
    });
});

