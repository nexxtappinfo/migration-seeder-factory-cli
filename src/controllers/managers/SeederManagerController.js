const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

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

  const getFakeValue = (type) => {
    switch (type.toLowerCase()) {
      case 'number': return faker.number.int(); // Any integer
      case 'smallint': return faker.number.int({ min: -32768, max: 32767 }); // Small integer range
      case 'mediumint': return faker.number.int({ min: -8388608, max: 8388607 }); // Medium integer range
      case 'bigint': return faker.number.bigInt({ min: -9223372036854775808n, max: 9223372036854775807n }); // Big integer
      case 'tinyint': return faker.number.int({ min: 1, max: 999 }); // Tiny integer
      case 'float': return faker.number.float({ min: -1000, max: 1000, precision: 0.01 }); // Floating-point number
      case 'double': return faker.number.float({ min: -1000000, max: 1000000, precision: 0.0001 }); // More precise float
      case 'decimal': return faker.number.float({ min: -9999999999, max: 9999999999, precision: 0.01 }).toFixed(2); // Decimal
      case 'boolean': return faker.datatype.boolean(); // Boolean value (true/false)
      case 'uuid': return faker.string.uuid(); // UUID
      case 'string': return faker.word.words(3); // Random string
      case 'char': return faker.string.alphanumeric(1); // Single character
      case 'varchar': return faker.word.words(5); // Short string
      case 'longtext': return faker.lorem.paragraph(); // Long text
      case 'alphanumeric': return faker.string.alphanumeric(10); // Alphanumeric
      case 'email': return faker.internet.email(); // Email address
      case 'url': return faker.internet.url(); // URL
      case 'username': return faker.internet.userName(); // Username
      case 'password': return faker.internet.password(); // Password
      case 'phone': return faker.phone.number(); // Phone number
      case 'address': return faker.location.streetAddress(); // Address
      case 'city': return faker.location.city(); // City
      case 'state': return faker.location.state(); // State
      case 'country': return faker.location.country(); // Country
      case 'zip': return faker.location.zipCode(); // ZIP code
      case 'ipv4': return faker.internet.ip(); // IPv4 address
      case 'ipv6': return faker.internet.ipv6(); // IPv6 address
      case 'company': return faker.company.name(); // Company name
      case 'color': return faker.color.human(); // Color name
      case 'hexcolor': return faker.color.rgb(); // Hex color code
      case 'date': return faker.date.past().toISOString().split('T')[0]; // Date (YYYY-MM-DD)
      case 'time': return faker.date.recent().toISOString().split('T')[1].split('.')[0]; // Time (HH:MM:SS)
      case 'datetime': return faker.date.recent().toISOString(); // Full date-time (ISO format)
      case 'future_date': return faker.date.future().toISOString().split('T')[0]; // Future date
      case 'past_date': return faker.date.past().toISOString().split('T')[0]; // Past date
      case 'credit_card': return faker.finance.creditCardNumber(); // Credit card number
      case 'currency': return faker.finance.currencyCode(); // Currency code (e.g., USD, EUR)
      case 'iban': return faker.finance.iban(); // IBAN (bank account)
      case 'bic': return faker.finance.bic(); // BIC/SWIFT code
      case 'job_title': return faker.person.jobTitle(); // Job title
      case 'company_suffix': return faker.company.name().split(' ').pop(); // Company suffix (e.g., Inc., LLC)
      case 'mac_address': return faker.internet.mac(); // MAC address
      default: return null;
    }
  };

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
                  if (typeof colData.custom === 'string' && colData.custom !== '') {
                    // Use custom string directly
                    columns[colName] = colData.custom;
                  } else if (typeof colData.custom === 'object' && colData.custom.reference_table) {
                    // Use reference table value if defined
                    const { table: refTable, column: refColumn } = colData.custom.reference_table;
                    if (refTable && refColumn) {
                      if (dbType === dbTypes.PG) {
                        const refQuery = `SELECT "${refColumn}" FROM "${refTable}" ORDER BY random() LIMIT 1`;
                        const refResult = await db.query(refQuery);
                        if (refResult.rows.length > 0) {
                          columns[colName] = refResult.rows[0][refColumn];
                        } else {
                          logger.warn(`⚠️ No data found in reference table ${refTable}.${refColumn}`);
                          columns[colName] = null;
                        }
                      } else if (dbType === dbTypes.MYSQL) {
                        const refQuery = `SELECT \`${refColumn}\` FROM \`${refTable}\` ORDER BY RAND() LIMIT 1`;
                        const [result] = await db.execute(refQuery);
                        if (result.length > 0) {
                          columns[colName] = result[0][refColumn];
                        } else {
                          logger.warn(`⚠️ No data found in reference table ${refTable}.${refColumn}`);
                          columns[colName] = null;
                        }
                      }
                    } else {
                      columns[colName] = null;
                    }
                  } else {
                    // Generate a fake value if enabled, or use custom value if defined
                    columns[colName] = colData.fake ? getFakeValue(colData.type) : (colData.custom ?? null);
                  }
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