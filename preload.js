const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ============================================
  // EXISTING CODE EXECUTION
  // ============================================
  runCode: (language, code, input) => {
    return ipcRenderer.invoke('run-code', { language, code, input });
  },
  
  explainCode: (code, language, input) => {
    return ipcRenderer.invoke('ai-explain-code', { code, language, input });
  },
  
  fixCode: (code, error, language, debugInfo) => {
    return ipcRenderer.invoke('ai-fix-code', { code, error, language, debugInfo });
  },
  
  getBestPractices: (code, language, analysis) => {
    return ipcRenderer.invoke('ai-best-practices', { code, language, analysis });
  },

  geminiSuggest: (code, language, position) => {
    return ipcRenderer.invoke('gemini-complete', { code, language, position });
  },

  // ============================================
  // FIREBASE AUTHENTICATION
  // ============================================
  firebaseSignIn: (email, password) => {
    return ipcRenderer.invoke('firebase-signin', { email, password });
  },

  firebaseSignUp: (email, password) => {
    return ipcRenderer.invoke('firebase-signup', { email, password });
  },

  firebaseSignOut: () => {
    return ipcRenderer.invoke('firebase-signout');
  },

  firebaseGetCurrentUser: () => {
    return ipcRenderer.invoke('firebase-get-current-user');
  },

  // Listen for auth state changes
  onAuthStateChanged: (callback) => {
    ipcRenderer.on('auth-state-changed', (event, user) => callback(user));
  },

  // ============================================
  // FIREBASE PROJECTS
  // ============================================
  firebaseGetProjects: () => {
    return ipcRenderer.invoke('firebase-get-projects');
  },

  firebaseCreateProject: (name, language, code) => {
    return ipcRenderer.invoke('firebase-create-project', { name, language, code });
  },

  firebaseGetProject: (projectId) => {
    return ipcRenderer.invoke('firebase-get-project', { projectId });
  },

  firebaseUpdateProject: (projectId, code) => {
    return ipcRenderer.invoke('firebase-update-project', { projectId, code });
  },

  firebaseDeleteProject: (projectId) => {
    return ipcRenderer.invoke('firebase-delete-project', { projectId });
  },

  // ============================================
  // REAL-TIME SYNC
  // ============================================
  firebaseListenProject: (projectId) => {
    return ipcRenderer.invoke('firebase-listen-project', { projectId });
  },

  firebaseStopListening: (projectId) => {
    return ipcRenderer.invoke('firebase-stop-listening', { projectId });
  },

  // Listen for project updates
  onProjectUpdated: (callback) => {
    ipcRenderer.on('project-updated', (event, project) => callback(project));
  },

  onProjectListenerError: (callback) => {
    ipcRenderer.on('project-listener-error', (event, error) => callback(error));
  },

  navigateToEditor: (projectData) => {
    return ipcRenderer.invoke('navigate-to-editor', projectData);
  },
  
  navigateToLogin: () => {
    return ipcRenderer.invoke('navigate-to-login');
  }
});

console.log('✅ Enhanced Preload with Firebase loaded!');