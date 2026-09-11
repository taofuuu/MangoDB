import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // Prisma output and the compiled build are not ours to lint.
    { ignores: ['src/generated/**', 'dist/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            // A warning, not an error, so a helper written ahead of the branch
            // that uses it does not block a commit. Prefix with _ to say the
            // unused name is deliberate.
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
);
