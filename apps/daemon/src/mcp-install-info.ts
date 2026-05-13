export interface McpInstallPayload {
  command: string;
  args: string[];
  env: Record<string, string>;
  daemonUrl: string;
  platform: NodeJS.Platform;
  cliExists: boolean;
  nodeExists: boolean;
  buildHint: string | null;
}

export function buildMcpInstallPayload(inputs: {
  cliPath: string;
  cliExists: boolean;
  execPath: string;
  nodeExists: boolean;
  port: number;
  platform: NodeJS.Platform;
  dataDir: string;
  electronAsNode?: boolean;
}): McpInstallPayload {
  const hints: string[] = [];
  if (!inputs.cliExists) hints.push(`Pixelpitch CLI entry is missing at ${inputs.cliPath}. Rebuild and refresh.`);
  if (!inputs.nodeExists) hints.push(`Node-compatible runtime is missing at ${inputs.execPath}.`);
  return {
    command: inputs.execPath,
    args: [inputs.cliPath, 'mcp', '--daemon-url', `http://127.0.0.1:${inputs.port}`],
    env: {
      PIXELPITCH_DATA_DIR: inputs.dataDir,
      ...(inputs.electronAsNode ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
    },
    daemonUrl: `http://127.0.0.1:${inputs.port}`,
    platform: inputs.platform,
    cliExists: inputs.cliExists,
    nodeExists: inputs.nodeExists,
    buildHint: hints.length ? hints.join(' ') : null,
  };
}
