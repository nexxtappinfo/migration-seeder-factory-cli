module.exports = function (database, dbTypes) {
  const fs = require('fs');
  const path = require('path');
  const { getDbTarget } = require('../../services/Index.js');

  const getCreateMigrationsTableSQL = (dbType) => {
    const queries = {
      [dbTypes.PG]: `CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            migration VARCHAR(255) NOT NULL,
            batch INT DEFAULT 1 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );`,
      [dbTypes.MYSQL]: `CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration VARCHAR(255) NOT NULL,
            batch INT DEFAULT 1 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );`,
      default: '',
    };

    return queries[dbType] || queries.default;
  };

  // Utility function to get SQL for checking batch column
  const getBatchColumnCheckSQL = (dbType) => {
    const queries = {
      [dbTypes.PG]: `SELECT column_name FROM information_schema.columns WHERE table_name = 'migrations' AND column_name = 'batch';`,
      [dbTypes.MYSQL]: `SHOW COLUMNS FROM migrations LIKE 'batch';`,
      default: '',
    };
    
    return queries[dbType] || queries.default;
  };
  
  // Utility function to get SQL for adding batch column
  const getAddBatchColumnQuery = (dbType) => {
    const queries = {
      [dbTypes.PG]: `ALTER TABLE migrations ADD COLUMN batch INT DEFAULT 1 NOT NULL;`,
      [dbTypes.MYSQL]: `ALTER TABLE migrations ADD COLUMN batch INT DEFAULT 1 NOT NULL;`,
      default: '',
    };
  
    return queries[dbType] || queries.default;
  };
  
  // Utility function to get SQL for inserting into migrations table
  const getInsertMigrationSQL = async (dbType) => {
    const queries = {
      [dbTypes.PG]: `INSERT INTO migrations (migration, batch) VALUES ($1, $2);`,
      [dbTypes.MYSQL]: `INSERT INTO migrations (migration, batch) VALUES (?, ?);`,
      default: '',
    };
  
    return queries[dbType] || queries.default;
  };

  const getMigrationsPath = (dbType) => {
    return path.join(process.cwd(), 'database/migrations', dbType);
  };

  const ensureMigrationsTable = async (db, dbType) => {
    const sql = getCreateMigrationsTableSQL(dbType);
    await db.query(sql);
  };

  const checkBatchColumnExists = (columns, dbType) => {
      if (!columns) return false;

      if (dbType === dbTypes.PG) {
          return columns.rows?.length > 0;
      } else if (dbType === dbTypes.MYSQL) {
           return Array.isArray(columns) && columns.length > 1 && columns[0]?.some(row => row.Field === 'batch');
      }

      return false;
  }

  const ensureBatchColumn = async (db, dbType) => {
    try {
      const columns = await db.query(getBatchColumnCheckSQL(dbType));
      const columnExists = checkBatchColumnExists(columns, dbType);

      if (columnExists) {
          return true;
      }

      logger.info(`🔄 Adding missing 'batch' column to migrations table.`);
      const alterSql = getAddBatchColumnQuery(dbType);
      await db.query(alterSql);
      logger.info(`✅ 'batch' column added successfully.`);

    } catch (error) {
      logger.error(`Error checking/adding 'batch' column: ${error.message}`);
      process.exit(1);
    }
  };

  const getMigrationTableInfo = async (db, dbType, dbTypes) => {
    try {

      if(dbType === dbTypes.PG){
        const batchResult = await db.query(`SELECT COALESCE(MAX(batch), 0) + 1 AS batch FROM migrations`);
        const currentBatch = batchResult.rows[0].batch;
  
        const executedMigrationsResult = await db.query(`SELECT migration FROM migrations`);
        const executedMigrations = executedMigrationsResult.rows.map(row => row.migration);

        return {
          currentBatch,
          executedMigrations
        }
      } else if(dbType === dbTypes.MYSQL){
        const batchResult = await db.query(`SELECT COALESCE(MAX(batch), 0) + 1 AS batch FROM migrations`);
        const currentBatch = batchResult[0][0].batch;

        const executedMigrationsResult = await db.query(`SELECT migration FROM migrations`);
        const executedMigrations = executedMigrationsResult[0].map(row => row.migration);

        return {
          currentBatch,
          executedMigrations
        }
      }else{
        logger.error(`Error! failed to get data from migration table.`);
        process.exit(1);
      }
    } catch (error) {
      logger.error(`Error! failed to get data from migration table: ${error.message}`);
      process.exit(1);
    }
  }

  const runMigrations = async (dbType, fileName) => {
    try {
      const db = await database.getConnection(dbType);
      if (!db) throw new Error(`${dbType.toUpperCase()} connection is not initialized.`);

      await ensureMigrationsTable(db, dbType);
      await ensureBatchColumn(db, dbType);

      const migrationDir = getMigrationsPath(dbType);
      if (!fs.existsSync(migrationDir)) {
        logger.info(`⚠️ No migrations found at: ${migrationDir}`);
        process.exit(0);
        return;
      }

      const { currentBatch, executedMigrations } = await getMigrationTableInfo(db, dbType, dbTypes);
      const executedMigrationsSet = new Set(executedMigrations);

      const files = fileName ? [`${fileName}.json`] : fs.readdirSync(migrationDir).sort().reverse();
      for (const file of files) {
        if (executedMigrationsSet.has(file)) {
          logger.warn(`⚠️ Skipping already run migration: ${file}`);
          continue;
        }

        const filePath = path.join(migrationDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        logger.info(`🚀 Running: ${file}`);

        const sql = await getDbTarget(dbTypes, dbType, fileContent);
        
        if (sql) {
          const sqlStatements = sql.split(';').filter(statement => statement.trim() !== '');
          for (const statement of sqlStatements) {
            await db.query(statement);
          }
        }

        const insertQuery = await getInsertMigrationSQL(dbType);

        await db.query(insertQuery, [file, currentBatch]);
      }

      logger.info(`✅ Migration process completed for ${dbType.toUpperCase()}`);
      process.exit(0);
    } catch (error) {
      logger.error(`Error running migrations: ${error.message}`);
      process.exit(1);
    }
  };

  const rollbackMigrations = async (dbType, fileName = '') => {
      try {
          const db = await database.getConnection(dbType);
          if (!db) throw new Error(`${dbType.toUpperCase()} connection is not initialized.`);

          const migrationDir = getMigrationsPath(dbType);
          if (!fs.existsSync(migrationDir)) {
              logger.info(`⚠️ No rollback migrations found at: ${migrationDir}`);
              process.exit(1);
              return;
          }

          const files = fileName ? [`${fileName}.json`] : fs.readdirSync(migrationDir).sort().reverse();
          for (const file of files) {
              const filePath = path.join(migrationDir, file);
              if (!fs.existsSync(filePath)) {
                  logger.warn(`⚠️ Migration file not found: ${file}`);
                  continue;
              }

              const fileContent = fs.readFileSync(filePath, 'utf-8');
              logger.info(`⏪ Rolling back: ${file}`);

              const sql = await getDbTarget(dbTypes, dbType, fileContent, true);
              if (sql) {
                  const sqlStatements = sql.split(';').filter(statement => statement.trim() !== '');
                  for (const statement of sqlStatements) {
                      await db.query(statement);
                  }
              }

              let deleteQuery;

              if (dbType === dbTypes.PG) {
                deleteQuery = `DELETE FROM migrations WHERE migration = $1;`;
              } else if (dbType === dbTypes.MYSQL) {
                deleteQuery = `DELETE FROM migrations WHERE migration = ?;`;
              }

              await db.query(deleteQuery, [file]);
          }

          logger.info(`✅ Rollback completed for ${dbType.toUpperCase()}`);
          process.exit(0);
      } catch (error) {
          logger.error(`Error rolling back migrations: ${error.message}`);
          process.exit(1);
      }
  }

  const createMigration = (dbType, fileName) =>  {
    try {
      const migrationDir = getMigrationsPath(dbType);
      if (!fs.existsSync(migrationDir)) {
        fs.mkdirSync(migrationDir, { recursive: true });
        logger.info(`📂 Created migrations directory: ${migrationDir}`);
      }

      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const filePath = path.join(migrationDir, `${timestamp}_${fileName}.json`);

      const template = JSON.stringify({
        "migrations": [
          {
            "action": "",
            "table": "",
            "columns": [],
            "indexes": [],
            "foreignKeys": []
          }
        ],
        "rollback": [
          {
            "action": "",
            "table": "",
            "dropIfExists": true,
            "ignoreForeignAndCascade": true
          }
        ]
      }, null, 2);

      fs.writeFileSync(filePath, template);
      logger.info(`✅ Migration file created: ${filePath}`);
      process.exit(0);
    } catch (error) {
      logger.error(`Error creating migration: ${error.message}`);
      process.exit(1);
    }
  }

  return {
    runMigrations,
    createMigration,
    rollbackMigrations,
  };
};