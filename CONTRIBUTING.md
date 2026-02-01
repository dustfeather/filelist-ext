# Contributing

## Getting Started

```bash
git clone https://github.com/dustfeather/filelist-ext.git
cd filelist-ext
pnpm install
pnpm run dev
```

Load `dist/` as an unpacked extension in Chrome (`chrome://extensions`) or as a temporary add-on in Firefox (`about:debugging`).

## Making Changes

1. Fork the repository and create a branch from `main`
2. Make your changes
3. Ensure `pnpm run build` passes without errors
4. Test the extension manually in Chrome and/or Firefox
5. Open a pull request against `main`

## Code Style

- TypeScript strict mode
- 4-space indentation (see `.editorconfig`)
- Keep changes focused — one feature or fix per PR

## Releases

Releases are automated. Every push to `main` auto-bumps the patch version, creates a git tag, and publishes a GitHub Release with packaged extensions.