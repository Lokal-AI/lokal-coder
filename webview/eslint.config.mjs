import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import { fixupPluginRules } from "@eslint/compat";

export default tseslint.config(
	{
		ignores: [
			"dist-webview/**",
			"node_modules/**"
		]
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.{ts,tsx}"],
		plugins: {
			react: fixupPluginRules(reactPlugin),
			"react-hooks": fixupPluginRules(hooksPlugin),
		},
		settings: {
			react: {
				version: "18.2", // Explicit version avoids crashing auto-detection
			},
		},
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2020,
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...hooksPlugin.configs.recommended.rules,
			"react/react-in-jsx-scope": "off",
			"react/no-unescaped-entities": "off",
			"@typescript-eslint/no-unused-vars": ["warn", { 
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_",
				"caughtErrorsIgnorePattern": "^_"
			}],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"no-console": ["error", { "allow": ["warn", "error"] }]
		},
	}
);
