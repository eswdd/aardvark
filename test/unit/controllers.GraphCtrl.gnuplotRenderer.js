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

    describe('GraphCtrl.gnuplotRenderer', function() {
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
        }));

        // ---------- gnuplot rendering ----------

        it('should report an error when trying to render with gnuplot and no start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 0, graphHeight: 0 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc: { src : '', width : 0, height : 0 }});
            expect(scope.renderErrors).toEqualData({abc:"No start date specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with gnuplot and no metrics', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{ src : '', width : 0, height : 0 }});
            expect(scope.renderErrors).toEqualData({abc:"No metrics specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with gnuplot and an unsupported axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, graphOptions: { axis: "fred" }};
            var metrics = [ { id: "123", graphOptions: {}, tags: [] } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{ src : '', width : 0, height : 0 }});
            expect(scope.renderErrors).toEqualData({abc:"Invalid axis specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a relative start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        // todo: absolute times and parsing errors

        it('should render with gnuplot with a rate', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: false, rate: true } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a downsample', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: true, downsampleBy: "avg", downsampleTo: "1m" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:1m-avg:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a rate and a downsample', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: true, downsampleBy: "avg", downsampleTo: "1m", rate: true } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:1m-avg:rate:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter with no rate (with a warning)', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false, rateCounter: true } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({abc:"You have specified a rate counter without a rate, ignoring"});
        });

        it('should render with gnuplot with a ratecounter', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate{counter}:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a max', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "123" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate{counter,123}:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a reset', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "", rateCounterReset: "456" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate{counter,,456}:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a max and a reset', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "123", rateCounterReset: "456" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate{counter,123,456}:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a value', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "value1" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1{tag1=value1}&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a multi-value', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "value1|value2" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1{tag1=value1|value2}&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a wildcard value', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "*" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1{tag1=*}&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a blank value', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a label when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLabel: "Label 1", y2AxisLabel: "Label 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&ylabel=Label+1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a label when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLabel: "Label 1", y2AxisLabel: "Label 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2label=Label+2&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a format when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisFormat: "Format 1", y2AxisFormat: "Format 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&yformat=Format+1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a format when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisFormat: "Format 1", y2AxisFormat: "Format 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2format=Format+2&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a yrange when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisRange: "[0:1]", y2AxisRange: "[0:2]" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&yrange=[0:1]&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a yrange when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisRange: "[0:1]", y2AxisRange: "[0:2]" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2range=[0:2]&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with logscale when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLogScale: true, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&ylog&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with logscale when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLogScale: true, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2log&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot without logscale when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLogScale: false, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot without logscale when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLogScale: true, y2AxisLogScale: false }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with line smoothing when selected', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { lineSmoothing: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&smooth=csplines&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with no key', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: false }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with key top left', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with unspecified key location', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({abc: "Invalid key location specified '', defaulting to top left"});
        });

        it('should render with gnuplot with key bottom right', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "bottom right", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=bottom+right&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with horizontal key', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "horizontal" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+horiz&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with top left key with a box', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "vertical", keyBox: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+box&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with horizontal key with a box', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "horizontal", keyBox: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+horiz+box&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
    });
});

