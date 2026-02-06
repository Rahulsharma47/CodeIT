const { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp
} = require('./firebase-config');


const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const fetch = require('node-fetch');


// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyAlT6WgkIcR9np0xAO6AP4UqEADx4UgOoE');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1e1e2e',
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // START WITH LOGIN PAGE INSTEAD
  win.loadFile('login.html');  // Changed from 'index-codemirror.html'
  
  win.once('ready-to-show', () => {
    win.show();
  });
  
  return win; // Add this to return the window
}

// Handle navigation between login and editor
ipcMain.handle('navigate-to-editor', async (event, projectData) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (projectData && projectData.projectId) {
    win.loadFile('index-codemirror.html', {
      query: {
        project: projectData.projectId,
        lang: projectData.language,
        name: projectData.name
      }
    });
  } else {
    win.loadFile('index-codemirror.html');
  }
});

ipcMain.handle('navigate-to-login', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.loadFile('login.html');
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ============================================
// AI CODE EXPLANATION WITH DRY RUN
// ============================================

ipcMain.handle('ai-explain-code', async (event, { code, language, input }) => {
  try {
    const prompt = `You are an expert coding tutor. Explain this ${language} code in a simple, beginner-friendly way.

Code:
\`\`\`${language}
${code}
\`\`\`

${input ? `Sample Input: ${input}` : ''}

Provide your response in this exact JSON format:
{
  "overview": "Brief overview of what the code does",
  "stepByStep": [
    {
      "step": 1,
      "description": "What happens in this step",
      "code": "relevant code snippet",
      "variables": "state of variables after this step"
    }
  ],
  "dryRun": {
    "description": "Detailed dry run with sample input",
    "steps": [
      "Step 1: ...",
      "Step 2: ..."
    ]
  },
  "keyPoints": [
    "Important concept 1",
    "Important concept 2"
  ]
}

Make it conversational and easy to understand for beginners. Include a complete dry run showing how variables change.`;

    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
      // thinkingConfig: { thinkingBudget: 0 }
    });
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON, fallback to raw text
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, explanation: parsed };
      }
    } catch (e) {
      console.log('Could not parse JSON, using raw text');
    }
    
    return { 
      success: true, 
      explanation: {
        overview: text,
        stepByStep: [],
        dryRun: { description: text, steps: [] },
        keyPoints: []
      }
    };
  } catch (err) {
    console.error('AI Explanation Error:', err);
    return { success: false, error: err.message };
  }
});

// ============================================
// AI FIX SUGGESTIONS
// ============================================

ipcMain.handle('ai-fix-code', async (event, { code, error, language, debugInfo }) => {
  try {
    const prompt = `You are an expert ${language} debugger. A user has encountered an error.

Code:
\`\`\`${language}
${code}
\`\`\`

Error Details:
- Type: ${debugInfo?.type || 'Unknown'}
- Message: ${error}
- Line: ${debugInfo?.line || 'Unknown'}

Provide your response in this exact JSON format:
{
  "diagnosis": "Clear explanation of what went wrong and why",
  "fixedCode": "The complete corrected code",
  "changes": [
    {
      "line": number,
      "before": "old code",
      "after": "new code",
      "reason": "why this change fixes the issue"
    }
  ],
  "prevention": "How to avoid this error in the future",
  "learningPoint": "Key concept the user should understand"
}

Be specific and educational. Show exactly what needs to change.`;

    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 3072,
      },
      // thinkingConfig: { thinkingBudget: 0 }
    });
    const response = await result.response;
    const text = response.text();
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, fix: parsed };
      }
    } catch (e) {
      console.log('Could not parse JSON, using raw text');
    }
    
    return { 
      success: true, 
      fix: {
        diagnosis: text,
        fixedCode: code,
        changes: [],
        prevention: '',
        learningPoint: ''
      }
    };
  } catch (err) {
    console.error('AI Fix Error:', err);
    return { success: false, error: err.message };
  }
});

// ============================================
// AI BEST PRACTICES & OPTIMIZATION
// ============================================

