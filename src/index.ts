#!/usr/bin/env bun

import { stat } from "node:fs/promises";
import { basename, relative } from "node:path";
import { Command } from "commander";
import { version } from "../package.json";
import { SUPPORTED_EXTS, UVX_CMD } from "./constants";
import { normalizeOne, scanFiles } from "./normalize";
import type { FileWithStat } from "./types";

const program = new Command();

program
  .name("normalize-audio")
  .version(version)
  .description("Normalize audio in video files using ffmpeg-normalize")
  .argument("[input]", "video file or directory (default: current directory)")
  .option("-o, --output-dir <dir>", "output directory (default: same as input)")
  .option("-k, --keep-backup", "keep the _normalize backup file")
  .option("-d, --dry-run", "show what would be done without doing it")
  .option("-v, --verbose", "show ffmpeg-normalize warnings and progress")
  .action(async (input, options) => {
    const target = input || ".";

    if (!Bun.which(UVX_CMD)) {
      program.error(
        `${UVX_CMD} is not installed. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh`,
      );
    }

    const info = await stat(target).catch(() => null);
    if (!info) {
      program.error(`file or directory not found: ${target}`);
      return;
    }

    function onSignal() {
      console.log(
        "\nNote: backup files (ending in _normalize) may exist. Rename them back manually to restore originals.",
      );
      process.exit(1);
    }

    process.on("SIGINT", onSignal);

    try {
      if (info.isFile()) {
        await normalizeOne(target, options);
      } else if (info.isDirectory()) {
        let files: string[] = [];
        for await (const f of scanFiles(target)) {
          files.push(f);
        }

        const withStats: FileWithStat[] = await Promise.all(
          files.map(async (f) => {
            const s = await stat(f).catch(() => null);
            return { path: f, birthtimeMs: s?.birthtimeMs ?? s?.mtimeMs ?? 0 };
          }),
        );
        withStats.sort((a, b) => a.birthtimeMs - b.birthtimeMs);
        files = withStats.map((s) => s.path);

        if (files.length === 0) {
          console.log(`No supported video files found (${SUPPORTED_EXTS.join(", ")}).`);
          return;
        }

        if (options.dryRun) {
          console.log(`Found ${files.length} file(s):\n`);
          for (const file of files) {
            console.log(`  ${relative(target, file) || basename(file)}`);
            await normalizeOne(file, options);
            console.log();
          }
          console.log("[dry-run] No changes were made.");
          return;
        }

        console.log(`Found ${files.length} file(s)\n`);

        let ok = 0;
        for (const file of files) {
          const rel = relative(target, file) || basename(file);
          try {
            await normalizeOne(file, options);
            ok++;
            console.log(`  \u2713 ${rel}\n`);
          } catch {
            console.log(`  \u2717 ${rel}\n`);
          }
        }

        console.log(`Done: ${ok}/${files.length} succeeded`);
      }
    } finally {
      process.off("SIGINT", onSignal);
    }
  });

program.parse();
