const buildProjectJson = require('./project.json/build');

(async () => {
    await buildProjectJson().catch(e => {
        console.error(e);
    });
})();
