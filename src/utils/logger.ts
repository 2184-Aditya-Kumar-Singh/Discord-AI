type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, meta?: unknown) {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console[level === "error" ? "error" : "log"](`[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${suffix}`);
}

export const logger = {
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta)
};
