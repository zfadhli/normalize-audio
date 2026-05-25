export const SUPPORTED_EXTS = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv"];

export const UVX_CMD = "uvx";

export const FFMPEG_NORMALIZE_ARGS = ["--preset", "streaming-video", "-c:a", "aac"];

export const TQDM_PCT_RE = /(\d+\.?\d*)%\s*\|/g;

export const TQDM_BAR_LINE_RE = /%\s*\|/;
