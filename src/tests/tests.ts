import testLodash from './tests.lodash';

// NOTE: These are browser tests: use `acav.tests()` in the dev console.

(window.acav as any).test = function test() {
    testLodash();
};
