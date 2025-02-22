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

          let seederFiles = [];
          if (fileName) {
              seederFiles.push(path.join(seederDir, `${fileName}.json`));
          } else {
              seederFiles = fs.readdirSync(seederDir).map(file => path.join(seederDir, file));
          }

          for (const seederFile of seederFiles) {
              if (!fs.existsSync(seederFile)) continue;
              const seeder = JSON.parse(fs.readFileSync(seederFile, 'utf8'));

              for (const seed of seeder.seed) {
                  const table = seed.table;
                  const executionCount = seed.execution_count;
                  const factoryFilePath = getFactoryPath(seed.factory);
                  
                  if (!fs.existsSync(factoryFilePath)) {
                      logger.error(`⚠️ Factory file not found at: ${factoryFilePath}`);
                      continue;
                  }
                  
                  const factory = JSON.parse(fs.readFileSync(factoryFilePath, 'utf8'));
                  
                  for (let i = 0; i < executionCount; i++) {
                      let columns = {};

                      for (const columnObj of factory.columns) {
                          for (const [colName, colData] of Object.entries(columnObj)) {
                              if (colData.fake === true) {
                                  columns[colName] = getFakeValue(colData.type);
                              } else {
                                  columns[colName] = colData.custom !== 'null' ? colData.custom : null;
                              }
                          }
                      }

                      if(dbType === dbTypes.PG){
                        const keys = Object.keys(columns).map(k => `"${k}"`).join(', ');
                        const values = Object.values(columns);
                        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
                        
                        const query = `INSERT INTO "${table}" (${keys}) VALUES (${placeholders})`;
                        await db.query(query, values);
                      } 
                      else if(dbType === dbTypes.MYSQL){
                        const keys = Object.keys(columns).map(k => `\`${k}\``).join(', ');
                        const values = Object.values(columns);
                        const placeholders = values.map(() => '?').join(', ');

                        const query = `INSERT INTO \`${table}\` (${keys}) VALUES (${placeholders})`;
                        await db.execute(query, values);
                      }
                  }

                  if (seed.custom_query && seed.custom_query_execution_count > 0) {
                      for (let i = 0; i < seed.custom_query_execution_count; i++) {
                        if(dbType === dbTypes.PG){
                          await db.query(seed.custom_query);
                        }
                        else if(dbType === dbTypes.MYSQL){
                          await db.execute(seed.custom_query);
                        }
                      }
                  }
              }
          }

          logger.info(`✅ Seeders completed for ${dbType.toUpperCase()}`);
          process.exit(0);
      } catch (error) {
          logger.error(`❌ Error running seeders: ${error.message}`);
          process.exit(1);
      }
  }

  const createSeeder = (dbType, fileName) =>  {
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
            "custom_query": null,
            "custom_query_execution_count": 0,
          }
        ]
      }, null, 2);

      fs.writeFileSync(filePath, template);
      logger.info(`✅ Seeder file created: ${filePath}`);
      process.exit(0);
    } catch (error) {
      logger.error(`❌ Error creating seeder: ${error.message}`);
      process.exit(1);
    }
  }

  return {
    createSeeder,
    runSeeders
  };
};