'use strict';
require('dotenv').config({ path: '.env.development' });
const { Sequelize } = require('sequelize');

const schema = process.env.DB_SCHEMA || 'mad_crm_dev';

const seq = new Sequelize(
  process.env.DATABASE,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASS,
  {
    host: process.env.DATABASE_HOST,
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  }
);

async function checkTable(tableName) {
  const [rows] = await seq.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = :schema AND table_name = :table
     ORDER BY ordinal_position`,
    { replacements: { schema, table: tableName } }
  );
  console.log(`\n=== ${tableName} (schema: ${schema}) ===`);
  if (rows.length === 0) {
    console.log('  [TABLE NOT FOUND or NO COLUMNS]');
  } else {
    rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type}`));
  }
}

(async () => {
  try {
    await seq.authenticate();
    console.log('Connected to DB successfully.');
    await checkTable('pocs');
    await checkTable('meetings');
    await checkTable('poc_partners');
    await seq.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
