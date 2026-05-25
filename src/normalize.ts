import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import ora from "ora";
import { FFMPEG_NORMALIZE_ARGS, SUPPORTED_EXTS, UVX_CMD } from "./constants";
import { extractStderrError, parseTqdmProgress } from "./progress";
import type { NormalizeOptions } from "./types";

export async function* scanFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => {
    console.warn(`warning: unable to read directory: ${dir}`);
    return [];
  });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* scanFiles(full);
    } else if (entry.isFile() && SUPPORTED_EXTS.includes(extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

export async function normalizeOne(input: string, options: NormalizeOptions): Promise<void> {
  const ext = extname(input).toLowerCase();
  if (!SUPPORTED_EXTS.includes(ext)) {
    throw new Error(`unsupported format: ${ext}`);
  }

  const inputDir = dirname(input);
  const name = basename(input, ext);
  const backupPath = join(inputDir, `${name}_normalize${ext}`);
  const outputDir = options.outputDir || inputDir;
  const outputPath = join(outputDir, `${name}.mp4`);

  if (options.dryRun) {
    console.log(`  mv ${input} → ${backupPath}`);
    console.log(
      `  ${UVX_CMD} ffmpeg-normalize ${backupPath} -o ${outputPath} ${FFMPEG_NORMALIZE_ARGS.join(" ")}`,
    );
    if (!options.keepBackup) console.log(`  rm ${backupPath}`);
    return;
  }

  let spinner = ora("Creating backup…").start();
  try {
    await rename(input, backupPath);
    spinner.succeed(`Backup: ${name}_normalize${ext}`);
  } catch (e) {
    spinner.fail(`Failed to create backup: ${(e as Error).message}`);
    throw e;
  }

  if (outputDir !== inputDir) {
    await mkdir(outputDir, { recursive: true });
  }

  spinner = ora("Normalizing…").start();

  const proc = Bun.spawn(
    [UVX_CMD, "ffmpeg-normalize", backupPath, "-o", outputPath, ...FFMPEG_NORMALIZE_ARGS],
    { stdio: ["ignore", "inherit", "pipe"] },
  );

  const reader = proc.stderr.getReader();
  const decoder = new TextDecoder();
  let stderrBuf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    stderrBuf += chunk;

    if (options.verbose) {
      process.stderr.write(chunk);
    }

    const pct = parseTqdmProgress(chunk);
    if (pct) {
      spinner.text = `Normalizing ${pct}%`;
    }
  }

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    spinner.fail("Normalization failed");
    const errLine = extractStderrError(stderrBuf, `uvx exited with code ${exitCode}`);
    throw new Error(errLine);
  }

  spinner.succeed(`Output: ${outputPath}`);

  if (!options.keepBackup) {
    spinner = ora("Removing backup…").start();
    try {
      await rm(backupPath);
      spinner.succeed("Backup removed");
    } catch (e) {
      spinner.fail(`Failed to remove backup: ${(e as Error).message}`);
      throw e;
    }
  }
}
