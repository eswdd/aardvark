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

    describe('GraphCtrl', function() {
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
            scope.renderers["unittest"] = {
                create: function() {
                    return {
                        type: "unittest",
                        supports_tsdb_export: false,
                        render: function(global,graph,metrics) {
                            globals.push(global);
                            graphs.push(graph);
                            metricss.push(metrics);
                        }
                    }
                }
            };
            scope.renderers["exportable"] = {
                create: function() {
                    return {
                        type: "unittest",
                        supports_tsdb_export: true,
                        tsdb_export_link: "http://tsdb:4242",
                        render: function(global,graph,metrics) {
                            globals.push(global);
                            graphs.push(graph);
                            metricss.push(metrics);
                        }
                    }
                }
            };

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

        it('should define the renderGraphs function on the rootScope', function() {
            var defined = false;
            if (rootScope.renderGraphs) {
                defined = true;
            }
            expect(defined).toEqualData(true);
        });

        it('should call the correct renderer when a graph with the correct type is defined', function() {
            var graph = { id: "abc", type: "unittest" };
            var notGraph = { id: "def", type: "something" };
            var incMetric = { id: "123", graphOptions: { graphId: "abc" }};
            var excMetric = { id: "456", graphOptions: { graphId: "def" }};
            rootScope.model.global = {
                autoGraphHeight: true,
                minGraphHeight: 0
            };
            rootScope.model.graphs = [ graph, notGraph ];
            rootScope.model.metrics = [ incMetric, excMetric ];

            rootScope.renderGraphs();

            expect(graphs).toEqualData([graph]);
            expect(metricss).toEqualData([[incMetric]]);
        });

        it('should respect the minimum graph height to that specified when using autoGraphHeight', function() {
            var graph = { id: "abc", type: "unittest" };
            var incMetric = { id: "123", graphOptions: { graphId: "abc" }};
            rootScope.model.global = {
                autoGraphHeight: true,
                minGraphHeight: 201
            };
            rootScope.model.graphs = [ graph ];
            rootScope.model.metrics = [ incMetric ];

            rootScope.renderGraphs({clientHeight: 240, clientWidth: 424});

            expect(graphs).toEqualData([graph]);
            expect(metricss).toEqualData([[incMetric]]);
            expect(graph.graphHeight).toEqualData(201);
            expect(graph.graphWidth).toEqualData(400);
        });

        it('should apportion the render area correctly between multiple graphs', function() {
            var graph = { id: "abc", type: "unittest" };
            var graph2 = { id: "def", type: "unittest" };
            var incMetric = { id: "123", graphOptions: { graphId: "abc" }};
            var incMetric2 = { id: "456", graphOptions: { graphId: "def" }};
            rootScope.model.global = {
                autoGraphHeight: true,
                minGraphHeight: 0
            };
            rootScope.model.graphs = [ graph, graph2 ];
            rootScope.model.metrics = [ incMetric, incMetric2 ];

            rootScope.renderGraphs({clientHeight: 260, clientWidth: 424});

            expect(graphs).toEqualData([graph, graph2]);
            expect(metricss).toEqualData([[incMetric],[incMetric2]]);
            expect(graph.graphHeight).toEqualData(100);
            expect(graph.graphWidth).toEqualData(400);
            expect(graph2.graphHeight).toEqualData(100);
            expect(graph2.graphWidth).toEqualData(400);
        });

        it('should fix the graph height to that specified when not using autoGraphHeight', function() {
            var graph = { id: "abc", type: "unittest" };
            var notGraph = { id: "def", type: "something" };
            var incMetric = { id: "123", graphOptions: { graphId: "abc" }};
            var excMetric = { id: "456", graphOptions: { graphId: "def" }};
            rootScope.model.global = {
                autoGraphHeight: false,
                graphHeight: 300
            };
            rootScope.model.graphs = [ graph, notGraph ];
            rootScope.model.metrics = [ incMetric, excMetric ];

            rootScope.renderGraphs({clientHeight: 260, clientWidth: 424});

            expect(graphs).toEqualData([graph]);
            expect(metricss).toEqualData([[incMetric]]);
            expect(graph.graphHeight).toEqualData(300);
            expect(graph.graphWidth).toEqualData(400);
        });
        
        it('should indicate that tsdb export is available as appropriate', function() {
            var not_exportable = { id: "abc", type: "unittest" };
            var exportable = { id: "def", type: "exportable" };
            var metric1 = { id: "123", graphOptions: { graphId: "abc" }};
            var metric2 = { id: "456", graphOptions: { graphId: "def" }};
            rootScope.model.global = {};
            rootScope.model.graphs = [ not_exportable, exportable ];
            rootScope.model.metrics = [ metric1, metric2 ];
            
            expect(scope.supportsTsdbExport(not_exportable)).toEqualData(false);
            expect(scope.supportsTsdbExport(exportable)).toEqualData(false);

            rootScope.renderGraphs();

            expect(scope.supportsTsdbExport(not_exportable)).toEqualData(false);
            expect(scope.supportsTsdbExport(exportable)).toEqualData(true);
        });
        
        it('should return tsdb export links as appropriate', function() {
            var not_exportable = { id: "abc", type: "unittest" };
            var exportable = { id: "def", type: "exportable" };
            var metric1 = { id: "123", graphOptions: { graphId: "abc" }};
            var metric2 = { id: "456", graphOptions: { graphId: "def" }};
            rootScope.model.global = {};
            rootScope.model.graphs = [ not_exportable, exportable ];
            rootScope.model.metrics = [ metric1, metric2 ];
            
            expect(scope.tsdbExportLink(not_exportable)).toEqualData("");
            expect(scope.tsdbExportLink(exportable)).toEqualData("");

            rootScope.renderGraphs();

            expect(scope.tsdbExportLink(not_exportable)).toEqualData("");
            expect(scope.tsdbExportLink(exportable)).toEqualData("http://tsdb:4242");
        });
    });
});

