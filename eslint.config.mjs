import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import unicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import importPlugin from "eslint-plugin-import";

export default [
  {
    files: ["**/*.js", "**/*.coffee"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "script"
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      unicorn,
      sonarjs,
      import: importPlugin
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",

      "complexity": ["warn", 10],
      "max-depth": ["warn", 4],
      "max-nested-callbacks": ["warn", 3],
      "max-params": ["warn", 4],
      "max-statements": ["warn", 20],

      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-duplicate-string": ["warn", { "threshold": 3 }],
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-small-switch": "warn",
      "sonarjs/no-nested-switch": "warn",

      "unicorn/prevent-abbreviations": "off",
      "unicorn/filename-case": "off",
      "unicorn/no-null": "off",
      "unicorn/no-array-reduce": "off",

      "import/no-unresolved": "off",
      "import/no-extraneous-dependencies": "off"
    }
  }
];
