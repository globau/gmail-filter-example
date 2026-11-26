# Gmail filters with Apps Script

This is an example of filing and deleting Gmail messages with Apps Script,
using rules that Gmail's built-in filters can't express, such as matching on
arbitrary headers or deleting by age.

It isn't meant to be run as is. The rules are examples that won't match your
mail, so fork the repository and replace them with your own.

- `main` runs every 10 minutes. It checks inbox messages from the last 4 hours.
  `vaporise.js` deletes junk and `organise.js` moves everything else into labels.
- `nightly` runs once a day. It cleans up read, unstarred messages in each
  label once they reach a set age (see `nightly.js`).

## Setup

### 1. Fork and write your rules

Fork this repository, then edit these files:

- `vaporise.js`: messages to delete as soon as they arrive.
- `organise.js`: which label each message moves to.
- `nightly.js`: how long read messages stay in each label before they're
  deleted.
- `appsscript.json`: set `timeZone` to your own. Age calculations and trigger
  times use it.

`lib-message.js` has the `Message` class the rules work with. It has getters
such as `from`, `subject` and `listID`, `header()` for any other header, and
the `moveTo()`, `delete()` and `markAsRead()` actions. It also has the
`delete_messages()` and `find_messages()` helpers that `nightly.js` uses.

### 2. Create the project

1. Go to <https://script.google.com> and click **New project**. Give it a name.
2. Open **Project Settings** (the cog icon):
   - Tick **Show "appsscript.json" manifest file in editor**.
   - Copy the **Script ID**. You'll need it in step 3.

### 3. Push the code with clasp

1. Turn on the Apps Script API at <https://script.google.com/home/usersettings>.
   clasp won't work until you do this.
2. Create `.clasp.json` in your fork:

   ```json
   { "scriptId": "<your script id>", "rootDir": "." }
   ```

3. Run `make auth` to log in. A browser window opens for you to sign in. The
   credentials expire after about a week, so run this again when a push fails.
4. Run `make deploy`. This formats the code and pushes every `.js` file plus
   `appsscript.json` to the project. Apps Script shows the files with a `.gs`
   extension.

### 4. Create the labels

Every label that `organise.js` moves messages into and `nightly.js` cleans up
must already exist in Gmail; the script won't create it. If a label is missing,
the script logs `Invalid label` or `Invalid mailbox`. Gmail turns a `/` in a
label name into a nested label.

### 5. Authorise and test

1. In the editor, select `debug` from the function dropdown and click **Run**.
   This processes the last 28 days of your inbox. It really moves and deletes
   messages, so check the rules first.
2. The first run asks for permission to access Gmail. If Google shows "Google
   hasn't verified this app", click **Advanced**, then **Go to (project name)**.
3. The execution log shows each message and the action taken: `MOVING`,
   `DELETING` or `MARK-AS-READ`.

### 6. Add triggers

Open **Triggers** (the clock icon) and click **Add Trigger** twice:

| Function  | Event source | Type             | Interval            |
| --------- | ------------ | ---------------- | ------------------- |
| `main`    | Time-driven  | Minutes timer    | Every 10 minutes    |
| `nightly` | Time-driven  | Day timer        | e.g. midnight to 1am |

When `main` hits an error, such as a missing label, it throws at the end of
the run. That makes the trigger fail, and the failure-notification setting
decides whether Google emails you straight away or in a daily summary.

## Development

- `make test` runs the Biome linter and checks formatting.
- `make format` fixes lint and formatting problems.
- `make pull` fetches the project from Apps Script. Use it if you've edited
  code in the web editor.

`lib-parse5322.js` is an RFC 5322 address parser. Biome skips it.
