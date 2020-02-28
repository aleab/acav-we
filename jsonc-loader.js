/* eslint-disable import/no-extraneous-dependencies */
const JsoncParser = require('jsonc-parser');

function loader(source) {
    return JsoncParser.stripComments(source);
}

module.exports = loader;
