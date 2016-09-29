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

    describe('AnnotationsDialogCtrl', function() {
        var ctrl, rootConfig;

        beforeEach(inject(function (_$httpBackend_) {
            $httpBackend = _$httpBackend_;
            rootConfig = {};
            ctrl = $controller('AnnotationsDialogCtrl', {rootConfig: rootConfig});
        }));
        
        

    });
});

