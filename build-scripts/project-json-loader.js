const jsoncLoader = require('./jsonc-loader');

function loader(source) {
    let json = JSON.parse(jsoncLoader(source));

    if (json['title'] && json['general']) {
        Object.getOwnPropertyNames(json).forEach(v => {
            if (json[v] !== 'general') {
                delete json[v];
            }
        });
        json = json['properties'];
    }

    Object.getOwnPropertyNames(json).forEach(v => {
        if (json[v]['type'] === 'text') {
            delete json[v];
        } else {
            delete json[v]['order'];
            delete json[v]['text'];
            delete json[v]['type'];
            delete json[v]['condition'];
            delete json[v]['editable'];

            if (Array.isArray(json[v]['options'])) {
                json[v]['options'].forEach(o => {
                    delete o['label'];
                });
            }
        }
    });

    return JSON.stringify(json);
}

module.exports = loader;
