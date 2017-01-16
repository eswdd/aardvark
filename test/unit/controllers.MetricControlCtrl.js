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

    describe('MetricControlCtrl', function() {
        var rootScope, scope, ctrl, controllerCreator;
        var configUpdateFunc;
        var saveModelCalled = false;
        var idGeneratorRef;
        var mockTsdbClient;
        var mockTsdbUtils;

        var callArraysToCheckAndCleanAfter = [];

        var suggestCalls = [];
        var getTagsCalls = []

        var mockMethod = function(name, callArray) {
            callArraysToCheckAndCleanAfter.push({name:name, calls: callArray});
            return function() {
                if (callArray.length == 0) {
                    fail("Unexpected call to "+name+": "+arguments);
                }
                else {
                    var call = callArray[0];
                    callArray.splice(0,1);
                    return call(arguments);
                }
            }
        }

        beforeEach(inject(function ($rootScope, $browser, $location, $controller, tsdbClient, idGenerator) {
            controllerCreator = $controller;
            idGeneratorRef = idGenerator;
            mockTsdbClient = {
                versionNumber: 20,
                TSDB_2_2: 22,
                suggest: mockMethod("$tsdbClient.suggest", suggestCalls),
                tagFilterMatchesValue: tsdbClient.tagFilterMatchesValue
            };
            mockTsdbUtils = {
                getTags: mockMethod("$tsdbUtils.getTags", getTagsCalls)
            };

            // hmm
            rootScope = $rootScope;

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }
            rootScope.saveModel = function() {
                saveModelCalled = true;
            }
            saveModelCalled = false;
            rootScope.model = { global: {}, graphs: [], metrics: [] };

            scope = $rootScope.$new();
            ctrl = $controller('MetricControlCtrl', {$scope: scope, $rootScope: rootScope, tsdbClient: mockTsdbClient, tsdbUtils: mockTsdbUtils});
        }));

        afterEach(function() {
            for (var c=0; c<callArraysToCheckAndCleanAfter.length; c++) {
                var name = callArraysToCheckAndCleanAfter[c].name;
                var calls = callArraysToCheckAndCleanAfter[c].calls;
                if (calls.length != 0) {
                    fail("Expected calls array for "+name+" to be empty after test execution");
                    calls.splice(0, calls.length);
                }
            }
        });

        it('should register for config loads on start', function () {
            expect(configUpdateFunc).not.toEqual(null);
        });

        it('should load data for the tree on config update', function() {
            rootScope.config = {tsdbBaseReadUrl: "http://tsdb:4242"};
            suggestCalls.push(function(args) {
                expect(args[0]).toEqualData("metrics");
                expect(args[1]).toEqualData("");
                expect(args[2]).toEqualData(null);
                args[3]([
                    "flob",
                    "name.baldrick",
                    "name.blackadder",
                    "wibble",
                    "wibble.wobble"
                ]);
            });

            configUpdateFunc();

            var expectedDataForTheTree = [
                {id: "flob", name: "flob", isMetric: true, children: []},
                {id: "name", name: "name", isMetric: false, children: [
                    {id: "name.baldrick", name: "baldrick", isMetric: true, children: []},
                    {id: "name.blackadder", name: "blackadder", isMetric: true, children: []}
                ]},
                {id: "wibble", name: "wibble", isMetric: true, children: [
                    {id: "wibble.wobble", name: "wobble", isMetric: true, children: []}
                ]}
            ];

            expect(scope.dataForTheTree).toEqualData(expectedDataForTheTree);
            expect(scope.allParentNodes).toEqualData([
                expectedDataForTheTree[1], expectedDataForTheTree[2]
            ]);
        });

        it('should load data for the tree on config update with prefix exclusions', function() {
            rootScope.config = {hidePrefixes: ["wibble","dave.fred"]};
            suggestCalls.push(function(args) {
                expect(args[0]).toEqualData("metrics");
                expect(args[1]).toEqualData("");
                expect(args[2]).toEqualData(null);
                args[3]([
                    "flob",
                    "dave.fred.jim",
                    "dave.jim.fred",
                    "name.baldrick",
                    "name.blackadder",
                    "wibble",
                    "wibble.wobble"
                ]); 
            });

            configUpdateFunc();

            var expectedDataForTheTree = [
                {id: "flob", name: "flob", isMetric: true, children: []},
                {id: "dave", name: "dave", isMetric: false, children: [
                    {id: "dave.jim", name: "jim", isMetric: false, children: [
                        {id: "dave.jim.fred", name: "fred", isMetric: true, children: []}
                    ]}
                ]},
                {id: "name", name: "name", isMetric: false, children: [
                    {id: "name.baldrick", name: "baldrick", isMetric: true, children: []},
                    {id: "name.blackadder", name: "blackadder", isMetric: true, children: []}
                ]}
            ];

            expect(scope.dataForTheTree).toEqualData(expectedDataForTheTree);
        });

        it('should load data for the tree on config update with prefix exclusions disabled in ui', function() {
            rootScope.config = {tsdbBaseReadUrl: "http://tsdb:4242", hidePrefixes: ["wibble","dave.fred"]};
            scope.showingIgnoredPrefixes = true;

            suggestCalls.push(function(args) {
                expect(args[0]).toEqualData("metrics");
                expect(args[1]).toEqualData("");
                expect(args[2]).toEqualData(null);
                args[3]([
                    "flob",
                    "dave.fred.jim",
                    "dave.jim.fred",
                    "name.baldrick",
                    "name.blackadder",
                    "wibble",
                    "wibble.wobble"
                ]);
            });

            configUpdateFunc();

            var expectedDataForTheTree = [
                {id: "flob", name: "flob", isMetric: true, children: []},
                {id: "dave", name: "dave", isMetric: false, children: [
                    {id: "dave.fred", name: "fred", isMetric: false, children: [
                        {id: "dave.fred.jim", name: "jim", isMetric: true, children: []}
                    ]},
                    {id: "dave.jim", name: "jim", isMetric: false, children: [
                        {id: "dave.jim.fred", name: "fred", isMetric: true, children: []}
                    ]}
                ]},
                {id: "name", name: "name", isMetric: false, children: [
                    {id: "name.baldrick", name: "baldrick", isMetric: true, children: []},
                    {id: "name.blackadder", name: "blackadder", isMetric: true, children: []}
                ]},
                {id: "wibble", name: "wibble", isMetric: true, children: [
                    {id: "wibble.wobble", name: "wobble", isMetric: true, children: []}
                ]}
            ];

            expect(scope.dataForTheTree).toEqualData(expectedDataForTheTree);
        });

        // todo: test should not load data for the tree if already loading
        it('should not load data for the tree if already loading', function() {
        });

        it('should not show the expand all button if it is disabled in config', function() {
            rootScope.config = {ui:{metrics:{enableExpandAll: false}}};
            expect(scope.expandAllVisible()).toEqual(false);
        });

        it('should show the expand all button if it is enabled in config', function() {
            rootScope.config = {ui:{metrics:{enableExpandAll: true}}};
            expect(scope.expandAllVisible()).toEqual(true);
        });

        it('should correctly process a selected node in the tree', function() {
            var node = {id: "name.baldrick", name: "baldrick", isMetric: true, children: []};

            getTagsCalls.push(function(args) {
                expect(args[0]).toEqualData("name.baldrick");
                args[1]({key1: ["value1","value2"], key2: ["value3"]});
            });

            scope.nodeSelectedForAddition(node, true);

            // simple results
            expect(scope.addButtonVisible()).toEqualData(true);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.deleteButtonVisible()).toEqualData(false);
            expect(scope.selectedMetric).toEqualData("name.baldrick");
            expect(scope.tagNames).toEqualData(["key1","key2"]);
            expect(scope.tagValues).toEqualData({
                key1: [ "value1", "value2" ],
                key2: [ "value3" ]
            });
            expect(scope.nodeSelectionDisabled).toEqualData(true);

            // tag options are a little more complex
            expect(scope.tagOptions.key1.suggest('')).toEqualData([{label:"value1",value:"value1"},{label:"value2",value:"value2"}]);
            expect(scope.tagOptions.key2.suggest('')).toEqualData([{label:"value3",value:"value3"}]);

        })

        it('should cleanup when a node is deselected and not try to get tag values', function() {
            var node = {id: "name.baldrick", name: "baldrick", isMetric: true, children: []};

            scope.nodeSelectedForAddition(node, false);
            // no calls should be made

            // simple results
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.selectedMetricId).toEqualData("0");
            expect(scope.selectedMetric).toEqualData("");
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tagValues).toEqualData({});
            expect(scope.tagOptions).toEqualData({});
            expect(scope.nodeSelectionDisabled).toEqualData(false);
        });

        it('should suggest correct tag values', function() {
            scope.tagValues = { key1: ["value1","something2","value2"] };

            var ret_value1 = {label:"value1",value:"value1"};
            var ret_something2 = {label:"something2",value:"something2"};
            var ret_value2 = {label:"value2",value:"value2"};

            expect(scope.suggestTagValues('','key1')).toEqualData([ret_value1,ret_something2,ret_value2]);
            expect(scope.suggestTagValues('value','key1')).toEqualData([ret_value1,ret_value2]);
            expect(scope.suggestTagValues('value1','key1')).toEqualData([ret_value1]);
            expect(scope.suggestTagValues('value12','key1')).toEqualData([]);
            expect(scope.suggestTagValues('*','key1')).toEqualData([]);
            expect(scope.suggestTagValues('value1|','key1')).toEqualData([{"label":"something2","value":"value1|something2"},{"label":"value2","value":"value1|value2"}]);
            expect(scope.suggestTagValues('value1|value2','key1')).toEqualData([{"label":"value2","value":"value1|value2"}]);
            expect(scope.suggestTagValues('value1|value2|','key1')).toEqualData([{"label":"something2","value":"value1|value2|something2"}]);
            expect(scope.suggestTagValues('value1|value2|something2|','key1')).toEqualData([]);
        });
        
        it('should add a second tag row when filtering is supported', function() {
            mockTsdbClient.versionNumber = mockTsdbClient.TSDB_2_2;
            expect(scope.tagFilters.length).toEqualData(0);
            scope.addTagRow("tag1");
            expect(scope.tagFilters.length).toEqualData(1);
            scope.addTagRow("tag1");
            expect(scope.tagFilters.length).toEqualData(2);
        });
        
        it('should not add a second tag row when filtering is supported', function() {
            expect(scope.tagFilters.length).toEqualData(0);
            scope.addTagRow("tag1");
            expect(scope.tagFilters.length).toEqualData(1);
            scope.addTagRow("tag1");
            expect(scope.tagFilters.length).toEqualData(1);
        });
        
        it('should correctly count matching tag values', function() {
            scope.tagValues = { key1: ["value1","something2","value2"] };

            scope.tag = { key1: '' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("");
            scope.tag = { key1: 'value' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: 'value1' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(1)");
            scope.tag = { key1: 'value12' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: '*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(3)");
            scope.tag = { key1: '.*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: 'value1|value2' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(2)");
        });
        
        it('should correctly count matching tag values when filtering available', function() {
            mockTsdbClient.versionNumber = mockTsdbClient.TSDB_2_2;
            scope.tagValues = { key1: ["value1","something2","value2","Value3"] };
            
            var tagFilter = {name: 'key1', value: ''};
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("");
            tagFilter.value = 'value';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(0)");
            tagFilter.value = 'value1';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(1)");
            tagFilter.value = 'value12';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(0)");
            tagFilter.value = '*';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(4)");
            tagFilter.value = 'literal_or(value4)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(0)");
            tagFilter.value = 'literal_or(value1)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(1)");
            tagFilter.value = 'literal_or(value1|value2)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(2)");
            tagFilter.value = 'literal_or(value1|value2|value3)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(2)");
            tagFilter.value = 'iliteral_or(value1|value2|value3)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(3)");
            tagFilter.value = 'not_literal_or(value4)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(4)");
            tagFilter.value = 'not_literal_or(value1)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(3)");
            tagFilter.value = 'not_literal_or(value1|value2)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(2)");
            tagFilter.value = 'not_literal_or(value1|value2|value3)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(2)");
            tagFilter.value = 'not_iliteral_or(value1|value2|value3)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(1)");
            tagFilter.value = 'wildcard(.*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(0)");
            tagFilter.value = 'wildcard(*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(4)");
            tagFilter.value = 'iwildcard(*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(4)");
            tagFilter.value = 'wildcard(value*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(2)");
            tagFilter.value = 'iwildcard(value*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(3)");
            tagFilter.value = 'wildcard(*e*2)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(2)");
            tagFilter.value = 'regexp(*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(0)");
            tagFilter.value = 'regexp(.*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(4)");
            tagFilter.value = 'regexp(value.*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(2)");
            tagFilter.value = 'regexp([vV]alue.*)';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(3)");
            tagFilter.value = '.*';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(0)");
            tagFilter.value = 'value1|value2';
            expect(scope.tagValuesMatchCountFiltering(tagFilter)).toEqualData("(2)");
        });

        it('should add the metric to the model when addMetric() is called', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tagFilters = [{name:"tag1", value: ''}, {name:"tag2", value: '*'}, {name:"tag3",value: 'value'}];
            scope.selectedMetric = "some.metric.name";
            scope.rate = true;
            scope.rateCounter = true;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '1';
            scope.rightAxis = true;
            scope.downsample = true;
            scope.downsampleBy = "zimsum";
            scope.downsampleTo = "10m";
            scope.nodeSelectionDisabled = true; // set by nodeSelectedForAddition normally

            scope.addMetric();

            expect(saveModelCalled).toEqualData(true);
            var newMetricId = idGeneratorRef.prev();
            expect(rootScope.model.metrics).toEqualData([
                {
                    id: newMetricId,
                    name: 'some.metric.name',
                    tags: [
                        {
                            name: "tag1",
                            value: "",
                            groupBy: true
                        },
                        {
                            name: "tag2",
                            value: "*",
                            groupBy: true
                        },
                        {
                            name: "tag3",
                            value: "value",
                            groupBy: true
                        }
                    ],
                    graphOptions: {
                        graphId: '0',
                        axis: 'x1y2',
                        aggregator: 'sum',
                        rate: true,
                        rateCounter: true,
                        rateCounterMax: '123',
                        rateCounterReset: '1',
                        downsample: true,
                        downsampleBy: 'zimsum',
                        downsampleTo: '10m'
                    }
                }
            ]);
            expect(scope.selectedMetric).toEqualData("");
            expect(scope.selectedMetricId).toEqualData(newMetricId);
            expect(scope.nodeSelectionDisabled).toEqualData(true);
            expect(scope.saveButtonVisible()).toEqualData(true);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
        })

        it('should clear the form when a user cancels adding a new metric', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.selectedMetric = "some.metric.name";
            scope.selectedTreeNode = "mock-node";
            scope.rightAxis = false;
            scope.rate = true;
            scope.rateCounter = true;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '1';
            scope.aggregator = "zimsum";
            scope.downsample = true;
            scope.downsampleBy = "sum";
            scope.downsampleTo = "10m";
            scope.nodeSelectionDisabled = true; // set by nodeSelectedForAddition normally

            scope.clearMetric();

            expect(saveModelCalled).toEqualData(false);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.aggregator).toEqualData('sum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterMax).toEqualData('');
            expect(scope.rateCounterReset).toEqualData('');
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('avg');
            expect(scope.downsampleTo).toEqualData('');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.selectedTreeNode).toEqualData(undefined);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);
        });

        it('should populate the metric form when an existing metric is selected', function() {
            rootScope.config = {tsdbBaseReadUrl: "http://tsdb:4242"};
            rootScope.model = {
                graphs: [
                    {
                        id: "abc",
                        type: "debug",
                        title: "Title1"
                    }
                ],
                metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "",
                                groupBy: true
                            },
                            {
                                name: "tag2",
                                value: "*",
                                groupBy: true
                            },
                            {
                                name: "tag3",
                                value: "value",
                                groupBy: true
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: true,
                            downsampleBy: '10m'
                        }
                    }
                ]
            }

            scope.selectedMetricId = "123";


            var response = {
                "type":"LOOKUP",
                "metric":"some.metric.name",
                "limit":100000,
                "time":1,
                "results":[
                    {
                        "metric":"some.metric.name",
                        "tags":{
                            "tag1":"value1",
                            "tag2":"value3",
                            "tag3":"value"
                        },
                        "tsuid":"000006000001000009"
                    },
                    {
                        "metric":"some.metric.name",
                        "tags":{
                            "tag1":"value2",
                            "tag2":"value3",
                            "tag3":"value"
                        },
                        "tsuid":"00000600000100000a"
                    }
                ],
                "startIndex":0,
                "totalResults":2
            };

            getTagsCalls.push(function(args) {
                expect(args[0]).toEqualData("some.metric.name");
                args[1]({tag1: ["value1","value2"], tag2: ["value3"], tag3: ["value"]});
            });

            scope.nodeSelectedForEditing();

            expect(scope.tagNames).toEqualData(["tag1","tag2","tag3"]);
            expect(scope.tag).toEqualData({tag1:"",tag2:"*",tag3:"value"});
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.rate).toEqualData(true);
            expect(scope.downsample).toEqualData(true);
            expect(scope.downsampleBy).toEqualData('10m');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(true);
            expect(scope.deleteButtonVisible()).toEqualData(true);
        });

        it('should update the model when a user clicks save from an existing metric being edited', function() {
            rootScope.model = {
                graphs: [],
                    metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "abc",
                                groupBy: true
                            },
                            {
                                name: "tag2",
                                value: "zab",
                                groupBy: true
                            },
                            {
                                name: "tag3",
                                value: "",
                                groupBy: true
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: false,
                            downsampleBy: ''
                        }
                    }
                ]
                };

            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tagFilters = [{name:"tag1",value: ''}, {name:"tag2", value: '*'}, {name:"tag3",value: 'value'}];
            scope.selectedMetricId = "123";
            scope.aggregator = 'zimsum';
            scope.rightAxis = false;
            scope.rate = false;
            scope.rateCounter = false;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '456';
            scope.downsample = true;
            scope.downsampleTo = "10m";
            scope.downsampleBy = "sum";

            scope.saveMetric();

            expect(saveModelCalled).toEqualData(true);
            expect(scope.tagNames).toEqualData(["tag1","tag2","tag3"]);
            expect(scope.tagFilters).toEqualData([{name:"tag1",value: ''}, {name:"tag2", value: '*'}, {name:"tag3",value: 'value'}]);
            expect(scope.selectedMetricId).toEqualData('123');
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.aggregator).toEqualData('zimsum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterMax).toEqualData('123');
            expect(scope.rateCounterReset).toEqualData('456');
            expect(scope.downsample).toEqualData(true);
            expect(scope.downsampleBy).toEqualData('sum');
            expect(scope.downsampleTo).toEqualData('10m');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(true);

            expect(rootScope.model).toEqualData(
                {
                    graphs: [],
                    metrics: [
                        {
                            id: "123",
                            name: 'some.metric.name',
                            tags: [
                                {
                                    name: "tag1",
                                    value: "",
                                    groupBy: true
                                },
                                {
                                    name: "tag2",
                                    value: "*",
                                    groupBy: true
                                },
                                {
                                    name: "tag3",
                                    value: "value",
                                    groupBy: true
                                }
                            ],
                            graphOptions: {
                                graphId: '0',
                                aggregator: 'zimsum',
                                axis: 'x1y1',
                                rate: false,
                                rateCounter: false,
                                rateCounterMax: '123',
                                rateCounterReset: '456',
                                downsample: true,
                                downsampleBy: 'sum',
                                downsampleTo: '10m'
                            }
                        }
                    ]
                }
            );
        });

        it('should update the model when a user clicks delete from an existing metric being edited', function() {
            rootScope.model = {
                graphs: [],
                    metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "abc",
                                groupBy: true
                            },
                            {
                                name: "tag2",
                                value: "zab",
                                groupBy: true
                            },
                            {
                                name: "tag3",
                                value: "",
                                groupBy: true
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: false,
                            downsampleBy: ''
                        }
                    }
                ]
                };

            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.selectedMetricId = "123";
            scope.selectedTreeNode = "mock-node";
            scope.aggregator = 'zimsum';
            scope.rightAxis = false;
            scope.rate = false;
            scope.rateCounter = false;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '456';
            scope.downsample = true;
            scope.downsampleTo = "10m";
            scope.downsampleBy = "sum";

            scope.deleteMetric();

            expect(saveModelCalled).toEqualData(true);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.selectedMetricId).toEqualData('0');
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.aggregator).toEqualData('sum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterMax).toEqualData('');
            expect(scope.rateCounterReset).toEqualData('');
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('avg');
            expect(scope.downsampleTo).toEqualData('');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.selectedTreeNode).toEqualData(undefined);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.deleteButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);

            expect(rootScope.model).toEqualData(
                {
                    graphs: [],
                    metrics: []
                }
            );
        });

        it('should only delete the selected metric when a user clicks delete from an existing metric being edited', function() {
            rootScope.model = {
                graphs: [],
                    metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "abc"
                            },
                            {
                                name: "tag2",
                                value: "zab"
                            },
                            {
                                name: "tag3",
                                value: ""
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: false,
                            downsampleBy: ''
                        }
                    },
                    {
                        id: "456",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "abc"
                            },
                            {
                                name: "tag2",
                                value: "zab"
                            },
                            {
                                name: "tag3",
                                value: ""
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: false,
                            downsampleBy: ''
                        }
                    }
                ]
                };

            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.selectedMetricId = "123";
            scope.selectedTreeNode = "mock-node";
            scope.aggregator = 'zimsum';
            scope.rightAxis = false;
            scope.rate = false;
            scope.rateCounter = false;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '456';
            scope.downsample = true;
            scope.downsampleTo = "10m";
            scope.downsampleBy = "sum";

            scope.deleteMetric();

            expect(saveModelCalled).toEqualData(true);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.selectedMetricId).toEqualData('0');
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.aggregator).toEqualData('sum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterMax).toEqualData('');
            expect(scope.rateCounterReset).toEqualData('');
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('avg');
            expect(scope.downsampleTo).toEqualData('');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.selectedTreeNode).toEqualData(undefined);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.deleteButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);

            expect(rootScope.model).toEqualData(
                {
                    graphs: [],
                    metrics: [
                        {
                            id: "456",
                            name: 'some.metric.name',
                            tags: [
                                {
                                    name: "tag1",
                                    value: "abc"
                                },
                                {
                                    name: "tag2",
                                    value: "zab"
                                },
                                {
                                    name: "tag3",
                                    value: ""
                                }
                            ],
                            graphOptions: {
                                graphId: 'abc',
                                rate: true,
                                downsample: false,
                                downsampleBy: ''
                            }
                        }]
                }
            );
        });

        it('should clear the form when a user cancels editing an existing metric', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.selectedMetricId = "123";
            scope.selectedTreeNode = "mock-node";
            scope.aggregator = "avg";
            scope.rightAxis = true;
            scope.rate = true;
            scope.rateCounter = true;
            scope.rateCounterReset = "123";
            scope.rateCounterMax = "123";
            scope.downsample = true;
            scope.downsampleTo = "10m";
            scope.downsampleBy = "sum";

            scope.clearMetric();

            expect(saveModelCalled).toEqualData(false);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.selectedMetricId).toEqualData('0');
            expect(scope.aggregator).toEqualData('sum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterReset).toEqualData('');
            expect(scope.rateCounterMax).toEqualData('');
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('avg');
            expect(scope.downsampleTo).toEqualData('');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.selectedTreeNode).toEqualData(undefined);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);
        });
        
        it('should reset user entered metric options on selecting a new metric', function() {
            rootScope.config = { tsdbBaseReadUrl: "http://tsdb:4242" };
            rootScope.model = {
                graphs: [{id: "1"}]
            };

            var node = {id: "name.baldrick", name: "baldrick", isMetric: true, children: []};
            var response = {
                "type":"LOOKUP",
                "metric":"name.baldrick",
                "limit":100000,
                "time":1,
                "results":[
                    {
                        "metric":"name.baldrick",
                        "tags":{
                            "key1":"value1",
                            "key2":"value3"
                        },
                        "tsuid":"000006000001000009"
                    },
                    {
                        "metric":"name.baldrick",
                        "tags":{
                            "key1":"value2",
                            "key2":"value3"
                        },
                        "tsuid":"00000600000100000a"
                    }
                ],
                "startIndex":0,
                "totalResults":2
            };

            getTagsCalls.push(function(args) {
                expect(args[0]).toEqualData("name.baldrick");
                args[1]({key1: ["value1","value2"], key2: ["value3"]});
            });

            scope.nodeSelectedForAddition(node, true);

            var checkDefaults = function() {
                expect(scope.tagFilters).toEqualData([]);
                expect(scope.selectedMetricId).toEqualData("0");
                expect(scope.rate).toEqualData(false);
                expect(scope.rateCounter).toEqualData(false);
                expect(scope.rateCounterMax).toEqualData("");
                expect(scope.rateCounterReset).toEqualData("");
                expect(scope.downsample).toEqualData(false);
                expect(scope.downsampleBy).toEqualData("avg");
                expect(scope.downsampleTo).toEqualData("");
                expect(scope.rightAxis).toEqualData(false);
                expect(scope.aggregator).toEqualData("sum");
            }
            
            checkDefaults();
            expect(scope.graphId).toEqualData("1");
            expect(scope.selectedMetric).toEqualData("name.baldrick");
            expect(scope.tagValues).toEqualData({
                key1: ["value1","value2"],
                key2: ["value3"]
            });
            expect(scope.tagNames).toEqualData(["key1","key2"]);
            expect(scope.tag).toEqualData({key1:"",key2:""});
            expect(scope.tagOptions).toEqualData({key1:{},key2:{}});
            scope.tagFilters = [
                {name:"key1",value:"*",groupBy:true}
            ];
            scope.tag.key2 = "wibble";
            scope.rate = true;

            node = {id: "name.blackadder", name: "blackadder", isMetric: true, children: []};
            response = {
                "type":"LOOKUP",
                "metric":"name.blackadder",
                "limit":100000,
                "time":1,
                "results":[
                    {
                        "metric":"name.blackadder",
                        "tags":{
                            "key1":"value1",
                            "key3":"value3"
                        },
                        "tsuid":"000006000001000009"
                    },
                    {
                        "metric":"name.blackadder",
                        "tags":{
                            "key1":"value2",
                            "key3":"value3"
                        },
                        "tsuid":"00000600000100000a"
                    }
                ],
                "startIndex":0,
                "totalResults":2
            };

            getTagsCalls.push(function(args) {
                expect(args[0]).toEqualData("name.blackadder");
                args[1]({key1: ["value1","value2"], key3: ["value3"]});
            });

            scope.nodeSelectedForAddition(node, true);
            checkDefaults();
            expect(scope.graphId).toEqualData("1");
            expect(scope.selectedMetric).toEqualData("name.blackadder");
            expect(scope.tagValues).toEqualData({
                key1: ["value1","value2"],
                key3: ["value3"]
            });
            expect(scope.tagNames).toEqualData(["key1","key3"]);
            expect(scope.tag).toEqualData({key1:"",key3:""});
            expect(scope.tagOptions).toEqualData({key1:{},key3:{}});
            
            
        });
        
        it('should display the tree filter button by default', function() {
            expect(scope.treeFilterButtonVisible()).toEqualData(true);
        });
        
        it('should hide the tree filter button if the filter input should always be displayed', function() {
            rootScope.config = { ui: { metrics: { alwaysShowMetricFilter: true }}};
            expect(scope.treeFilterButtonVisible()).toEqualData(false);
        });
        
        it('should toggle the showing of the tree filter input when the tree filter button is clicked', function() {
            expect(scope.treeFilterVisible()).toEqualData(false);
            scope.showHideFilterInput();
            expect(scope.treeFilterVisible()).toEqualData(true);
            scope.showHideFilterInput();
            expect(scope.treeFilterVisible()).toEqualData(false);
        });
        
        it('should not hide the tree filter input when the tree filter button is clicked if the input should always be displayed', function() {
            rootScope.config = { ui: { metrics: { alwaysShowMetricFilter: true }}};
            expect(scope.treeFilterVisible()).toEqualData(true);
            scope.showHideFilterInput();
            expect(scope.treeFilterVisible()).toEqualData(true);
        });
    });
});

