// rules refer to labels by name but the api needs ids. listing them once per run avoids an api call per message.
// static variables don't work here :(
const _labelMap = []; // label name --> label id
const _labelMapRev = []; // label id --> label name
for (const label of Gmail.Users.Labels.list("me").labels) {
  _labelMap[label.name] = label.id;
  _labelMapRev[label.id] = label.name;
}

class Message {
  constructor(message) {
    this.message = message;
  }

  // properties

  get str() {
    return (
      "(" +
      this.message.labelIds
        .filter((e) => !["IMPORTANT", "CATEGORY_UPDATES", "CATEGORY_PERSONAL", "CATEGORY_FORUMS"].includes(e))
        .map((e) => (_labelMapRev[e] ? _labelMapRev[e] : e))
        .join(",") +
      ") " +
      this.subject
    );
  }

  get subject() {
    return this.header("subject");
  }

  get from() {
    return this.headerAddress("from");
  }

  get sender() {
    return this.headerAddress("sender");
  }

  get cc() {
    return this.headerAddresses("cc");
  }

  // list-id is usually "description <id>"; only the id is stable enough to match on
  get listID() {
    const value = this.header("list-id");
    const m = value.match(/<([^>]+)>/);
    return m ? m[1] : value;
  }

  get date() {
    return new Date(Number.parseInt(this.message.internalDate, 10));
  }

  get ageDays() {
    return (Date.now() - this.date) / 1000 / 60 / 60 / 24;
  }

  get unread() {
    return this.message.labelIds.includes("UNREAD");
  }

  get starred() {
    return this.message.labelIds.includes("STARRED");
  }

  // header

  headerAddress(name) {
    const value = this.header(name);
    const addresses = emailAddresses(value);
    if (addresses.length === 0) {
      return "";
    }
    if (addresses.length > 1) {
      logInfo(`Multiple addresses found: ${value}`);
    }
    return addresses[0].address;
  }

  headerAddresses(name) {
    return emailAddresses(this.header(name));
  }

  header(headerName) {
    headerName = headerName.toLowerCase();
    for (const headerItem of this.message.payload.headers) {
      if (headerItem.name.toLowerCase() === headerName) {
        return headerItem.value;
      }
    }
    return "";
  }

  // actions

  moveTo(labelName) {
    const labelID = _labelMap[labelName];
    if (labelID == null) {
      logError(`Invalid label: ${labelName}`);
      return false;
    }
    logInfo(`MOVING -> ${labelName}: ${this.str}`);
    // gmail has no folders; removing INBOX is what turns adding a label into a move
    Gmail.Users.Messages.modify({ addLabelIds: [labelID], removeLabelIds: [_labelMap.INBOX] }, "me", this.message.id);
    return true;
  }

  delete() {
    if (this.unread) {
      this.markAsRead();
    }
    logInfo(`DELETING: ${this.str}`);
    Gmail.Users.Messages.trash("me", this.message.id);
    return true;
  }

  markAsRead() {
    logInfo(`MARK-AS-READ: ${this.str}`);
    Gmail.Users.Messages.modify({ removeLabelIds: [_labelMap.UNREAD] }, "me", this.message.id);
    return true;
  }
}

// nightly helpers

function list_message_ids(mailbox, age, filter, all_pages) {
  // starred and unread messages are never cleaned up, so nothing goes before you've seen it or while you want it
  const query = [];
  query.push("-{label:STARRED}");
  query.push("-{label:UNREAD}");

  if (age) {
    const before = new Date();
    before.setDate(before.getDate() - age + 1);
    // the en-ca locale formats dates as yyyy-mm-dd, which gmail search accepts
    const beforeYMD = before.toLocaleDateString("en-CA");
    query.push(`before:${beforeYMD}`);
  }

  if (filter) {
    query.push(filter);
  }

  if (!_labelMap[mailbox]) {
    logError(`Invalid mailbox: ${mailbox}`);
    return [];
  }

  const ids = [];
  const params = {
    q: query.join(" AND "),
    labelIds: [_labelMap[mailbox]],
    maxResults: 250, // small batches
  };
  do {
    const res = Gmail.Users.Messages.list("me", params);
    if (res.messages) {
      ids.push(...res.messages.map((msg) => msg.id));
    }
    params.pageToken = res.nextPageToken;
  } while (all_pages && params.pageToken);
  return ids;
}

function find_messages(mailboxes, age, filter) {
  // the editor's run button calls functions without arguments
  if (!mailboxes) {
    return logError("must run from main.gs or nightly.gs");
  }
  if (mailboxes.length === 0) {
    return logError("missing mailboxes");
  }

  const messages = [];
  for (const mailbox of mailboxes) {
    for (const id of list_message_ids(mailbox, age, filter)) {
      // rules only look at headers, so don't fetch bodies
      messages.push(new Message(Gmail.Users.Messages.get("me", id, { format: "metadata" })));
    }
  }
  return messages;
}

function delete_messages(mailboxes, age, filter) {
  for (const mailbox of mailboxes) {
    const ids = list_message_ids(mailbox, age, filter, true);
    if (ids.length === 0) {
      continue;
    }
    logInfo(`DELETING ${ids.length} from ${mailbox}`);
    // batchModify accepts at most 1000 ids per call, and can't trash directly; adding the TRASH label is the
    // equivalent
    for (let i = 0; i < ids.length; i += 1000) {
      Gmail.Users.Messages.batchModify({ ids: ids.slice(i, i + 1000), addLabelIds: ["TRASH"] }, "me");
    }
  }
}