ipcMain.handle('ai-best-practices', async (event, { code, language, analysis }) => {
  try {
    const prompt = `You are a senior ${language} developer conducting a code review.

Code:
\`\`\`${language}
${code}
\`\`\`

Current Analysis:
- Time Complexity: ${analysis.complexity}
- Space Complexity: ${analysis.spaceComplexity || 'O(1)'}
- Lines: ${analysis.lines}
- Has Recursion: ${analysis.hasRecursion}
- Has Loops: ${analysis.hasLoops}

Provide your response in this exact JSON format:
{
  "overallRating": "Good/Fair/Needs Improvement",
  "strengths": [
    "What the code does well"
  ],
  "improvements": [
    {
      "category": "Performance/Readability/Best Practice/Security",
      "issue": "Description of the issue",
      "suggestion": "How to improve it",
      "priority": "High/Medium/Low",
      "example": "Code example showing the improvement"
    }
  ],
  "optimizedCode": "A more optimal version if applicable",
  "complexityImprovement": "If optimization improves complexity, explain how",
  "bestPractices": [
    "Key best practice advice"
  ]
}

Be constructive and educational. Focus on teaching better coding habits.`;

    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 4096,
      },
      // thinkingConfig: { thinkingBudget: 0 }
    });
    const response = await result.response;
    const text = response.text();
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, review: parsed };
      }
    } catch (e) {
      console.log('Could not parse JSON, using raw text');
    }
    
    return { 
      success: true, 
      review: {
        overallRating: 'Good',
        strengths: [],
        improvements: [],
        optimizedCode: '',
        complexityImprovement: text,
        bestPractices: []
      }
    };
  } catch (err) {
    console.error('AI Best Practices Error:', err);
    return { success: false, error: err.message };
  }
});

// GEMINI AUTO COMPLETE
ipcMain.handle('gemini-complete', async (event, { code, language, position }) => {
  try {
    console.log('[GEMINI] Autocomplete request:', { language, position });
    
    const lines = code.split('\n');
    const currentLineIndex = position.lineNumber - 1;
    const currentLine = lines[currentLineIndex] || '';
    const beforeCursor = currentLine.substring(0, position.column - 1);
    
    // Don't suggest if line is empty or ends with certain characters
    if (!beforeCursor.trim() || 
        beforeCursor.trim().endsWith(':') || 
        beforeCursor.trim().endsWith('{') || 
        beforeCursor.trim().endsWith(';')) {
      return { success: false, suggestion: '' };
    }
    
    // Get context: 15 lines before cursor
    const contextStart = Math.max(0, currentLineIndex - 15);
    const contextLines = lines.slice(contextStart, currentLineIndex + 1);
    const context = contextLines.join('\n');
    
    // Build a focused prompt
    const prompt = `You are a code completion AI. Complete ONLY the current line of code.

Language: ${language}
Context (last few lines):
${context}

Rules:
1. Return ONLY the completion text (the rest of the current line)
2. NO explanations, NO comments, NO multiple lines
3. NO markdown formatting, NO backticks
4. Keep it SHORT (max 50 characters)
5. Must be valid ${language} syntax

Complete this line starting from: "${beforeCursor}"

Completion:`;

    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 30,
        topP: 0.8,
        topK: 20,
      }
    });

    const text = result.response.text().trim();
    
    // Clean up the response
    let suggestion = text
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .replace(/\/\/.*$/g, '')
      .replace(/#.*$/g, '')
      .split('\n')[0]
      .trim();
    
    // Remove the context if Gemini repeated it
    if (suggestion.startsWith(beforeCursor.trim())) {
      suggestion = suggestion.substring(beforeCursor.trim().length).trim();
    }
    
    // Validate suggestion
    if (suggestion.length < 2 || 
        suggestion.length > 80 || 
        /^(Here|This|The|You|To|Complete|First|Next)/i.test(suggestion)) {
      return { success: false, suggestion: '' };
    }
    
    console.log('[GEMINI] Suggestion:', suggestion);
    return { success: true, suggestion };
    
  } catch (err) {
    console.error('[GEMINI] Autocomplete error:', err);
    return { success: false, error: err.message, suggestion: '' };
  }
});



// ============================================
// SMART ERROR PARSERS (EXISTING)
// ============================================

