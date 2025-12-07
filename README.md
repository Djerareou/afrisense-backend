<<<<<<< HEAD
# afrisense-backend
MVP de Afrisence ; boite de geotracking
=======
# AfriSense Backend — Tests & ESM notes

This project uses ECMAScript modules (see `package.json` -> `type: "module"`).

## Run tests (current setup)

The repository is configured to run Jest in ESM mode by invoking Node's VM modules.

Install dependencies (if not already installed):

```bash
npm install
# AfriSense Backend

MVP de AfriSense — backend pour suivi de trackers, positions et alertes.

## Tests & ESM notes

This project uses ECMAScript modules (see `package.json` -> `type: "module"`).

### Run tests (current setup)

Install dependencies (if not already installed):

```bash
npm install
```

Run the test suite:

```bash
npm test
```

Under the hood this runs Jest in ESM mode. The project may include an experimental flag in some environments but the provided test scripts handle the current setup.

### Why this approach

- The codebase uses native `import` / `export` (ESM). Running Jest with the VM modules flag is one way to execute ESM code without a build step.

### Alternatives

1. Use Babel to transform ESM for Jest (no experimental flag):

   - Install dev deps: `npm install --save-dev @babel/core @babel/preset-env babel-jest`
   - Add a minimal Babel config (e.g. `.babelrc` with `{"presets":["@babel/preset-env"]}`)
   - Configure Jest normally (Babel will transform files for the test runner).

2. Convert the project to CommonJS (remove `type: "module"` in `package.json` and replace `import`/`export` with `require`/`module.exports`).

Choose the alternative if you want to avoid the experimental flag or need broader tool compatibility.

### Troubleshooting

- If tests fail due to missing packages, run `npm install` and re-run `npm test`.
- If you see syntax errors from third-party packages, you may need to adjust Jest's `transformIgnorePatterns` or transpile some node_modules using Babel.

If you want, I can:
- add a `jest.config.js` file,
- add an optional `test:jest` script that runs Jest directly without the `node` wrapper, or
- add the Babel setup to avoid the experimental flag.

Tell me which alternative you prefer and I will implement it.
