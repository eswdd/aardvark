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

    describe('HeatmapRenderer', function() {
//        var rootScope, $httpBackend, scope;
//        var configUpdateFunc;
        var heatmapMock;
        var globalHeatmap = null;
//        var rendererInstance;

        var heatmap = function() {
            if (globalHeatmap != null) {
                return globalHeatmap;
            }

            var ret = {};

            ret._dps = null;
            ret._scale = null;
            ret._cellSize = null;
            ret._width = null;
            ret._height = null;
            ret._colourScheme = null;

            ret.tearDown = function() {
                globalHeatmap = null;
            }

            ret.dps = function(_) {
                if (!arguments.length) {
                    return ret._dps;
                }
                ret._dps = _;
                return ret;
            };

            ret.scale = function(_) {
                if (!arguments.length) {
                    return ret._scale;
                }
                ret._scale = _;
                return ret;
            };

            ret.cellSize = function(_) {
                if (!arguments.length) {
                    return ret._cellSize;
                }
                ret._cellSize = _;
                return ret;
            }

            ret.width = function(_) {
                if (!arguments.length) {
                    return ret._width;
                }
                ret._width = _;
                return ret;
            }

            ret.height = function(_) {
                if (!arguments.length) {
                    return ret._height;
                }
                ret._height = _;
                return ret;
            }

            ret.colourScheme = function(_) {
                if (!arguments.length) {
                    return ret._colourScheme;
                }
                ret._colourScheme = _;
                return ret;
            }

            ret.weekDayRender = function(divSelector, fromYear, toYear, isFilteredOutFn) {
                ret.weekDayRenderParams = [divSelector, fromYear, toYear, isFilteredOutFn];
            }

            ret.dayHourRender = function(divSelector, fromMonth, toMonth, isFilteredOutFn) {
                ret.dayHourRenderParams = [divSelector, fromMonth, toMonth, isFilteredOutFn];
            }

            globalHeatmap = ret;

            return ret;
        }

        var graphServices, $httpBackend;
        var renderer, rendererInstance;
        var renderContext, config;
        var renderDiv, graphPanel;

        beforeEach(inject(function (HeatmapRenderer, GraphServices, _$httpBackend_) {
            // hmm
            renderer = HeatmapRenderer;
            graphServices = GraphServices;
            $httpBackend = _$httpBackend_;

            renderContext = {};
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
            renderContext.renderMessages = {};
            renderContext.graphRendered = function() {};
            renderContext.addGraphRenderListener = function() {};

            config = {
                tsdbBaseReadUrl: "http://tsdb:4242"
            };

            renderDiv = document.createElement("div");
            renderDiv.setAttribute("id","horizonDiv_abc");
            document.body.appendChild(renderDiv);
            graphPanel = document.createElement("div");
            graphPanel.setAttribute("id","graph-content-panel");
            document.body.appendChild(graphPanel);

            renderer.heatmap = heatmap;
            heatmapMock = heatmap();

            rendererInstance = renderer.create();
            // defaults
            expect(rendererInstance.supports_tsdb_export).toEqualData(true);
            expect(rendererInstance.tsdb_export_link).toEqualData("");
            // memory from a previous query
            rendererInstance.tsdb_export_link = "http://tsdb:4242/oldquery";
        }));
/*
        beforeEach(inject(function ($rootScope, _$httpBackend_, $controller) {
            // hmm
            rootScope = $rootScope;
            $httpBackend = _$httpBackend_;
            scope = $rootScope.$new();

            renderContext.renderers = {};

            rootScope.model = {
                graphs: [],
                metrics: []
            }

            rootScope.config = {tsdbBaseReadUrl: "http://tsdb:4242"};

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


            rendererInstance = renderContext.renderers.heatmap.create();
            // defaults
            expect(rendererInstance.supports_tsdb_export).toEqualData(true);
            expect(rendererInstance.tsdb_export_link).toEqualData("");
            // memory from a previous query
            rendererInstance.tsdb_export_link = "http://tsdb:4242/oldquery";

            scope.heatmap = heatmap;
            heatmapMock = heatmap();
        }));*/
        
        afterEach(function() {
            heatmapMock.tearDown();
        });

        it('should report an error when trying to render with heatmap and no start time', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", type: "metric", graphOptions: {} } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(rendererInstance.tsdb_export_link).toEqualData("");
            expect(renderContext.renderErrors).toEqualData({abc:"No start date specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with heatmap and no queries', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};

            var global = { relativePeriod: "2h", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [  ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(rendererInstance.tsdb_export_link).toEqualData("");
            expect(renderContext.renderErrors).toEqualData({abc:"No queries specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with heatmap and too many queries', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};

            var global = { relativePeriod: "2h", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", type: "metric", graphOptions: {} }, { id: "456", graphOptions: {} } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(rendererInstance.tsdb_export_link).toEqualData("");
            expect(renderContext.renderErrors).toEqualData({abc:"Require exactly 1 query, currently have 2"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with day/hour style when auto requested with a short time period', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { fromDate: "2016/09/02", fromTime: "00:00:00", toDate: "2016/09/12", toTime: "00:00:00", absoluteTimeSpecification: true };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "auto" } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2016/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1h-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1472783200000, 10],
                    [1472786800000, 20],
                    [1472790400000, 30],
                    [1473136000000, 40],
                    [1473568000000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2016/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1h-avg:metric1&o=axis+x1y1&yrange=[:]&key=top+left");
            expect(heatmapMock.cellSize()).toEqualData(5);
            
            expect(heatmapMock.dayHourRenderParams != null).toEqualData(true);
            expect(heatmapMock.weekDayRenderParams != null).toEqualData(false);
            
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with week/day style when auto requested with a short time period', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { fromDate: "2014/09/02", fromTime: "00:00:00", toDate: "2016/09/12", toTime: "00:00:00", absoluteTimeSpecification: true };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "auto" } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2014/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1d-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1472783200000, 10],
                    [1472786800000, 20],
                    [1472790400000, 30],
                    [1473136000000, 40],
                    [1473568000000, 50]
                ]}
            ]);
            $httpBackend.flush();
            
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2014/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1d-avg:metric1&o=axis+x1y1&yrange=[:]&key=top+left");
            expect(heatmapMock.cellSize()).toEqualData(5);
            
            expect(heatmapMock.dayHourRenderParams != null).toEqualData(false);
            expect(heatmapMock.weekDayRenderParams != null).toEqualData(true);
            
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render when day/hour style requested', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { fromDate: "2016/09/02", fromTime: "00:00:00", toDate: "2016/09/12", toTime: "00:00:00", absoluteTimeSpecification: true };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "day_hour" } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2016/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1h-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1472783200000, 10],
                    [1472786800000, 20],
                    [1472790400000, 30],
                    [1473136000000, 40],
                    [1473568000000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2016/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1h-avg:metric1&o=axis+x1y1&yrange=[:]&key=top+left");
            expect(heatmapMock.cellSize()).toEqualData(5);
            expect(heatmapMock.dps()).toEqualData([
                [1472783200000, 10],
                [1472786800000, 20],
                [1472790400000, 30],
                [1473136000000, 40],
                [1473568000000, 50]
            ]);
            expect(heatmapMock.dayHourRenderParams[0]).toEqualData("#heatmapDiv_abc");
            expect(heatmapMock.dayHourRenderParams[1]).toEqualData(24200);
            expect(heatmapMock.dayHourRenderParams[2]).toEqualData(24200);
            
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render when day/hour style requested with negative squashing', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { fromDate: "2016/09/02", fromTime: "00:00:00", toDate: "2016/09/12", toTime: "00:00:00", absoluteTimeSpecification: true };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "day_hour", excludeNegative: true } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2016/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1h-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1472783200000, 10],
                    [1472786800000, -20],
                    [1472790400000, 30],
                    [1473136000000, -40],
                    [1473568000000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2016/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1h-avg:metric1&o=axis+x1y1&yrange=[0:]&key=top+left");
            expect(heatmapMock.cellSize()).toEqualData(5);
            expect(heatmapMock.dps()).toEqualData([
                [1472783200000, 10],
                [1472786800000, 0],
                [1472790400000, 30],
                [1473136000000, 0],
                [1473568000000, 50]
            ]);
            expect(heatmapMock.dayHourRenderParams[0]).toEqualData("#heatmapDiv_abc");
            expect(heatmapMock.dayHourRenderParams[1]).toEqualData(24200);
            expect(heatmapMock.dayHourRenderParams[2]).toEqualData(24200);
            
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render when week/day style requested', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { fromDate: "2016/10/10", fromTime: "10:10:10", toDate: "2016/10/24", toTime: "10:10:10", absoluteTimeSpecification: true };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "week_day" } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2016/10/10 10:10:10&end=2016/10/24 10:10:10&m=sum:1d-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1234483200000, 10],
                    [1234569600000, 20],
                    [1234656000000, 30],
                    [1235001600000, 40],
                    [1235433600000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2016/10/10 10:10:10&end=2016/10/24 10:10:10&m=sum:1d-avg:metric1&o=axis+x1y1&yrange=[:]&key=top+left");
            expect(heatmapMock.cellSize()).toEqualData(5);
            expect(heatmapMock.dps()).toEqualData([
                [1234483200000, 10],
                [1234569600000, 20],
                [1234656000000, 30],
                [1235001600000, 40],
                [1235433600000, 50]
            ]);
            expect(heatmapMock.weekDayRenderParams[0]).toEqualData("#heatmapDiv_abc");
            expect(heatmapMock.weekDayRenderParams[1]).toEqualData(2016);
            expect(heatmapMock.weekDayRenderParams[2]).toEqualData(2016);

            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render when week/day style requested with negative squashing', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { fromDate: "2016/10/10", fromTime: "10:10:10", toDate: "2016/10/24", toTime: "10:10:10", absoluteTimeSpecification: true };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "week_day", excludeNegative: true } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2016/10/10 10:10:10&end=2016/10/24 10:10:10&m=sum:1d-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1234483200000, -10],
                    [1234569600000, 20],
                    [1234656000000, -30],
                    [1235001600000, 40],
                    [1235433600000, -50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2016/10/10 10:10:10&end=2016/10/24 10:10:10&m=sum:1d-avg:metric1&o=axis+x1y1&yrange=[0:]&key=top+left");
            expect(heatmapMock.cellSize()).toEqualData(5);
            expect(heatmapMock.dps()).toEqualData([
                [1234483200000, 0],
                [1234569600000, 20],
                [1234656000000, 0],
                [1235001600000, 40],
                [1235433600000, 0]
            ]);
            expect(heatmapMock.weekDayRenderParams[0]).toEqualData("#heatmapDiv_abc");
            expect(heatmapMock.weekDayRenderParams[1]).toEqualData(2016);
            expect(heatmapMock.weekDayRenderParams[2]).toEqualData(2016);

            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should use an appropriate filter when requested with only a lower bound', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { relativePeriod: "2w", autoReload: false };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "week_day", filterLowerBound: "30" } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2w-ago&ignore=1&m=sum:1d-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1234483200000, 10],
                    [1234569600000, 20],
                    [1234656000000, 30],
                    [1235001600000, 40],
                    [1235433600000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2w-ago&m=sum:1d-avg:metric1&o=axis+x1y1&yrange=[30:]&key=top+left");
            var filterFn = heatmapMock.weekDayRenderParams[3];
            expect(filterFn(10)).toEqualData(true);
            expect(filterFn(30)).toEqualData(false);
            expect(filterFn(50)).toEqualData(false);
        });

        it('should use an appropriate filter when requested with only an upper bound', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { relativePeriod: "2w", autoReload: false };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "week_day", filterUpperBound: "30" } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2w-ago&ignore=1&m=sum:1d-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1234483200000, 10],
                    [1234569600000, 20],
                    [1234656000000, 30],
                    [1235001600000, 40],
                    [1235433600000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2w-ago&m=sum:1d-avg:metric1&o=axis+x1y1&yrange=[:30]&key=top+left");
            var filterFn = heatmapMock.weekDayRenderParams[3];
            expect(filterFn(10)).toEqualData(false);
            expect(filterFn(30)).toEqualData(false);
            expect(filterFn(50)).toEqualData(true);
        });

        it('should use an appropriate filter when requested with both a lower and upper bound', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { relativePeriod: "2w", autoReload: false };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "day_hour", filterLowerBound: "30", filterUpperBound: "30" } };
            var metrics = [ { id: "123", type: "metric", name: "metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2w-ago&ignore=1&m=sum:1h-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1234483200000, 10],
                    [1234569600000, 20],
                    [1234656000000, 30],
                    [1235001600000, 40],
                    [1235433600000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2w-ago&m=sum:1h-avg:metric1&o=axis+x1y1&yrange=[30:30]&key=top+left");
            var filterFn = heatmapMock.dayHourRenderParams[3];
            expect(filterFn(10)).toEqualData(true);
            expect(filterFn(30)).toEqualData(false);
            expect(filterFn(50)).toEqualData(true);
        });
    });
});

//            expect(renderDiv.innerHTML).toEqualData("z");
// svg
// -> g
//   -> text
//   -> rect.cell (1 per hour)
//     -> text
/*
 var svg = renderDiv.childNodes[0];
 expect(svg.nodeName).toEqualData("svg");
 expect(svg.attributes.width.value).toEqualData("175");
 expect(svg.attributes.height.value).toEqualData("125");
 expect(svg.attributes.class.value).toEqualData("RdYlGn");
 var g = svg.childNodes[0];
 expect(g.nodeName).toEqualData("g");
 expect(g.attributes.transform != null).toEqualData(true);
 var text = g.childNodes[0];
 expect(text.nodeName).toEqualData("text");
 expect(text.attributes.transform.value).toEqualData("translate(-6,60)rotate(-90)");
 expect(text.textContent).toEqualData("9/2016");
 expect(g.childNodes.length).toEqualData(721); // 30d + 1
 for (var i=1; i< g.childNodes.length; i++) {
 var rect = g.childNodes[i];
 expect(rect.nodeName).toEqualData("rect");
 var rect_text = rect.childNodes[0];
 expect(rect_text.nodeName).toEqualData("title");
 }
 for (var d=1; d<=30; d++) {
 for (var h=0; h<24; h++) {
 var i = ((d-1)*24) + h + 1;
 // <rect y=\"85\" x=\"150\" height=\"5\" width=\"5\" class=\"cell\"><title>2016-08-31 @ 17</title></rect>
 var rect = g.childNodes[i];
 if (rect == null) {
 fail("off the end, went looking for "+i);
 break;
 }
 else {
 expect(rect.attributes.height.value).toEqualData("5");
 expect(rect.attributes.width.value).toEqualData("5");
 var rect_text = rect.childNodes[0];
 var d_string = d<10 ? "0"+d : d;
 var h_string = h<10 ? "0"+h : h;
 var expectedValue = null;
 var expectedClass = null;
 if (d==2 && h==3) {
 expectedValue = "10";
 expectedClass = "q0-11";
 }
 else if (d==2 && h == 4) {
 expectedValue = "20";
 expectedClass = "q2-11";
 }
 else if (d==2 && h == 5) {
 expectedValue = "30";
 expectedClass = "q5-11";
 }
 else if (d==6 && h == 5) {
 expectedValue = "40";
 expectedClass = "q8-11";
 }
 else if (d==11 && h == 5) {
 expectedValue = "50";
 expectedClass = "q10-11";
 }
 if (expectedValue != null) {
 expect(rect.attributes.class.value).toEqualData("cell "+expectedClass);
 expect(rect_text.textContent).toEqualData("2016-09-"+d_string+" @ "+h_string+": "+expectedValue);
 }
 else {
 expect(rect.attributes.class.value).toEqualData("cell");
 expect(rect_text.textContent).toEqualData("2016-09-"+d_string+" @ "+h_string);
 }
 }
 }
 }*/

