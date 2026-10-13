import assert from "node:assert/strict";
import { plainText, safeHref } from "../src/components/markdown-utils.ts";
import { Lexer } from "marked";

assert.equal(safeHref("https://example.com/docs"), "https://example.com/docs");
assert.equal(safeHref("mailto:hello@example.com"), "mailto:hello@example.com");
for (const href of ["javascript:alert(1)", "data:text/html,<script>1</script>", "file:///etc/passwd", "#/settings"]) {
  assert.equal(safeHref(href), null);
}
assert.equal(plainText("A &amp; B &lt;script&gt; &#x1f44d;"), "A & B <script> 👍");

const sample = Lexer.lex("# 标题\n\n- **列表**\n\n```js\nconst x = 1\n", { gfm: true });
assert.deepEqual(sample.filter((token) => token.type !== "space").map((token) => token.type), ["heading", "list", "code"]);
assert.equal(sample.at(-1)?.type, "code", "an unfinished stream fence should remain a code token");
console.log("markdown smoke ok");
