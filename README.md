# excalidraw-export-cli

Export `.excalidraw` files to PNG using headless Chromium.

## Setup

```bash
npm install -g excalidraw-export-cli
npx playwright install chromium
```

Or use without installing:

```bash
npx excalidraw-export-cli diagram.excalidraw output.png
```

## Usage

```bash
excalidraw-export diagram.excalidraw              # outputs diagram.png
excalidraw-export diagram.excalidraw output.png   # custom output path
```

## Requirements

- Node.js >= 18
- Playwright with Chromium (`npx playwright install chromium`)

## How it works

Launches headless Chromium, loads the Excalidraw library from esm.sh, renders the diagram at 2x resolution, and saves the result as PNG.

The default Excalifont handwriting font is replaced with Playpen Sans for cleaner rendering.

## License

MIT
