# Future cleanup work

Temporary workarounds that should be undone once their upstream cause is gone.
Each entry says how to tell whether it can be removed and how to verify the
removal. Delete an entry once it is cleaned up.

## Remove the `minimatch` overrides

**Added:** 2026-11-10, to clear `npm audit` before a redeploy.

**What:** both projects force `minimatch` onto a version their lint tooling
does not officially support yet.

- `portfolio-v3/package.json` has a global override:
  ```json
  "overrides": { "minimatch": "11.0.5" }
  ```
- `portfolio-v2/package.json` has a scoped override. It is scoped because v2's
  eslint 9 uses `minimatch@3`, which is unaffected and has a different API, so
  a global override would break it:
  ```json
  "overrides": {
    "@typescript-eslint/typescript-estree": { "minimatch": "11.0.5" }
  }
  ```

**Why:** advisory
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
(globparts amplification DoS) affects `minimatch >=7.0.0 <11.0.1`. When it was
published, the latest `eslint` (10.14.0) and `typescript-eslint` (8.72.2) still
depended on `minimatch@^10`, so there was no upstream fix. `npm audit fix
--force` would have downgraded v3 to eslint 9 instead.

The risk is low either way: `minimatch` is only pulled in by dev-time lint
tooling and never ships in the built site. The override's cost is that
`minimatch` stays pinned at exactly `11.0.5` and misses future patch releases.

**When it can be removed:** once the versions of `eslint`,
`@eslint/config-array`, and `@typescript-eslint/typescript-estree` you would
install depend on a patched `minimatch` (`>=11.0.1`). Check with:

```sh
npm view eslint dependencies.minimatch
npm view @eslint/config-array dependencies.minimatch
npm view @typescript-eslint/typescript-estree dependencies.minimatch
```

**How to remove:** in each project,

1. Delete the `overrides` block from `package.json`.
2. Upgrade `eslint`, `@eslint/js`, and `typescript-eslint` to versions that use
   the patched `minimatch`, then run `npm install`.
3. Confirm `npm ls minimatch` shows no `overridden` entries and `npm audit`
   reports 0 vulnerabilities.
4. Run `npm run lint` and make sure it still lints the expected number of
   files (`npx eslint . --format json` lists them), not zero.
