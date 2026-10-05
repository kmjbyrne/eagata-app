/** When the store was seeded, and any collections that no longer match their schema. */
export default defineSandboxHandler(() => useSandbox().store.status())