function parsePythonError(stderr, code) {
  const lines = code.split('\n');
  const errorInfo = {
    line: null,
    column: null,
    type: '',
    message: '',
    tip: '',
    suggestion: ''
  };

  const lineMatch = stderr.match(/File ".*", line (\d+)/);
  if (lineMatch) {
    errorInfo.line = parseInt(lineMatch[1]);
  }

  if (stderr.includes('SyntaxError')) {
    errorInfo.type = 'Syntax Error';
    
    if (stderr.includes('invalid syntax')) {
      errorInfo.message = 'Invalid syntax detected';
      errorInfo.tip = 'Check for missing colons (:), parentheses, or quotes';
      
      if (errorInfo.line && lines[errorInfo.line - 1]) {
        const line = lines[errorInfo.line - 1];
        if (line.trim().match(/^(if|for|while|def|class)\s+.*[^:]$/)) {
          errorInfo.suggestion = `Add a colon at the end: ${line.trim()}:`;
        }
      }
    }
    
    if (stderr.includes('EOL while scanning string')) {
      errorInfo.message = 'Unterminated string';
      errorInfo.tip = 'You forgot to close a string with a quote';
      errorInfo.suggestion = 'Make sure all strings have matching quotes';
    }
  }
  
  else if (stderr.includes('IndentationError')) {
    errorInfo.type = 'Indentation Error';
    errorInfo.message = 'Incorrect indentation';
    errorInfo.tip = 'Python uses indentation to define code blocks';
    errorInfo.suggestion = 'Use consistent spaces (4 spaces recommended)';
  }
  
  else if (stderr.includes('NameError')) {
    errorInfo.type = 'Name Error';
    const nameMatch = stderr.match(/name '(\w+)' is not defined/);
    if (nameMatch) {
      errorInfo.message = `Variable '${nameMatch[1]}' is not defined`;
      errorInfo.tip = 'Make sure you define variables before using them';
      errorInfo.suggestion = `Did you mean to define: ${nameMatch[1]} = ... ?`;
    }
  }
  
  else if (stderr.includes('TypeError')) {
    errorInfo.type = 'Type Error';
    errorInfo.message = 'Operation not supported between these types';
    errorInfo.tip = 'Check that you\'re using compatible data types';
    errorInfo.suggestion = 'Try converting types with int(), str(), or float()';
  }
  
  else if (stderr.includes('ValueError')) {
    errorInfo.type = 'Value Error';
    errorInfo.message = 'Invalid value provided';
    errorInfo.tip = 'Check your input values and conversions';
    errorInfo.suggestion = 'Use try-except to handle input errors';
  }
  
  else if (stderr.includes('ZeroDivisionError')) {
    errorInfo.type = 'Zero Division Error';
    errorInfo.message = 'Cannot divide by zero';
    errorInfo.tip = 'Add a check to ensure divisor is not zero';
    errorInfo.suggestion = 'Use: if divisor != 0: before division';
  }
  
  else if (stderr.includes('IndexError')) {
    errorInfo.type = 'Index Error';
    errorInfo.message = 'List index out of range';
    errorInfo.tip = 'Trying to access an index that doesn\'t exist';
    errorInfo.suggestion = 'Check list length with len() before accessing';
  }

  return errorInfo;
}

