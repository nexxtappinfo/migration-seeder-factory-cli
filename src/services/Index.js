const MySQL = require('./Converter/MysqlQueryService.js');
const Pg = require('./Converter/PgQueryService.js');


const getDbTarget = async (dbTypes, dbType, fileContent, rollback = false) => {
    switch (dbType) {
        case dbTypes.PG:
            return await Pg.parseMigrationFile(fileContent, rollback);
        case dbTypes.MYSQL:
            return await MySQL.parseMigrationFile(fileContent, rollback);
        default:
            logger.error(`Unsupported database type: ${dbType}`);
            process.exit(0);
    }
}


module.exports = {
    getDbTarget
}