import { useState, type ReactNode } from "react";
import { parserSource } from "../data/workspace";
import { Icon } from "./Icon";

function Line({ n, children }: { n: string; children?: ReactNode }) {
  return (
    <>
      <span className="text-outline">{n}</span>
      {children ?? "  "}
      {"\n"}
    </>
  );
}

export function ParserCode() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(parserSource);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-md">
      <div className="flex h-9 items-center justify-between bg-surface-container px-space-md font-code-sm text-code-sm">
        <div className="flex items-center gap-space-sm">
          <Icon name="code" className="text-[15px] text-secondary" />
          <span className="font-medium text-on-surface">src/stream/parser.ts</span>
          <span className="rounded bg-tertiary/10 px-1.5 py-0.5 text-[11px] text-tertiary">TypeScript</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 font-label-xs text-label-xs text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name="content_copy" className="text-[13px]" />
          <span>{copied ? "已复制" : "复制代码"}</span>
        </button>
      </div>
      <pre className="select-text overflow-x-auto p-space-md font-code-md text-code-md leading-5 text-on-surface">
        <code>
          <Line n="01">
            {"  "}
            <span className="text-primary-container">import</span>
            {" { EventEmitter } "}
            <span className="text-primary-container">from</span>{" "}
            <span className="text-tertiary">&apos;node:events&apos;</span>;
          </Line>
          <Line n="02" />
          <Line n="03">
            {"  "}
            <span className="text-primary-container">export class</span>{" "}
            <span className="text-secondary">ResilientSSEParser</span>{" "}
            <span className="text-primary-container">extends</span>{" "}
            <span className="text-secondary">EventEmitter</span>
            {" {"}
          </Line>
          <Line n="04">
            {"    "}
            <span className="text-primary-container">private</span>
            {" buffer: "}
            <span className="text-secondary">Uint8Array</span>
            {" = "}
            <span className="text-primary-container">new</span>{" "}
            <span className="text-secondary">Uint8Array</span>
            {"(0);"}
          </Line>
          <Line n="05">
            {"    "}
            <span className="text-primary-container">private</span>
            {" reconnectAttempts: "}
            <span className="text-secondary">number</span>
            {" = 0;"}
          </Line>
          <Line n="06" />
          <Line n="07">
            {"    "}
            <span className="text-primary-container">constructor</span>
            {"("}
            <span className="text-primary-container">private readonly</span>
            {" maxRetries: "}
            <span className="text-secondary">number</span>
            {" = 5) {"}
          </Line>
          <Line n="08">
            {"      "}
            <span className="text-primary-container">super</span>
            {"();"}
          </Line>
          <Line n="09">{"    }"}</Line>
          <Line n="10" />
          <Line n="11">
            {"    "}
            <span className="text-primary-container">public</span>{" "}
            <span className="text-secondary">feed</span>
            {"(chunk: "}
            <span className="text-secondary">Uint8Array</span>
            {"): "}
            <span className="text-secondary">void</span>
            {" {"}
          </Line>
          <Line n="12">
            {"      "}
            <span className="text-outline">{"// 环形双缓冲拼接，预防分包粘包"}</span>
          </Line>
          <Line n="13">
            {"      "}
            <span className="text-primary-container">const</span>
            {" combined = "}
            <span className="text-primary-container">new</span>{" "}
            <span className="text-secondary">Uint8Array</span>
            {"("}
            <span className="text-primary">this</span>
            {".buffer.length + chunk.length);"}
          </Line>
          <Line n="14">
            {"      combined."}
            <span className="text-secondary">set</span>
            {"("}
            <span className="text-primary">this</span>
            {".buffer);"}
          </Line>
          <Line n="15">
            {"      combined."}
            <span className="text-secondary">set</span>
            {"(chunk, "}
            <span className="text-primary">this</span>
            {".buffer.length);"}
          </Line>
          <Line n="16">
            {"      "}
            <span className="text-primary">this</span>
            {".buffer = combined;"}
          </Line>
          <Line n="17">
            {"      "}
            <span className="text-primary">this</span>
            {"."}
            <span className="text-secondary">drainFrames</span>
            {"();"}
          </Line>
          <Line n="18">{"    }"}</Line>
          <Line n="19">{"  }"}</Line>
        </code>
      </pre>
    </div>
  );
}
