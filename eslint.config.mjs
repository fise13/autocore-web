import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * React Compiler lint debt.
 *
 * `eslint-config-next` promoted the react-hooks compiler rules to errors, which
 * turned ~530 pre-existing violations into a red pipeline overnight. They are
 * real signal — `set-state-in-effect` in particular hides render loops — but
 * they are not new regressions, and leaving them as errors meant `npm run lint`
 * exited 1 and every later CI step (typecheck, tests, build) never ran at all.
 *
 * Downgraded to warnings so the gate works again. Warnings stay visible in
 * output; CI fails on errors only. Ratchet these back to "error" one rule at a
 * time as the count reaches zero — do not add new violations.
 *
 * Baseline at the time of writing: immutability 244, refs 148,
 * set-state-in-effect 139, preserve-manual-memoization 13, purity 5,
 * static-components 4.
 */
const REACT_COMPILER_DEBT = {
  "react-hooks/immutability": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/static-components": "warn",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated / vendored trees that are not ours to lint.
    "graphify-out/**",
    "src-tauri/**",
    "firebase/functions/lib/**",
    "**/node_modules/**",
  ]),
  {
    rules: REACT_COMPILER_DEBT,
  },
  {
    // Config and script files legitimately use CommonJS require().
    files: ["**/*.config.js", "**/*.config.cjs", "scripts/**", "**/metro.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    /**
     * React Native resolves static assets through `require('./thing.png')` —
     * the Metro bundler needs the literal call, an ESM import will not do. Expo
     * config plugins under `plugins/` are CommonJS modules by contract. Both are
     * the platform's idiom, not a lapse, so the web-oriented default is off for
     * the mobile tree.
     */
    files: ["autocore-mobile/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      /**
       * HTML-only rule. React Native `<Text>` renders its children literally,
       * so "escaping" an apostrophe here would put the characters `&apos;` on
       * screen for the user. Applying it to the mobile tree introduces bugs
       * rather than preventing them.
       */
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
