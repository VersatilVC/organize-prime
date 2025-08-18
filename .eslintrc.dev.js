export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      
      // Performance optimizations (more lenient for dev)
      'no-console': 'off', // Allow console in development
      'no-debugger': 'warn', // Warn instead of error
      'no-unused-vars': 'warn', // Warn instead of error
      
      // Code quality (more lenient)
      'prefer-const': 'warn',
      'no-var': 'warn',
      'object-shorthand': 'warn',
      'prefer-template': 'warn',
      'prefer-arrow-callback': 'warn',
      
      // Import optimizations
      'no-duplicate-imports': 'warn',
      
      // TypeScript specific (much more lenient for dev)
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // Allow any types in development
    },
  },
];