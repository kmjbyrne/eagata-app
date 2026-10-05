// Tells the services who is asking. Whether that user still exists is the
// services' check, so a stale session fails as "sign in required".
export default defineEventHandler(event => resolveActor(event))
