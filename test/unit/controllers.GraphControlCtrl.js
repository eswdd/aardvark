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

    describe('GraphControlCtrl', function() {
        var rootScope, scope;
        var saveModelCalled, saveModelRenderArg;
        var idGeneratorRef;
        var deepUtilsRef;

        beforeEach(inject(function ($rootScope, $controller, idGenerator, deepUtils) {
            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();
            idGeneratorRef = idGenerator;
            deepUtilsRef = deepUtils;

            rootScope.saveModel = function(render) {
                saveModelCalled = true;
                saveModelRenderArg = render;
            }
            saveModelCalled = false;
            saveModelRenderArg = false;
            rootScope.model = { global: {}, graphs: [], metrics: [] };
            rootScope.graphTypes = [ "unittest1", "unittest2" ];
            rootScope.config = {
                ui:{graphs:{dygraph:{highlightingDefault:true}}},
                defaultGraphType: "dygraph"
            };

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
            var clone = deepUtilsRef.deepClone(orig);
            expect(clone).toEqualData(orig);
            expect(clone == orig).toEqualData(false);
        });

        it('should create a single graph on initialisation if none exist', function () {
            expect(scope.graphs).toEqualData([
                {
                    id: idGeneratorRef.prev(),
                    title: "Graph 1",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                }
            ]);
            expect(rootScope.model.graphs).toEqualData(scope.graphs);
        });

        it('should set the graph type when creating a graph on initialisation if only one type is defined', function () {
            rootScope.graphTypes = [ "unittest1" ];


            // force reload
            rootScope.model = {};
            scope.loadModel(null, false);
            var firstId = idGeneratorRef.prev();

            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "unittest1",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
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

            scope.loadModel(null, false);

            expect(scope.graphs).toEqualData(rootScope.model.graphs);
        });

        it('should add a new graph to the model with a default title when the addGraph() function is called', function () {

            var firstId = idGeneratorRef.prev();
            scope.addGraph();

            var secondId = idGeneratorRef.prev();
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                }
            ]);

            scope.addGraph();

            var thirdId = idGeneratorRef.prev();
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                },
                {
                    id: thirdId,
                    title: "Graph 3",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                }
            ]);
        });

        it('should set the graph type on new graphs if there is only one type defined', function () {
            rootScope.graphTypes = [ "unittest1" ];
            var firstId = idGeneratorRef.prev();

            scope.addGraph();
            var secondId = idGeneratorRef.prev();

            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: "unittest1",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                }
            ]);

            scope.addGraph();

            var thirdId = idGeneratorRef.prev();
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: "unittest1",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                },
                {
                    id: thirdId,
                    title: "Graph 3",
                    type: "unittest1",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                }
            ]);
        });

        it('should request rendering when saving changes', function () {
            scope.saveAndRenderGraphs();
            expect(saveModelCalled).toEqualData(true);
            expect(saveModelRenderArg).toEqualData(true);
        });

        it('should persist internal graphs to the model when saving changes', function () {
            expect(rootScope.model.graphs).toEqualData([
                {
                    id: idGeneratorRef.prev(),
                    title: "Graph 1",
                    type: "dygraph",
                    gnuplot: {
                        y1AxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true,
                        style: "linespoint"
                    },
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    },
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        annotations: true,
                        countFilter: {
                            end: "top",
                            count: "",
                            measure: "mean"
                        },
                        valueFilter: {
                            lowerBound: "",
                            measure: "any",
                            upperBound: ""
                        }
                    },
                    heatmap: {
                        style: "auto",
                        filterLowerBound: "",
                        filterUpperBound: "",
                        colourScheme:"RdYlGn"
                    },
                    scatter: {
                        xRange: "[:]",
                        yRange: "[:]"
                    }
                }
            ]);
            scope.addGraph();
            scope.saveAndRenderGraphs();
            expect(saveModelCalled).toEqualData(true);
            expect(rootScope.model.graphs.length).toEqualData(2);
        });

        it('should remove a graph from the model when requested', function () {
            scope.addGraph();

            var firstId = idGeneratorRef.prev();
            
            expect(scope.graphs.length).toEqualData(2);

            scope.deleteGraph(firstId);

            expect(scope.graphs.length).toEqualData(1);
        });

        it("should not remove a graph if it can't be found", function () {
            scope.addGraph();

            expect(scope.graphs.length).toEqualData(2);

            scope.deleteGraph("0");
            expect(scope.graphs.length).toEqualData(2);
        });

        it('should not create new graphs with an existing id', function () {
            scope.addGraph();

            var firstId = idGeneratorRef.prev();

            scope.addGraph();

            var secondId = idGeneratorRef.prev();

            expect(firstId == secondId).toEqualData(false);
        });

        it('should control the accordion appropriately when adding / removing graphs', function() {
            
            var id1 = idGeneratorRef.prev();

            expect(scope.isOpen[id1]).toEqualData(true);
           
            scope.addGraph();
            var id2 = idGeneratorRef.prev();

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(true);

            scope.addGraph();
            var id3 = idGeneratorRef.prev();

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
        
        it('should setup the date/time correctly when loading an empty model', function() {
            rootScope.model.global.absoluteTimeSpecification = false;
            scope.loadModel();
            expect(scope.model.relativePeriod).toEqualData("2h");
            expect(scope.model.fromDate).toEqualData("");
            expect(scope.model.fromTime).toEqualData("");
            expect(scope.model.toDate).toEqualData("");
            expect(scope.model.toDate).toEqualData("");
        });
        
        it('should setup the date/time correctly when loading a model with an invalid date/time', function() {
            rootScope.model.graphs = [{}];
            rootScope.model.global.absoluteTimeSpecification = false;
            scope.loadModel();
            expect(scope.model.relativePeriod).toEqualData("2h");
            expect(scope.model.fromDate).toEqualData("");
            expect(scope.model.fromTime).toEqualData("");

            var datum = moment.utc("2016/08/20 12:10:10", "YYYY/MM/DD HH:mm:ss");
            rootScope.model.global.absoluteTimeSpecification = true;
            scope.loadModel(datum);
            expect(scope.model.relativePeriod).toEqualData("2h");
            expect(scope.model.fromDate).toEqualData("2016/08/20");
            expect(scope.model.fromTime).toEqualData("10:10:10");
        });


    });
});

