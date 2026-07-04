/* eslint-disable */
// @ts-check

/** @type {import("@typescript-eslint/utils").TSESLint.FlatConfig.ConfigFile} */

module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: "module",
    },
    plugins: ["@typescript-eslint", "prettier"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended",
    ],
    rules: {
        /* Prettier formatting */
        "prettier/prettier": "error",

        /* TypeScript */
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/explicit-function-return-type": "warn",
        "@typescript-eslint/explicit-module-boundary-types": "warn",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
        "@typescript-eslint/no-import-type-side-effects": "error",

        /* General */
        "no-console": ["warn", { allow: ["warn", "error", "info"] }],
        "eqeqeq": ["error", "always"],
        "curly": ["error", "all"],
        "prefer-const": "error",
    },
    ignorePatterns: ["dist/", "node_modules/", "*.js", "*.cjs"],
};
