// Fills the shell's extension points with the sandbox's dev tools.
export default defineAppConfig({
  shell: {
    loginExtras: ['SandboxSignInAs', 'SandboxStoreStatus'],
    userMenuExtras: ['SandboxSwitchUser']
  }
})
