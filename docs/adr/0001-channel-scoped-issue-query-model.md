# Use channel-scoped issue records with query-oriented identity fields

Issue Submissions are stored below their Slack Channel and denormalize immutable member IDs alongside display-name snapshots. Asked Member IDs are also stored in a dedicated array so date-range, Issue Creator, and Asked Member filters remain direct indexed Firestore queries; this duplicates a small amount of identity data but avoids joins and participant fan-out writes.
