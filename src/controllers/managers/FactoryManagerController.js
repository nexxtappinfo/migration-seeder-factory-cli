const fs = require('fs');
const path = require('path');

module.exports = function (dbTypes) {

  function getFactoryPath(dirName) {
    return path.join(process.cwd(), 'database/factory', dirName);
  }

  const createFactory = (fileName) =>  {
    try {
      const factoryDir = getFactoryPath('');
      if (!fs.existsSync(factoryDir)) {
        fs.mkdirSync(factoryDir, { recursive: true });
        logger.info(`📂 Created Factory directory: ${factoryDir}`);
      }

      const filePath = path.join(factoryDir, `${fileName}.json`);

      const template = JSON.stringify({
        "columns": [
          {
            "col_name": {
              "fake": true,
              "type": 'number|string|longtext|alphan_umaric|float|...',
              "custom": "",
            },
          }
        ]
      }, null, 2);

      fs.writeFileSync(filePath, template);
      logger.info(`✅ Factory file created: ${filePath}`);
      process.exit(0);
    } catch (error) {
      logger.error(`❌ Error creating factory: ${error.message}`);
      process.exit(1);
    }
  }

  return {
    createFactory
  };
};