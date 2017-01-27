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

    describe('HorizonRenderer', function() {

        var graphServices, $httpBackend;
        var renderer, rendererInstance;
        var renderContext, config;
        var renderDiv, graphPanel;

        beforeEach(inject(function (HorizonRenderer, GraphServices, _$httpBackend_) {
            // hmm
            renderer = HorizonRenderer;
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

            rendererInstance = renderer.create();
            // defaults
            expect(rendererInstance.supports_tsdb_export).toEqualData(true);
            expect(rendererInstance.tsdb_export_link).toEqualData("");
            // memory from a previous query
            rendererInstance.tsdb_export_link = "http://tsdb:4242/oldquery";
        }));
        
        afterEach(function() {
            renderDiv.remove();
            renderDiv = null;
            graphPanel.remove();
            graphPanel = null;
        })

        it('should report an error when trying to render with horizon and no start time', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(rendererInstance.tsdb_export_link).toEqualData("");
            expect(renderContext.renderErrors).toEqualData({abc:"No start date specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render a single line for a simple query', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { relativePeriod: "2h", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2h-ago&ignore=1&m=sum:20s-avg:metric1&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1234567811000, 10],
                    [1234567812000, 20],
                    [1234567813000, 30],
                    [1234567814000, 40],
                    [1234567815000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2h-ago&m=sum:20s-avg:metric1&o=axis+x1y1&key=top+left");
//
//            expect(renderDivId).toEqualData(null);
//            expect(renderGraphId).toEqualData(null);
//            expect(renderData).toEqualData(null);
//            expect(renderConfig).toEqualData(null);
//            expect(renderContext.renderErrors).toEqualData({abc:"No start date specified"});
//            expect(renderContext.renderWarnings).toEqualData({});
        });
    });
});

