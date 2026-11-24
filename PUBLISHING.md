# Publishing checklist

This file is for maintainers and is **not** included in the npm package, because only `dist`, `README.md`, `LICENSE`, and `package.json` are published.

## 1. One-time setup

1. Create an npm account at https://www.npmjs.com/signup and verify your email.
2. **Turn on two-factor authentication.** npm requires 2FA, or a granular token with bypass-2FA, to publish.
3. Log in from this folder:
   ```bash
   npm login
   npm whoami
   ```
4. Replace the placeholders:
   - `package.json`: `author`, `homepage`, `repository.url`, `bugs.url` (`YOUR_NAME`, `YOUR_GITHUB_USER`)
   - `LICENSE`: `YOUR_NAME`
5. Recommended: push this folder to its own public GitHub repo so the `repository` link works. Provenance also needs it (step 5).

### Package name

`react-date-filter-picker` was **unclaimed on npm on 2026-11-24**. Check again just before publishing:

```bash
npm view react-date-filter-picker   # E404 = still free
```

If it has been taken, use a scoped name such as `@your-npm-user/react-date-filter-picker`. Change `name` in `package.json` and the import paths in `README.md`. `publishConfig.access: "public"` is already set, which scoped packages need because they are private by default.

## 2. Build and verify locally

```bash
npm install
npm run typecheck
npm run build
npm run lint:package      # publint + are-the-types-wrong
npm pack --dry-run        # lists exactly what will be uploaded
```

To try the real tarball in another project before publishing:

```bash
npm pack                                  # creates react-date-filter-picker-1.0.0.tgz
cd ../some-other-app
npm install /path/to/react-date-filter-picker-1.0.0.tgz
```

## 3. Publish

```bash
npm publish --dry-run     # final check, uploads nothing
npm publish               # prepublishOnly runs typecheck + build + lint first
```

npm prompts for your 2FA code. Then check https://www.npmjs.com/package/react-date-filter-picker.

## 4. Releasing updates

You can never publish the same version twice, even after an unpublish. Bump it first:

```bash
npm version patch   # 1.0.1: bug fix
npm version minor   # 1.1.0: new backwards-compatible feature or prop
npm version major   # 2.0.0: breaking change (renamed prop, changed value shape)
npm publish
```

Add an entry to `CHANGELOG.md` with each release.

Pre-release: `npm version prerelease --preid beta`, then `npm publish --tag beta`, so `latest` is not touched.

## 5. Optional: publish from GitHub Actions with provenance

npm's recommended CI setup is **trusted publishing (OIDC)**. You configure it on the package's settings page on npmjs.com after the first manual publish. No token is stored, and provenance is attached automatically. Minimal workflow:

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  release:
    types: [published]
permissions:
  contents: read
  id-token: write
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm publish
```

The `repository.url` in `package.json` must exactly match the GitHub repo, including case.

## What's in the package

| Path | Purpose |
|---|---|
| `dist/index.js` + `index.d.ts` | ES module build + types |
| `dist/index.cjs` + `index.d.cts` | CommonJS build + types |
| `dist/styles.css` | Stylesheet (`import "react-date-filter-picker/styles.css"`) |

`sideEffects: ["**/*.css"]` lets bundlers tree-shake the JS while keeping the CSS import.
