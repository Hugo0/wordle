import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
    // @ts-expect-error earlyAccess is a valid runtime option not yet reflected in Prisma's type definitions
    earlyAccess: true,
    schema: path.join(__dirname, 'schema.prisma'),
    datasource: {
        url: process.env.DATABASE_URL!,
    },
});
