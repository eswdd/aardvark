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


        it('should save the model to the location hash when requested', function () {

            expect(rootScope.model).toEqualData({
                graphs: [],
                metrics: []
            });

            rootScope.model = {
                graphs: [],
                metrics: [
                    {
                        id: "1",
                        name: "fred"
                    }
                ]
            };
            rootScope.saveModel();

//            browser.poll();
            expect(location.url()).toEqualData('#'+encodeURI('{"graphs":[],"metrics":[{"id":"1","name":"fred"}]}'));
        });


        it('should should correctly rehydrate the model from the hash', function () {
            // recreate the controller now we've changed the hash
            location.hash(encodeURI('{"metrics":[{"id":"1","name": "fred"}]}'));
//            browser.poll();
            ctrl = controllerCreator('AardvarkCtrl', {$scope: scope, $rootScope: rootScope});

            expect(rootScope.model).toEqualData(
                { metrics : [ { id : '1', name : 'fred' } ] }
            );
        });


    });
});

