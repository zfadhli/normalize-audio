# normalize-audio

Normalize audio in video files using [`ffmpeg-normalize`](https://github.com/slhck/ffmpeg-normalize). Supports batch processing of entire directories with recursive search, sorted by creation date (oldest first).

## Requirements

- [Bun](https://bun.sh) 1.x
- [uv](https://docs.astral.sh/uv/) (provides `uvx`) — install with:
  ```sh
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

## Usage

```sh
bun src/index.ts [input] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `input`  | Video file or directory (default: current directory) |

### Options

| Flag | Description |
|------|-------------|
| `-o, --output-dir <dir>` | Output directory (default: same as input) |
| `-k, --keep-backup`      | Keep the `_normalize` backup file |
| `-d, --dry-run`          | Show what would be done without doing it |
| `-v, --verbose`          | Show ffmpeg-normalize warnings and progress |
| `--version`              | Print version |

### Examples

```sh
# Normalize a single file
bun src/index.ts video.mp4

# Normalize all videos in a directory (recursive), oldest first
bun src/index.ts /path/to/videos

# Dry-run to preview changes
bun src/index.ts video.mp4 --dry-run

# Keep the backup file
bun src/index.ts video.mp4 --keep-backup
```

## How it works

1. **Backup** — renames the input file to `{name}_normalize{ext}`
2. **Normalize** — runs `uvx ffmpeg-normalize` with `--preset streaming-video -c:a aac`, outputting to `{name}.mp4`
3. **Cleanup** — removes the backup file (unless `--keep-backup`)

In **directory mode**, files are collected recursively, sorted by creation date (oldest first), and processed sequentially. Errors in individual files are reported and processing continues with the next file.

## Supported formats

`.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.flv`

## Scripts

| Command | Action |
|---------|--------|
| `bun run lint`       | Biome check |
| `bun run lint:fix`   | Biome check with auto-fix |
| `bun run format`     | Biome format |
| `bun run typecheck`  | Type check with Bun |
