const test = require('node:test');
const assert = require('node:assert/strict');
const { EditorState } = require('@codemirror/state');
const {
  duplicateLine,
  moveLineUp,
  moveLineDown,
} = require('../renderer/js/editCommands.js');

function apply(doc, anchor, command) {
  const state = EditorState.create({ doc, selection: { anchor } });
  const spec = command(state);
  if (!spec) return state;
  return state.update(spec).state;
}

test('Ctrl+D duplicates the final line without an out-of-range change', () => {
  const state = apply('abc', 2, duplicateLine);
  assert.equal(state.doc.toString(), 'abc\nabc');
  assert.equal(state.selection.main.anchor, 7);
});

test('Alt+ArrowUp moves the selected line without deleting content', () => {
  const state = apply('one\ntwo\nthree', 5, moveLineUp);
  assert.equal(state.doc.toString(), 'two\none\nthree');
  assert.equal(state.doc.lineAt(state.selection.main.anchor).text, 'two');
});

test('Alt+ArrowDown moves the selected line without deleting content', () => {
  const state = apply('one\ntwo\nthree', 1, moveLineDown);
  assert.equal(state.doc.toString(), 'two\none\nthree');
  assert.equal(state.doc.lineAt(state.selection.main.anchor).text, 'one');
});

test('line moves at document boundaries are no-ops', () => {
  const first = EditorState.create({ doc: 'one\ntwo', selection: { anchor: 0 } });
  const last = EditorState.create({ doc: 'one\ntwo', selection: { anchor: 5 } });
  assert.equal(moveLineUp(first), null);
  assert.equal(moveLineDown(last), null);
});
