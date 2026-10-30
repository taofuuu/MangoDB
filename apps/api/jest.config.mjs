// White-box coverage for the Test Plan only. `npm test` stays on node:test.
export default {
    testEnvironment: 'node',
    roots: ['<rootDir>/jest'],
    testMatch: ['**/*.spec.ts'],
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
    collectCoverageFrom: ['src/lib/listing.ts'],
    coverageReporters: ['text', 'json'],
};
