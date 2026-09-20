# Team Productivity

Shared language for Slack-based daily scheduling and requests for help.

## Language

**Slack Channel**:
A Slack conversation identified by its immutable Slack channel ID. It owns its settings and submission history even if its display name changes.

**Channel Settings**:
Configuration that applies to one Slack Channel. The first setting is the Daily Time Range.

**Daily Time Range**:
The default start and end times shown when a member opens the Daily modal for a Slack Channel.

**Daily Submission**:
The current Daily time range for one calendar date in a Slack Channel. A Slack Channel has at most one Daily Submission per date; submitting again replaces that date's current values.

**Issue Submission**:
A request for help created by one Slack member in a Slack Channel and directed to zero or more Asked Members.
_Avoid_: Issue Log

**Issue Creator**:
The Slack member who submits an Issue Submission.
_Avoid_: Owner, submitter

**Asked Member**:
A Slack member whose help is requested in an Issue Submission.
_Avoid_: Assignee
