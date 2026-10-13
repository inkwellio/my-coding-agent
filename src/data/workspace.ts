export const userPrompt =
  "请帮我重构 SSE 流式解析器，支持自动重连以及解析 chunk 粘包异常，增加完整的单元测试。";

export const reasoningChips = [
  { icon: "search", text: "分析当前 src/stream/parser.ts 结构", tone: "text-secondary" },
  { icon: "warning", text: "检测到 2 处边界缓冲区溢出风险", tone: "text-error" },
  { icon: "psychology", text: "选定双指针切片算法", tone: "text-tertiary" },
] as const;

export const reasoningSteps = [
  "1. 原生 implementation 缺乏对 HTTP chunk 分块在 CRLFCRLF 双换行截断场景的边界防护。",
  "2. 引入状态机环形缓冲区，对 incomplete frame 做滑动视窗保留，避免大量 string concat 导致 GC 停顿。",
  "3. 结合指数退避机制（Jittered Backoff）实现零竞态重连。",
];

export const parserSource = `import { EventEmitter } from 'node:events';

export class ResilientSSEParser extends EventEmitter {
  private buffer: Uint8Array = new Uint8Array(0);
  private reconnectAttempts: number = 0;

  constructor(private readonly maxRetries: number = 5) {
    super();
  }

  public feed(chunk: Uint8Array): void {
    // 环形双缓冲拼接，预防分包粘包
    const combined = new Uint8Array(this.buffer.length + chunk.length);
    combined.set(this.buffer);
    combined.set(chunk, this.buffer.length);
    this.buffer = combined;
    this.drainFrames();
  }
}
`;
