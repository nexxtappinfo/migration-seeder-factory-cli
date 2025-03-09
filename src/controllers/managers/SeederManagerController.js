const fs = require('fs');
const path = require('path');
const { setRegexExpresion, getFakeValue } = require('../../helpers/Functions');

module.exports = function (database, dbTypes) {

  function getSeedersPath(dbType) {
    return path.join(process.cwd(), 'database/seeders', dbType);
  }

  function getFactoryPath(fileName) {
    if (!fileName.endsWith('.json')) {
      fileName += '.json';
    }
    return path.join(process.cwd(), 'database/factory', fileName);
  }

  async function runSeeders(dbType, fileName = '') {
    try {
      const db = await database.getConnection(dbType);
      if (!db) {
        logger.error(`${dbType.toUpperCase()} connection is not initialized.`);
        process.exit(1);
      }

      const seederDir = getSeedersPath(dbType);
      if (!fs.existsSync(seederDir)) {
        logger.error(`⚠️ No seeders found at: ${seederDir}`);
        process.exit(1);
      }

      let seederFiles = fileName
        ? [path.join(seederDir, `${fileName}.json`)]
        : fs.readdirSync(seederDir).map(file => path.join(seederDir, file));

      for (const seederFile of seederFiles) {
        if (!fs.existsSync(seederFile)) {
          logger.info(`Seeder file not found for ${seederFile}`);
          process.exit(0);
        }

        const seeder = JSON.parse(fs.readFileSync(seederFile, 'utf8'));

        for (const seed of seeder.seed) {
          const { table, factory: factoryFile, execution_count, createOrUpdate, custom } = seed;
          if (!table) {
            logger.info('Table Not Provided!');
            continue;
          }

          const factoryFilePath = getFactoryPath(factoryFile);
          if (!fs.existsSync(factoryFilePath)) {
            logger.error(`Factory file not found for table ${table}`);
            continue;
          }

          const factory = JSON.parse(fs.readFileSync(factoryFilePath, 'utf8'));

          for (let i = 0; i < execution_count; i++) {
            let columns = {};

            if (factory.columns && factory.columns.length > 0) {
              for (const columnObj of factory.columns) {
                for (const [colName, colData] of Object.entries(columnObj)) {
                  let value;
                  // Default fake to false if not provided
                  const isFake = typeof colData.fake === 'boolean' ? colData.fake : false;

                  if (isFake) {
                    // Generate fake value regardless of any custom options
                    value = getFakeValue(colData.type);
                  } else {
                    // Check if a custom value is provided
                    if (colData.custom !== undefined && colData.custom !== null) {
                      // If custom is an object with a reference_table, then do reference lookup
                      if (typeof colData.custom === 'object' && colData.custom.reference_table) {
                        const { table: refTable, column: refColumn } = colData.custom.reference_table;
                        if (refTable && refColumn) {
                          if (dbType === dbTypes.PG) {
                            const refQuery = `SELECT "${refColumn}" FROM "${refTable}" ORDER BY random() LIMIT 1`;
                            const refResult = await db.query(refQuery);
                            if (refResult.rows.length > 0) {
                              value = refResult.rows[0][refColumn];
                            } else {
                              logger.warn(`⚠️ No data found in reference table ${refTable}.${refColumn}`);
                              value = null;
                            }
                          } else if (dbType === dbTypes.MYSQL) {
                            const refQuery = `SELECT \`${refColumn}\` FROM \`${refTable}\` ORDER BY RAND() LIMIT 1`;
                            const [result] = await db.execute(refQuery);
                            if (result.length > 0) {
                              value = result[0][refColumn];
                            } else {
                              logger.warn(`⚠️ No data found in reference table ${refTable}.${refColumn}`);
                              value = null;
                            }
                          }
                        } else {
                          value = null;
                        }
                      }
                      // If custom is a non-object (like a string or number) and not empty, use it.
                      else if (typeof colData.custom !== 'object' && colData.custom !== '') {
                        value = colData.custom;
                      } else {
                        value = "";
                      }
                    } else {
                      value = "";
                    }
                  }

                  // Apply manipulation if the property exists and the value is a string.
                  if (
                    colData.manupulation &&
                    typeof colData.manupulation === 'object' &&
                    typeof value === 'string'
                  ) {
                    value = setRegexExpresion(
                      colData.manupulation.regex,
                      colData.manupulation.replace_with,
                      value
                    );
                  }

                  columns[colName] = value;
                }
              }
            }

            // Insert or update logic based on createOrUpdate settings
            if (createOrUpdate && createOrUpdate.matchColumns && createOrUpdate.matchColumns.length > 0) {
              let checkQuery, updateQuery, insertQuery;
              if (createOrUpdate.matchColumns.length > 1 && (!createOrUpdate.operator || createOrUpdate.operator === '')) {
                logger.info(`Please Provide Operator Type`);
                process.exit(0);
              }

              if (dbType === dbTypes.PG) {
                // Build PostgreSQL queries
                const whereClauses = createOrUpdate.matchColumns.map((col, index) => `"${col}" = $${index + 1}`);
                const whereCondition = `(${whereClauses.join(` ${createOrUpdate.operator.toUpperCase()} `)})`;
                const whereValues = createOrUpdate.matchColumns.map(col => columns[col]);

                const columnKeys = Object.keys(columns);
                const setClauses = columnKeys.map((col, i) => `"${col}" = $${i + 1}`);
                const updateWhereClauses = createOrUpdate.matchColumns.map((col, index) => `"${col}" = $${columnKeys.length + index + 1}`);
                const updateWhereCondition = `(${updateWhereClauses.join(` ${createOrUpdate.operator.toUpperCase()} `)})`;

                checkQuery = `SELECT COUNT(*) as count FROM "${table}" WHERE ${whereCondition}`;
                updateQuery = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE ${updateWhereCondition}`;
                insertQuery = `INSERT INTO "${table}" (${columnKeys.map(k => `"${k}"`).join(', ')}) VALUES (${columnKeys.map((_, i) => `$${i + 1}`).join(', ')})`;

                const result = await db.query(checkQuery, whereValues);
                const count = parseInt(result.rows[0].count, 10);
                if (count > 0) {
                  await db.query(updateQuery, [...Object.values(columns), ...whereValues]);
                } else {
                  await db.query(insertQuery, Object.values(columns));
                }
              } else if (dbType === dbTypes.MYSQL) {
                // Build MySQL queries
                const whereClauses = createOrUpdate.matchColumns.map(col => `\`${col}\` = ?`);
                const whereCondition = whereClauses.join(` ${createOrUpdate.operator.toUpperCase()} `);
                const whereValues = createOrUpdate.matchColumns.map(col => columns[col]);

                checkQuery = `SELECT COUNT(*) as count FROM \`${table}\` WHERE ${whereCondition}`;
                updateQuery = `UPDATE \`${table}\` SET ${Object.keys(columns).map(col => `\`${col}\` = ?`).join(', ')} WHERE ${whereCondition}`;
                insertQuery = `INSERT INTO \`${table}\` (${Object.keys(columns).map(k => `\`${k}\``).join(', ')}) VALUES (${Object.values(columns).map(() => '?').join(', ')})`;

                const [rows] = await db.execute(checkQuery, whereValues);
                if (rows[0].count > 0) {
                  await db.execute(updateQuery, [...Object.values(columns), ...whereValues]);
                } else {
                  await db.execute(insertQuery, Object.values(columns));
                }
              }
            } else {
              // Simple insert if no createOrUpdate logic is provided
              if (dbType === dbTypes.PG) {
                const columnKeys = Object.keys(columns);
                const insertQuery = `INSERT INTO "${table}" (${columnKeys.map(k => `"${k}"`).join(', ')}) VALUES (${columnKeys.map((_, i) => `$${i + 1}`).join(', ')})`;
                await db.query(insertQuery, Object.values(columns));
              } else if (dbType === dbTypes.MYSQL) {
                const insertQuery = `INSERT INTO \`${table}\` (${Object.keys(columns).map(k => `\`${k}\``).join(', ')}) VALUES (${Object.values(columns).map(() => '?').join(', ')})`;
                await db.execute(insertQuery, Object.values(columns));
              }
            }
          }

          // Execute custom queries from seeder (if provided)
          if (custom && custom.query && custom.execution_count > 0) {
            for (let j = 0; j < custom.execution_count; j++) {
              if (dbType === dbTypes.PG) {
                await db.query(custom.query);
              } else if (dbType === dbTypes.MYSQL) {
                await db.execute(custom.query);
              }
            }
          }
        }
      }

      logger.info(`✅ Seeding process completed for ${dbType.toUpperCase()}`);
      process.exit(0);
    } catch (error) {
      logger.error(`Error running seeders: ${error.message}`);
      process.exit(1);
    }
  }


  const createSeeder = (dbType, fileName) => {
    try {
      const seederDir = getSeedersPath(dbType);
      if (!fs.existsSync(seederDir)) {
        fs.mkdirSync(seederDir, { recursive: true });
        logger.info(`📂 Created Seeder directory: ${seederDir}`);
      }

      const filePath = path.join(seederDir, `${fileName}.json`);

      const template = JSON.stringify({
        "seed": [
          {
            "table": "tableName",
            "factory": "factoryName",
            "execution_count": 10,
            "createOrUpdate": {
              "matchColumns": [
              ],
              "operator": ""
            },
            "custom": {
              "query": "",
              "execution_count": 0
            }
          }
        ]
      }, null, 2);

      fs.writeFileSync(filePath, template);
      logger.info(`✅ Seeder file created: ${filePath}`);
      process.exit(0);
    } catch (error) {
      logger.error(`Error creating seeder: ${error.message}`);
      process.exit(1);
    }
  }

  return {
    createSeeder,
    runSeeders
  };
};