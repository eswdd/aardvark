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

    describe('QueryEditorDialogCtrl', function() {
        var ctrl;
        var mockUibModal;
        var mockIdGenerator;
        var mockTsdbUtils;
        var actualTsdbUtils;
        
        var callArraysToCheckAndCleanAfter = [];
        
        var tsuidToMetricAndTagsCalls = [];
        var closeCalls = [];
        var dismissCalls = [];
        var nextIdCalls = [];
        
        beforeEach(inject(function (tsdbUtils) {
            actualTsdbUtils = tsdbUtils;
        }));
        
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
        
        var setupController = function($controller, queries, graphs) {
            mockTsdbUtils = {
                tsuidToMetricAndTags: mockMethod("$tsdbUtils.tsuidToMetricAndTags", tsuidToMetricAndTagsCalls),
                // call through to real methods - todo: not really unit testing
                gexpFunctions: actualTsdbUtils.gexpFunctions,
                metricQuery: actualTsdbUtils.metricQuery,
                gexpQuery: actualTsdbUtils.gexpQuery
            };
            mockUibModal = {
                close: mockMethod("$uibModal.close", closeCalls),
                dismiss: mockMethod("$uibModal.dismiss", dismissCalls)
            };
            mockIdGenerator = {
                nextId: mockMethod("idGenerator.nextId", nextIdCalls)
            };
            ctrl = $controller('QueryEditorDialogCtrl', {
                $uibModalInstance: mockUibModal,
                queries: queries,
                idGenerator: mockIdGenerator,
                tsdbUtils: mockTsdbUtils,
                graphs: graphs
            });
        }
        
        it('should initialise the controller correctly', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["1"]
                },
                {
                    id: "3",
                    type: "metric"
                },
                {
                    id: "4",
                    type: "exp"
                }
            ];
            setupController($controller, queries);
            expect(ctrl.queries).toEqualData(queries);
            expect(ctrl.gexpSubQueriesById).toEqualData({
                "1": {
                    id: "1",
                    type: "metric"
                },
                "2": {
                    id: "2",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["1"]
                },
                "3": {
                    id: "3",
                    type: "metric"
                }
            });
            expect(ctrl.deletedQueries).toEqualData([]);
        }));
        
        it('should load an existing gexp query with a single sub query correctly', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["1"]
                },
                {
                    id: "3",
                    type: "metric"
                },
                {
                    id: "4",
                    type: "exp"
                }
            ];
            setupController($controller, queries);
            
            ctrl.currentQueryId = "2";
            ctrl.querySelectionChanged();

            expect(ctrl.currentQuery).toEqualData(queries[1]);
            expect(ctrl.selectedSubQueryId).toEqualData("1");
            expect(ctrl.selectedAvailableSubQueries).toEqualData([]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData([]);
            expect(ctrl.availableSubQueries).toEqualData([
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                }
            ]);
            expect(ctrl.includedSubQueries).toEqualData([]);
        }));
        
        it('should load an existing gexp query with multiple sub queries correctly', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "gexp",
                    function: "sumSeries",
                    subQueries: ["1","3"]
                },
                {
                    id: "3",
                    type: "metric"
                },
                {
                    id: "4",
                    type: "exp"
                }
            ];
            setupController($controller, queries);
            
            ctrl.currentQueryId = "2";
            nextIdCalls.push(function () { return "5"; });
            nextIdCalls.push(function () { return "6"; });
            ctrl.querySelectionChanged();

            expect(ctrl.currentQuery).toEqualData(queries[1]);
            expect(ctrl.selectedSubQueryId).toEqualData(null);
            expect(ctrl.selectedAvailableSubQueries).toEqualData([]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData([]);
            expect(ctrl.availableSubQueries).toEqualData([
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                }
            ]);
            expect(ctrl.includedSubQueries).toEqualData([
                {
                    id: "5",
                    query: {
                        id: "1",
                        type: "metric"
                    }
                },
                {
                    id: "6",
                    query: {
                        id: "3",
                        type: "metric"
                    }
                }
            ]);
        }));
        
        it('should not allow simple circular references in availableSubQueries', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["2"]
                },
                {
                    id: "2",
                    type: "gexp",
                    function: "sumSeries",
                    subQueries: ["3"]
                },
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);
            
            ctrl.currentQueryId = "2";
            nextIdCalls.push(function () { return "5"; });
            ctrl.querySelectionChanged();

            expect(ctrl.currentQuery).toEqualData(queries[1]);
            expect(ctrl.availableSubQueries).toEqualData([
                {
                    id: "3",
                    type: "metric"
                }
            ]);
        }));
        
        it('should not allow complex circular references in availableSubQueries', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["2"]
                },
                {
                    id: "2",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["3"]
                },
                {
                    id: "3",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["4"]
                },
                {
                    id: "4",
                    type: "gexp",
                    function: "sumSeries",
                    subQueries: ["5"]
                },
                {
                    id: "5",
                    type: "metric"
                }
            ];
            setupController($controller, queries);
            
            ctrl.currentQueryId = "4";
            nextIdCalls.push(function () { return "5"; });
            ctrl.querySelectionChanged();

            expect(ctrl.currentQuery).toEqualData(queries[3]);
            expect(ctrl.availableSubQueries).toEqualData([
                {
                    id: "5",
                    type: "metric"
                }
            ]);
        }));
        
        it('should allow references trees which are DAGs with multiple references to a single query in availableSubQueries', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "gexp",
                    function: "sumSeries",
                    subQueries: ["2","3"]
                },
                {
                    id: "2",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["5"]
                },
                {
                    id: "3",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["5"]
                },
                {
                    id: "4",
                    type: "gexp",
                    function: "sumSeries",
                    subQueries: ["5"]
                },
                {
                    id: "5",
                    type: "metric"
                }
            ];
            setupController($controller, queries);
            
            ctrl.currentQueryId = "4";
            nextIdCalls.push(function () { return "5"; });
            ctrl.querySelectionChanged();

            expect(ctrl.currentQuery).toEqualData(queries[3]);
            expect(ctrl.availableSubQueries).toEqualData([
                {
                    id: "1",
                    type: "gexp",
                    function: "sumSeries",
                    subQueries: ["2","3"]
                },
                {
                    id: "2",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["5"]
                },
                {
                    id: "3",
                    type: "gexp",
                    function: "absolute",
                    subQueries: ["5"]
                },
                {
                    id: "5",
                    type: "metric"
                }
            ]);
        }));
        
        it('should make the selected metric query the sub query to be used for a graphite expression query', inject(function($controller) {
            var query2 = {
                id: "2",
                type: "metric",
                name: "cpu.percent",
                graphOptions: {
                    aggregator: "avg",
                    downsample: false,
                    rate: false
                },
                tags: []
            };
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                query2,
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "absolute";
            ctrl.selectedSubQueryId = "2";
            
            ctrl.saveCurrent();
            
            expect(ctrl.queries[3].subQueries).toEqualData(["2"]);
            expect(ctrl.queryString(ctrl.currentQuery)).toEqualData("absolute(avg:cpu.percent)");
        }));
        
        it('should correctly run through a flow of defining nested gexp queries', inject(function($controller) {
            var query1 = {
                id: "1",
                type: "metric",
                name: "cpu.percent",
                graphOptions: {
                    aggregator: "avg",
                    downsample: false,
                    rate: false
                },
                tags: []
            };
            var queries = [
                query1
            ];
            
            // init
            setupController($controller, queries);
            expect(ctrl.queries).toEqualData(queries);
            expect(ctrl.gexpSubQueriesById).toEqualData({
                "1": query1
            });

            // press new query button
            nextIdCalls.push(function () { return "2"; });
            ctrl.newQuery();
            
            expect(ctrl.currentQuery).toEqualData({
                id: "2",
                type: "gexp",
                name: "Query 2", // todo: really?
                subQueries: [null],
                graphOptions: {
                    graphId: "0",
                    rightAxis: false,
                    dygraph: {
                        drawLines: true,
                        drawPoints: false
                    }
                }
            })
            expect(ctrl.availableSubQueries).toEqualData([query1]);
            expect(ctrl.selectedAvailableSubQueries).toEqualData([]);
            expect(ctrl.includedSubQueries).toEqualData([]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData([]);
            expect(ctrl.currentQueryAdding).toEqualData(true);
            expect(ctrl.selectedSubQueryId).toEqualData(null);
            
            // fill in user info
            ctrl.currentQuery.function = "movingAverage";
            ctrl.queryTypeChanged();
            
            ctrl.selectedSubQueryId = "1";
            ctrl.currentQuery.extraArg = "2h";
            
            // save it
            ctrl.saveCurrent();
            var gexpQuery1 = ctrl.currentQuery;

            expect(ctrl.currentQuery.subQueries).toEqualData(["1"]);
            expect(ctrl.currentQueryAdding).toEqualData(false);
            expect(ctrl.gexpSubQueriesById).toEqualData({
                "1": query1,
                "2": gexpQuery1
            });
            expect(ctrl.availableSubQueries).toEqualData([query1]);
            expect(ctrl.queryString(gexpQuery1)).toEqualData("movingAverage(avg:cpu.percent, '2h')");
            
            // another new query
            nextIdCalls.push(function () { return "3"; });
            ctrl.newQuery();

            expect(ctrl.currentQuery).toEqualData({
                id: "3",
                type: "gexp",
                name: "Query 3",
                subQueries: [null],
                graphOptions: {
                    graphId: "0",
                    rightAxis: false,
                    dygraph: {
                        drawLines: true,
                        drawPoints: false
                    }
                }
            })
            expect(ctrl.availableSubQueries).toEqualData([query1,gexpQuery1]);
            expect(ctrl.selectedAvailableSubQueries).toEqualData([]);
            expect(ctrl.includedSubQueries).toEqualData([]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData([]);
            expect(ctrl.currentQueryAdding).toEqualData(true);
            expect(ctrl.selectedSubQueryId).toEqualData(null);


            // fill in user info
            ctrl.currentQuery.function = "sumSeries";
            ctrl.queryTypeChanged();

            ctrl.selectedAvailableSubQueries = ["1","2"];
            nextIdCalls.push(function () { return "5"; });
            nextIdCalls.push(function () { return "6"; });
            ctrl.moveMetricIn();
            expect(ctrl.includedSubQueries.map(function (w) {return w.query.id;})).toEqualData(["1","2"]);

            // save it
            ctrl.saveCurrent();
            var gexpQuery2 = ctrl.currentQuery;

            expect(ctrl.currentQuery.subQueries).toEqualData(["1","2"]);
            expect(ctrl.currentQueryAdding).toEqualData(false);
            expect(ctrl.gexpSubQueriesById).toEqualData({
                "1": query1,
                "2": gexpQuery1,
                "3": gexpQuery2
            });
            expect(ctrl.availableSubQueries).toEqualData([query1,gexpQuery1]);
            expect(ctrl.queryString(gexpQuery2)).toEqualData("sumSeries(avg:cpu.percent, movingAverage(avg:cpu.percent, '2h'))");


            // another new query
            nextIdCalls.push(function () { return "7"; });
            ctrl.newQuery();

            expect(ctrl.currentQuery).toEqualData({
                id: "7",
                type: "gexp",
                name: "Query 4",
                subQueries: [null],
                graphOptions: {
                    graphId: "0",
                    rightAxis: false,
                    dygraph: {
                        drawLines: true,
                        drawPoints: false
                    }
                }
            })
            expect(ctrl.availableSubQueries).toEqualData([query1,gexpQuery1,gexpQuery2]);
            expect(ctrl.selectedAvailableSubQueries).toEqualData([]);
            expect(ctrl.includedSubQueries).toEqualData([]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData([]);
            expect(ctrl.currentQueryAdding).toEqualData(true);
            expect(ctrl.selectedSubQueryId).toEqualData(null);
        }));
        
        it('should make the selected gexp query the sub query to be used for a graphite expression query', inject(function($controller) {
            var query1 = {
                id: "1",
                type: "metric",
                name: "cpu.percent",
                graphOptions: {
                    aggregator: "avg",
                    downsample: false,
                    rate: false
                },
                tags: []
            };
            var query2 = {
                id: "2",
                type: "gexp",
                function: "sumSeries",
                subQueries: ["1"]
            }
            var queries = [
                query1,
                query2,
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "absolute";
            ctrl.selectedSubQueryId = "2";
            
            ctrl.saveCurrent();
            
            expect(ctrl.queries[3].subQueries).toEqualData(["2"]);
            expect(ctrl.queryString(ctrl.currentQuery)).toEqualData("absolute(sumSeries(avg:cpu.percent))");
        }));
        
        it('should add a selected metric query to the bottom of list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var query2 = {
                id: "2",
                type: "metric",
                name: "cpu.percent",
                graphOptions: {
                    aggregator: "avg",
                    downsample: false,
                    rate: false
                },
                tags: []
            };
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                query2,
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.selectedAvailableSubQueries = ["2"];

            nextIdCalls.push(function () { return "5"; });
            ctrl.moveMetricIn();

            expect(ctrl.includedSubQueries).toEqualData([{id:"5",query:query2}]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["5"]);
            
            ctrl.saveCurrent();
            
            expect(ctrl.queries[3].subQueries).toEqualData(["2"]);
            expect(ctrl.queryString(ctrl.currentQuery)).toEqualData("sumSeries(avg:cpu.percent)");
        }));
        
        it('should add a selected gexp query to the bottom of list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var query1 = {
                id: "1",
                type: "metric",
                name: "cpu.percent",
                graphOptions: {
                    aggregator: "avg",
                    downsample: false,
                    rate: false
                },
                tags: []
            };
            var query2 = {
                id: "2",
                type: "gexp",
                function: "absolute",
                subQueries: ["1"]
            }
            var queries = [
                query1,
                query2,
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.selectedAvailableSubQueries = ["1","2"];

            nextIdCalls.push(function () { return "5"; });
            nextIdCalls.push(function () { return "6"; });
            ctrl.moveMetricIn();

            expect(ctrl.includedSubQueries).toEqualData([{id:"5",query:query1},{id:"6",query:query2}]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["5","6"]);
            
            ctrl.saveCurrent();
            
            expect(ctrl.queries[3].subQueries).toEqualData(["1", "2"]);
            expect(ctrl.queryString(ctrl.currentQuery)).toEqualData("sumSeries(avg:cpu.percent, absolute(avg:cpu.percent))");
        }));
        
        it('should add multiple selected metric queries to the bottom of list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.selectedAvailableSubQueries = ["1","3"];

            nextIdCalls.push(function () { return "5"; });
            nextIdCalls.push(function () { return "6"; });
            ctrl.moveMetricIn();

            expect(ctrl.includedSubQueries).toEqualData([
                {id:"5",query:{id:"1",type:"metric"}},
                {id:"6",query:{id:"3",type:"metric"}}
            ]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["5","6"]);
            
            ctrl.saveCurrent();
            
            expect(ctrl.queries[3].subQueries).toEqualData(["1","3"]);
        }));
        
        it('should limit the number of sub queries added to a graphite expression query to the maximum available for that function', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                },
                {
                    id: "4",
                    type: "metric"
                },
                {
                    id: "5",
                    type: "metric"
                },
                {
                    id: "6",
                    type: "metric"
                },
                {
                    id: "7",
                    type: "metric"
                },
                {
                    id: "8",
                    type: "metric"
                },
                {
                    id: "9",
                    type: "metric"
                },
                {
                    id: "10",
                    type: "metric"
                },
                {
                    id: "11",
                    type: "metric"
                },
                {
                    id: "12",
                    type: "metric"
                },
                {
                    id: "13",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "14"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.selectedAvailableSubQueries = ["1","2","3","4","5","6","7","8","9","10","11","12","13"];

            // 26 new ids
            nextIdCalls.push(function () { return "15"; });
            nextIdCalls.push(function () { return "16"; });
            nextIdCalls.push(function () { return "17"; });
            nextIdCalls.push(function () { return "18"; });
            nextIdCalls.push(function () { return "19"; });
            nextIdCalls.push(function () { return "20"; });
            nextIdCalls.push(function () { return "21"; });
            nextIdCalls.push(function () { return "22"; });
            nextIdCalls.push(function () { return "23"; });
            nextIdCalls.push(function () { return "24"; });
            nextIdCalls.push(function () { return "25"; });
            nextIdCalls.push(function () { return "26"; });
            nextIdCalls.push(function () { return "27"; });
            nextIdCalls.push(function () { return "28"; });
            nextIdCalls.push(function () { return "29"; });
            nextIdCalls.push(function () { return "30"; });
            nextIdCalls.push(function () { return "31"; });
            nextIdCalls.push(function () { return "32"; });
            nextIdCalls.push(function () { return "33"; });
            nextIdCalls.push(function () { return "34"; });
            nextIdCalls.push(function () { return "35"; });
            nextIdCalls.push(function () { return "36"; });
            nextIdCalls.push(function () { return "37"; });
            nextIdCalls.push(function () { return "38"; });
            nextIdCalls.push(function () { return "39"; });
            nextIdCalls.push(function () { return "40"; });
            // this one should not be needed but is to get a meaningful error message
            nextIdCalls.push(function () { return "41"; });
            ctrl.moveMetricIn();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["15","16","17","18","19","20","21","22","23","24","25","26","27"]);
            
            ctrl.selectedAvailableSubQueries = ["1","2","3","4","5","6","7","8","9","10","11","12"];
            ctrl.moveMetricIn();
            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39"]);

            ctrl.selectedAvailableSubQueries = ["1","2"];
            ctrl.moveMetricIn();
            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40"]);
            
            // cleanup after the test
            if (nextIdCalls.length != 0) {
                mockIdGenerator.nextId();
            }
        }));
        
        it('should remove a selected metric query from the list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.includedSubQueries = [
                {id:"5",query:{id:"1",type:"metric"}},
                {id:"6",query:{id:"2",type:"metric"}},
                {id:"7",query:{id:"3",type:"metric"}}
            ];
            
            ctrl.selectedIncludedSubQueries = ["6"];

            ctrl.moveMetricOut();

            expect(ctrl.includedSubQueries).toEqualData(
                [
                    {id:"5",query:{id:"1",type:"metric"}},
                    {id:"7",query:{id:"3",type:"metric"}}
                ]);
            
            ctrl.saveCurrent();
            
            expect(ctrl.queries[3].subQueries).toEqualData(["1","3"]);
        }));
        
        it('should remove multiple selected metric queries from the list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();

            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.includedSubQueries = [
                {id:"5",query:{id:"1",type:"metric"}},
                {id:"6",query:{id:"2",type:"metric"}},
                {id:"7",query:{id:"3",type:"metric"}}
            ];

            ctrl.selectedIncludedSubQueries = ["5","7"];

            ctrl.moveMetricOut();

            expect(ctrl.includedSubQueries).toEqualData(
                [
                    {id:"6",query:{id:"2",type:"metric"}}
                ]);

            ctrl.saveCurrent();

            expect(ctrl.queries[3].subQueries).toEqualData(["2"]);
        }));
        
        it('should move a selected metric query up in the list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.includedSubQueries = [
                {id:"5",query:{id:"1",type:"metric"}},
                {id:"6",query:{id:"2",type:"metric"}},
                {id:"7",query:{id:"3",type:"metric"}}
            ];
            
            ctrl.selectedIncludedSubQueries = ["7"];

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["5","7","6"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7"]);

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["7","5","6"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7"]);

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["7","5","6"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7"]);
        }));
        
        it('should move multiple selected metric queries up in the list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                },
                {
                    id: "4",
                    type: "metric"
                },
                {
                    id: "5",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "6"; });
            ctrl.newQuery();

            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.includedSubQueries = [
                {id: "7",query:{id:"1",type:"metric"}},
                {id: "8",query:{id:"2",type:"metric"}},
                {id: "9",query:{id:"3",type:"metric"}},
                {id:"10",query:{id:"2",type:"metric"}},
                {id:"11",query:{id:"3",type:"metric"}}
            ];

            ctrl.selectedIncludedSubQueries = ["9","11"];

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["7","9","8","11","10"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["9","11"]);

            ctrl.moveMetricUp();
            
            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["9","7","11","8","10"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["9","11"]);

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["9","11","7","8","10"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["9","11"]);

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["9","11","7","8","10"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["9","11"]);
        }));
        
        it('should move multiple adjacent selected metric queries up in the list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                },
                {
                    id: "4",
                    type: "metric"
                },
                {
                    id: "5",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "6"; });
            ctrl.newQuery();

            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.includedSubQueries = [
                {id: "7",query:{id:"1",type:"metric"}},
                {id: "8",query:{id:"2",type:"metric"}},
                {id: "9",query:{id:"3",type:"metric"}},
                {id:"10",query:{id:"2",type:"metric"}},
                {id:"11",query:{id:"3",type:"metric"}}
            ];

            ctrl.selectedIncludedSubQueries = ["10","11"];

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["7","8","10","11","9"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["10","11"]);

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["7","10","11","8","9"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["10","11"]);

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["10","11","7","8","9"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["10","11"]);

            ctrl.moveMetricUp();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["10","11","7","8","9"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["10","11"]);
        }));
        
        it('should move a selected metric query down in the list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "4"; });
            ctrl.newQuery();
            
            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.includedSubQueries = [
                {id:"5",query:{id:"1",type:"metric"}},
                {id:"6",query:{id:"2",type:"metric"}},
                {id:"7",query:{id:"3",type:"metric"}}
            ];
            
            ctrl.selectedIncludedSubQueries = ["5"];

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["6","5","7"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["5"]);

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["6","7","5"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["5"]);

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["6","7","5"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["5"]);
        }));
        
        it('should move multiple selected metric queries down in the list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                },
                {
                    id: "4",
                    type: "metric"
                },
                {
                    id: "5",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "6"; });
            ctrl.newQuery();

            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.includedSubQueries = [
                {id: "7",query:{id:"1",type:"metric"}},
                {id: "8",query:{id:"2",type:"metric"}},
                {id: "9",query:{id:"3",type:"metric"}},
                {id:"10",query:{id:"2",type:"metric"}},
                {id:"11",query:{id:"3",type:"metric"}}
            ];

            ctrl.selectedIncludedSubQueries = ["7","9"];

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["8","7","10","9","11"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7","9"]);

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["8","10","7","11","9"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7","9"]);

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["8","10","11","7","9"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7","9"]);

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["8","10","11","7","9"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7","9"]);
        }));
        
        it('should move multiple adjacent selected metric queries down in the list of sub queries to be used for a graphite expression query', inject(function($controller) {
            var queries = [
                {
                    id: "1",
                    type: "metric"
                },
                {
                    id: "2",
                    type: "metric"
                },
                {
                    id: "3",
                    type: "metric"
                },
                {
                    id: "4",
                    type: "metric"
                },
                {
                    id: "5",
                    type: "metric"
                }
            ];
            setupController($controller, queries);

            nextIdCalls.push(function () { return "6"; });
            ctrl.newQuery();

            ctrl.currentQuery.type = "gexp";
            ctrl.currentQuery.function = "sumSeries";
            ctrl.includedSubQueries = [
                {id: "7",query:{id:"1",type:"metric"}},
                {id: "8",query:{id:"2",type:"metric"}},
                {id: "9",query:{id:"3",type:"metric"}},
                {id:"10",query:{id:"2",type:"metric"}},
                {id:"11",query:{id:"3",type:"metric"}}
            ];

            ctrl.selectedIncludedSubQueries = ["7","8"];

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["9","7","8","10","11"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7","8"]);

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["9","10","7","8","11"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7","8"]);

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["9","10","11","7","8"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7","8"]);

            ctrl.moveMetricDown();

            expect(ctrl.includedSubQueries.map(function(o){return o.id})).toEqualData(["9","10","11","7","8"]);
            expect(ctrl.selectedIncludedSubQueries).toEqualData(["7","8"]);
        }));
        
        // todo: available sub queries with complex circular references
        // todo: deletion including usages
        

    });
});

