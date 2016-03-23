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
                            message: 'Expected ' + JSON.stringify(actual) + ' to equal ' + JSON.stringify(expected)
                        };
                    }
                };
            }
        });
    });

    beforeEach(module('Aardvark'));

    describe('GraphCtrl.dygraphRenderer', function() {
        var rootScope, $httpBackend, scope;
        var globals, graphs, metricss;
        var configUpdateFunc;
        var renderDivId, renderGraphId, renderData, renderConfig;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $controller) {
            // hmm
            rootScope = $rootScope;
            $httpBackend = _$httpBackend_;
            scope = $rootScope.$new();
            globals = [];
            graphs = [];
            metricss = [];

            scope.renderers = {};
            renderDivId = null;
            renderGraphId = null;
            renderData = null;
            renderConfig = null;

            rootScope.model = {
                graphs: [],
                metrics: []
            }

            rootScope.config = {
                tsdbHost: "tsdb",
                tsdbPort: 4242
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

            // override function to get us a test hook
            scope.dygraph_render = function(divId, graphId, data, config) {
                renderDivId = divId;
                renderGraphId = graphId;
                renderData = data;
                renderConfig = config;
            }
        }));

        it('should report an error when trying to render with dygraph and no start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 0, graphHeight: 0 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            scope.renderers.dygraph(global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(scope.renderErrors).toEqualData({abc:"No start date specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with dygraph and no metrics', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ ];

            scope.renderers.dygraph(global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(scope.renderErrors).toEqualData({abc:"No metrics specified"});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with a relative start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]}]);

            scope.renderers.dygraph(global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 10],
                [new Date(1234567812000), 20],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), 40],
                [new Date(1234567815000), 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with stacked lines', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { stackedLines: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]}]);

            scope.renderers.dygraph(global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 10],
                [new Date(1234567812000), 20],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), 40],
                [new Date(1234567815000), 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1"],
                width: 0,
                height: 0,
                legend: "always",
                stackedGraph: true,
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph and correctly indicate gaps in data', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567810000, 10],
                [1234567811000, 10],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567815000, 50],
                [1234567816000, 50]
            ]}]);

            scope.renderers.dygraph(global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567810000), 10, null],
                [new Date(1234567811000), 10, 10],
                [new Date(1234567812000), null, 20],
                [new Date(1234567813000), 30, 30],
                [new Date(1234567814000), 40, null],
                [new Date(1234567815000), 50, 50],
                [new Date(1234567816000), null, 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1", "metric2"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with interpolation', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { interpolateGaps: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]}]);

            scope.renderers.dygraph(global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 10],
                [new Date(1234567812000), 20],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), 40],
                [new Date(1234567815000), 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1"],
                width: 0,
                height: 0,
                legend: "always",
                connectSeparatedPoints: true,
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with logarithmic y axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { ylog: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]}]);

            scope.renderers.dygraph(global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 10],
                [new Date(1234567812000), 20],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), 40],
                [new Date(1234567815000), 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1"],
                width: 0,
                height: 0,
                legend: "always",
                logscale: true,
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with negative squashing', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 50]
            ]}]);

            scope.renderers.dygraph(global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 10],
                [new Date(1234567812000), 0],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), 0],
                [new Date(1234567815000), 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with mean adjustment', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: false, meanAdjusted: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 50]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, -20],
                    [1234567812000, 20],
                    [1234567813000, -30],
                    [1234567814000, 40],
                    [1234567815000, 10]
                ]}]);

            scope.renderers.dygraph(global, graph, metrics);

            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 15, -15],
                [new Date(1234567812000), -20, 20],
                [new Date(1234567813000), 30, -30],
                [new Date(1234567814000), -40, 40],
                [new Date(1234567815000), 20, -20]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1", "metric2"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with mean adjustment and negative squashing', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: true, meanAdjusted: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 50]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, -20],
                    [1234567812000, 20],
                    [1234567813000, -30],
                    [1234567814000, 40],
                    [1234567815000, 10]
                ]}]);

            scope.renderers.dygraph(global, graph, metrics);

            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 5, -5],
                [new Date(1234567812000), -10, 10],
                [new Date(1234567813000), 15, -15],
                [new Date(1234567814000), -20, 20],
                [new Date(1234567815000), 20, -20]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1", "metric2"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with auto scaling', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 1000],
                [1234567812000, 2000],
                [1234567813000, 3000],
                [1234567814000, 4000],
                [1234567815000, 5000]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 20],
                    [1234567812000, 20],
                    [1234567813000, 30],
                    [1234567814000, 40],
                    [1234567815000, 10]
                ]}]);

            scope.renderers.dygraph(global, graph, metrics);

            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 1000, 2000],
                [new Date(1234567812000), 2000, 2000],
                [new Date(1234567813000), 3000, 3000],
                [new Date(1234567814000), 4000, 4000],
                [new Date(1234567815000), 5000, 1000]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1", "100x metric2"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with auto scaling and scale same metrics same amount', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [{name: "host", value: "host1"}], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric1", tags: [{name: "host", value: "host2"}], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "125", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1{host=host1}&m=sum:metric1{host=host2}&m=sum:metric2&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {host: "host1"}, dps:[
                [1234567811000, 1000],
                [1234567812000, 2000],
                [1234567813000, 3000],
                [1234567814000, 4000],
                [1234567815000, 5000]
            ]},{metric: "metric1", tags: {host: "host2"}, dps:[
                [1234567811000, 20],
                    [1234567812000, 20],
                    [1234567813000, 30],
                    [1234567814000, 40],
                    [1234567815000, 10]
                ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 20],
                    [1234567812000, 20],
                    [1234567813000, 30],
                    [1234567814000, 40],
                    [1234567815000, 10]
                ]}]);

            scope.renderers.dygraph(global, graph, metrics);

            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 1000, 20, 2000],
                [new Date(1234567812000), 2000, 20, 2000],
                [new Date(1234567813000), 3000, 30, 3000],
                [new Date(1234567814000), 4000, 40, 4000],
                [new Date(1234567815000), 5000, 10, 1000]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1{host=host1}", "metric1{host=host2}", "100x metric2"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with dygraph with auto scaling of absolute values', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, -1000],
                [1234567812000, -2000],
                [1234567813000, -3000],
                [1234567814000, -4000],
                [1234567815000, -5000]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 20],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 10]
            ]}]);

            scope.renderers.dygraph(global, graph, metrics);

            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), -1000, 2000],
                [new Date(1234567812000), -2000, 2000],
                [new Date(1234567813000), -3000, 3000],
                [new Date(1234567814000), -4000, 4000],
                [new Date(1234567815000), -5000, 1000]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1", "100x metric2"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with dygraph with auto scaling taking acount of negative squashing', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true, squashNegative: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, -1000],
                [1234567812000, -2000],
                [1234567813000, -3000],
                [1234567814000, -4000],
                [1234567815000, -5000]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 20],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 10]
            ]}]);

            scope.renderers.dygraph(global, graph, metrics);

            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [new Date(1234567811000), 0, 20],
                [new Date(1234567812000), 0, 20],
                [new Date(1234567813000), 0, 30],
                [new Date(1234567814000), 0, 40],
                [new Date(1234567815000), 0, 10]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1", "metric2"],
                width: 0,
                height: 0,
                legend: "always",
                drawGapEdgePoints: true,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes:{
                    y:{}
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        // todo: http error
        // todo: line highlighting callback
        // todo: value formatters
    });
});

