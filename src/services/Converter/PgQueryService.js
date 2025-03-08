const parseMigrationFile = async (fileContent, rollback = false) => {
  try {
    const migrationData = JSON.parse(fileContent);
    if(rollback){
      if(migrationData.rollback){
        return generateSQLQueries(migrationData.rollback);
      }
      logger.error(`❌ Error parsing migration file! rollback key not defined in object`);
      return null;
    }
    if(migrationData.migrations){
      return generateSQLQueries(migrationData.migrations);
    }
    logger.error(`❌ Error parsing migration file! migrations key not defined in object`);
    return null;
  } catch (error) {
    logger.error(`❌ Error parsing migration file: ${error.message}`);
    return null;
  }
};

const generateSQLQueries = (migrations) => {
  const queries = migrations.map(migration => {

    if ((!migration.table || migration.table == '') || (!migration.action || migration.action == '')) {
      logger.error(`Please Provide Correct Migration Object Values`);
      process.exit(1);
      return;
    }
  
    if (migration.action === 'create') {
      return createTableQuery(migration);
    } else if (migration.action === 'alter') {
      return alterTableQuery(migration);
    } else if (migration.action === 'drop') {
      return dropTableQuery(migration);
    }
    return '';
  }).filter(Boolean);

  return `BEGIN;
${queries.join('\n')}
COMMIT;`;
};

const createTableQuery = (migration) => {
  const quote = '"';
  const columns = migration.columns.map(col => {
    let columnDef = `${quote}${col.name}${quote} ${mapType(col)}`;
    if (col.primaryKey) columnDef += ' PRIMARY KEY';
    if (col.autoIncrement) {
      columnDef += ' GENERATED ALWAYS AS IDENTITY';
    } else if (col.default) {
      columnDef += ` DEFAULT ${formatDefault(col.default)}`;
    }
    if (col.unique) columnDef += ' UNIQUE';
    if (col.nullable === false) columnDef += ' NOT NULL';
    return columnDef;
  });

  const foreignKeys = (migration.foreignKeys || []).map(fk => {
    return `CONSTRAINT ${quote}${fk.name}${quote} FOREIGN KEY (${quote}${fk.column}${quote}) REFERENCES ${quote}${fk.referenceTable}${quote} (${quote}${fk.referenceColumn}${quote})`;
  });

  const tableDefinition = [...columns, ...foreignKeys].join(', ');
  const tableQuery = `CREATE TABLE IF NOT EXISTS ${quote}${migration.table}${quote} (${tableDefinition});`;

  const indexes = (migration.indexes || []).map(idx => {
    const unique = idx.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX ${quote}${idx.name}${quote} ON ${quote}${migration.table}${quote} (${idx.columns.map(c => `${quote}${c}${quote}`).join(', ')});`;
  }).join('\n');

  return `${tableQuery}\n${indexes}`;
};

const alterTableQuery = (migration) => {
  const quote = '"';
  const table = `${quote}${migration.table}${quote}`;
  const changes = [];
  const independentQueries = [];

  if (migration.changes.add) {
    changes.push(...migration.changes.add.map(col => `ADD COLUMN ${quote}${col.name}${quote} ${mapType(col)}${col.nullable === false ? ' NOT NULL' : ''}`));
  }
  if (migration.changes.modify) {
    changes.push(...migration.changes.modify.map(col => `ALTER COLUMN ${quote}${col.name}${quote} TYPE ${mapType(col)}`));
  }
  if (migration.changes.drop) {
    changes.push(...migration.changes.drop.map(col => `DROP COLUMN ${quote}${col}${quote}`));
  }
  if (migration.changes.addForeignKeys) {
    changes.push(...migration.changes.addForeignKeys.map(fk => {
      let constraint = `ADD CONSTRAINT "${fk.name}" FOREIGN KEY ("${fk.column}") REFERENCES "${fk.referenceTable}" ("${fk.referenceColumn}")`;
      
      if (fk.onDelete) constraint += ` ON DELETE ${fk.onDelete.toUpperCase()}`;
      if (fk.onUpdate) constraint += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`;
      
      return constraint;
    }));
  }  
  if (migration.changes.dropForeignKeys) {
    changes.push(...migration.changes.dropForeignKeys.map(fk => `DROP CONSTRAINT ${quote}${fk}${quote}`));
  }
  if (migration.changes.dropIndex) {
    independentQueries.push(...migration.changes.dropIndex.map(idx => `DROP INDEX IF EXISTS ${quote}${idx}${quote};`));
  }

  const alterTableSQL = changes.length ? `ALTER TABLE ${table} ${changes.join(', ')};` : '';
  const dropIndexSQL = independentQueries.join('\n');

  return [alterTableSQL, dropIndexSQL].filter(Boolean).join('\n');
}

const dropTableQuery = (migration) => {
  const quote = '"';
  let query = `DROP TABLE`;
  if (!migration.dropIfExists) {
    query += ' IF EXISTS';
  }
  query += ` ${quote}${migration.table}${quote}`;
  if (migration.ignoreForeignAndCascade) {
    query += ' CASCADE';
  }
  return `${query};`;
};

const mapType = (col) => {
  const typeMap = {
    int: 'INTEGER',
    'varchar': 'VARCHAR',
    'varchar(255)': 'VARCHAR(255)',
    'varchar(100)': 'VARCHAR(100)',
    smallint: 'SMALLINT',
    timestamp: 'TIMESTAMP',
    date: 'DATE'
  };
  return typeMap[col.type] || col.type;
};

const formatDefault = (defaultValue) => {
  if (typeof defaultValue === 'object') {
    if (defaultValue.value) return defaultValue.value;
    if (defaultValue.function === 'ON_UPDATE_TIMESTAMP') {
      return 'CURRENT_TIMESTAMP';
    }
  }
  return `'${defaultValue}'`;
};

module.exports = { parseMigrationFile };
