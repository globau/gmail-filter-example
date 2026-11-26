// cleans up old mail.  schedule it with a time-driven day timer, once a day
// (eg. midnight to 1am).  unlike `main` it works through labels rather than new
// inbox messages, and deletes messages once they reach a set age (in days).
// starred and unread messages are never touched, so nothing goes before you've
// read it, and you can star a read message to guard against its deletion.

function nightly() {
  // by age
  delete_messages(["Dev", "Dev/Firefox", "Lists"], 7);
  delete_messages(["Dev/Involved"], 28);

  // by age and a gmail search
  delete_messages(["INBOX"], 1, "from:comments-noreply@docs.google.com");

  // gmail search can't match arbitrary headers, so check each message
  for (const message of find_messages(["Dev", "Dev/Firefox"])) {
    if (message.header("X-Bugzilla-Type") === "nag-watch") {
      message.delete();
    }
  }
}
