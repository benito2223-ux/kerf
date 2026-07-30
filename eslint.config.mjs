import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // next-env.d.ts est régénéré par Next lui-même (triple-slash inclus) — ne pas le linter.
    ignores: ["node_modules/**", ".next/**", "db/migrations/**", "next-env.d.ts"],
  },
];

export default config;