function parseCppError(stderr, code) {
  const lines = code.split('\n');
  const errorInfo = {
    line: null,
    column: null,
    type: '',
    message: '',
    tip: '',
    suggestion: ''
  };

  const lineMatch = stderr.match(/:(\d+):(\d+):/);
  if (lineMatch) {
    errorInfo.line = parseInt(lineMatch[1]);
    errorInfo.column = parseInt(lineMatch[2]);
  }

  if (stderr.includes('expected') && stderr.includes('before')) {
    errorInfo.type = 'Syntax Error';
    
    if (stderr.includes('expected \';\'')) {
      errorInfo.message = 'Missing semicolon';
      errorInfo.tip = 'Every C++ statement must end with a semicolon (;)';
      errorInfo.suggestion = 'Add ; at the end of the statement';
    }
    
    if (stderr.includes('expected \'{\'')) {
      errorInfo.message = 'Missing opening brace';
      errorInfo.tip = 'Functions and control structures need braces { }';
    }
  }
  
  else if (stderr.includes('was not declared in this scope')) {
    errorInfo.type = 'Declaration Error';
    const nameMatch = stderr.match(/'(\w+)' was not declared/);
    if (nameMatch) {
      errorInfo.message = `'${nameMatch[1]}' not declared`;
      errorInfo.tip = 'Variable or function used before declaration';
      errorInfo.suggestion = `Declare before use: int ${nameMatch[1]};`;
    }
  }
  
  else if (stderr.includes('cannot convert')) {
    errorInfo.type = 'Type Conversion Error';
    errorInfo.message = 'Incompatible types';
    errorInfo.tip = 'Cannot convert between these types';
    errorInfo.suggestion = 'Use type casting or change variable type';
  }
  
  else if (stderr.includes('undefined reference to')) {
    errorInfo.type = 'Linker Error';
    const funcMatch = stderr.match(/undefined reference to `(\w+)'/);
    if (funcMatch) {
      errorInfo.message = `Function '${funcMatch[1]}' not defined`;
      errorInfo.tip = 'Function declared but not implemented';
      errorInfo.suggestion = 'Provide function definition';
    }
  }

  return errorInfo;
}

// ============================================
// CODE ANALYSIS (EXISTING)
// ============================================

function analyzeCode(code, language) {
  const analysis = {
    lines: code.split('\n').length,
    complexity: 'O(1)',
    spaceComplexity: 'O(1)',
    hasRecursion: false,
    hasLoops: false,
    suggestions: []
  };
  
  if (language === 'python') {
    const funcMatches = code.matchAll(/def\s+(\w+)\(/g);
    for (const match of funcMatches) {
      const funcName = match[1];
      const regex = new RegExp(`return.*${funcName}\\(`, 'g');
      if (regex.test(code)) {
        analysis.hasRecursion = true;
        analysis.complexity = 'O(2^n)';
        analysis.spaceComplexity = 'O(n)';
      }
    }
  } else if (language === 'cpp') {
    const funcMatches = code.matchAll(/(\w+)\s+(\w+)\([^)]*\)/g);
    for (const match of funcMatches) {
      const funcName = match[2];
      const regex = new RegExp(`return.*${funcName}\\(`, 'g');
      if (regex.test(code)) {
        analysis.hasRecursion = true;
        analysis.complexity = 'O(2^n)';
        analysis.spaceComplexity = 'O(n)';
      }
    }
  }
  
  if (/for|while/.test(code)) {
    analysis.hasLoops = true;
    if (!analysis.hasRecursion) {
      analysis.complexity = 'O(n)';
    }
    
    const nestedLoop = code.match(/for.*for|while.*while|for.*while|while.*for/);
    if (nestedLoop) {
      analysis.complexity = 'O(n^2)';
      analysis.spaceComplexity = 'O(1)';
    }
  }
  
  return analysis;
}

// ============================================
// RUN CODE HANDLER (EXISTING)
// ============================================

ipcMain.handle('run-code', async (event, { language, code, input }) => {
  console.log('=== RUN CODE CALLED ===');
  
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  
  try {
    if (language === 'python') {
      const codeFile = path.join(tmpDir, `code_${timestamp}.py`);
      const inputFile = path.join(tmpDir, `input_${timestamp}.txt`);
      
      await fs.writeFile(codeFile, code, 'utf8');
      
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      
      let result;
      if (input && input.trim()) {
        const inputData = input.trim() + '\n';
        await fs.writeFile(inputFile, inputData, 'utf8');
        result = await runPythonWithInput(pythonCmd, codeFile, inputFile);
      } else {
        result = await runCommand(pythonCmd, [codeFile]);
      }
      
      if (result.stderr) {
        result.debugInfo = parsePythonError(result.stderr, code);
      }
      
      result.analysis = analyzeCode(code, language);
      
      return result;
    } 
    
    if (language === 'cpp') {
      const cppFile = path.join(tmpDir, `code_${timestamp}.cpp`);
      const exeFile = path.join(tmpDir, `code_${timestamp}${process.platform === 'win32' ? '.exe' : ''}`);
      const inputFile = path.join(tmpDir, `input_${timestamp}.txt`);
      
      await fs.writeFile(cppFile, code, 'utf8');
      
      const compileCmd = `g++ "${cppFile}" -o "${exeFile}" 2>&1`;
      const compileResult = await execPromise(compileCmd);
      
      if (compileResult.stderr || (compileResult.stdout && compileResult.stdout.toLowerCase().includes('error'))) {
        const errorText = compileResult.stderr || compileResult.stdout;
        return { 
          stdout: '', 
          stderr: errorText,
          debugInfo: parseCppError(errorText, code),
          analysis: analyzeCode(code, language)
        };
      }
      
      try {
        await fs.access(exeFile);
      } catch (err) {
        return { 
          stdout: '', 
          stderr: 'Compilation failed: executable not created',
          analysis: analyzeCode(code, language)
        };
      }
      
      if (process.platform !== 'win32') {
        await fs.chmod(exeFile, 0o755);
      }
      
      let result;
      if (input && input.trim()) {
        const inputData = input.trim() + '\n';
        await fs.writeFile(inputFile, inputData, 'utf8');
        result = await runCppWithInput(exeFile, inputFile);
      } else {
        result = await runCommand(exeFile, []);
      }
      
      if (result.stderr) {
        result.debugInfo = parseCppError(result.stderr, code);
      }
      
      result.analysis = analyzeCode(code, language);
      
      return result;
    }
    
    return { 
      stdout: '', 
      stderr: 'Unsupported language',
      analysis: { lines: 0, complexity: 'N/A' }
    };
  } catch (err) {
    console.error('Error in run-code:', err);
    return { 
      stdout: '', 
      stderr: err.message,
      analysis: { lines: 0, complexity: 'N/A' }
    };
  }
});

// ============================================
// HELPER FUNCTIONS (EXISTING)
// ============================================

function runPythonWithInput(pythonCmd, codeFile, inputFile) {
  return new Promise(async (resolve) => {
    try {
      const inputData = await fs.readFile(inputFile, 'utf8');
      
      const proc = spawn(pythonCmd, [codeFile], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let killed = false;
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', (code) => {
        if (!killed) {
          resolve({ stdout, stderr });
        }
      });
      
      proc.on('error', (err) => {
        if (!killed) {
          killed = true;
          resolve({ stdout: '', stderr: err.message });
        }
      });
      
      proc.stdin.write(inputData);
      proc.stdin.end();
      
      setTimeout(() => {
        if (!killed) {
          killed = true;
          proc.kill();
          resolve({ stdout, stderr: stderr || 'Execution timed out (5 seconds)' });
        }
      }, 5000);
      
    } catch (err) {
      resolve({ stdout: '', stderr: err.message });
    }
  });
}

function runCppWithInput(exeFile, inputFile) {
  return new Promise(async (resolve) => {
    try {
      const inputData = await fs.readFile(inputFile, 'utf8');
      
      const proc = spawn(exeFile, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let killed = false;
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', (code) => {
        if (!killed) {
          resolve({ stdout, stderr });
        }
      });
      
      proc.on('error', (err) => {
        if (!killed) {
          killed = true;
          resolve({ stdout: '', stderr: err.message });
        }
      });
      
      proc.stdin.write(inputData);
      proc.stdin.end();
      
      setTimeout(() => {
        if (!killed) {
          killed = true;
          proc.kill();
          resolve({ stdout, stderr: stderr || 'Execution timed out (5 seconds)' });
        }
      }, 5000);
      
    } catch (err) {
      resolve({ stdout: '', stderr: err.message });
    }
  });
}

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({ stdout, stderr });
    });
    
    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message });
    });
    
    setTimeout(() => {
      proc.kill();
      resolve({ stdout, stderr: stderr || 'Execution timed out' });
    }, 5000);
  });
}

function execPromise(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
      resolve({ 
        stdout: stdout || '', 
        stderr: stderr || (error ? error.message : '')
      });
    });
  });
}

console.log('Enhanced AI Code Debugger - Main process ready!');

// Global variables for Firebase
let currentUser = null;
let projectListeners = new Map(); // Store Firestore listeners

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log('Auth state changed:', user ? user.email : 'Not logged in');
  
  // Send to renderer
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send('auth-state-changed', user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    } : null);
  }
});

// ============================================
// FIREBASE AUTH HANDLERS
// ============================================

ipcMain.handle('firebase-signin', async (event, { email, password }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { 
      success: true, 
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email
      }
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase-signup', async (event, { email, password }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { 
      success: true, 
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email
      }
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase-signout', async () => {
  try {
    await signOut(auth);
    
    // Clean up all listeners
    projectListeners.forEach((unsubscribe) => unsubscribe());
    projectListeners.clear();
    
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase-get-current-user', async () => {
  if (currentUser) {
    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName
    };
  }
  return null;
});

// ============================================
// FIRESTORE PROJECT HANDLERS
// ============================================

ipcMain.handle('firebase-get-projects', async () => {
  try {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const projectsRef = collection(db, 'users', currentUser.uid, 'projects');
    const q = query(projectsRef, orderBy('lastModified', 'desc'));
    const snapshot = await getDocs(q);
    
    const projects = [];
    snapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data(),
        lastModified: doc.data().lastModified?.toDate().toISOString()
      });
    });
    
    return { success: true, projects };
  } catch (error) {
    console.error('Get projects error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase-create-project', async (event, { name, language, code }) => {
  try {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const projectsRef = collection(db, 'users', currentUser.uid, 'projects');
    const newProjectRef = doc(projectsRef);
    
    await setDoc(newProjectRef, {
      name,
      language,
      code: code || getDefaultCode(language),
      lastModified: serverTimestamp(),
      lastModifiedBy: 'desktop',
      createdAt: serverTimestamp()
    });
    
    return { success: true, projectId: newProjectRef.id };
  } catch (error) {
    console.error('Create project error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase-get-project', async (event, { projectId }) => {
  try {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const projectRef = doc(db, 'users', currentUser.uid, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      return { success: false, error: 'Project not found' };
    }
    
    return { 
      success: true, 
      project: {
        id: projectDoc.id,
        ...projectDoc.data(),
        lastModified: projectDoc.data().lastModified?.toDate().toISOString()
      }
    };
  } catch (error) {
    console.error('Get project error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase-update-project', async (event, { projectId, code }) => {
  try {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const projectRef = doc(db, 'users', currentUser.uid, 'projects', projectId);
    
    await setDoc(projectRef, {
      code,
      lastModified: serverTimestamp(),
      lastModifiedBy: 'desktop'
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Update project error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase-delete-project', async (event, { projectId }) => {
  try {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const projectRef = doc(db, 'users', currentUser.uid, 'projects', projectId);
    await deleteDoc(projectRef);
    
    return { success: true };
  } catch (error) {
    console.error('Delete project error:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// REAL-TIME SYNC LISTENER
// ============================================

ipcMain.handle('firebase-listen-project', async (event, { projectId }) => {
  try {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    // Remove existing listener if any
    if (projectListeners.has(projectId)) {
      projectListeners.get(projectId)();
      projectListeners.delete(projectId);
    }

    const projectRef = doc(db, 'users', currentUser.uid, 'projects', projectId);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(projectRef, (doc) => {
      if (doc.exists()) {
        const project = {
          id: doc.id,
          ...doc.data(),
          lastModified: doc.data().lastModified?.toDate().toISOString()
        };
        
        // Send update to renderer
        event.sender.send('project-updated', project);
      }
    }, (error) => {
      console.error('Listener error:', error);
      event.sender.send('project-listener-error', error.message);
    });
    
    projectListeners.set(projectId, unsubscribe);
    
    return { success: true };
  } catch (error) {
    console.error('Listen project error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase-stop-listening', async (event, { projectId }) => {
  if (projectListeners.has(projectId)) {
    projectListeners.get(projectId)();
    projectListeners.delete(projectId);
  }
  return { success: true };
});

// Helper function
function getDefaultCode(language) {
  if (language === 'python') {
    return '# Write your Python code here\n\nprint("Hello, World!")';
  } else {
    return '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}';
  }
}

console.log('✅ Firebase integration loaded!');