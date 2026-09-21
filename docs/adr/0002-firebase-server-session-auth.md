# Use Firebase server sessions for company dashboard access

The dashboard uses Firebase Google sign-in, then exchanges the verified ID token for an HttpOnly server session cookie. The server enforces the exact approved email domain and Google provider on session creation and every protected request; the Google `hd` request parameter is only a sign-in hint, not the authorization boundary. This adds an Admin SDK check to dashboard requests but prevents client-only auth state from exposing Firestore-backed APIs.
