// Unit and API tests with coverage. `npm test` stays on node:test.
export default {
    testEnvironment: 'node',
    roots: ['<rootDir>/jest'],
    testMatch: ['**/*.spec.ts'],
    setupFiles: ['<rootDir>/jest/setup/env.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest/setup/mocks.ts'],
    // Prisma's generated client imports its own .ts files as ".js" (ESM style).
    moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
    transform: {
        // Types are checked by `npm run typecheck`, so here it only compiles.
        '^.+\\.ts$': [
            'ts-jest',
            {
                diagnostics: false,
                tsconfig: {
                    target: 'es2022',
                    module: 'commonjs',
                    esModuleInterop: true,
                },
            },
        ],
    },
    // Every unit of the API. Left out: Prisma's generated client, type-only
    // files, and the three scripts that are not part of the server (the
    // entry point that only listens, the seed, and the admin CLI).
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.test.ts',
        '!src/**/*.d.ts',
        '!src/generated/**',
        '!src/index.ts',
        '!src/seed.ts',
        '!src/create-admin.ts',
    ],
    coverageReporters: ['text', 'json', 'json-summary'],
};
