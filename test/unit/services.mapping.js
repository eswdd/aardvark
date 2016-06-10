'use strict';

describe('AardvarkServices.mapping', function() {
    
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

    it('expects the mapping factory to exist', inject(function(mapping) {
        expect(mapping).toBeDefined();
    }));

    it('expects the mapping to be bidirectional', inject(function(mapping) {
        var bdm = mapping.generateBiDiMapping(["a","b","c"]);
        expect(bdm.valueToId("a")).toEqualData(1);
        expect(bdm.valueToId("b")).toEqualData(2);
        expect(bdm.valueToId("c")).toEqualData(3);
        expect(bdm.valueToId("d")).toEqualData(null);
        expect(bdm.idToValue(0)).toEqualData(null);
        expect(bdm.idToValue(1)).toEqualData("a");
        expect(bdm.idToValue(2)).toEqualData("b");
        expect(bdm.idToValue(3)).toEqualData("c");
        expect(bdm.idToValue(4)).toEqualData(null);
    }));
});