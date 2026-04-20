module.exports = function(results) {
  return results
    .map(r => {
      if (r.messages.length === 0) {
        return `${r.filePath} - no issues found`;
      }
      return r.messages
        .map(m => `${r.filePath}:${m.line}:${m.column} ${m.message} (${m.ruleId})`)
        .join("\n");
    })
    .join("\n");
};