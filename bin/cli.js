#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const kernel = require('../src/Kernel');

(async () => {
  const DEFAULT_DB_TYPE = process.env.DEFAULT_DB_TYPE || 'mysql';

  async function ensureConnection(dbType) {
    await kernel.database.getConnection(dbType);
  }

  program
    .command('make:migration [fileName]')
    .option('--db <dbType>', 'Specify database type', DEFAULT_DB_TYPE)
    .description('Create a new migration file')
    .action(async (fileName, options) => {
        if (!fileName) {
            console.error('Error: Please provide a filename.');
            process.exit(1);
        }

        const dbType = options.db || DEFAULT_DB_TYPE;
        await kernel.controllers.migrations.createMigration(dbType, fileName);
    });

  program
    .command('migrate [fileName]')
    .option('--db <dbType>', 'Specify database type', DEFAULT_DB_TYPE)
    .description('Run all pending migrations')
    .action(async (fileName, options) => {
      const dbType = options.db || DEFAULT_DB_TYPE;
      await ensureConnection(dbType);
      await kernel.controllers.migrations.runMigrations(dbType, fileName);
    });

  program
    .command('migrate:rollback [fileName]')
    .option('--db <dbType>', 'Specify database type', DEFAULT_DB_TYPE)
    .description('Migration RollBack')
    .action(async (fileName, options) => {
        const dbType = options.db || DEFAULT_DB_TYPE;
        await ensureConnection(dbType);

        if (!fileName) {
            process.stdout.write('Are you sure you want to rollback all migrations? (y/N): ');
            
            process.stdin.setEncoding('utf8');
            process.stdin.once('data', async (data) => {
                const answer = data.trim().toLowerCase();
                if (answer !== 'y') {
                    console.log('rollback process aborted! Please provide the filename you want to run..');
                    process.exit(1);
                }
                await kernel.controllers.migrations.rollbackMigrations(dbType);
            });

            return;
        }

        await kernel.controllers.migrations.rollbackMigrations(dbType, fileName);
    });

  program
    .command('make:seeder [fileName]')
    .option('--db <dbType>', 'Specify database type', DEFAULT_DB_TYPE)
    .description('Create a new seeder file')
    .action(async (fileName, options) => {
        if (!fileName) {
            console.error('Error: Please provide a filename.');
            process.exit(1);
        }

        const dbType = options.db || DEFAULT_DB_TYPE;
        await kernel.controllers.seeders.createSeeder(dbType, fileName);
    });

  program
    .command('make:factory [fileName]')
    .description('Create a new factory file')
    .action(async (fileName) => {
        if (!fileName) {
            console.error('Error: Please provide a filename.');
            process.exit(1); 
        }
        await kernel.controllers.factory.createFactory(fileName);
    });


  program
    .command('seed [fileName]')
    .option('--db <dbType>', 'Specify database type', DEFAULT_DB_TYPE)
    .description('Run seeder')
    .action(async (fileName, options) => {
        const dbType = options.db || DEFAULT_DB_TYPE;
        await ensureConnection(dbType);

        if (!fileName) {
            process.stdout.write('Are you sure you want to run all seeders? (y/N): ');
            
            process.stdin.setEncoding('utf8');
            process.stdin.once('data', async (data) => {
                const answer = data.trim().toLowerCase();
                if (answer !== 'y') {
                    console.log('Seeding process aborted! Please provide the filename you want to run..');
                    process.exit(1);
                }
                await kernel.controllers.seeders.runSeeders(dbType);
            });

            return;
        }

        await kernel.controllers.seeders.runSeeders(dbType, fileName);
    });

  program.parse(process.argv);
})();