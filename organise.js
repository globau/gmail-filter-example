// moves inbox messages into labels.  `main` calls this on every inbox message
// from the last 4 hours (28 days when run via `debug`), but only for messages
// `vaporise` didn't delete.  messages that match no rule stay in the inbox.

function organise(message) {
  // the editor's run button calls functions without arguments
  if (!message) {
    return logError("must run from main.gs or nightly.gs");
  }
  const from = message.from;
  const cc = message.cc.map((rcpt) => rcpt.address);

  // the first matching rule wins, so specific rules must come before broader ones that would also match

  // github
  if (from === "notifications@github.com") {
    // github cc's this address on notifications about your own actions
    if (cc.includes("your_activity@noreply.github.com")) {
      return message.delete();
    }
    if (message.header("X-GitHub-Reason") === "mention") {
      return message.moveTo("Dev/Involved");
    }
    return message.moveTo("Dev");
  }

  // bugzilla
  if (from === "bugzilla-daemon@mozilla.org") {
    const reason = message.header("X-Bugzilla-Reason");
    if (
      reason.includes("AssignedTo") ||
      reason.includes("Reporter") ||
      message.header("X-Bugzilla-Type") === "request"
    ) {
      return message.moveTo("Dev/Involved");
    }
    if (message.header("X-Bugzilla-Product") === "Firefox") {
      return message.moveTo("Dev/Firefox");
    }
    return message.moveTo("Dev");
  }

  // mailing lists
  if (["dev-platform.mozilla.org", "firefox-dev.mozilla.org"].includes(message.listID)) {
    return message.moveTo("Lists");
  }

  return false;
}
