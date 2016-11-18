'use strict';

describe('Aardvark services', function() {
    
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

    describe('tsdbClient', function () {
        var $httpBackend, $tsdbClient;

        beforeEach(inject(function (_$httpBackend_, tsdbClient) {
            $httpBackend = _$httpBackend_;

            // hmm
            $httpBackend.expectGET('http://tsdb:4242/api/config').respond({});
            $httpBackend.expectGET('http://tsdb:4242/api/version').respond({version: "2.0.0"});
            tsdbClient.init({
                tsdbBaseReadUrl: "http://tsdb:4242",
                tsdbBaseWriteUrl: "http://tsdb:4242"
            });
            $httpBackend.flush();
            $tsdbClient = tsdbClient;
        }));
    
        it('expects the tsdb client to exist', function() {
            expect($tsdbClient).toBeDefined();
        });
        
        it('expects a search/lookup call to default to not useMeta and return the correct json', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 1000, useMeta: false}).respond(expectedJson);
            $httpBackend.flush();
        });
        
        it('expects a search/lookup call to useMeta if tsd.core.meta.enable_tsuid_tracking is enabled and return the correct json', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.config["tsd.core.meta.enable_tsuid_tracking"] = "true";
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 1000, useMeta: true}).respond(expectedJson);
            $httpBackend.flush();
        });
        
        it('expects a search/lookup call to useMeta if tsd.core.meta.enable_tsuid_incrementing is enabled and return the correct json', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.config["tsd.core.meta.enable_tsuid_incrementing"] = "true";
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 1000, useMeta: true}).respond(expectedJson);
            $httpBackend.flush();
        });
        
        it('expects a search/lookup call to useMeta if tsd.core.meta.enable_realtime_ts is enabled and return the correct json', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.config["tsd.core.meta.enable_realtime_ts"] = "true";
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 1000, useMeta: true}).respond(expectedJson);
            $httpBackend.flush();
        });

        it('expects a search/lookup call to request the correct tags when specified as tags', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 4,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000001000002000003000003000005'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000002000002000003000003000005'
                    }
                ]
            };
            var metric = {
                name:"a.b.c", 
                tags: [
                    {name:"a",value:"value1|value2"},
                    {name:"b",value:"value3"},
                    {name:"c",value:"*"}
                ]
            };
            var postBody = {
                metric:"a.b.c",
                tags: [
                    {key:"a",value:"value1|value2"},
                    {key:"b",value:"value3"},
                    {key:"c",value:"*"}
                ],
                limit: 1000,
                useMeta: false
            };
            $tsdbClient.searchLookup(metric,false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', postBody).respond(expectedJson);
            $httpBackend.flush();
        });

        it('expects a search/lookup call to request the correct tags when specified as filters 1', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 4,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000001000002000003000003000005'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000002000002000003000003000005'
                    }
                ]
            };
            var metric = {
                name:"a.b.c",
                tags: [
                    {name:"a",value:"literal_or(value1|value2)",groupBy:true},
                    {name:"b",value:"literal_or(value3)",groupBy:true},
                    {name:"c",value:"wildcard(*)",groupBy:true}
                ]
            };
            var postBody = {
                metric:"a.b.c",
                tags: [
                    {key:"a", value:"value1|value2"},
                    {key:"b", value:"value3"},
                    {key:"c", value:"*"}
                ],
                limit: 1000,
                useMeta: false
            };
            $tsdbClient.searchLookup(metric,true,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', postBody).respond(expectedJson);
            $httpBackend.flush();
        });

        it('expects a search/lookup call to request the correct tags when specified as filters 2', function() {
            var response = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 1,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    }
                ]
            };
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 1,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    }
                ]
            };
            var metric = {
                name:"a.b.c",
                tags: [
                    {name:"a",value:"literal_or(value1|value2)",groupBy:true},
                    {name:"a",value:"literal_or(value2|value3)",groupBy:true},
                    {name:"b",value:"literal_or(value3)",groupBy:true},
                    {name:"b",value:"wildcard(*)",groupBy:true},
                    {name:"c",value:"wildcard(*)",groupBy:true},
                    {name:"c",value:"literal_or(value4)",groupBy:true}
                ]
            };
            var postBody = {
                metric:"a.b.c",
                tags: [
                    {key:"a", value:"value2"},
                    {key:"b", value:"value3"},
                    {key:"c", value:"value4"}
                ],
                limit: 1000,
                useMeta: false
            };
            $tsdbClient.searchLookup(metric,true,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', postBody).respond(response);
            $httpBackend.flush();
        });

        it('expects a search/lookup call to request the correct tags when specified as filters 3', function() {
            var response = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 4,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000001000002000003000003000005'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000002000002000003000003000005'
                    }
                ]
            };
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 4,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    }
                ]
            };
            var metric = {
                name:"a.b.c",
                tags: [
                    {name:"a",value:"iliteral_or(value1|value2)",groupBy:true},
                    {name:"b",value:"wildcard(value3*)",groupBy:true},
                    {name:"c",value:"regexp(.*4)",groupBy:true}
                ]
            };
            var postBody = {
                metric:"a.b.c",
                tags: [
                    {key:"a", value:"*"},
                    {key:"b", value:"*"},
                    {key:"c", value:"*"}
                ],
                limit: 1000,
                useMeta: false
            };
            $tsdbClient.searchLookup(metric,true,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', postBody).respond(response);
            $httpBackend.flush();
        });
        
        it('expects saveAnnotation to return the data tsdb returns', function() {
            var annotation = {
                tsuid: 123,
                startTime: 12344567890,
                description: "qibble"
            }
            $tsdbClient.saveAnnotation(annotation, function(response) {
                expect(response).toEqualData(annotation);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectPOST('http://tsdb:4242/api/annotation', annotation).respond(annotation);
            $httpBackend.flush();
        });
        
        it('expects deleteAnnotation to succeed', function() {
            $tsdbClient.deleteAnnotation("123", function() {
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectDELETE('http://tsdb:4242/api/annotation?tsuid=123').respond(204);
            $httpBackend.flush();
        });
        
        it('expects getTSMetaByTsuid to return the data tsdb returns', function() {
            var toReturn = {
                metric: "abc",
                tags: {
                    a: "b"
                }
            };
            $tsdbClient.getTSMetaByTsuid("123", function(response) {
                expect(response).toEqualData(toReturn);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectGET('http://tsdb:4242/api/uid/tsmeta?tsuid=123').respond(toReturn);
            $httpBackend.flush();
        });
        
        it('expects getUidMeta for a metric to return the data tsdb returns', function() {
            var toReturn = {
                name: "abc"
            };
            $tsdbClient.getUidMeta("123", "metric", function(response) {
                expect(response).toEqualData(toReturn);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectGET('http://tsdb:4242/api/uid/uidmeta?uid=123&type=metric').respond(toReturn);
            $httpBackend.flush();
        });
        
        it('expects getUidMeta for a tagk to return the data tsdb returns', function() {
            var toReturn = {
                name: "abc"
            };
            $tsdbClient.getUidMeta("123", "tagk", function(response) {
                expect(response).toEqualData(toReturn);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectGET('http://tsdb:4242/api/uid/uidmeta?uid=123&type=tagk').respond(toReturn);
            $httpBackend.flush();
        });
        
        it('expects getUidMeta for a tagv to return the data tsdb returns', function() {
            var toReturn = {
                name: "abc"
            };
            $tsdbClient.getUidMeta("123", "tagv", function(response) {
                expect(response).toEqualData(toReturn);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectGET('http://tsdb:4242/api/uid/uidmeta?uid=123&type=tagv').respond(toReturn);
            $httpBackend.flush();
        });
        
        it('expects getUidMeta for an invalid uid type to return the data tsdb returns', function() {
            $tsdbClient.getUidMeta("123", "wibble", function(response) {
                fail("expected failure");
            }, function(error) {
                expect(error).toEqualData("Unrecognised type: wibble");
            });
        });

    });
    
    

});