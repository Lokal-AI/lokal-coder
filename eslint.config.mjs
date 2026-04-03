import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
	{
		ignores: [
			"out/**",
			"dist/**",
			"**/*.d.ts",
			"node_modules/**"
		]
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: "module",
			globals: {
				...globals.node,
				...globals.es2020
			}
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { 
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_",
				"caughtErrorsIgnorePattern": "^_"
			}],
			"@typescript-eslint/no-explicit-any": "off",
			"no-console": ["error", { "allow": ["warn", "error"] }],
			"prefer-const": "error",
			"no-empty": "error"
		}
	}
);
