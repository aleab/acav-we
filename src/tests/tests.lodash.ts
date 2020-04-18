import _ from 'lodash';
import { expect } from 'chai';

// NOTE: Test lodash because of `lodash-webpack-plugin'

function success(name: string) { console.log(`%c[TEST] ${name} %c✓`, 'color: #3A62C1', 'color: green; font-weight: bold'); }
function fail(name: string, err: any) {
    console.log(`%c[TEST] ${name} %c✗`, 'color: #3A62C1', 'color: red; font-weight: bold');
    console.error('%s\n%s', err.message, err.stack);
}

function pick() {
    const obj = { prop0: 0, prop1: '1', prop2: { 2: 2 }, prop3: [3] };
    const obj1 = _.pick(obj, [ 'prop0', 'prop3', 'prop9000' ]);

    expect(Object.getOwnPropertyNames(obj1)).to.have.lengthOf(2);
    expect(obj1).to.have.own.property('prop0');
    expect(obj1).to.not.have.own.property('prop1');
    expect(obj1).to.not.have.own.property('prop2');
    expect(obj1).to.have.own.property('prop3');
}

function cloneDeep() {
    const sym = Symbol.for('symbol');
    const obj = {
        number: 0,
        string: 'string',
        boolean: true,
        symbol: sym,
        array: [ 0, 1, 2 ],
        object: {
            number: 1,
            string: 'string1',
            boolean: true,
            symbol: sym,
            array: [ 10, 11, 12 ],
            nestedObject: {
                number: 2,
                string: 'string2',
                boolean: false,
                symbol: sym,
                array: [ 20, 21, 22 ],
            },
        },
    };

    const rec = (o: any, c: any) => {
        Object.getOwnPropertyNames(o).forEach(k => {
            switch (typeof o[k]) {
                case 'number':
                case 'string':
                case 'boolean':
                case 'symbol':
                    expect(c[k]).to.equal(o[k]);
                    break;

                case 'object': {
                    if (Array.isArray(o[k])) {
                        expect(c[k]).to.not.equal(o[k]);
                        (o[k] as Array<any>).forEach((v, i) => rec(v, c[k][i]));
                    } else {
                        expect(c[k]).to.not.equal(o[k]);
                        rec(o[k], c[k]);
                    }
                    break;
                }

                default: break;
            }
        });
    };
    rec(obj, _.cloneDeep(obj));
}

function isEmpty() {
    expect(_.isEmpty({})).to.be.true;
    expect(_.isEmpty({ a: 0 })).to.be.false;

    expect(_.isEmpty([])).to.be.true;
    expect(_.isEmpty([0])).to.be.false;

    expect(_.isEmpty('')).to.be.true;
    expect(_.isEmpty('a')).to.be.false;

    expect(_.isEmpty(null)).to.be.true;
    expect(_.isEmpty(undefined)).to.be.true;
}

function isEqual() {
    const sym = Symbol.for('symbol');
    const now = Date.now() - 1000;

    const obj = {
        number: 0,
        string: 'string',
        boolean: true,
        symbol: sym,
        array: [ 0, 1, 2 ],
        date: new Date(now),
        object: { a: 1 },
    };

    expect(_.isEqual(obj, {
        number: 0,
        string: 'string',
        boolean: true,
        symbol: sym,
        array: [ 0, 1, 2 ],
        date: new Date(now),
        object: { a: 1 },
    })).to.be.true;
    expect(_.isEqual(obj, { ...obj, array: [ 1, 2, 3 ] })).to.be.false;
    expect(_.isEqual(obj, { ...obj, object: { a: 2 } })).to.be.false;
    expect(_.isEqual(obj, { ...obj, date: new Date() })).to.be.false;
}

function merge() {
    const obj = {
        number: 0,
        string: 'string',
        boolean: true,
        array: [ 0, 1, 2 ],
        object: { a: 1 },
        arrayOfObjects: [ { a: 1 }, { b: 2 } ],
    };

    expect(_.merge(obj, {
        number: 1,
        new: 'new',
        array: [3],
        object: { a: 2, b: 2 },
        arrayOfObjects: [ { c: 3 }, { d: 4 } ],
    })).to.deep.equal({
        number: 1,
        string: 'string',
        boolean: true,
        array: [ 3, 1, 2 ],
        object: { a: 2, b: 2 },
        arrayOfObjects: [ { a: 1, c: 3 }, { b: 2, d: 4 } ],
        new: 'new',
    });
}

function some() {
    const array: Array<string> = [ 'abc', 'cde', 'fgh', 'adh' ];

    expect(_.some(array, s => /^a/.test(s))).to.be.true;
    expect(_.some(array, s => /g$/.test(s))).to.be.false;
}

export default function test() {
    const tests: { [k: string]: () => void } = { cloneDeep, isEmpty, isEqual, merge, pick, some };
    Object.getOwnPropertyNames(tests).forEach(k => {
        try {
            tests[k]();
            success(`lodash.${k}`);
        } catch (err) {
            fail(`lodash.${k}`, err);
            throw err;
        }
    });
}
