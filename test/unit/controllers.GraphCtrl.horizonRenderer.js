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

    describe('GraphCtrl.horizonRenderer', function() {
        var rootScope, $httpBackend, scope;
        var configUpdateFunc;
        var renderDiv, graphPanel;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $controller) {
            // hmm
            rootScope = $rootScope;
            $httpBackend = _$httpBackend_;
            scope = $rootScope.$new();

            scope.renderers = {};

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

            renderDiv = document.createElement("div");
            renderDiv.setAttribute("id","horizonDiv_abc");
            document.body.appendChild(renderDiv);
            graphPanel = document.createElement("div");
            graphPanel.setAttribute("id","graph-content-panel");
            document.body.appendChild(graphPanel);
        }));
        
        afterEach(function() {
            renderDiv.remove();
            renderDiv = null;
            graphPanel.remove();
            graphPanel = null;
        })

        it('should report an error when trying to render with horizon and no start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            scope.renderers.horizon.create().render(global, graph, metrics);

            expect(scope.renderErrors).toEqualData({abc:"No start date specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render a single line for a simple query', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
//
            var global = { relativePeriod: "2h", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            scope.renderers.horizon.create().render(global, graph, metrics);
            
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
//
//            expect(renderDivId).toEqualData(null);
//            expect(renderGraphId).toEqualData(null);
//            expect(renderData).toEqualData(null);
//            expect(renderConfig).toEqualData(null);
//            expect(scope.renderErrors).toEqualData({abc:"No start date specified"});
//            expect(scope.renderWarnings).toEqualData({});
        });
    });
});

