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
        
        var searchLookupBulkCalls = [];
        
        afterEach(function() {
            searchLookupBulkCalls = [];
        });
        
        var setupController = function($controller, adding, originalAnnotation, time, seriesAndQueries, clickedSeries) {
            rootConfig = {};
            mockTsdbClient = {
                searchLookupBulk: function() {
                    if (searchLookupBulkCalls.length == 0) {
                        fail("Unexpected call to searchLookupBulk: "+arguments);
                    }
                    else {
                        return searchLookupBulkCalls[0](arguments);
                    }
                }
            };
            mockTsdbUtils = {};
            mockUibModal = {};
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
        
        it('should initialise correctly when adding a new annotation', inject(function($controller) {
            var seriesAndQueries = {
                "some.metric{host=host1}": {id:"123",name:"some.metric",tags:[{name:"host",value:"host1",groupBy:true}]}
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
            });
            setupController($controller, true, {startTime: 1234567890}, 1234567890, seriesAndQueries, "some.metric{host=host1}");
            expect(ctrl.clickTimeseries).toEqualData([
                {tsuid:"001001",label:"some.metric {\"host\":\"host1\",\"type\":\"type1\"}"},
                {tsuid:"001002",label:"some.metric {\"host\":\"host1\",\"type\":\"type2\"}"}
            ]);
            expect(ctrl.allowEditTimeAndSeries()).toEqualData(true);
            
        }));
        

    });
});

