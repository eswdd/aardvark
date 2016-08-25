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

    describe('GraphCtrl.dygraphRenderer', function() {
        var rootScope, $httpBackend, scope;
        var globals, graphs, metricss;
        var configUpdateFunc;
        var renderDivId, renderGraphId, renderData, renderConfig, renderAnnotations;
        var dygraphHeight;

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
                tsdbPort: 4242, 
                tsdbProtocol: "http"
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
                return {
                    height: dygraphHeight,
                    canvas_: {
                        style: {}
                    }
                };
            }

            dygraphHeight = 100;
            
            scope.dygraph_setAnnotations = function(g, anns) {
                renderAnnotations = anns;
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

        it('should report an error when trying to render with dygraph and count filtering of < 1 item', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { countFilter: { count: 0, measure: "max", end: "top" }}};
            var metrics = [{ id: "123", name: "metric1", tags: [{name: "host", value: "host1"}], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            scope.renderers.dygraph(global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(scope.renderErrors).toEqualData({abc:"Minimum count for filtering is 1"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should report an error when the http response is empty', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [{name: "host", value: "host1"}], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1{host=host1}&no_annotations=true&ms=true&arrays=true&show_query=true').respond([]);

            scope.renderers.dygraph(global, graph, metrics);

            $httpBackend.flush();

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(scope.renderErrors).toEqualData({abc:"Empty response from TSDB"});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with a relative start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with a relative start time via https when requested', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "https"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('https://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with stacked lines', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { stackedLines: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph and correctly indicate gaps in data', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph and correctly indicate gaps in data - issue #87', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "plantime", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:plantime&no_annotations=true&ms=true&arrays=true&show_query=true').respond([
                {
                    "metric":"plantime",
                    "tags":{"identifier":"service","application":"app","host":"host01","team":"T1","plan":"plan1","plan_state":"Successful"},
                    "aggregateTags":[],
                    "dps":[
                        [1468335395347,57.57211685180664],
                        [1468338875360,51.52141571044922],
                        [1468403975370,32.534732818603516],
                        [1468405955887,52.70555114746094],
                        [1468412435323,66.93949890136719],
                        [1468416456323,119.05480194091797],
                        [1468423655463,81.28475189208984],
                        [1468428575997,77.4905014038086],
                        [1468433255350,90.22109985351562],
                        [1468448316183,91.98995208740234],
                        [1468453895633,59.74071502685547],
                        [1468502675817,39.572898864746094],
                        [1468505075407,40.61399841308594],
                        [1468507535323,42.13880157470703],
                        [1468510115287,47.14339828491211],
                        [1468526135580,57.92693328857422],
                        [1468534895373,49.598899841308594],
                        [1468538135243,61.92961502075195],
                        [1468541855960,48.84546661376953],
                        [1468572995730,41.8890495300293],
                        [1468587215340,43.88251495361328],
                        [1468589855823,34.20836639404297]
                    ]
                },
                {
                    "metric":"plantime",
                    "tags":{"identifier":"service","application":"app","host":"host01","team":"T1","plan":"plan1​","plan_state":"Failed"},
                    "aggregateTags":[],
                    "dps":[
                        [1468341995407,58.83286666870117],
                        [1468345535330,62.51340103149414],
                        [1468362035540,38.79708480834961],
                        [1468365335783,49.48341751098633],
                        [1468368335610,65.78500366210938],
                        [1468393235533,39.09343338012695],
                        [1468397315487,34.668582916259766],
                        [1468399415480,75.0943832397461],
                        [1468483715533,61.68476486206055],
                        [1468487435610,45.46383285522461],
                        [1468490197913,40.18468475341797],
                        [1468492655373,48.184051513671875],
                        [1468512962767,219.3782196044922],
                        [1468575515643,43.14083480834961]
                    ]
                }
            ]);

            scope.renderers.dygraph(global, graph, metrics);


            $httpBackend.flush();

            expect(renderData.length).toEqualData(36);
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with interpolation', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { interpolateGaps: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with logarithmic y axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { ylog: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with negative squashing', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        var dygraphMeanAdjustedTest = function(graph) {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
        }
        
        it('should render with dygraph with mean adjustment', function() {
            dygraphMeanAdjustedTest({id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: false, meanAdjusted: true }});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with mean adjustment & negative squashing', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: true, meanAdjusted: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        var dygraphRatioTest = function(graph) {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 40]
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
                [new Date(1234567811000), 100/3, -200/3],
                [new Date(1234567812000), -50, 50],
                [new Date(1234567813000), 50, -50],
                [new Date(1234567814000), -50, 50],
                [new Date(1234567815000), 80, 20]
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
        };

        it('should render with dygraph with ratio graph', function() { 
            dygraphRatioTest({id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: false, ratioGraph: true }});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should render with dygraph with ratio graph & negative squashing', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: true, ratioGraph: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 40]
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
                [new Date(1234567811000), 100, 0],
                [new Date(1234567812000), 0, 100],
                [new Date(1234567813000), 100, 0],
                [new Date(1234567814000), 0, 100],
                [new Date(1234567815000), 80, 20]
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        // identical to ratio only - should ignore mean adjustment as not compatible
        it('should render with dygraph with ratio graph & mean adjustment', function() {
            dygraphRatioTest({id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { meanAdjusted: true, ratioGraph: true }});
            expect(scope.renderWarnings).toEqualData({abc:"Ignored mean adjustment as not compatible with ratio graphs"});
        });
        
        it('should render with dygraph with auto scaling', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with dygraph with auto scaling & negative squashing', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true, squashNegative: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        // identical to mean adjusted only - should ignore auto scaling as not compatible
        it('should render with dygraph with auto scaling & mean adjustment', function() {
            dygraphMeanAdjustedTest({id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true, meanAdjusted: true }});
            expect(scope.renderWarnings).toEqualData({abc:"Ignored auto scaling as not compatible with mean adjustment"});
        });

        // identical to ratio only - should ignore auto scaling as not compatible
        it('should render with dygraph with auto scaling & ratio graph', function() {
            dygraphRatioTest({id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true, ratioGraph: true }});
            expect(scope.renderWarnings).toEqualData({abc:"Ignored auto scaling as not compatible with ratio graphs"});
        });

        // identical to ratio only - should ignore auto scaling as not compatible
        it('should render with dygraph with auto scaling & ratio graph & mean adjustment', function() {
            dygraphRatioTest({id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true, ratioGraph: true, meanAdjusted: true }});
            expect(scope.renderWarnings).toEqualData({abc:"Ignored mean adjustment and auto scaling as not compatible with ratio graphs"});
        });
        
        it('should render with dygraph with auto scaling and scale same metrics same amount', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [{name: "host", value: "host1"}], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "124", name: "metric1", tags: [{name: "host", value: "host2"}], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                            { id: "125", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1{host=host1}&m=sum:metric1{host=host2}&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {host: "host1"}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with dygraph with auto scaling of absolute values', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with dygraph with auto scaling taking account of negative squashing', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true, squashNegative: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        var testFiltering = function(dygraphOptions, metricDps, expectedMetrics, expectedWarnings, expectedErrors) {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: dygraphOptions };
            var metrics = [
                { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "125", name: "metric3", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "126", name: "metric4", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }
            ];
        
            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&m=sum:metric3&m=sum:metric4&no_annotations=true&ms=true&arrays=true&show_query=true').respond(
            [
                {
                    metric: "metric1", tags: {}, dps:[
                    [1234567811000, metricDps.metric1[0]],
                    [1234567812000, metricDps.metric1[1]],
                    [1234567813000, metricDps.metric1[2]]
                ]
                },{
                metric: "metric2", tags: {}, dps:[
                    [1234567811000, metricDps.metric2[0]],
                    [1234567812000, metricDps.metric2[1]],
                    [1234567813000, metricDps.metric2[2]]
                ]
                },{
                    metric: "metric3", tags: {}, dps:[
                        [1234567811000, metricDps.metric3[0]],
                        [1234567812000, metricDps.metric3[1]],
                        [1234567813000, metricDps.metric3[2]]
                    ]
                },{
                    metric: "metric4", tags: {}, dps:[
                        [1234567811000, metricDps.metric4[0]],
                        [1234567812000, metricDps.metric4[1]],
                        [1234567813000, metricDps.metric4[2]]
                    ]
                }
            ]);

            scope.renderers.dygraph(global, graph, metrics);
    
            $httpBackend.flush();
    
            if (!expectedErrors) {
                expect(renderDivId).toEqualData("dygraphDiv_abc");
                expect(renderGraphId).toEqualData("abc");
            
                var expectedData = [
                    [new Date(1234567811000)],
                    [new Date(1234567812000)],
                    [new Date(1234567813000)]
                ];
                var expectedLabels = ["x"];
                for (var i=0; i<expectedMetrics.length; i++) {
                    var m = expectedMetrics[i];
                    expectedLabels.push(m);
                    expectedData[0].push(metricDps[m][0]);
                    expectedData[1].push(metricDps[m][1]);
                    expectedData[2].push(metricDps[m][2]);
                }
    
                expect(renderConfig.labels).toEqualData(expectedLabels);
                expect(renderData).toEqualData(expectedData);
            }
            
            expect(scope.renderErrors).toEqualData(expectedErrors || {});
            expect(scope.renderWarnings).toEqualData(expectedWarnings || {});
        }

        it('should render with dygraph with filtering count set to empty string', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { countFilter: {count: "", measure: "min", end: "top"} } };
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with dygraph with top n filtering based on min', function() {
            testFiltering(
                { countFilter: {count: 2, measure: "min", end: "top"}},
                {
                    metric1: [10,20,30],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,60]
                },
                [ "metric3", "metric4" ]
            );
        });
        
        it('should render with dygraph with top n filtering based on max', function() {
            testFiltering(
                { countFilter: {count: 2, measure: "max", end: "top"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,60]
                },
                [ "metric1", "metric4" ]
            );
        });
        it('should render with dygraph with top n filtering based on mean', function() {
            testFiltering(
                { countFilter: {count: 2, measure: "mean", end: "top"}},
                {
                    metric1: [10,20,70],
                    metric2: [10,30,70],
                    metric3: [10,40,70],
                    metric4: [10,20,70]
                },
                [ "metric2", "metric3" ]
            );
        });
        it('should render with dygraph with bottom n filtering based on min', function() {
            testFiltering(
                { countFilter: {count: 2, measure: "min", end: "bottom"}},
                {
                    metric1: [10,20,30],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,60]
                },
                [ "metric1", "metric2" ]
            );
        });
        it('should render with dygraph with bottom n filtering based on mean', function() {
            testFiltering(
                { countFilter: {count: 2, measure: "mean", end: "bottom"}},
                {
                    metric1: [10,20,70],
                    metric2: [10,30,70],
                    metric3: [10,40,70],
                    metric4: [10,20,70]
                },
                [ "metric1", "metric4" ]
            );
        });
        it('should render with dygraph with bottom n filtering based on max', function() {
            testFiltering(
                { countFilter: {count: 2, measure: "max", end: "bottom"}},
                {
                    metric1: [10,20,700],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,60]
                },
                [ "metric2", "metric3" ]
            );
        });
        it('should render with dygraph with top n filtering where nth values are equal', function() {
            testFiltering(
                { countFilter: {count: 2, measure: "min", end: "top"}},
                {
                    metric1: [30,50,30],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,60]
                },
                [ "metric1", "metric3", "metric4" ]
            );
        });
        it('should render with dygraph with bottom n filtering where nth values are equal', function() {
            testFiltering(
                { countFilter: {count: 2, measure: "max", end: "bottom"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric2", "metric3", "metric4" ]
            );
        });

        it('should render with dygraph with bounded filter based on min(value) >= v', function() {
            testFiltering(
                { valueFilter: {lowerBound: 25, measure: "min", upperBound: ""}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric3", "metric4" ]
            );
        });
        it('should render with dygraph with bounded filter based on mean(value) >= v', function() {
            testFiltering(
                { valueFilter: {lowerBound: 31, measure: "mean", upperBound: ""}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1", "metric3", "metric4" ]
            );
        });
        it('should render with dygraph with bounded filter based on max(value) >= v', function() {
            testFiltering(
                { valueFilter: {lowerBound: 60, measure: "max", upperBound: ""}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1" ]
            );
        });
        it('should render with dygraph with bounded filter based on any(value) >= v', function() {
            testFiltering(
                { valueFilter: {lowerBound: 42, measure: "any", upperBound: ""}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1", "metric3", "metric4" ]
            );
        });
        it('should render with dygraph with bounded filter based on min(value) <= v', function() {
            testFiltering(
                { valueFilter: {lowerBound: "", measure: "min", upperBound: 25}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1", "metric2" ]
            );
        });
        it('should render with dygraph with bounded filter based on mean(value) <= v', function() {
            testFiltering(
                { valueFilter: {lowerBound: "", measure: "mean", upperBound: "42"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1", "metric2", "metric3" ]
            );
        });
        it('should render with dygraph with bounded filter based on max(value) <= v', function() {
            testFiltering(
                { valueFilter: {lowerBound: "", measure: "max", upperBound: "52"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric2", "metric3", "metric4" ]
            );
        });
        it('should render with dygraph with bounded filter based on any(value) <= v', function() {
            testFiltering(
                { valueFilter: {lowerBound: "", measure: "any", upperBound: 25}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1", "metric2" ]
            );
        });
        
        it('should render with dygraph with bounded filter based on min(value) <= v <= min(value)', function() {
            testFiltering(
                { valueFilter: {lowerBound: "18", measure: "min", upperBound: "22"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric2" ]
            );
        });
        it('should render with dygraph with bounded filter based on mean(value) <= v <= mean(value)', function() {
            testFiltering(
                { valueFilter: {lowerBound: "30", measure: "mean", upperBound: "35"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1", "metric2" ]
            );
        });
        it('should render with dygraph with bounded filter based on max(value) <= v <= max(value)', function() {
            testFiltering(
                { valueFilter: {lowerBound: "69", measure: "max", upperBound: "72"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1" ]
            );
        });
        it('should render with dygraph with bounded filter based on any(value) <= v <= any(value)', function() {
            testFiltering(
                { valueFilter: {lowerBound: "29", measure: "any", upperBound: "32"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric2", "metric3" ]
            );
        });

        it('should show an error when value filtering removes all time series', function() {
            testFiltering(
                { valueFilter: {lowerBound: "80", measure: "any", upperBound: "90"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [],
                {},
                {abc: "Value filtering excluded all time series"}
            );
        });
        it('should show an error when lower bound > upper bound', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { valueFilter: { lowerBound: 100, measure: "max", upperBound: "80" }}};
            var metrics = [{ id: "123", name: "metric1", tags: [{name: "host", value: "host1"}], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            scope.renderers.dygraph(global, graph, metrics);

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(scope.renderErrors).toEqualData({abc:"Upper bound on value filter is less than lower bound"});
            expect(scope.renderWarnings).toEqualData({});
        });
        it('should show a warning when lower bound == upper bound', function() {
            testFiltering(
                { valueFilter: {lowerBound: "20", measure: "any", upperBound: "20"}},
                {
                    metric1: [10,20,70],
                    metric2: [20,30,40],
                    metric3: [30,40,50],
                    metric4: [40,50,50]
                },
                [ "metric1", "metric2" ],
                {abc: "Lower bound on value filter is same as upper bound"}
            );
        });

        it('should fail when baselining is enabled and there was an empty response for the main query', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([]);
            $httpBackend.expectGET('http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234481411000, 10],
                [1234481412000, 20],
                [1234481413000, 30],
                [1234481414000, 40],
                [1234481415000, 50]
            ]}]);

            var datum = moment.utc("2016/01/22 14:10:10", "YYYY/MM/DD HH:mm:ss");
            
            scope.renderers.dygraph(global, graph, metrics, datum);

            $httpBackend.flush();

            expect(renderDivId).toEqualData(null);
            expect(renderGraphId).toEqualData(null);
            expect(renderData).toEqualData(null);
            expect(renderConfig).toEqualData(null);
            expect(scope.renderErrors).toEqualData({abc:"Empty response from TSDB"});
            expect(scope.renderWarnings).toEqualData({});
        });
        
        it('should warn when baselining is enabled and there was an empty response for the baseline query', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            $httpBackend.expectGET('http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]}]);
            $httpBackend.expectGET('http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true').respond([]);

            var datum = moment.utc("2016/01/22 14:10:10", "YYYY/MM/DD HH:mm:ss");
            
            scope.renderers.dygraph(global, graph, metrics, datum);

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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({abc:"Empty response from TSDB for baseline query"});
        });

        var baselineTest = function(url1, data1, url2, data2, global, graph, metrics, expectedRenderData, labels) {
            if (url1 == null) {
                url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true';
            }
            if (url2 == null) {
                url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&no_annotations=true&ms=true&arrays=true&show_query=true';
            }
            if (labels == null) {
                labels = ["x", "metric1", "metric1[BL]"];
            }

            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var datum = moment.utc("2016/01/22 14:10:10", "YYYY/MM/DD HH:mm:ss");

            if (graph == null) {
                graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            }
            if (metrics == null) {
                metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];
            }

            $httpBackend.expectGET(url1).respond(data1);
            $httpBackend.expectGET(url2).respond(data2);

            scope.renderers.dygraph(global, graph, metrics, datum);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData(expectedRenderData);
            expect(renderConfig).toEqualData({
                labels: labels,
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        }
        
        it('should render baseline lines where we had no corresponding main query lines', function() {
            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';

            var data1 = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 50]
            ]}];
            var data2 = [{metric: "metric2", tags: {}, dps:[
                [1234481411000, -20],
                [1234481412000, 30],
                [1234481413000, -30],
                [1234481414000, 50],
                [1234481415000, 20]
            ]}];

            var renderData = [
                [new Date(1234567811000), 10, -20],
                [new Date(1234567812000), -20, 30],
                [new Date(1234567813000), 30, -30],
                [new Date(1234567814000), -40, 50],
                [new Date(1234567815000), 50, 20]
            ];

            baselineTest(url1, data1, url2, data2, global, null, metrics, renderData, ["x", "metric1", "metric2[BL]"]);
        });
        
        it('should render with dygraph when baselining is enabled', function() {
            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };

            var data1 = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]}];
            var data2 = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 10],
                [1234481412000, 20],
                [1234481413000, 30],
                [1234481414000, 40],
                [1234481415000, 50]
            ]}];
            
            var renderData = [
                [new Date(1234567811000), 10, 10],
                [new Date(1234567812000), 20, 20],
                [new Date(1234567813000), 30, 30],
                [new Date(1234567814000), 40, 40],
                [new Date(1234567815000), 50, 50]
            ];

            baselineTest(null, data1, null, data2, global, null, null, renderData, null);
        });
        
        it('should render with dygraph when baselining is enabled with negative squashing', function() {
            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: true }};

            var data1 = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 50]
            ]}];
            var data2 = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 10],
                [1234481412000, -20],
                [1234481413000, 30],
                [1234481414000, -40],
                [1234481415000, 50]
            ]}];

            var renderData = [
                [new Date(1234567811000), 10, 10],
                [new Date(1234567812000), 0, 0],
                [new Date(1234567813000), 30, 30],
                [new Date(1234567814000), 0, 0],
                [new Date(1234567815000), 50, 50]
            ];

            baselineTest(null, data1, null, data2, global, graph, null, renderData, null);
        });
        
        it('should render with dygraph when baselining is enabled with mean adjustment', function() {
            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: false, meanAdjusted: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';

            var data1 = [{metric: "metric1", tags: {}, dps:[
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
            ]}];
            var data2 = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 20],
                [1234481412000, -20],
                [1234481413000, 40],
                [1234481414000, -40],
                [1234481415000, 60]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234481411000, -20],
                [1234481412000, 30],
                [1234481413000, -30],
                [1234481414000, 50],
                [1234481415000, 20]
            ]}];

            var renderData = [
                [new Date(1234567811000), 15, -15, 20, -20],
                [new Date(1234567812000), -20, 20, -25, 25],
                [new Date(1234567813000), 30, -30, 35, -35],
                [new Date(1234567814000), -40, 40, -45, 45],
                [new Date(1234567815000), 20, -20, 20, -20]
            ];

            baselineTest(url1, data1, url2, data2, global, graph, metrics, renderData, ["x", "metric1", "metric2", "metric1[BL]", "metric2[BL]"]);
        });
        
        it('should render with dygraph when baselining is enabled with mean adjustment & negative squashing', function() {

            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: true, meanAdjusted: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];


            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            
            var data1 = [{metric: "metric1", tags: {}, dps:[
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
            ]}];
            var data2 = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 20],
                [1234481412000, -20],
                [1234481413000, 40],
                [1234481414000, -40],
                [1234481415000, 60]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234481411000, -20],
                [1234481412000, 30],
                [1234481413000, -30],
                [1234481414000, 50],
                [1234481415000, 20]
            ]}];
            
            var renderData = [
                [new Date(1234567811000), 5, -5, 10, -10],
                [new Date(1234567812000), -10, 10, -15, 15],
                [new Date(1234567813000), 15, -15, 20, -20],
                [new Date(1234567814000), -20, 20, -25, 25],
                [new Date(1234567815000), 20, -20, 20, -20]
            ];

            baselineTest(url1, data1, url2, data2, global, graph, metrics, renderData, ["x", "metric1", "metric2", "metric1[BL]", "metric2[BL]"]);
        });
        
        it('should render with dygraph when baselining is enabled with ratio graph', function() {
            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: false, ratioGraph: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';

            var data1 = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 40]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, -30],
                [1234567812000, 20],
                [1234567813000, -30],
                [1234567814000, 40],
                [1234567815000, 10]
            ]}];
            var data2 = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 20],
                [1234481412000, -20],
                [1234481413000, 70],
                [1234481414000, -80],
                [1234481415000, 60]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234481411000, -20],
                [1234481412000, 30],
                [1234481413000, -30],
                [1234481414000, 120],
                [1234481415000, 20]
            ]}];

            var renderData = [
                [new Date(1234567811000), 25, -75, 50, -50],
                [new Date(1234567812000), -50, 50, -40, 60],
                [new Date(1234567813000), 50, -50, 70, -30],
                [new Date(1234567814000), -50, 50, -40, 60],
                [new Date(1234567815000), 80, 20, 75, 25]
            ];

            baselineTest(url1, data1, url2, data2, global, graph, metrics, renderData, ["x", "metric1", "metric2", "metric1[BL]", "metric2[BL]"]);
        });
        
        it('should render with dygraph when baselining is enabled with ratio graph & negative squashing', function() {

            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { squashNegative: true, ratioGraph: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];


            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            
            var data1 = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, -20],
                [1234567813000, 30],
                [1234567814000, -40],
                [1234567815000, 40]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, -20],
                [1234567812000, 20],
                [1234567813000, -30],
                [1234567814000, 40],
                [1234567815000, 10]
            ]}];
            var data2 = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 30],
                [1234481412000, -20],
                [1234481413000, 40],
                [1234481414000, -40],
                [1234481415000, 60]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234481411000, -20],
                [1234481412000, 30],
                [1234481413000, -30],
                [1234481414000, 50],
                [1234481415000, 40]
            ]}];
            
            var renderData = [
                [new Date(1234567811000), 100, 0, 100, 0],
                [new Date(1234567812000), 0, 100, 0, 100],
                [new Date(1234567813000), 100, 0, 100, 0],
                [new Date(1234567814000), 0, 100, 0, 100],
                [new Date(1234567815000), 80, 20, 60, 40]
            ];

            baselineTest(url1, data1, url2, data2, global, graph, metrics, renderData, ["x", "metric1", "metric2", "metric1[BL]", "metric2[BL]"]);
        });
        
        it('should render with dygraph when baselining is enabled with auto scaling', function() {
            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];


            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';

            var data1 = [{metric: "metric1", tags: {}, dps:[
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
            ]}];
            var data2 = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 1000],
                [1234481412000, 2000],
                [1234481413000, 3000],
                [1234481414000, 4000],
                [1234481415000, 5000]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234481411000, 20],
                [1234481412000, 20],
                [1234481413000, 30],
                [1234481414000, 40],
                [1234481415000, 10]
            ]}];

            var renderData = [
                [new Date(1234567811000), 1000, 2000, 1000, 2000],
                [new Date(1234567812000), 2000, 2000, 2000, 2000],
                [new Date(1234567813000), 3000, 3000, 3000, 3000],
                [new Date(1234567814000), 4000, 4000, 4000, 4000],
                [new Date(1234567815000), 5000, 1000, 5000, 1000]
            ];

            baselineTest(url1, data1, url2, data2, global, graph, metrics, renderData, ["x", "metric1", "100x metric2", "metric1[BL]", "100x metric2[BL]"]);
        });
        
        it('should render with dygraph when baselining is enabled with auto scaling & negative squashing', function() {

            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { autoScale: true, squashNegative: true }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];


            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';

            var data1 = [{metric: "metric1", tags: {}, dps:[
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
            ]}];
            var data2 = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, -1000],
                [1234481412000, -2000],
                [1234481413000, -3000],
                [1234481414000, -4000],
                [1234481415000, -5000]
            ]},{metric: "metric2", tags: {}, dps:[
                [1234481411000, 20],
                [1234481412000, 20],
                [1234481413000, 30],
                [1234481414000, 40],
                [1234481415000, 10]
            ]}];

            var renderData = [
                [new Date(1234567811000), 0, 20, 0, 20],
                [new Date(1234567812000), 0, 20, 0, 20],
                [new Date(1234567813000), 0, 30, 0, 30],
                [new Date(1234567814000), 0, 40, 0, 40],
                [new Date(1234567815000), 0, 10, 0, 10]
            ];

            baselineTest(url1, data1, url2, data2, global, graph, metrics, renderData, ["x", "metric1", "metric2", "metric1[BL]", "metric2[BL]"]);
        });
        
        it('should remove baseline results when the corresponding main query results are removed by filtering', function() {
            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { countFilter: {count: 1, measure: "max", end: "bottom"} }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';

            var data1 = [{metric: "metric1", tags: {}, query: { metric: "metric1", tags: {} }, dps:[
                [1234567811000, 100],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]},{metric: "metric2", tags: {}, query: { metric: "metric2", tags: {} }, dps:[
                [1234567811000, 20],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 10]
            ]}];
            var data2 = [{metric: "metric1", query: { metric: "metric1", tags: {} }, tags: {}, dps:[
                [1234481411000, 20],
                [1234481412000, 20],
                [1234481413000, 40],
                [1234481414000, 40],
                [1234481415000, 60]
            ]},{metric: "metric2", query: { metric: "metric2", tags: {} }, tags: {}, dps:[
                [1234481411000, 200], // lets make sure this one doesn't get removed as baseline shouldn't be considered when filtering
                [1234481412000, 30],
                [1234481413000, 30],
                [1234481414000, 50],
                [1234481415000, 20]
            ]}];

            var renderData = [
                [new Date(1234567811000), 20, 200],
                [new Date(1234567812000), 20, 30],
                [new Date(1234567813000), 30, 30],
                [new Date(1234567814000), 40, 50],
                [new Date(1234567815000), 10, 20]
            ];

            baselineTest(url1, data1, url2, data2, global, graph, metrics, renderData, ["x", "metric2", "metric2[BL]"]);
        });
        
        it('should not error when filtering excludes all baseline lines by excluding all corresponding main query results', function() {
            var global = { relativePeriod: "1d", autoReload: false, baselining: true, baselineDatumStyle: "relative", baselineRelativePeriod: "1d" };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: { countFilter: {count: 1, measure: "max", end: "bottom"} }};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "124", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }];

            var url1 = 'http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';
            var url2 = 'http://tsdb:4242/api/query?start=2016/01/20 14:10:10&end=2016/01/21 14:10:10&m=sum:metric1&m=sum:metric2&no_annotations=true&ms=true&arrays=true&show_query=true';

            var data1 = [{metric: "metric1", tags: {}, query: { metric: "metric1", tags: {} }, dps:[
                [1234567811000, 100],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ]},{metric: "metric2", tags: {}, query: { metric: "metric2", tags: {} }, dps:[
                [1234567811000, 20],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 10]
            ]}];
            var data2 = [{metric: "metric1", query: { metric: "metric1", tags: {} }, tags: {}, dps:[
                [1234481411000, 20],
                [1234481412000, 20],
                [1234481413000, 40],
                [1234481414000, 40],
                [1234481415000, 60]
            ]}];

            var renderData = [
                [new Date(1234567811000), 20],
                [new Date(1234567812000), 20],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), 40],
                [new Date(1234567815000), 10]
            ];

            baselineTest(url1, data1, url2, data2, global, graph, metrics, renderData, ["x", "metric2"]);
        });

        var annotationTest = function(responseData, expectedRenderData, expectedAnnotations, autoScaling, expectedLabels) {
            var url = "http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&ms=true&arrays=true&show_query=true";
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];
            if (autoScaling) {
                metrics.push({ id: "123", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } });
                url = url.replace("metric1","metric1&m=sum:metric2");
            }
            if (expectedLabels == null) {
                expectedLabels = ["x", "metric1"];
            }
            _annotationTest(false, metrics, null, url, null, responseData, null, expectedRenderData, expectedLabels, expectedAnnotations, autoScaling);
        }
        var annotationBaselineTest = function(responseData, baselineResponseData, expectedRenderData, expectedAnnotations, autoScaling, expectedLabels) {
            var datum = moment.utc("2016-06-03");
            var url = "http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&ms=true&arrays=true&show_query=true";
            var start = moment.utc("2016-06-01").format("YYYY/MM/DD HH:mm:ss");
            var end = moment.utc("2016-06-02").format("YYYY/MM/DD HH:mm:ss");
            var baselineUrl = "http://tsdb:4242/api/query?start="+start+"&end="+end+"&m=sum:metric1&ms=true&arrays=true&show_query=true";
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];
            if (autoScaling) {
                metrics.push({ id: "123", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } });
                url = url.replace("metric1","metric1&m=sum:metric2");
                baselineUrl = baselineUrl.replace("metric1","metric1&m=sum:metric2");
            }
            if (expectedLabels == null) {
                expectedLabels = ["x", "metric1","metric1[BL]"];
            }
            _annotationTest(false, metrics, datum, url, baselineUrl, responseData, baselineResponseData, expectedRenderData, expectedLabels, expectedAnnotations, autoScaling);
        }
        var globalAnnotationTest = function(responseData, expectedRenderData, expectedAnnotations, autoScaling, expectedLabels) {
            var url = "http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&global_annotations=true&ms=true&arrays=true&show_query=true";
            var metrics = [ 
                { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }, 
                { id: "123", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } 
            ];
            if (expectedLabels == null) {
                expectedLabels = ["x", "metric1", "metric2"];
            }
            _annotationTest(true, metrics, null, url, null, responseData, null, expectedRenderData, expectedLabels, expectedAnnotations, autoScaling);
        }
        var globalAnnotationBaselineTest = function(responseData, baselineResponseData, expectedRenderData, expectedAnnotations, autoScaling, expectedLabels) {
            var datum = moment.utc("2016-06-03");
            var url = "http://tsdb:4242/api/query?start=1d-ago&ignore=1&m=sum:metric1&m=sum:metric2&global_annotations=true&ms=true&arrays=true&show_query=true";
            var start = moment.utc("2016-06-01").format("YYYY/MM/DD HH:mm:ss");
            var end = moment.utc("2016-06-02").format("YYYY/MM/DD HH:mm:ss");
            var baselineUrl = "http://tsdb:4242/api/query?start="+start+"&end="+end+"&m=sum:metric1&m=sum:metric2&global_annotations=true&ms=true&arrays=true&show_query=true";
            var metrics = [
                { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } },
                { id: "123", name: "metric2", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } }
            ];
            if (expectedLabels == null) {
                expectedLabels = ["x", "metric1", "metric2","metric1[BL]","metric2[BL]"];
            }
            _annotationTest(true, metrics, datum, url, baselineUrl, responseData, baselineResponseData, expectedRenderData, expectedLabels, expectedAnnotations, autoScaling);
        }
        var _annotationTest = function(globalAnnotations, metrics, datum, url, baselineUrl, responseData, baselineResponseData, expectedRenderData, expectedLabels, expectedAnnotations, autoScaling) {

            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242, tsdbProtocol: "http"};

            var global = { relativePeriod: "1d", autoReload: false };
            if (baselineUrl != null && baselineResponseData != null) {
                global.baselining = true;
                global.baselineDatumStyle = "relative";
                global.baselineRelativePeriod = "1d";
            }
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, dygraph: {annotations: true, globalAnnotations: globalAnnotations, autoScale: autoScaling }};
            

            $httpBackend.expectGET(url).respond(responseData);
            if (baselineUrl != null && baselineResponseData != null) {
                $httpBackend.expectGET(baselineUrl).respond(baselineResponseData);
            }

            scope.renderers.dygraph(global, graph, metrics, datum);


            $httpBackend.flush();

            expect(renderDivId).toEqualData("dygraphDiv_abc");
            expect(renderGraphId).toEqualData("abc");
            expect(renderData).toEqualData(expectedRenderData);
            expect(renderConfig).toEqualData({
                labels: expectedLabels,
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
                    y:{ valueRange: [null, null] }
                }
            });
            expect(renderAnnotations).toEqualData(expectedAnnotations);
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        }
        
        it('should render with dygraph when annotations are enabled and there is an annotation on a series', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [
                {
                    startTime: 1234567813000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567814000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10],
                [new Date(1234567812000), 20],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), 40],
                [new Date(1234567815000), 50]
            ];
            
            var expectedAnnotation1 = {"series":"metric1","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};
            
            annotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when annotations are enabled and there is an annotation on a series between points', function() {

            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567815000, 50]
            ], annotations: [
                {
                    startTime: 1234567813000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567814000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];
            
            var expectedRenderData = [
                [new Date(1234567811000), 10],
                [new Date(1234567812000), 20],
                [new Date(1234567813000), null],
                [new Date(1234567814000), null],
                [new Date(1234567815000), 50]
            ];

            var expectedAnnotation1 = {"series":"metric1","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            annotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when annotations are enabled and there is an annotation on a series before any points', function() {

            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [
                {
                    startTime: 1234567811000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567812000,
                    description: "Some text 2",
                    custom: {
                        type: "deployment"
                    }
                }
            ]}];

            var expectedRenderData = [
                [new Date(1234567811000), null],
                [new Date(1234567812000), null],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), 40],
                [new Date(1234567815000), 50]
            ];

            var expectedAnnotation1 = {"series":"metric1","xval":1234567811000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1","xval":1234567812000,"height":16,"width":16,"icon":"deployment.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            annotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when annotations are enabled and there is an annotation on a series after any points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30]
            ], annotations: [
                {
                    startTime: 1234567815000,
                    description: "Some text",
                    custom: {
                        
                    }
                },
                {
                    startTime: 1234567814000,
                    description: "Some text 2",
                    custom: {
                        type: "problem"
                    }
                }
            ]}];

            var expectedRenderData = [
                [new Date(1234567811000), 10],
                [new Date(1234567812000), 20],
                [new Date(1234567813000), 30],
                [new Date(1234567814000), null],
                [new Date(1234567815000), null]
            ];

            var expectedAnnotation1 = {"series":"metric1","xval":1234567814000,"height":16,"width":16,"icon":"problem.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};
            var expectedAnnotation2 = {"series":"metric1","xval":1234567815000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};

            annotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when autoscaling and annotations are enabled and there is an annotation on a series point', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [
                {
                    startTime: 1234567813000,
                    description: "Some text",
                    custom: null
                }
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 100],
                [1234567812000, 200],
                [1234567813000, 300],
                [1234567814000, 400],
                [1234567815000, 500]
            ], annotations: [
                {
                    startTime: 1234567814000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 100, 100],
                [new Date(1234567812000), 200, 200],
                [new Date(1234567813000), 300, 300],
                [new Date(1234567814000), 400, 400],
                [new Date(1234567815000), 500, 500]
            ];

            var expectedAnnotation1 = {"series":"10x metric1","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric2","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            annotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2], true, ["x","10x metric1", "metric2"]);
        });

        it('should render with dygraph when global annotations are enabled and there is a global annotation at the time of a series point', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234567813000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567814000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 60],
                [1234567812000, 70],
                [1234567814000, 90],
                [1234567815000, 100]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234567813000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567814000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 60],
                [new Date(1234567812000), 20, 70],
                [new Date(1234567813000), 30, null],
                [new Date(1234567814000), null, 90],
                [new Date(1234567815000), 50, 100]
            ];

            var expectedAnnotation1 = {"series":"metric1","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric2","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when global annotations are enabled and there is a global annotation at a time between any series points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234567813300,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567813700,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 60],
                [1234567812000, 70],
                [1234567814000, 90],
                [1234567815000, 100]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234567813300,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567813700,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 60],
                [new Date(1234567812000), 20, 70],
                [new Date(1234567813300), null, null],
                [new Date(1234567813700), null, null],
                [new Date(1234567814000), 40, 90],
                [new Date(1234567815000), 50, 100]
            ];

            var expectedAnnotation1 = {"series":"metric1","xval":1234567813300,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1","xval":1234567813700,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when global annotations are enabled and there is a global annotation at a time before any series points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: []},{metric: "metric2", tags: {}, dps:[
                [1234567813000, 80],
                [1234567814000, 90],
                [1234567815000, 100]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234567811000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567812000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), null, null],
                [new Date(1234567812000), null, null],
                [new Date(1234567813000), 30, 80],
                [new Date(1234567814000), 40, 90],
                [new Date(1234567815000), 50, 100]
            ];

            var expectedAnnotation1 = {"series":"metric1","xval":1234567811000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1","xval":1234567812000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when global annotations are enabled and there is a global annotation at a time after any series points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30]
            ], annotations: [], globalAnnotations: []},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 60],
                [1234567812000, 70],
                [1234567813000, 80]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234567814000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567815000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 60],
                [new Date(1234567812000), 20, 70],
                [new Date(1234567813000), 30, 80],
                [new Date(1234567814000), null, null],
                [new Date(1234567815000), null, null]
            ];

            var expectedAnnotation1 = {"series":"metric1","xval":1234567814000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1","xval":1234567815000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when autoscaling and annotations are enabled and there is a global annotation on a series point', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234567813000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567814000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]},{metric: "metric2", tags: {}, dps:[
                [1234567811000, 600],
                [1234567812000, 700],
                [1234567814000, 900],
                [1234567815000, 900]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234567813000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234567814000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 100, 600],
                [new Date(1234567812000), 200, 700],
                [new Date(1234567813000), 300, null],
                [new Date(1234567814000), null, 900],
                [new Date(1234567815000), 500, 900]
            ];

            var expectedAnnotation1 = {"series":"10x metric1","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric2","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationTest(responseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2], true, ["x", "10x metric1", "metric2"]);
        });
        
        it('should render with dygraph when annotations are enabled and there is an annotation on a baseline series', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 11],
                [1234481412000, 22],
                [1234481413000, 33],
                [1234481414000, 44],
                [1234481415000, 55]
            ], annotations: [
                {
                    startTime: 1234481413000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234481414000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 11],
                [new Date(1234567812000), 20, 22],
                [new Date(1234567813000), 30, 33],
                [new Date(1234567814000), 40, 44],
                [new Date(1234567815000), 50, 55]
            ];

            var expectedAnnotation1 = {"series":"metric1[BL]","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1[BL]","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            annotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when annotations are enabled and there is an annotation on a baseline series between points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 11],
                [1234481412000, 22],
                [1234481415000, 55]
            ], annotations: [
                {
                    startTime: 1234481413000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234481414000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 11],
                [new Date(1234567812000), 20, 22],
                [new Date(1234567813000), null, null],
                [new Date(1234567814000), 40, null],
                [new Date(1234567815000), 50, 55]
            ];

            var expectedAnnotation1 = {"series":"metric1[BL]","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1[BL]","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            annotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when annotations are enabled and there is an annotation on a baseline series before any points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481413000, 33],
                [1234481414000, 44],
                [1234481415000, 55]
            ], annotations: [
                {
                    startTime: 1234481411000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234481412000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), null, null],
                [new Date(1234567812000), 20, null],
                [new Date(1234567813000), 30, 33],
                [new Date(1234567814000), 40, 44],
                [new Date(1234567815000), 50, 55]
            ];

            var expectedAnnotation1 = {"series":"metric1[BL]","xval":1234567811000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1[BL]","xval":1234567812000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            annotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when annotations are enabled and there is an annotation on a baseline series after any points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40]
            ], annotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 11],
                [1234481412000, 22],
                [1234481413000, 33]
            ], annotations: [
                {
                    startTime: 1234481414000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234481415000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 11],
                [new Date(1234567812000), 20, 22],
                [new Date(1234567813000), 30, 33],
                [new Date(1234567814000), 40, null],
                [new Date(1234567815000), null, null]
            ];

            var expectedAnnotation1 = {"series":"metric1[BL]","xval":1234567814000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1[BL]","xval":1234567815000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            annotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when autoscaling and annotations are enabled and there is an annotation on a baseline series point', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: []},
                {metric: "metric2", tags: {}, dps:[
                    [1234567811000, 600],
                    [1234567812000, 700],
                    [1234567813000, 800],
                    [1234567814000, 900],
                    [1234567815000, 900]
                ], annotations: [], globalAnnotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 11],
                [1234481412000, 22],
                [1234481413000, 33],
                [1234481414000, 44],
                [1234481415000, 55]
            ], annotations: [
                {
                    startTime: 1234481413000,
                    description: "Some text",
                    custom: null
                }
            ]},
                {metric: "metric2", tags: {}, dps:[
                    [1234481411000, 660],
                    [1234481412000, 770],
                    [1234481413000, 880],
                    [1234481414000, 990],
                    [1234481415000, 990]
                ], annotations: [
                    {
                        startTime: 1234481414000,
                        description: "Some text 2",
                        custom: {
                            type: "config"
                        }
                    }
                ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 100, 600, 110, 660],
                [new Date(1234567812000), 200, 700, 220, 770],
                [new Date(1234567813000), 300, 800, 330, 880],
                [new Date(1234567814000), 400, 900, 440, 990],
                [new Date(1234567815000), 500, 900, 550, 990]
            ];

            var expectedAnnotation1 = {"series":"10x metric1[BL]","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric2[BL]","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            annotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2], true, ["x", "10x metric1","metric2","10x metric1[BL]","metric2[BL]"]);
        });
        
        it('should render with dygraph when global annotations are enabled and there is a global annotation from the baseline query at the time of a series point', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: []},
                {metric: "metric2", tags: {}, dps:[
                    [1234567811000, 60],
                    [1234567812000, 70],
                    [1234567813000, 80],
                    [1234567814000, 90],
                    [1234567815000, 100]
                ], annotations: [], globalAnnotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 11],
                [1234481412000, 22],
                [1234481413000, 33],
                [1234481415000, 55]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234481413000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234481414000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]},
                {metric: "metric2", tags: {}, dps:[
                    [1234481411000, 66],
                    [1234481412000, 77],
                    [1234481414000, 99],
                    [1234481415000, 110]
                ], annotations: [], globalAnnotations: [
                ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 60, 11, 66],
                [new Date(1234567812000), 20, 70, 22, 77],
                [new Date(1234567813000), 30, 80, 33, null],
                [new Date(1234567814000), 40, 90, null, 99],
                [new Date(1234567815000), 50, 100, 55, 110]
            ];

            var expectedAnnotation1 = {"series":"metric1[BL]","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric2[BL]","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when global annotations are enabled and there is a global annotation from the baseline query at a time between any series points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: []},
                {metric: "metric2", tags: {}, dps:[
                    [1234567811000, 60],
                    [1234567812000, 70],
                    [1234567813000, 80],
                    [1234567814000, 90],
                    [1234567815000, 100]
                ], annotations: [], globalAnnotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 11],
                [1234481412000, 22],
                [1234481415000, 55]
            ], annotations: [], globalAnnotations: []},
                {metric: "metric2", tags: {}, dps:[
                    [1234481411000, 66],
                    [1234481412000, 77],
                    [1234481415000, 110]
                ], annotations: [], globalAnnotations: [
                    {
                        startTime: 1234481413000,
                        description: "Some text",
                        custom: null
                    },
                    {
                        startTime: 1234481414000,
                        description: "Some text 2",
                        custom: {
                            type: "config"
                        }
                    }
                ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 60, 11, 66],
                [new Date(1234567812000), 20, 70, 22, 77],
                [new Date(1234567813000), 30, 80, null, null],
                [new Date(1234567814000), 40, 90, null, null],
                [new Date(1234567815000), 50, 100, 55, 110]
            ];

            var expectedAnnotation1 = {"series":"metric1[BL]","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1[BL]","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when global annotations are enabled and there is a global annotation from the baseline query at a time before any series points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: []},
                {metric: "metric2", tags: {}, dps:[
                    [1234567811000, 60],
                    [1234567812000, 70],
                    [1234567813000, 80],
                    [1234567814000, 90],
                    [1234567815000, 100]
                ], annotations: [], globalAnnotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481413000, 33],
                [1234481414000, 44],
                [1234481415000, 55]
            ], annotations: [], globalAnnotations: []},
                {metric: "metric2", tags: {}, dps:[
                    [1234481413000, 88],
                    [1234481414000, 99],
                    [1234481415000, 110]
                ], annotations: [], globalAnnotations: [
                    {
                        startTime: 1234481411000,
                        description: "Some text",
                        custom: null
                    },
                    {
                        startTime: 1234481412000,
                        description: "Some text 2",
                        custom: {
                            type: "config"
                        }
                    }
                ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 60, null, null],
                [new Date(1234567812000), 20, 70, null, null],
                [new Date(1234567813000), 30, 80, 33, 88],
                [new Date(1234567814000), 40, 90, 44, 99],
                [new Date(1234567815000), 50, 100, 55, 110]
            ];

            var expectedAnnotation1 = {"series":"metric1[BL]","xval":1234567811000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1[BL]","xval":1234567812000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when global annotations are enabled and there is a global annotation from the baseline query at a time after any series points', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: []},
                {metric: "metric2", tags: {}, dps:[
                    [1234567811000, 60],
                    [1234567812000, 70],
                    [1234567813000, 80],
                    [1234567814000, 90],
                    [1234567815000, 100]
                ], annotations: [], globalAnnotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 11],
                [1234481412000, 22],
                [1234481413000, 33]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234481414000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234481415000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]},
                {metric: "metric2", tags: {}, dps:[
                    [1234481411000, 66],
                    [1234481412000, 77],
                    [1234481413000, 88]
                ], annotations: [], globalAnnotations: []}];


            var expectedRenderData = [
                [new Date(1234567811000), 10, 60, 11, 66],
                [new Date(1234567812000), 20, 70, 22, 77],
                [new Date(1234567813000), 30, 80, 33, 88],
                [new Date(1234567814000), 40, 90, null, null],
                [new Date(1234567815000), 50, 100, null, null]
            ];

            var expectedAnnotation1 = {"series":"metric1[BL]","xval":1234567814000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"metric1[BL]","xval":1234567815000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2]);
        });
        it('should render with dygraph when autoscaling and annotations are enabled and there is a global annotation on a baseline series point', function() {
            var responseData = [{metric: "metric1", tags: {}, dps:[
                [1234567811000, 10],
                [1234567812000, 20],
                [1234567813000, 30],
                [1234567814000, 40],
                [1234567815000, 50]
            ], annotations: [], globalAnnotations: []},
                {metric: "metric2", tags: {}, dps:[
                    [1234567811000, 600],
                    [1234567812000, 700],
                    [1234567813000, 800],
                    [1234567814000, 900],
                    [1234567815000, 900]
                ], annotations: [], globalAnnotations: []}];
            var baselineResponseData = [{metric: "metric1", tags: {}, dps:[
                [1234481411000, 11],
                [1234481412000, 22],
                [1234481413000, 33],
                [1234481414000, 44],
                [1234481415000, 55]
            ], annotations: [], globalAnnotations: [
                {
                    startTime: 1234481413000,
                    description: "Some text",
                    custom: null
                },
                {
                    startTime: 1234481414000,
                    description: "Some text 2",
                    custom: {
                        type: "config"
                    }
                }
            ]},
                {metric: "metric2", tags: {}, dps:[
                    [1234481411000, 660],
                    [1234481412000, 770],
                    [1234481413000, 880],
                    [1234481414000, 990],
                    [1234481415000, 990]
                ], annotations: [], globalAnnotations: [
                    {
                        startTime: 1234481413000,
                        description: "Some text",
                        custom: null
                    },
                    {
                        startTime: 1234481414000,
                        description: "Some text 2",
                        custom: {
                            type: "config"
                        }
                    }
                ]}];


            var expectedRenderData = [
                [new Date(1234567811000), 100, 600, 110, 660],
                [new Date(1234567812000), 200, 700, 220, 770],
                [new Date(1234567813000), 300, 800, 330, 880],
                [new Date(1234567814000), 400, 900, 440, 990],
                [new Date(1234567815000), 500, 900, 550, 990]
            ];

            var expectedAnnotation1 = {"series":"10x metric1[BL]","xval":1234567813000,"height":16,"width":16,"icon":"unknown.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text"};
            var expectedAnnotation2 = {"series":"10x metric1[BL]","xval":1234567814000,"height":16,"width":16,"icon":"config.jpg","attachAtBottom":true,"tickHeight":84,"text":"Some text 2"};

            globalAnnotationBaselineTest(responseData, baselineResponseData, expectedRenderData, [expectedAnnotation1, expectedAnnotation2], true, ["x", "10x metric1","metric2","10x metric1[BL]","metric2[BL]"]);
        });
        
        
        // todo: http error
        // todo: line highlighting callback
        // todo: value formatters
    });
});

