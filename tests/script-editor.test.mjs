import test from "node:test";
import assert from "node:assert/strict";
import { highlightScript, indentationEdit, newlineEdit, findRange, lineRange } from "../js/script-editor.mjs";
import { validateScript } from "../js/lumen-script.mjs";
import { scriptSamples } from "../js/script-samples.mjs";
const apply = (source, edit) => source.slice(0, edit.from) + edit.text + source.slice(edit.to);
test("syntax highlighting escapes user markup and leaves quoted keywords intact", () => {
  const html = highlightScript('print "<img src=x onerror=evil()> if"\nrem <script>\nn = 12');
  assert.ok(!html.includes("<img") && !html.includes("<script>"));
  assert.match(html, /code-token--string/);
  assert.match(html, /&lt;img/);
  assert.match(html, /code-token--comment/);
  assert.match(html, /code-token--number/);
});
test("indentation edits preserve selected blocks and exclude the following line", () => {
  const source = "one\ntwo\nthree";
  const indent = indentationEdit(source, 0, 8);
  assert.equal(apply(source, indent), "  one\n  two\nthree");
  const outdent = indentationEdit("  one\n  two\nthree", 0, 12, true);
  assert.equal(apply("  one\n  two\nthree", outdent), source);
  assert.equal(apply("\nabc", indentationEdit("\nabc", 0, 1, true)), "\nabc");
  assert.equal(apply("  text", indentationEdit("  text", 4, 4, true)), "text");
});
test("Enter indents real blocks without treating inline IF as an opener", () => {
  for (const source of ["while 1", "  for i = 1 to 5", "function f(x)", "if x then", "else"]) {
    const result = apply(source, newlineEdit(source, source.length, source.length));
    assert.equal(result.split("\n").at(-1).length, source.match(/^ */)[0].length + 2);
  }
  const inline = "  if x then print x";
  assert.equal(newlineEdit(inline, inline.length, inline.length).text, "\n  ");
  assert.equal(newlineEdit("\nabc", 0, 0).from, 0);
  assert.equal(newlineEdit("", 0, 0).text, "\n");
});
test("literal search wraps both ways and respects match-case", () => {
  assert.deepEqual(findRange("one TWO one", "one", 8), { start: 8, end: 11 });
  assert.deepEqual(findRange("one TWO one", "one", 11), { start: 0, end: 3 });
  assert.deepEqual(findRange("one TWO one", "one", 0, true), { start: 8, end: 11 });
  assert.deepEqual(findRange("one TWO one", "two", 0), { start: 4, end: 7 });
  assert.equal(findRange("one TWO one", "two", 0, false, true), null);
  assert.equal(findRange("text", "", 0), null);
});
test("line navigation clamps and includes the final empty line", () => {
  assert.deepEqual(lineRange("first\nsecond\n", 2), { start: 6, end: 12, line: 2 });
  assert.deepEqual(lineRange("first\nsecond\n", 999), { start: 13, end: 13, line: 3 });
  assert.deepEqual(lineRange("", -3), { start: 0, end: 0, line: 1 });
});
test("syntax checking validates all samples and reports source lines without executing", () => {
  for (const sample of scriptSamples) assert.deepEqual(validateScript(sample.content), [], sample.name);
  assert.match(validateScript('print 1\nif 1 then\nprint 2')[0].message, /never closed/);
  assert.equal(validateScript('print 1\nrect 1, (')[0].line, 2);
  assert.match(validateScript('goto absent')[0].message, /Unknown label/);
  assert.match(validateScript('if 1 then goto absent')[0].message, /Unknown label/);
  assert.deepEqual(validateScript('while 1\n  print 1\nwend'), []);
});

