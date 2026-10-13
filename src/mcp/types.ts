export interface McpServer {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  description?: string;
  exposure?: "codemode" | "deferred" | "direct" | "hidden";
}

export interface McpActionResult {
  ok: boolean;
  servers?: McpServer[];
  applied?: boolean;
  message?: string;
}

export interface McpTestResult {
  ok: boolean;
  tools?: { name: string; description: string }[];
  message?: string;
}
