export interface NormalizeOptions {
  outputDir?: string;
  keepBackup?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface FileWithStat {
  path: string;
  birthtimeMs: number;
}
