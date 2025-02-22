require('./config/global')(); 
const dbTypes = require('./enums/DbTypes.js');
const database = require('../src/config/database.js')(dbTypes);
const controllers = require('../src/controllers/Index.js')(database, dbTypes);

module.exports = {
    database,
    controllers,
};