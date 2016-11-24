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

    describe('AnnotationsDialogCtrl', function() {
        var ctrl, rootConfig;
        var mockUibModal;
        var mockTsdbClient;
        var mockTsdbUtils;
        
        var callArraysToCheckAndCleanAfter = [];
        
        var searchLookupBulkCalls = [];
        var tsuidToMetricAndTagsCalls = [];
        var closeCalls = [];
        var dismissCalls = [];
        
        afterEach(function() {
            for (var c=0; c<callArraysToCheckAndCleanAfter.length; c++) {
                var name = callArraysToCheckAndCleanAfter[c].name;
                var calls = callArraysToCheckAndCleanAfter[c].calls;
                if (calls.length != 0) {
                    fail("Expected calls array for "+name+" to be empty after test execution");
                    calls.splice(0, calls.length);
                }
            }
        });
        
        var mockMethod = function(name, callArray) {
            callArraysToCheckAndCleanAfter.push({name:name, calls: callArray});
            return function() {
                if (callArray.length == 0) {
                    fail("Unexpected call to "+name+": "+arguments);
                }
                else {
                    var call = callArray[0];
                    callArray.splice(0,1);
                    return call(arguments);
                }
            }
        }
        
        var setupController = function($controller, adding, originalAnnotation, time, seriesAndQueries, clickedSeries) {
            rootConfig = {
                annotations: {
                    allowDelete: true
                }
            };
            mockTsdbClient = {
                searchLookupBulk: mockMethod("$tsdbClient.searchLookupBulk", searchLookupBulkCalls)
            };
            mockTsdbUtils = {
                tsuidToMetricAndTags: mockMethod("$tsdbUtils.tsuidToMetricAndTags", tsuidToMetricAndTagsCalls)
            };
            mockUibModal = {
                close: mockMethod("$uibModal.close", closeCalls),
                dismiss: mockMethod("$uibModal.dismiss", dismissCalls)
            };
            ctrl = $controller('AnnotationsDialogCtrl', {
                $uibModalInstance: mockUibModal,
                rootConfig: rootConfig,
                adding: adding,
                originalAnnotation: originalAnnotation,
                time: time,
                seriesAndQueries: seriesAndQueries,
                clickedSeries: clickedSeries,
                $tsdbClient: mockTsdbClient,
                $tsdbUtils: mockTsdbUtils,
                readOnly: false
            });
        }
        
        it('should function correctly when adding a new annotation', inject(function($controller) {
            var seriesAndQueries = {
                "some.metric{host=host1}": {id:"123",name:"some.metric",tags:[{name:"host",value:"host1",groupBy:true}]},
                "some.metric2{host=host1}": {id:"123",name:"some.metric",tags:[{name:"host",value:"host1",groupBy:true}]}
            }
            searchLookupBulkCalls.push(function(args) {
                var queries = args[0];
                var perResultFn = args[1];
                var successFn = args[2];
                var errorFn = args[3];
                expect(queries.length).toEqualData(1);
                expect(queries[0]).toEqualData(seriesAndQueries["some.metric{host=host1}"]);
                perResultFn(queries[0],{results:[
                    {tsuid:"001001",metric:"some.metric",tags:{host:"host1",type:"type1"}},
                    {tsuid:"001002",metric:"some.metric",tags:{host:"host1",type:"type2"}}
                ]});
                successFn();
            });
            setupController($controller, true, {startTime: 1234567890}, 1234567890, seriesAndQueries, "some.metric{host=host1}");
            expect(ctrl.clickTimeseries).toEqualData([
                {tsuid:"001001",label:"some.metric {\"host\":\"host1\",\"type\":\"type1\"}"},
                {tsuid:"001002",label:"some.metric {\"host\":\"host1\",\"type\":\"type2\"}"}
            ]);
            expect(ctrl.loadingMessage).toEqualData("");
            expect(ctrl.allowEditTimeAndSeries()).toEqualData(true);
            
            // now select all time series..
            searchLookupBulkCalls.push(function(args) {
                var queries = args[0];
                var perResultFn = args[1];
                var successFn = args[2];
                var errorFn = args[3];
                expect(queries.length).toEqualData(2);
                expect(queries[0]).toEqualData(seriesAndQueries["some.metric{host=host1}"]);
                expect(queries[1]).toEqualData(seriesAndQueries["some.metric2{host=host1}"]);
                perResultFn(queries[0],{results:[
                    {tsuid:"001001",metric:"some.metric",tags:{host:"host1",type:"type1"}},
                    {tsuid:"001002",metric:"some.metric",tags:{host:"host1",type:"type2"}},
                    {tsuid:"001003",metric:"some.metric2",tags:{host:"host1",type:"type1"}},
                    {tsuid:"001004",metric:"some.metric2",tags:{host:"host1",type:"type2"}}
                ]});
                expect(ctrl.loadingMessage).toEqualData("Loading candidate time series");
                successFn();
            });
            ctrl.metricSourceClick = false;
            ctrl.metricSourceUpdated();
            expect(ctrl.allTimeseries).toEqualData([
                {tsuid:"001001",label:"some.metric {\"host\":\"host1\",\"type\":\"type1\"}"},
                {tsuid:"001002",label:"some.metric {\"host\":\"host1\",\"type\":\"type2\"}"},
                {tsuid:"001003",label:"some.metric2 {\"host\":\"host1\",\"type\":\"type1\"}"},
                {tsuid:"001004",label:"some.metric2 {\"host\":\"host1\",\"type\":\"type2\"}"}
            ]);
            expect(ctrl.loadingMessage).toEqualData("");
            
            dismissCalls.push(function(args) {
                expect(args[0]).toEqualData('cancel');
            });
            ctrl.cancel();
            dismissCalls.push(function(args) {
                expect(args[0]).toEqualData('cancel');
            });
            ctrl.delete();
            ctrl.tsuidsFromAll = ["001001"];
            ctrl.description = "test";
            ctrl.notes = "testing";
            closeCalls.push(function(args) {
                var ann = {
                    tsuid: "001001",
                    startTime: 1234567000,
                    endTime: 0,
                    description: "test",
                    notes: "testing",
                    custom: {
                        type: ""
                    }
                };
                expect(args[0]).toEqualData({action:'add',annotations:[ann]});
            });
            ctrl.ok();
        }));
        
        it('should function correctly when editing an existing annotation', inject(function($controller) {
            var seriesAndQueries = {
                "some.metric{host=host1}": {id:"123",name:"some.metric",tags:[{name:"host",value:"host1",groupBy:true}]},
                "some.metric2{host=host1}": {id:"123",name:"some.metric",tags:[{name:"host",value:"host1",groupBy:true}]}
            }
            var existingAnnotation = {
                tsuid: "001001",
                startTime: 1234567890,
                endTime: 2234567890,
                description: "test",
                notes: "testing"
            };
            tsuidToMetricAndTagsCalls.push(function(args) {
                var tsuid = args[0];
                var successFn = args[1];
                var failureFn = args[2];
                expect(tsuid).toEqualData(existingAnnotation.tsuid);
                successFn({metric:"some.metric",tags:{host:"host1",type:"type1"}});
            })
            setupController($controller, false, existingAnnotation, 0, seriesAndQueries, "some.metric{host=host1}");
            expect(ctrl.loadingMessage).toEqualData("");
            expect(ctrl.allowEditTimeAndSeries()).toEqualData(false);

            dismissCalls.push(function(args) {
                expect(args[0]).toEqualData('cancel');
            });
            ctrl.cancel();
            ctrl.description = "test2";
            ctrl.notes = "testing2";
            ctrl.startTime = "1970-01-15 06:56:08";
            ctrl.startTime = "1970-01-26 20:42:48";
            closeCalls.push(function(args) {
                var ann = {
                    tsuid: "001001",
                    startTime: 1234567890,
                    endTime: 2234567890,
                    description: "test",
                    notes: "testing"
                };
                expect(args[0]).toEqualData({action:'delete',annotations:[ann]});
            });
            ctrl.delete();
            closeCalls.push(function(args) {
                var ann = {
                    tsuid: "001001",
                    startTime: 1234567890,
                    endTime: 2234567890,
                    description: "test2",
                    notes: "testing2",
                    custom: {
                        type: ""
                    }
                };
                expect(args[0]).toEqualData({action:'edit',annotations:[ann]});
            });
            ctrl.ok();
        }));
        

    });
});

