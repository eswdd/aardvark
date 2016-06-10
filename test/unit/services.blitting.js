'use strict';

describe('AardvarkServices.blitting', function() {
    
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
    
    it('expects the blitting factory to exist', inject(function(blitting) {
        expect(blitting).toBeDefined();
    }));

    it('expects a single unset flag to serialise correctly', inject(function(blitting) {
        expect(blitting.toBlittedInt([false])).toEqualData(1);
    }));
    
    it('expects a single set flag to serialise correctly', inject(function(blitting) {
        expect(blitting.toBlittedInt([true])).toEqualData(3);
    }));
    
    it('expects 2 flags to serialise correctly', inject(function(blitting) {
        expect(blitting.toBlittedInt([false, false])).toEqualData(5);
        expect(blitting.toBlittedInt([true, false])).toEqualData(7);
        expect(blitting.toBlittedInt([false, true])).toEqualData(13);
        expect(blitting.toBlittedInt([true, true])).toEqualData(15);
    }));
    
    it('expects a single unset flag to deserialise correctly', inject(function(blitting) {
        expect(blitting.fromBlittedInt(1, [false])).toEqualData([false]);
        expect(blitting.fromBlittedInt(1, [true])).toEqualData([false]);
    }));
    
    it('expects a single set flag to deserialise correctly', inject(function(blitting) {
        expect(blitting.fromBlittedInt(3, [false])).toEqualData([true]);
        expect(blitting.fromBlittedInt(3, [true])).toEqualData([true]);
    }));
    
    it('expects 2 flags to deserialise correctly', inject(function(blitting) {
        expect(blitting.fromBlittedInt(5, [true, true])).toEqualData([false, false]);
        expect(blitting.fromBlittedInt(7, [false, true])).toEqualData([true, false]);
        expect(blitting.fromBlittedInt(13, [true, false])).toEqualData([false, true]);
        expect(blitting.fromBlittedInt(15, [false, false])).toEqualData([true, true]);
    }));
    
    it('expects 1 flag where expecting 2 to deserialise correctly', inject(function(blitting) {
        expect(blitting.fromBlittedInt(1, [true, true])).toEqualData([false, true]);
        expect(blitting.fromBlittedInt(1, [true, false])).toEqualData([false, false]);
        expect(blitting.fromBlittedInt(3, [true, true])).toEqualData([true, true]);
        expect(blitting.fromBlittedInt(3, [true, false])).toEqualData([true, false]);
    }));

});