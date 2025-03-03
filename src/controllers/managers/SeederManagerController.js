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
      case 'number': return faker.number.int();
      case 'string': return faker.word.words(3);
      case 'longtext': return faker.lorem.paragraph();
      case 'alphanumeric': return faker.string.alphanumeric(10);
      case 'float': return faker.number.float({ min: 0, max: 100 });
      case 'boolean': return faker.datatype.boolean();
      case 'date': return faker.date.past().toISOString().split('T')[0];
      case 'time': return faker.date.recent().toISOString().split('T')[1].split('.')[0];
      case 'datetime': return faker.date.recent().toISOString();
      case 'email': return faker.internet.email();
      case 'url': return faker.internet.url();
      case 'uuid': return faker.string.uuid();
      case 'phone': return faker.phone.number();
      case 'address': return faker.location.streetAddress();
      case 'city': return faker.location.city();
      case 'country': return faker.location.country();
      case 'zip': return faker.location.zipCode();
      case 'ipv4': return faker.internet.ip();
      case 'ipv6': return faker.internet.ipv6();
      case 'username': return faker.internet.userName();
      case 'password': return faker.internet.password();
      case 'company': return faker.company.name();
      case 'color': return faker.color.human();
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
        
        if (!fs.existsSync(seederFile)){
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
                  columns[colName] = colData.fake ? getFakeValue(colData.type) : colData.custom ?? null;
                }
              }

              if (createOrUpdate && createOrUpdate.matchColumns.length > 0) {
                let checkQuery, updateQuery, insertQuery;

                if (dbType === dbTypes.PG) {
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
                if (dbType === dbTypes.PG) {
                  const columnKeys = Object.keys(columns);
                  const insertQuery = `INSERT INTO "${table}" (${columnKeys.map(k => `"${k}"`).join(', ')}) VALUES (${columnKeys.map((_, i) => `$${i + 1}`).join(', ')})`;
                  await db.query(insertQuery, Object.values(columns));
                } else {
                  const insertQuery = `INSERT INTO \`${table}\` (${Object.keys(columns).map(k => `\`${k}\``).join(', ')}) VALUES (${Object.values(columns).map(() => '?').join(', ')})`;
                  await db.execute(insertQuery, Object.values(columns));
                }
              }
            }
          }

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
            "table": "sites",
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