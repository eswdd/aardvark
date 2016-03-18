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
            scope.renderers["unittest"] = function(global,graph,metrics) {
                globals.push(global);
                graphs.push(graph);
                metricss.push(metrics);
            }

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
            rootScope.model.graphs = [ graph, notGraph ];
            rootScope.model.metrics = [ incMetric, excMetric ];

            rootScope.renderGraphs();

            expect(graphs).toEqualData([graph]);
            expect(metricss).toEqualData([[incMetric]]);
        });
    });
});

