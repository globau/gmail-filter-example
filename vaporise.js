// deletes junk as soon as it arrives.  `main` calls this for every inbox
// message from the last 4 hours (28 days when run via `debug`), before
// `organise`.  return true once a rule has handled the message so `organise`
// doesn't see it; returning false passes it on.

function vaporise(message) {
  // the editor's run button calls functions without arguments
  if (!message) {
    return logError("must run from main.gs or nightly.gs");
  }
  const from = message.from;
  const subject = message.subject;

  // sender and subject
  if (from === "no-reply@zoom.us" && subject.includes("has joined your meeting")) {
    return message.delete();
  }

  // any header
  if (message.header("X-Sentry-Project") === "my-noisy-project") {
    return message.delete();
  }

  // sender prefix, to catch every domain a service sends from
  if (from.startsWith("firefox-settings-notification@")) {
    return message.delete();
  }

  return false;
}
