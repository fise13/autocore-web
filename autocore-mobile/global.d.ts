declare module '*.css';

/**
 * React Native exposes the Node-style `global` object at runtime, but Expo's
 * tsconfig ships only the DOM and ESNext libs, so it has no type.
 *
 * This matters because `react-native-iap` resolves to TypeScript *source*
 * (its `react-native` export condition points at `src/index.ts` rather than a
 * `.d.ts`), so tsc type-checks the library itself and `skipLibCheck` does not
 * apply. Declaring the binding here is accurate rather than a suppression —
 * `global` genuinely exists in the RN runtime.
 */
declare let global: typeof globalThis;
