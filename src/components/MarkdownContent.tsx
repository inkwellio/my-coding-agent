import { Fragment, useMemo, type ReactNode } from "react";
import { Lexer, type Token, type Tokens } from "marked";
import { plainText, safeHref } from "./markdown-utils";

function inline(tokens: Token[]): ReactNode {
  return tokens.map((token, index) => {
    let content: ReactNode;
    switch (token.type) {
      case "strong":
        content = <strong>{inline((token as Tokens.Strong).tokens)}</strong>;
        break;
      case "em":
        content = <em>{inline((token as Tokens.Em).tokens)}</em>;
        break;
      case "del":
        content = <del>{inline((token as Tokens.Del).tokens)}</del>;
        break;
      case "codespan":
        content = <code>{(token as Tokens.Codespan).text}</code>;
        break;
      case "br":
        content = <br />;
        break;
      case "link": {
        const link = token as Tokens.Link;
        const href = safeHref(link.href);
        content = href
          ? <a href={href} target="_blank" rel="noopener noreferrer">{inline(link.tokens)}</a>
          : <span>{inline(link.tokens)}</span>;
        break;
      }
      case "image": {
        const image = token as Tokens.Image;
        const href = safeHref(image.href);
        const label = plainText(image.text || "图片");
        content = href
          ? <a href={href} target="_blank" rel="noopener noreferrer">{label}（打开图片）</a>
          : <span>{label}</span>;
        break;
      }
      case "text": {
        const text = token as Tokens.Text;
        content = text.tokens ? inline(text.tokens) : plainText(text.text);
        break;
      }
      case "html":
        content = token.raw;
        break;
      case "escape":
        content = plainText((token as Tokens.Escape).text);
        break;
      default:
        content = token.raw;
    }
    return <Fragment key={index}>{content}</Fragment>;
  });
}

function tableCell(cell: Tokens.TableCell, key: number, header: boolean) {
  const content = inline(cell.tokens);
  const style = cell.align ? { textAlign: cell.align } : undefined;
  return header
    ? <th key={key} style={style}>{content}</th>
    : <td key={key} style={style}>{content}</td>;
}

function blocks(tokens: Token[]): ReactNode {
  return tokens.map((token, index) => {
    let content: ReactNode;
    switch (token.type) {
      case "heading": {
        const headingToken = token as Tokens.Heading;
        const depth = Math.min(Math.max(headingToken.depth, 1), 6);
        content = heading(depth, inline(headingToken.tokens));
        break;
      }
      case "paragraph":
        content = <p>{inline((token as Tokens.Paragraph).tokens)}</p>;
        break;
      case "text": {
        const text = token as Tokens.Text;
        content = <p>{text.tokens ? inline(text.tokens) : plainText(text.text)}</p>;
        break;
      }
      case "code": {
        const code = token as Tokens.Code;
        content = (
          <div className="markdown-code-block">
            {code.lang ? <div className="markdown-code-label">{code.lang}</div> : null}
            <pre><code>{code.text}</code></pre>
          </div>
        );
        break;
      }
      case "blockquote":
        content = <blockquote>{blocks((token as Tokens.Blockquote).tokens)}</blockquote>;
        break;
      case "list": {
        const list = token as Tokens.List;
        const items = list.items.map((item, itemIndex) => (
          <li key={itemIndex}>
            {item.task ? <input type="checkbox" checked={Boolean(item.checked)} readOnly disabled aria-label="任务状态" /> : null}
            {blocks(item.tokens.filter((part) => part.type !== "checkbox"))}
          </li>
        ));
        content = list.ordered
          ? <ol start={typeof list.start === "number" ? list.start : undefined}>{items}</ol>
          : <ul>{items}</ul>;
        break;
      }
      case "table": {
        const table = token as Tokens.Table;
        content = (
          <div className="markdown-table-wrap">
            <table>
              <thead><tr>{table.header.map((cell, cellIndex) => tableCell(cell, cellIndex, true))}</tr></thead>
              <tbody>{table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => tableCell(cell, cellIndex, false))}</tr>
              ))}</tbody>
            </table>
          </div>
        );
        break;
      }
      case "hr":
        content = <hr />;
        break;
      case "html":
        content = <p className="whitespace-pre-wrap">{token.raw}</p>;
        break;
      case "space":
      case "def":
        content = null;
        break;
      default:
        content = <p className="whitespace-pre-wrap">{token.raw}</p>;
    }
    return <Fragment key={index}>{content}</Fragment>;
  });
}

function heading(depth: number, content: ReactNode) {
  switch (depth) {
    case 1: return <h1>{content}</h1>;
    case 2: return <h2>{content}</h2>;
    case 3: return <h3>{content}</h3>;
    case 4: return <h4>{content}</h4>;
    case 5: return <h5>{content}</h5>;
    default: return <h6>{content}</h6>;
  }
}

export function MarkdownContent({ text }: { text: string }) {
  const tokens = useMemo(() => {
    try {
      return Lexer.lex(text, { gfm: true, breaks: false });
    } catch {
      return null;
    }
  }, [text]);
  return (
    <div className="assistant-markdown select-text break-words font-body-md text-body-md leading-relaxed text-on-surface">
      {tokens ? blocks(tokens) : <p className="whitespace-pre-wrap">{text}</p>}
    </div>
  );
}
