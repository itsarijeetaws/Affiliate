import { defineConfig } from '@prisma/internals';

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  prisma: {
    seed: undefined,
  },
  migrate: {
    skip: false,
    shadowDatabase: null, // Disable shadow database for Hostinger
  },
});
