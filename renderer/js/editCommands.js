function duplicateLine(state) {
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const insert = '\n' + line.text;
  return {
    changes: { from: line.to, insert },
    selection: { anchor: line.to + insert.length },
  };
}

function moveLineUp(state) {
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  if (line.number <= 1) return null;
  const prevLine = state.doc.line(line.number - 1);
  const column = from - line.from;
  return {
    changes: {
      from: prevLine.from,
      to: line.to,
      insert: line.text + '\n' + prevLine.text,
    },
    selection: { anchor: prevLine.from + Math.min(column, line.text.length) },
  };
}

function moveLineDown(state) {
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  if (line.number >= state.doc.lines) return null;
  const nextLine = state.doc.line(line.number + 1);
  const column = from - line.from;
  const movedLineStart = line.from + nextLine.text.length + 1;
  return {
    changes: {
      from: line.from,
      to: nextLine.to,
      insert: nextLine.text + '\n' + line.text,
    },
    selection: { anchor: movedLineStart + Math.min(column, line.text.length) },
  };
}

module.exports = { duplicateLine, moveLineUp, moveLineDown };
