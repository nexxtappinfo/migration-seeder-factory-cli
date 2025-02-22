module.exports = function(database, dbTypes) {
    const migrations = require('./managers/MigrationManagerController.js')(database, dbTypes);
    const seeders = require('./managers/SeederManagerController.js')(database, dbTypes);
    const factory = require('./managers/FactoryManagerController.js')(dbTypes);

    return {
        migrations,
        seeders,
        factory
    }
}