'use strict';

describe('AardvarkServices.idGenerator', function() {
    
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
    
    it('expects the idGenerator factory to exist', inject(function(idGenerator) {
        expect(idGenerator).toBeDefined();
    }));

    it('expects the id generator to return contiguous ids', inject(function(idGenerator) {
        expect(idGenerator.nextId()).toEqualData("1");
        expect(idGenerator.nextId()).toEqualData("2");
        expect(idGenerator.nextId()).toEqualData("3");
        expect(idGenerator.nextId()).toEqualData("4");
        expect(idGenerator.nextId()).toEqualData("5");
    }));

    it('expects the id generator to update the max', inject(function(idGenerator) {
        expect(idGenerator.nextId()).toEqualData("1");
        idGenerator.updateMax(10);
        expect(idGenerator.nextId()).toEqualData("11");
        idGenerator.updateMax(10);
        expect(idGenerator.nextId()).toEqualData("12");
        idGenerator.updateMax(20);
        expect(idGenerator.nextId()).toEqualData("21");
        idGenerator.updateMax(22);
        expect(idGenerator.nextId()).toEqualData("23");
        idGenerator.updateMax(23);
        expect(idGenerator.nextId()).toEqualData("24");
    }));

});