import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

export default defineConfig({
  out:"./src/db/drizzle",
  dialect: 'postgresql', 
  schema: './src/db/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  }
})