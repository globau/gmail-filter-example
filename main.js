// files new mail.  `main` passes every inbox message from the last 4 hours to
// `vaporise`, then to `organise` if `vaporise` didn't delete it.  schedule it
// with a time-driven minutes timer, every 10 minutes.
//
// `debug` does the same over the last 28 days, for running by hand from the
// editor.  it moves and deletes messages - it isn't a dry run.
//
// https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list

function main() {
  _execute("4h");
  // errors are collected rather than thrown immediately so one bad rule doesn't stop the rest of the run; throwing
  // at the end makes the trigger fail, which is what gets google to send a failure notification
  if (_errors.length > 0) {
    throw _errors.join("\n");
  }
}

function debug() {
  _execute("672h"); // 28 days
}

const _errors = [];

function logError(message) {
  _errors.push(message);
  console.error(message);
}

function logInfo(message) {
  console.warn(message);
}

function logDebug(message) {
  console.info(message);
}

function _execute(lookback) {
  const res = Gmail.Users.Messages.list("me", {
    q: `label:INBOX newer_than:${lookback}`,
    maxResults: 500,
  });
  if (!res.messages) {
    return;
  }
  for (const msg of res.messages) {
    const message = new Message(Gmail.Users.Messages.get("me", msg.id));
    logDebug(message.subject);
    // deleting takes priority, so junk is removed even when it also matches a rule in organise
    if (vaporise(message)) {
      continue;
    }
    organise(message);
  }
}
