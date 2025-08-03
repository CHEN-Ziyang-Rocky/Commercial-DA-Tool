// src/config/app.config.ts
import * as dotenv from 'dotenv';
dotenv.config();

export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  },
});
