'use strict';

/* jasmine specs for controllers go here */
describe('Aardvark renderers', function () {

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

    describe('ScatterRenderer', function() {
        var graphServices, $httpBackend;
        var renderer, rendererInstance;
        var renderContext, config;

        var renderDivId, renderGraphId, renderData, renderConfig;
        
        beforeEach(inject(function (ScatterRenderer, GraphServices, _$httpBackend_) {
            // hmm
            renderer = ScatterRenderer;
            graphServices = GraphServices;
            $httpBackend = _$httpBackend_;

            renderContext = {};
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
            renderContext.renderMessages = {};
            renderContext.graphRendered = function() {};

            config = {
                tsdbBaseReadUrl: "http://tsdb:4242"
            };

            graphServices.dygraph_render = function(divId, graphId, data, config) {
                renderDivId = divId;
                renderGraphId = graphId;
                renderData = data;
                renderConfig = config;
            }

            renderDivId = null;
            renderGraphId = null;
            renderData = null;
            renderConfig = null;

            rendererInstance = renderer.create();
        }));
        
        it('should indicate the correct graph type', function() {
            // defaults
            expect(rendererInstance.type).toEqualData("scatter");
        })
        
        it('should not support tsdb or grafana export', function() {
            // defaults
            expect(rendererInstance.supports_tsdb_export).toEqualData(false);
            expect(rendererInstance.supports_grafana_export).toEqualData(false);
        })

        it('should report an error when trying to render with scatter and no start time', function() {

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 0, graphHeight: 0 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(renderContext.renderErrors).toEqualData({abc:"No start date specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with scatter and no metrics', function() {

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(renderContext.renderErrors).toEqualData({abc:"No metrics specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with scatter and only one metric', function() {

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", graphOptions: {} } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(renderContext.renderErrors).toEqualData({abc:"Require exactly 2 metrics, currently have 1"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with scatter and more than two metrics', function() {

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", graphOptions: {} }, { id: "124", graphOptions: {} }, { id: "125", graphOptions: {} } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(renderContext.renderErrors).toEqualData({abc:"Require exactly 2 metrics, currently have 3"});
            expect(renderContext.renderWarnings).toEqualData({});
        });
        
        it('should render with scatter with a relative start time and no axes specified', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } }, 
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {}, dps:{
                        1234567811000: 11,
                        1234567812000: 21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric2", tags: {}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: 40,
                        1234567815000: 50
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("scatterDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [11, 10],
                [21, 20],
                [31, 30],
                [41, 40],
                [51, 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1 (x) vs metric2 (y)"],
                width: 0,
                height: 0,
                legend: "always",
                drawPoints: true,
                strokeWidth: 0.0,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes: {y:{},x:{}}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });
        
        it('should render with scatter with a relative start time and axes swapped', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: { swapAxes: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } }, 
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {}, dps:{
                        1234567811000: 11,
                        1234567812000: 21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric2", tags: {}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: 40,
                        1234567815000: 50
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("scatterDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [10, 11],
                [20, 21],
                [30, 31],
                [40, 41],
                [50, 51]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric2 (x) vs metric1 (y)"],
                width: 0,
                height: 0,
                legend: "always",
                drawPoints: true,
                strokeWidth: 0.0,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes: {y:{},x:{}}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });
        
        it('should render with scatter with a relative start time and axes specified as x/y', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: { axis: "x" } } }, 
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: { axis: "y" } } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {}, dps:{
                        1234567811000: 11,
                        1234567812000: 21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric2", tags: {}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: 40,
                        1234567815000: 50
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("scatterDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [11, 10],
                [21, 20],
                [31, 30],
                [41, 40],
                [51, 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1 (x) vs metric2 (y)"],
                width: 0,
                height: 0,
                legend: "always",
                drawPoints: true,
                strokeWidth: 0.0,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes: {y:{},x:{}}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });
        
        it('should render with scatter with a relative start time and axes specified as y/x', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: { axis: "y" } } }, 
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: { axis: "x" } } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {}, dps:{
                        1234567811000: 11,
                        1234567812000: 21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric2", tags: {}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: 40,
                        1234567815000: 50
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("scatterDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [10, 11],
                [20, 21],
                [30, 31],
                [40, 41],
                [50, 51]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric2 (x) vs metric1 (y)"],
                width: 0,
                height: 0,
                legend: "always",
                drawPoints: true,
                strokeWidth: 0.0,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes: {y:{},x:{}}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a relative start time and negatives excluded', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: {excludeNegative:true}};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {}, dps:{
                        1234567811000: 11,
                        1234567812000: -21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric2", tags: {}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: -40,
                        1234567815000: 50
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("scatterDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [11, 10],
                [31, 30],
                [51, 50]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1 (x) vs metric2 (y)"],
                width: 0,
                height: 0,
                legend: "always",
                drawPoints: true,
                strokeWidth: 0.0,
                axisLabelFontSize: 9,
                labelsDivStyles: {
                    fontSize: 9,
                    textAlign: "right"
                },
                labelsSeparateLines: true,
                labelsDiv: null,
                labelsDivWidth: 1000,
                axes: {y:{},x:{}}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should show a render errror with scatter when TSDB response contains more than 2 time series', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: {excludeNegative:true}};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {}, dps:{
                        1234567811000: 11,
                        1234567812000: -21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric2", tags: {}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: -40,
                        1234567815000: 50
                    }
                },
                {
                    metric: "metric3", tags: {}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: -40,
                        1234567815000: 50
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderContext.renderErrors).toEqualData({abc: "TSDB results doesn't contain exactly 2 metrics, was 3"});
            expect(renderContext.renderMessages).toEqualData({abc:""});
            expect(renderContext.renderWarnings).toEqualData({});
            
            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
        });

        it('should show a render errror with scatter when TSDB response contains less than 2 time series', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: {excludeNegative:true}};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {}, dps:{
                        1234567811000: 11,
                        1234567812000: -21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderContext.renderErrors).toEqualData({abc: "TSDB results doesn't contain exactly 2 metrics, was 1"});
            expect(renderContext.renderMessages).toEqualData({abc:""});
            expect(renderContext.renderWarnings).toEqualData({});
            
            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
        });
    });
    
    // todo: http error
    // todo: axis specification where both == x or both == y (error)
});

