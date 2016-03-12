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

    describe('GraphControlCtrl', function() {
        var rootScope, scope;
        var configUpdateFunc;
        var saveModelCalled, saveModelRenderArg;

        beforeEach(inject(function ($rootScope, $controller) {
            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }
            rootScope.saveModel = function(render) {
                saveModelCalled = true;
                saveModelRenderArg = render;
            }
            saveModelCalled = false;
            saveModelRenderArg = false;
            rootScope.model = { graphs: [], metrics: [] };
            rootScope.graphTypes = [ "unittest1", "unittest2" ];

            $controller('GraphControlCtrl', {$scope: scope, $rootScope: rootScope});
        }));

        it('should deep clone correctly', function() {
            var orig = [
                {
                    a: ["a","b","c"],
                    e: {
                        f: "g"
                    }
                },
                [
                    "h"
                ],
                [
                    {
                        i: "j",
                        k: []
                    }
                ],
                3
            ];
            var clone = scope.deepClone(orig);
            expect(clone).toEqualData(orig);
            expect(clone == orig).toEqualData(false);
        });

        it('should create a single graph on initialisation if none exist', function () {
            configUpdateFunc();

            expect(scope.graphs).toEqualData([
                {
                    id: scope.lastGraphId+"",
                    title: "Graph 1",
                    type: null,
                    graphWidth: 0,
                    graphHeight: 0,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);
            expect(rootScope.model.graphs).toEqualData(scope.graphs);
        });

        it('should set the graph type when creating a graph on initialisation if only one type is defined', function () {
            rootScope.graphTypes = [ "unittest1" ];

            configUpdateFunc();

            expect(scope.graphs).toEqualData([
                {
                    id: scope.lastGraphId+"",
                    title: "Graph 1",
                    type: "unittest1",
                    graphWidth: 0,
                    graphHeight: 0,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);
            expect(rootScope.model.graphs).toEqualData(scope.graphs);
        });

        it('should load the existing model on initialisation', function () {

            //todo: m2: we should 'fix' model with new defaults?
            rootScope.model.graphs = [
                {
                    id: "1234",
                    title: "Graph 1",
                    type: null
                }
            ];

            configUpdateFunc();

            expect(scope.lastGraphId).toEqualData(1234);
            expect(scope.graphs).toEqualData(rootScope.model.graphs);
        });

        it('should add a new graph to the model with a default title when the addGraph() function is called', function () {

            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);

            scope.addGraph();

            var secondId = scope.lastGraphId+"";
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: null,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);
        });

        it('should set the graph type on new graphs if there is only one type defined', function () {
            rootScope.graphTypes = [ "unittest1" ];

            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "unittest1",
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);

            scope.addGraph();

            var secondId = scope.lastGraphId+"";
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "unittest1",
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: "unittest1",
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);
        });

        it('should request rendering when saving changes', function () {
            scope.renderGraphs();
            expect(saveModelCalled).toEqualData(true);
            expect(saveModelRenderArg).toEqualData(true);
        });

        it('should persist internal graphs to the model when saving changes', function () {
            expect(rootScope.model.graphs).toEqualData([]);
            scope.addGraph();
            scope.renderGraphs();
            expect(saveModelCalled).toEqualData(true);
            expect(rootScope.model.graphs.length).toEqualData(1);
        });

        it('should remove a graph from the model when requested', function () {
            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(scope.graphs.length).toEqualData(1);

            scope.deleteGraph(firstId);

            expect(scope.graphs).toEqualData([]);
        });

        it("should not remove a graph if it can't be found", function () {
            scope.addGraph();

            expect(scope.graphs.length).toEqualData(1);

            scope.deleteGraph("0");
            expect(scope.graphs.length).toEqualData(1);
        });

        it('should not create new graphs with an existing id', function () {
            scope.addGraph();

            var firstId = scope.lastGraphId+"";

            scope.addGraph();

            var secondId = scope.lastGraphId+"";

            expect(firstId == secondId).toEqualData(false);
        });

        //todo: m2: move id generation to a service
        it('should generate unique ids', function () {
            scope.timeInMillis = function() {
                return 0;
            }

            var firstId = scope.nextId();
            var secondId = scope.nextId();
            expect(firstId == secondId).toEqualData(false);
        });

        it('should control the accordion appropriately when adding / removing graphs', function() {
            expect(scope.isOpen).toEqualData({});
            scope.addGraph();
            var id1 = scope.lastGraphId + "";

            expect(scope.isOpen[id1]).toEqualData(true);

            scope.addGraph();
            var id2 = scope.lastGraphId + "";

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(true);

            scope.addGraph();
            var id3 = scope.lastGraphId + "";

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(false);
            expect(scope.isOpen[id3]).toEqualData(true);

            scope.deleteGraph(id3);

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(true);
            expect(scope.isOpen[id3]).toEqualData(false);

            scope.deleteGraph(id1);

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(true);
            expect(scope.isOpen[id3]).toEqualData(false);

            scope.deleteGraph(id2);

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(false);
            expect(scope.isOpen[id3]).toEqualData(false);
        });


    });
});

