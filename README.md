# AfriSense Backend — Tests & ESM notes

This project uses ECMAScript modules (see `package.json` -> `type: "module"`).

## Run tests (current setup)

The repository is configured to run Jest in ESM mode by invoking Node's VM modules.

Install dependencies (if not already installed):

```bash
npm install
```

Run the test suite:

```bash
npm test
```

Under the hood this runs:

```bash
node --experimental-vm-modules node_modules/.bin/jest --runInBand
```

Note: Node will emit an `ExperimentalWarning: VM Modules` message. This is expected when using `--experimental-vm-modules` and does not indicate a failing test.

## Why this approach

- The codebase uses native `import` / `export` (ESM). Running Jest with the experimental VM modules flag is the simplest way to execute ESM code without adding a build/transpile step.

## Alternatives

1. Use Babel to transform ESM for Jest (no experimental flag):

   - Install dev deps: `npm install --save-dev @babel/core @babel/preset-env babel-jest`
   - Add a minimal Babel config (e.g. `.babelrc` with `{"presets":["@babel/preset-env"]}`)
   - Configure Jest normally (Babel will transform files for the test runner).

2. Convert the project to CommonJS (remove `type: "module"` in `package.json` and replace `import`/`export` with `require`/`module.exports`).

Choose the alternative if you want to avoid the experimental flag or need broader tool compatibility.

## Troubleshooting

- If tests fail due to missing packages, run `npm install` and re-run `npm test`.
- If you see syntax errors from third-party packages, you may need to adjust Jest's `transformIgnorePatterns` or transpile some node_modules using Babel.

If you want, I can:
- add a `jest.config.js` file,
- add an optional `test:jest` script that runs Jest directly without the `node` wrapper (for environments that handle ESM differently), or
- add the Babel setup to avoid the experimental flag.
Tell me which alternative you prefer and I will implement it.

---

## Release v1.0.0

This repository has been tagged `v1.0.0` and pushed to the `origin` remote. The tag represents the initial stable release of the AfriSense backend (feature-complete for the core MVP implemented in this branch).

If you want a GitHub Release created with release notes, provide a short changelog or let me create a draft release (I can create it via the GitHub API if you provide a PAT, or you can create it manually on GitHub using the tag).

## OpenAPI / API docs

The project ships an OpenAPI JSON at `src/docs/openapi.json`. The Express app exposes it via Swagger UI at:

   /api/docs

Start the server and open `http://localhost:PORT/api/docs` to view interactive API documentation (the `PORT` defaults to 3000 if you run `npm start` locally).

If you want the OpenAPI file to include the new Alerts endpoints, I can update `src/docs/openapi.json` with the new paths and schemas.

