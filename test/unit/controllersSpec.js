'use strict';

/* jasmine specs for controllers go here */
describe('Otis controllers', function () {

    beforeEach(function () {
        this.addMatchers({
            toEqualData: function (expected) {
                return angular.equals(this.actual, expected);
            }
        });
    });

    beforeEach(module('Otis'));

    describe('OtisCtrl', function () {
        var rootScope, scope, ctrl, $httpBackend, browser, location, controller;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $browser, $location, $controller) {
            $httpBackend = _$httpBackend_;
            $httpBackend.expectGET('/otis/config').respond({key: "value"});
            browser = $browser;
            location = $location;
            controller = $controller;

            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();
            ctrl = $controller('OtisCtrl', {$scope: rootScope});
        }));


        it('should create a default model and initialise the config on initialisation', function () {
            expect(rootScope.model).toEqualData({
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
            $httpBackend.expectGET('/otis/config').respond({key: "value"});
            rootScope.updateConfig();
            $httpBackend.flush();
            expect(configReceived).toEqualData(true);
        });


        it('should save the model to the location hash when requested', function () {

            expect(rootScope.model).toEqualData({
                metrics: []
            });

            rootScope.model = {
                metrics: [
                    {
                        id: "1",
                        name: "fred"
                    }
                ]
            };
            rootScope.saveModel();

//            browser.poll();
            expect(location.url()).toEqualData('#'+encodeURI('{"metrics":[{"id":"1","name":"fred"}]}'));
        });


        it('should should correctly rehydrate the model from the hash', function () {
            // recreate the controller now we've changed the hash
            location.hash(encodeURI('{"metrics":[{"id":"1","name": "fred"}]}'));
//            browser.poll();
            ctrl = controller('OtisCtrl', {$scope: rootScope});

            expect(rootScope.model).toEqualData(
                { metrics : [ { id : '1', name : 'fred' } ] }
            );
        });


    });

    /*

     x'#%7B%22metrics%22:%5B%7B%22id%22:%221%22,%22name%22:%22fred%22%7D%5D%7D' to equal data
      '#%7B%22metrics%22:%5B%7B%22id%22:%221%22,%22name%22:%22fred%22%7D%5D%7D'.


     describe('PhoneDetailCtrl', function(){
     var scope, $httpBackend, ctrl,
     xyzPhoneData = function() {
     return {
     name: 'phone xyz',
     images: ['image/url1.png', 'image/url2.png']
     }
     };


     beforeEach(inject(function(_$httpBackend_, $rootScope, $routeParams, $controller) {
     $httpBackend = _$httpBackend_;
     $httpBackend.expectGET('phones/xyz.json').respond(xyzPhoneData());

     $routeParams.phoneId = 'xyz';
     scope = $rootScope.$new();
     ctrl = $controller('PhoneDetailCtrl', {$scope: scope});
     }));


     it('should fetch phone detail', function() {
     expect(scope.phone).toEqualData({});
     $httpBackend.flush();

     expect(scope.phone).toEqualData(xyzPhoneData());
     });
     });*/
});
