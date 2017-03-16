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

        it('should report an error when trying to render with scatter and two metrics with unmatch multi-value tag queries', function() {

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true}], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } },
                { id: "124", name: "metric2", tags: [{name:"source",value:"*",groupBy:true}], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(renderContext.renderErrors).toEqualData({abc:"Mismatched multi-tag queries: [host] vs [source]"});
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
                axes: {y:{
                    valueRange: [null, null]
                },x:{
                    valueRange: [null, null]
                }}
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
                axes: {y:{
                    valueRange: [null, null]
                },x:{
                    valueRange: [null, null]
                }}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a relative start time and logscale x axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: { xlog: true }};
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
                axes: {
                    y:{
                        valueRange: [null, null]
                    },
                    x:{
                        logscale: true,
                        valueRange: [null, null]
                    }
                }
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a relative start time and logscale y axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: { ylog: true }};
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
                logscale: true,
                axes: {
                    y:{
                        valueRange: [null, null]
                    },
                    x:{
                        valueRange: [null, null]
                    }
                }
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a relative start time and logscale both axes', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: { xlog: true, ylog: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", 
                    tags: {}, 
                    dps:{
                        1234567811000: 11,
                        1234567812000: 21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric2", 
                    tags: {}, 
                    dps:{
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
                logscale: true,
                axes: {
                    y:{
                        valueRange: [null, null]
                    },
                    x:{
                        logscale: true,
                        valueRange: [null, null]
                    }
                }
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a relative start time and different ranges specified both axes', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: { xRange: "[20:100]", yRange:"[-30:50]" }};
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
                axes: {
                    y:{
                        valueRange: [-30, 50]
                    },
                    x:{
                        valueRange: [20, 100]
                    }
                }
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a relative start time and negatives excluded on both axes', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: {xSquashNegative:true, ySquashNegative: true}};
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
                axes: {y:{valueRange: [null, null]},x:{valueRange: [null, null]}}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a relative start time and negatives excluded on x axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: {xSquashNegative:true}};
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
                [41, -40],
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
                axes: {y:{valueRange: [null, null]},x:{valueRange: [null, null]}}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a relative start time and negatives excluded on y axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, scatter: {ySquashNegative: true}};
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
                [-21, 20],
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
                axes: {y:{valueRange: [null, null]},x:{valueRange: [null, null]}}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });
        
        it('should correctly identify matched multi-tag queries 1', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [] },
                { id: "124", name: "metric2", tags: [] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
            } catch (e) {
                fail("Unexpected exception: "+e);
            }
        });
        
        it('should correctly identify matched multi-tag queries 2', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true}] },
                { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:true}] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
            } catch (e) {
                fail("Unexpected exception: "+e);
            }
        });
        
        it('should correctly identify matched multi-tag queries 2', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true},{name:"source",value:"*",groupBy:true}] },
                { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:true},{name:"source",value:"*",groupBy:true}] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
            } catch (e) {
                fail("Unexpected exception: "+e);
            }
        });
        
        it('should correctly identify matched multi-tag queries 3', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true},{name:"source",value:"*",groupBy:false}] },
                { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:true}] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
            } catch (e) {
                fail("Unexpected exception: "+e);
            }
        });
        
        it('should correctly identify mis-matched multi-tag queries 1', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true}] },
                { id: "124", name: "metric2", tags: [] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
                fail("Expected an exception")
            } catch (e) {
                expect(e).toEqualData("Mismatched multi-tag queries: [host] vs []");
            }
        });
        
        it('should correctly identify mis-matched multi-tag queries 2', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true}] },
                { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:false}] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
                fail("Expected an exception")
            } catch (e) {
                expect(e).toEqualData("Mismatched multi-tag queries: [host] vs []");
            }
        });
        
        it('should correctly identify mis-matched multi-tag queries 3', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true}] },
                { id: "124", name: "metric2", tags: [{name:"source",value:"*",groupBy:true}] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
                fail("Expected an exception")
            } catch (e) {
                expect(e).toEqualData("Mismatched multi-tag queries: [host] vs [source]");
            }
        });
        
        it('should correctly identify mis-matched multi-tag queries 4', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true},{name:"source",value:"*",groupBy:true}] },
                { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:true},{name:"target",value:"*",groupBy:true}] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
                fail("Expected an exception")
            } catch (e) {
                expect(e).toEqualData("Mismatched multi-tag queries: [host,source] vs [host,target]");
            }
        });
        
        it('should correctly identify mis-matched multi-tag queries 5', function() {
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"host1",groupBy:true},{name:"host",value:"wildcard(fred*)",groupBy:true}] },
                            { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:true}] }];
            try {
                rendererInstance.findAndCheckMultiTagQueries(metrics);
                fail("Expected an exception")
            } catch (e) {
                expect(e).toEqualData("Mismatched multi-tag queries: [] vs [host]");
            }
        });

        it('should render with scatter with a single tag multi-value query', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true}], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } },
                { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:true}], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1{host=*}&m=sum:metric2{host=*}&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {host:"host1"}, dps:{
                        1234567811000: 11,
                        1234567812000: 21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric1", tags: {host:"host2"}, dps:{
                        1234567811000: 12,
                        1234567812000: 22,
                        1234567813000: 32,
                        1234567814000: 42,
                        1234567815000: 52
                    }
                },
                {
                    metric: "metric2", tags: {host:"host1"}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: 40,
                        1234567815000: 50
                    }
                },
                {
                    metric: "metric2", tags: {host:"host2"}, dps:{
                        1234567811000: 13,
                        1234567812000: 23,
                        1234567813000: 33,
                        1234567814000: 43,
                        1234567815000: 53
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("scatterDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [11, 10, null],
                [12, null, 13],
                [21, 20, null],
                [22, null, 23],
                [31, 30, null],
                [32, null, 33],
                [41, 40, null],
                [42, null, 43],
                [51, 50, null],
                [52, null, 53]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1{host=host1} (x) vs metric2{host=host1} (y)", "metric1{host=host2} (x) vs metric2{host=host2} (y)"],
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
                axes: {y:{
                    valueRange: [null, null]
                },x:{
                    valueRange: [null, null]
                }}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with a single tag multi-value query with mismatched values', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true}], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } },
                { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:true}], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1{host=*}&m=sum:metric2{host=*}&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {host:"host1"}, dps:{
                        1234567811000: 11,
                        1234567812000: 21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric1", tags: {host:"host2"}, dps:{
                        1234567811000: 12,
                        1234567812000: 22,
                        1234567813000: 32,
                        1234567814000: 42,
                        1234567815000: 52
                    }
                },
                {
                    metric: "metric1", tags: {host:"host3"}, dps:{
                        1234567811000: 14,
                        1234567812000: 24,
                        1234567813000: 34,
                        1234567814000: 44,
                        1234567815000: 54
                    }
                },
                {
                    metric: "metric2", tags: {host:"host1"}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: 40,
                        1234567815000: 50
                    }
                },
                {
                    metric: "metric2", tags: {host:"host2"}, dps:{
                        1234567811000: 13,
                        1234567812000: 23,
                        1234567813000: 33,
                        1234567814000: 43,
                        1234567815000: 53
                    }
                },
                {
                    metric: "metric2", tags: {host:"host4"}, dps:{
                        1234567811000: 15,
                        1234567812000: 25,
                        1234567813000: 35,
                        1234567814000: 45,
                        1234567815000: 55
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("scatterDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [11, 10, null],
                [12, null, 13],
                [21, 20, null],
                [22, null, 23],
                [31, 30, null],
                [32, null, 33],
                [41, 40, null],
                [42, null, 43],
                [51, 50, null],
                [52, null, 53]
            ]);
            expect(renderConfig).toEqualData({
                labels: ["x", "metric1{host=host1} (x) vs metric2{host=host1} (y)", "metric1{host=host2} (x) vs metric2{host=host2} (y)"],
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
                axes: {y:{
                    valueRange: [null, null]
                },x:{
                    valueRange: [null, null]
                }}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with scatter with two tag multi-value queries', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [{name:"host",value:"*",groupBy:true},{name:"type",value:"*",groupBy:true}], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } },
                { id: "124", name: "metric2", tags: [{name:"host",value:"*",groupBy:true},{name:"type",value:"*",groupBy:true}], graphOptions: { aggregator: "sum", axis: "x1y1", scatter: {} } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1{host=*,type=*}&m=sum:metric2{host=*,type=*}&no_annotations=true&ms=true&show_query=true').respond([
                {
                    metric: "metric1", tags: {host:"host1", type:"type1"}, dps:{
                        1234567811000: 11,
                        1234567812000: 21,
                        1234567813000: 31,
                        1234567814000: 41,
                        1234567815000: 51
                    }
                },
                {
                    metric: "metric1", tags: {host:"host2", type:"type1"}, dps:{
                        1234567811000: 12,
                        1234567812000: 22,
                        1234567813000: 32,
                        1234567814000: 42,
                        1234567815000: 52
                    }
                },
                {
                    metric: "metric1", tags: {host:"host1", type:"type2"}, dps:{
                        1234567811000: 14,
                        1234567812000: 24,
                        1234567813000: 34,
                        1234567814000: 44,
                        1234567815000: 54
                    }
                },
                {
                    metric: "metric1", tags: {host:"host2", type:"type2"}, dps:{
                        1234567811000: 15,
                        1234567812000: 25,
                        1234567813000: 35,
                        1234567814000: 45,
                        1234567815000: 55
                    }
                },
                {
                    metric: "metric2", tags: {host:"host1", type: "type1"}, dps:{
                        1234567811000: 10,
                        1234567812000: 20,
                        1234567813000: 30,
                        1234567814000: 40,
                        1234567815000: 50
                    }
                },
                {
                    metric: "metric2", tags: {host:"host2", type: "type1"}, dps:{
                        1234567811000: 13,
                        1234567812000: 23,
                        1234567813000: 33,
                        1234567814000: 43,
                        1234567815000: 53
                    }
                },
                {
                    metric: "metric2", tags: {host:"host1", type: "type2"}, dps:{
                        1234567811000: 16,
                        1234567812000: 26,
                        1234567813000: 36,
                        1234567814000: 46,
                        1234567815000: 56
                    }
                },
                {
                    metric: "metric2", tags: {host:"host2", type: "type2"}, dps:{
                        1234567811000: 17,
                        1234567812000: 27,
                        1234567813000: 37,
                        1234567814000: 47,
                        1234567815000: 57
                    }
                }
            ]);

            rendererInstance.render(renderContext, config, global, graph, metrics);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("scatterDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData([
                [11, 10, null, null, null],
                [12, null, 13, null, null],
                [14, null, null, 16, null],
                [15, null, null, null, 17],
                [21, 20, null, null, null],
                [22, null, 23, null, null],
                [24, null, null, 26, null],
                [25, null, null, null, 27],
                [31, 30, null, null, null],
                [32, null, 33, null, null],
                [34, null, null, 36, null],
                [35, null, null, null, 37],
                [41, 40, null, null, null],
                [42, null, 43, null, null],
                [44, null, null, 46, null],
                [45, null, null, null, 47],
                [51, 50, null, null, null],
                [52, null, 53, null, null],
                [54, null, null, 56, null],
                [55, null, null, null, 57]
            ]);
            expect(renderConfig).toEqualData({
                labels: [
                    "x", 
                    "metric1{host=host1,type=type1} (x) vs metric2{host=host1,type=type1} (y)", 
                    "metric1{host=host2,type=type1} (x) vs metric2{host=host2,type=type1} (y)", 
                    "metric1{host=host1,type=type2} (x) vs metric2{host=host1,type=type2} (y)", 
                    "metric1{host=host2,type=type2} (x) vs metric2{host=host2,type=type2} (y)"
                ],
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
                axes: {y:{
                    valueRange: [null, null]
                },x:{
                    valueRange: [null, null]
                }}
            });
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should show a render error with scatter when TSDB response contains more than 2 time series', function() {
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

            expect(renderContext.renderErrors).toEqualData({abc: "TSDB response doesn't contain exactly 2 timeseries, was 3"});
            expect(renderContext.renderMessages).toEqualData({abc:""});
            expect(renderContext.renderWarnings).toEqualData({});
            
            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
        });

        it('should show a render error with scatter when TSDB response contains less than 2 time series', function() {
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

            expect(renderContext.renderErrors).toEqualData({abc: "TSDB response doesn't contain exactly 2 timeseries, was 1"});
            expect(renderContext.renderMessages).toEqualData({abc:""});
            expect(renderContext.renderWarnings).toEqualData({});
            
            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
        });
    });
    
    // todo: http error
});

