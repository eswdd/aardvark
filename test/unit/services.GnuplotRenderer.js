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

    describe('GnuplotRenderer', function() {
        var graphServices, $httpBackend;
        var renderer, rendererInstance;
        var renderContext, config;

        beforeEach(inject(function (GnuplotRenderer, GraphServices, _$httpBackend_) {
            // hmm
            renderer = GnuplotRenderer;
            graphServices = GraphServices;
            $httpBackend = _$httpBackend_;
            
            renderContext = {};
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
            renderContext.renderMessages = {};
            
            config = {
                tsdbBaseReadUrl: "http://tsdb:4242"
            };
            
            rendererInstance = renderer.create();
            expect(rendererInstance.supports_tsdb_export).toEqualData(true);
            expect(rendererInstance.tsdb_export_link).toEqualData("");
            // memory from a previous query
            rendererInstance.tsdb_export_link = "http://tsdb:4242/oldquery";
        }));

        // ---------- gnuplot rendering ----------

        it('should report an error when trying to render with gnuplot and no start time', function() {
            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 0, graphHeight: 0 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(rendererInstance.tsdb_export_link).toEqualData("");
            expect(renderContext.renderedContent).toEqualData({abc: { src : '', width : 0, height : 0 }});
            expect(renderContext.renderErrors).toEqualData({abc:"No start date specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with gnuplot and no metrics', function() {
            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(rendererInstance.tsdb_export_link).toEqualData("");
            expect(renderContext.renderedContent).toEqualData({abc:{ src : '', width : 0, height : 0 }});
            expect(renderContext.renderErrors).toEqualData({abc:"No metrics specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with gnuplot and an unsupported axis', function() {
            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, graphOptions: {  }};
            var metrics = [ { id: "123", graphOptions: {axis: "fred"}, tags: [] } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(rendererInstance.tsdb_export_link).toEqualData("");
            expect(renderContext.renderedContent).toEqualData({abc:{ src : '', width : 0, height : 0 }});
            expect(renderContext.renderErrors).toEqualData({abc:"Invalid axis specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a relative start time', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.supports_tsdb_export).toEqualData(true);
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        // todo: absolute times and parsing errors

        it('should render with gnuplot with a rate', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: false, rate: true } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:rate:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:rate:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a downsample', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: true, downsampleBy: "avg", downsampleTo: "1m" } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:1m-avg:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:1m-avg:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a rate and a downsample', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: true, downsampleBy: "avg", downsampleTo: "1m", rate: true } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:1m-avg:rate:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:1m-avg:rate:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter with no rate (with a warning)', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false, rateCounter: true } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({abc:"You have specified a rate counter without a rate, ignoring"});
        });

        it('should render with gnuplot with a ratecounter', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:rate{counter}:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:rate{counter}:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a max', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "123" } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:rate{counter,123}:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:rate{counter,123}:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a reset', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "", rateCounterReset: "456" } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:rate{counter,,456}:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:rate{counter,,456}:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a max and a reset', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "123", rateCounterReset: "456" } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:rate{counter,123,456}:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:rate{counter,123,456}:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a value', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "value1" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:metric1{tag1=value1}&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1{tag1=value1}&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a multi-value', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "value1|value2" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:metric1{tag1=value1|value2}&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1{tag1=value1|value2}&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a wildcard value', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "*" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:metric1{tag1=*}&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1{tag1=*}&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a blank value', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+graphServices.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a label when there is a metric on the left axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisLabel: "Label 1", y2AxisLabel: "Label 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&ylabel=Label+1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&ylabel=Label+1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a label when there is a metric on the right axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisLabel: "Label 1", y2AxisLabel: "Label 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2label=Label+2&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y2&y2label=Label+2&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a format when there is a metric on the left axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisFormat: "Format 1", y2AxisFormat: "Format 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&yformat=Format+1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&yformat=Format+1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a format when there is a metric on the right axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisFormat: "Format 1", y2AxisFormat: "Format 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2format=Format+2&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y2&y2format=Format+2&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a yrange when there is a metric on the left axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisRange: "[0:1]", y2AxisRange: "[0:2]" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&yrange=[0:1]&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&yrange=[0:1]&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a yrange when there is a metric on the right axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisRange: "[0:1]", y2AxisRange: "[0:2]" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2range=[0:2]&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y2&y2range=[0:2]&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with logscale when there is a metric on the left axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisLogScale: true, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&ylog&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&ylog&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with logscale when there is a metric on the right axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisLogScale: true, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2log&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y2&y2log&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot without logscale when there is a metric on the left axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisLogScale: false, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot without logscale when there is a metric on the right axis', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { y1AxisLogScale: true, y2AxisLogScale: false }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y2&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with line smoothing when selected', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { lineSmoothing: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&nokey&smooth=csplines&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&nokey&smooth=csplines");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with no key', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: false }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&nokey");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with key top left', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&key=top+left");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with unspecified key location', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&key=top+left");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({abc: "Invalid key location specified '', defaulting to top left"});
        });

        it('should render with gnuplot with key bottom right', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "bottom right", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=bottom+right&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&key=bottom+right");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with horizontal key', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "horizontal" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+horiz&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&key=top+left+horiz");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with top left key with a box', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "vertical", keyBox: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+box&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&key=top+left+box");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with horizontal key with a box', function() {
            config = {tsdbBaseReadUrl: "http://tsdb:4242"};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "horizontal", keyBox: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(renderContext.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+horiz+box&png&wxh=0x0",width:0,height:0}});
            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=1d-ago&m=sum:metric1&o=axis+x1y1&key=top+left+horiz+box");
            expect(renderContext.renderErrors).toEqualData({});
            expect(renderContext.renderWarnings).toEqualData({});
        });
    });
});

