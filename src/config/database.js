const mongoose = require("mongoose");
const { Client } = require("pg");
const mysql = require("mysql2/promise");

module.exports = function (dbTypes) {
  const databases = {};

  async function connectMongo() {
    if (databases.mongo) return databases.mongo;
    try {
      await mongoose.connect(process.env.MONGO_CONNECTION_URL);
      console.log("✅ MongoDB connected");
      databases.mongo = mongoose.connection;
    } catch (error) {
      console.error("❌ Error connecting to MongoDB:", error.message);
      process.exit(0);
    }
    return databases.mongo;
  }

  async function connectPostgres() {
    if (databases.pg) return databases.pg;
    try {
      const client = new Client({
        host: process.env.PG_HOST,
        port: process.env.PG_PORT || 5432,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE,
      });
      await client.connect();
      console.log("✅ PostgreSQL connected");
      databases.pg = client;
    } catch (error) {
      console.error("❌ Error connecting to PostgreSQL:", error.message);
      process.exit(0);
    }
    return databases.pg;
  }

  async function connectMySQL() {
    if (databases.mysql) return databases.mysql;
    try {
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      });
      console.log("✅ MySQL connected");
      databases.mysql = connection;
    } catch (error) {
      console.error("❌ Error connecting to MySQL:", error.message);
      process.exit(0);
    }
    return databases.mysql;
  }

  async function getConnection(dbType) {
    switch (dbType) {
      case dbTypes.PG:
        return await connectPostgres();
      case dbTypes.MYSQL:
        return await connectMySQL();
      case dbTypes.MONGODB:
        return await connectMongo();
      default:
        console.error(`❌ Unsupported database type: ${dbType}`);
        process.exit(0);
    }
  }

  return {
    getConnection
  };
};