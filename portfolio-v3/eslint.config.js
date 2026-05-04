import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      "@stylistic": stylistic,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "@stylistic/jsx-self-closing-comp": [
        "error",
        {
          component: true,
          html: true,
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
