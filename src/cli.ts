/**
 * CLI entrypoint — starts the newsletter-commerce-mcp server over stdio.
 */

import { startStdioServer } from "./server.js";

startStdioServer().catch((err: unknown) => {
  process.stderr.write(
    `[newsletter-commerce-mcp] Fatal: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
