async function parseMigrationFile(fileContent, rollback = false) {
    try {
        const migrationData = JSON.parse(fileContent);
        if (rollback) {
            if (migrationData.rollback) {
                return generateSQLQueries(migrationData.rollback);
            }
            logger.error(`Error parsing migration file! rollback key not defined in object`);
            return null;
        }
        if (migrationData.migrations) {
            return generateSQLQueries(migrationData.migrations);
        }
        logger.error(`Error parsing migration file! migrations key not defined in object`);
        return null;
    } catch (error) {
        logger.error(`Error parsing migration file: ${error.message}`);
        return null;
    }
}

function generateSQLQueries(migrations) {
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
    
    return `START TRANSACTION;
${queries.join('\n')}
COMMIT;`;
}

function createTableQuery(migration) {
    const quote = '`';
    const columns = migration.columns.map(col => {
        let columnDef = `${quote}${col.name}${quote} ${mapType(col.type)}`;
        if (col.primaryKey) columnDef += ' PRIMARY KEY';
        if (col.autoIncrement) columnDef += ' AUTO_INCREMENT';
        if (col.unique) columnDef += ' UNIQUE';
        if (col.unsigned) columnDef += ' UNSIGNED';
        if (col.nullable === false) columnDef += ' NOT NULL';
        if (col.default !== undefined) columnDef += ` DEFAULT ${formatDefault(col.default)}`;
        return columnDef;
    });

    const foreignKeys = (migration.foreignKeys || []).map(fk => {
        return `CONSTRAINT ${quote}${fk.name}${quote} FOREIGN KEY (${quote}${fk.column}${quote}) REFERENCES ${quote}${fk.referenceTable}${quote} (${quote}${fk.referenceColumn}${quote})`;
    });

    const tableDefinition = `CREATE TABLE IF NOT EXISTS ${quote}${migration.table}${quote} (
      ${columns.join(', ')}
      ${foreignKeys.length > 0 ? ', ' + foreignKeys.join(', ') : ''}
    )`;

    const tableOptions = [];
    if (migration.engine) tableOptions.push(`ENGINE=${migration.engine}`);
    if (migration.charset) tableOptions.push(`DEFAULT CHARSET=${migration.charset}`);

    const tableQuery = `${tableDefinition}${tableOptions.length > 0 ? ' ' + tableOptions.join(' ') : ''};`;

    const indexes = (migration.indexes || []).map(idx => {
        const unique = idx.unique ? 'UNIQUE' : '';
        return `CREATE ${unique} INDEX ${quote}${idx.name}${quote} ON ${quote}${migration.table}${quote} (${idx.columns.map(c => `${quote}${c}${quote}`).join(', ')});`;
    }).join('\n');

    return `${tableQuery}\n${indexes}`;
}

function alterTableQuery(migration) {
    const quote = '`';
    const table = `${quote}${migration.table}${quote}`;
    const changes = [];

    if (migration.changes.add) {
        changes.push(...migration.changes.add.map(col => {
            let columnDef = `ADD COLUMN ${quote}${col.name}${quote} ${mapType(col.type)}`;
            if (col.unsigned) columnDef += ' UNSIGNED';
            if (col.nullable === false) columnDef += ' NOT NULL';
            return columnDef;
        }));
    }
    if (migration.changes.modify) {
        changes.push(...migration.changes.modify.map(col => {
            let columnDef = `MODIFY COLUMN ${quote}${col.name}${quote} ${mapType(col.type)}`;
            if (col.unsigned) columnDef += ' UNSIGNED';
            if (col.nullable === false) columnDef += ' NOT NULL';
            return columnDef;
        }));
    }
    if (migration.changes.drop) {
        changes.push(...migration.changes.drop.map(col => `DROP COLUMN ${quote}${col}${quote}`));
    }
    if (migration.changes.addForeignKeys) {
        changes.push(...migration.changes.addForeignKeys.map(fk => {
            let constraint = `ADD CONSTRAINT ${quote}${fk.name}${quote} FOREIGN KEY (${quote}${fk.column}${quote}) REFERENCES ${quote}${fk.referenceTable}${quote} (${quote}${fk.referenceColumn}${quote})`;
            
            if (fk.onDelete) constraint += ` ON DELETE ${fk.onDelete.toUpperCase()}`;
            if (fk.onUpdate) constraint += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`;
            
            return constraint;
        }));
    }
    if (migration.changes.dropForeignKeys) {
        changes.push(...migration.changes.dropForeignKeys.map(fk => {
            return `DROP FOREIGN KEY ${quote}${fk}${quote}`;
        }));
    }
    if (migration.changes.dropIndex) {
        changes.push(...migration.changes.dropIndex.map(fk => {
            return `DROP INDEX ${quote}${fk}${quote}`;
        }));
    }

    return `ALTER TABLE ${table} ${changes.join(', ')};`;
}

const dropTableQuery = (migration) => {
    const quote = '"';
    let query = `DROP TABLE`;
    if (migration.dropIfExists) {
      query += ' IF EXISTS';
    }
    query += ` ${quote}${migration.table}${quote}`;
    if (migration.ignoreForeignAndCascade) {
      query += ' CASCADE';
    }
    return `${query};`;
  };

function mapType(jsonType) {
    const typeMap = {
        int: 'INT',
        'varchar': 'VARCHAR(255)',
        'varchar(255)': 'VARCHAR(255)',
        'varchar(100)': 'VARCHAR(100)',
        smallint: 'SMALLINT',
        timestamp: 'TIMESTAMP',
        date: 'DATE'
    };
    return typeMap[jsonType] || jsonType;
}

function formatDefault(defaultValue) {
    if (typeof defaultValue === 'object') {
        if (defaultValue.value === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP';
        if (defaultValue.function === 'ON_UPDATE_TIMESTAMP') {
            return 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP';
        }
        return `'${defaultValue.value}'`;
    }
    if (typeof defaultValue === 'number') {
        return defaultValue;
    }
    return `'${defaultValue}'`;
}

module.exports = { parseMigrationFile };