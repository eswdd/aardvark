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

    describe('AardvarkCtrl', function () {
        var rootScope, scope, ctrl, $httpBackend, browser, location, controllerCreator;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $browser, $location, $controller) {
            $httpBackend = _$httpBackend_;
            $httpBackend.expectGET('/aardvark/config').respond({key: "value"});
            browser = $browser;
            location = $location;
            controllerCreator = $controller;

            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();
            ctrl = $controller('AardvarkCtrl', {$scope: scope, $rootScope: rootScope});
        }));


        it('should create a default model and initialise the config on initialisation', function () {
            expect(rootScope.model).toEqualData({
                global: {},
                graphs: [],
                metrics: []
            });
            $httpBackend.flush();

            expect(rootScope.config).toEqualData({
                key: "value"
            });
        });


        it('should create re-request the config and call listeners when config update is requested', function () {
            $httpBackend.flush();

            expect(rootScope.config).toEqualData({
                key: "value"
            });

            var configReceived = false;
            rootScope.onConfigUpdate(function () {
                configReceived = true;
            });

            // we should get a second get call when we ask the config to update
            $httpBackend.expectGET('/aardvark/config').respond({key: "value"});
            rootScope.updateConfig();
            $httpBackend.flush();
            expect(configReceived).toEqualData(true);
        });

        it('should save the model to the location hash when requested and then rehydrate correctly', function () {

            expect(rootScope.model).toEqualData({
                global: {},
                graphs: [],
                metrics: []
            });

            rootScope.model = {
                global: {},
                graphs: [],
                metrics: [
                    {
                        id: "1",
                        name: "fred"
                    }
                ]
            };
            rootScope.saveModel();

            expect(location.url().indexOf('#')).toEqualData(0);
            var encoded = location.url().substring(0);
            
            location.hash("");
            ctrl = controllerCreator('AardvarkCtrl', {$scope: scope, $rootScope: rootScope});
            expect(rootScope.model).toEqualData({
                global: {},
                graphs: [],
                metrics: []
            });

            location.hash(encoded);
            ctrl = controllerCreator('AardvarkCtrl', {$scope: scope, $rootScope: rootScope});
            expect(rootScope.model).toEqualData({"global":{"absoluteTimeSpecification":false,"autoReload":false,"autoGraphHeight":false,globalDownsampling:false,"relativePeriod":"2h","graphHeight":null},"graphs":[],"metrics":[{"id":1,"name":"fred","tags":[],"graphOptions":{"scatter":null,"rate":false,"rateCounter":false,"rightAxis":false,"downsample":false,"graphId":0,"rateCounterReset":"","rateCounterMax":"","downsampleBy":"","downsampleTo":""}}]});
            rootScope.saveModel();

            expect(location.url().indexOf('#')).toEqualData(0);
            encoded = location.url().substring(0);

            location.hash("");
            ctrl = controllerCreator('AardvarkCtrl', {$scope: scope, $rootScope: rootScope});
            expect(rootScope.model).toEqualData({
                global: {},
                graphs: [],
                metrics: []
            });

            location.hash(encoded);
            ctrl = controllerCreator('AardvarkCtrl', {$scope: scope, $rootScope: rootScope});
            expect(rootScope.model).toEqualData({"global":{"absoluteTimeSpecification":false,"autoReload":false,"autoGraphHeight":false,globalDownsampling:false,"relativePeriod":"2h","graphHeight":null},"graphs":[],"metrics":[{"id":1,"name":"fred","tags":[],"graphOptions":{"scatter":null,"rate":false,"rateCounter":false,"rightAxis":false,"downsample":false,"graphId":0,"rateCounterReset":"","rateCounterMax":"","downsampleBy":"","downsampleTo":""}}]});
            rootScope.saveModel();
            expect(location.url()).toEqualData(encoded);
        });
        
        it('autoReload timer should be triggered when setup', function() {
            expect(rootScope.activeTimeoutId).toEqualData(null);
            
            rootScope.model = {
                global: {
                    autoReload: true,
                    autoReloadPeriod: "60"
                },
                graphs: [],
                metrics: []
            }
            
            rootScope.resetAutoReload();
            
            var timeoutId = rootScope.activeTimeoutId;
            expect(timeoutId != null).toEqualData(true);

            rootScope.model = {
                global: {
                    autoReload: true,
                    autoReloadPeriod: "120"
                },
                graphs: [],
                metrics: []
            }

            rootScope.resetAutoReload();

            var timeoutId2 = rootScope.activeTimeoutId;
            expect(timeoutId != timeoutId2).toEqualData(true);

            rootScope.model = {
                global: {
                    autoReload: false
                },
                graphs: [],
                metrics: []
            }

            rootScope.resetAutoReload();
            
            expect(rootScope.activeTimeoutId).toEqualData(null);
        })

    });
});

