import { TQDM_BAR_LINE_RE, TQDM_PCT_RE } from "./constants";

export function parseTqdmProgress(text: string): string | null {
  const re = TQDM_PCT_RE;
  let last: string | null = null;
  for (let m: RegExpExecArray | null = re.exec(text); m !== null; m = re.exec(text)) {
    last = m[1];
  }
  return last;
}

export function extractStderrError(stderr: string, fallback: string): string {
  return (
    stderr
      .split("\n")
      .filter((l) => !TQDM_BAR_LINE_RE.test(l) && l.trim())
      .pop() || fallback
  );
}
