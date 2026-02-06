// renderer.js (updated) ----------------------------------------------------
// Wait for editor (Monaco) to be ready
function waitForEditor() {
  return new Promise((resolve) => {
    if (window.monacoEditor) {
      resolve();
    } else {
      setTimeout(() => waitForEditor().then(resolve), 100);
    }
  });
}

// Utility: get language select value (supports both 'language' and 'langSelect')
function getSelectedLanguage() {
  const el = document.getElementById('language') || document.getElementById('langSelect');
  return el ? el.value : 'python';
}

// ---------------------- Run button handler (unchanged behaviour) ------------
document.getElementById('runBtn')?.addEventListener('click', async () => {
  await waitForEditor();

  const language = getSelectedLanguage();
  const code = window.monacoEditor.getValue();
  const outputEl = document.getElementById('output');
  const runBtn = document.getElementById('runBtn');

  runBtn.disabled = true;
  runBtn.textContent = '⏳ Running...';
  outputEl.textContent = 'Executing code...\n';

  try {
    // Note: preload exposes runCode as window.api.runCode
    const result = await window.api.runCode(language, code);

    let output = '';
    if (result.stdout) output += result.stdout;
    if (result.stderr) {
      if (output) output += '\n\n';
      output += '═══ Error Output ═══\n' + result.stderr;
    }

    outputEl.textContent = output || '(no output produced)';
  } catch (err) {
    outputEl.textContent = `═══ Execution Error ═══\n${err.message || String(err)}`;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Run Code';
    setTimeout(() => window.monacoEditor.focus(), 100);
  }
});

console.log('✓ Renderer script loaded (updated for Gemini)');


// ---------------------- INLINE / GHOST SUGGESTIONS (Gemini) ----------------
// Helper: choose the available backend function (gemini preferred, fall back to ollama)
function chooseCompletionAPI() {
  if (window.api && typeof window.api.geminiComplete === 'function') {
    return window.api.geminiComplete;
  }
  if (window.api && typeof window.api.ollamaComplete === 'function') {
    console.warn('geminiComplete not found — falling back to ollamaComplete');
    return window.api.ollamaComplete;
  }
  console.warn('No completion API found on window.api (expected geminiComplete or ollamaComplete)');
  return null;
}

// Register Monaco inline completion provider
waitForEditor().then(() => {
  const editor = window.monacoEditor;
  if (!editor || !window.monaco || !window.monaco.languages) {
    console.warn('Monaco or editor not ready for inline completions');
    return;
  }

  const completionApi = chooseCompletionAPI();
  if (!completionApi) {
    console.warn('No LLM completion API available. Inline completions disabled.');
    return;
  }

  monaco.languages.registerInlineCompletionsProvider('*', {
    /**
     * provideInlineCompletions runs when Monaco decides to request inline suggestions.
     * We pass the entire document and cursor position to the backend to get a short completion.
     */
    async provideInlineCompletions(model, position, context, token) {
      try {
        const code = model.getValue();
        const language = getSelectedLanguage();

        // Provide a small context window to reduce latency and improve relevance.
        // We'll pass the whole code for maximum context; serverside can trim if needed.
        const pos = { lineNumber: position.lineNumber, column: position.column };

        // Call the chosen completion API.
        // We assume the backend returns a plain string with the completion (no commentary).
        const suggestion = await completionApi(code, language, pos);

        if (!suggestion || String(suggestion).trim().length === 0) {
          return { items: [] };
        }

        const text = String(suggestion).trim();

        // Monaco expects "items" with insertText and a range (we insert at cursor)
        return {
          items: [
            {
              insertText: text,
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
              ),
              // Optional: provide a small command to detect acceptance if you wire it up
              command: {
                id: 'ai.completionAccepted',
                title: 'AI Completion Accepted'
              }
            }
          ]
        };
      } catch (err) {
        console.error('Inline completion error:', err);
        return { items: [] };
      }
    },

    // Required no-op function if provider doesn't use freeInlineCompletions
    freeInlineCompletions() {}
  });

  console.log('✅ Inline completions provider registered (Gemini preferred)');
});


// ---------------------- DECORATED SUGGESTIONS (after pause) ----------------
// This shows a subtle decorative suggestion (like ghost text but persistent as decoration).
// It triggers after user stops typing for a short debounce period.

async function setupDecoratedSuggestions() {
  await waitForEditor();
  const editor = window.monacoEditor;
  let timeout;
  let decorations = [];
  const completionApi = chooseCompletionAPI();
  if (!completionApi) return;

  editor.onDidChangeModelContent(() => {
    // clear while typing
    decorations = editor.deltaDecorations(decorations, []);
    clearTimeout(timeout);

    timeout = setTimeout(async () => {
      try {
        const code = editor.getValue();
        const language = getSelectedLanguage();
        const position = editor.getPosition();
        if (!position) return;

        // Request a short suggestion
        const result = await completionApi(code, language, {
          lineNumber: position.lineNumber,
          column: position.column
        });

        if (!result || String(result).trim().length === 0) {
          return;
        }

        const suggestion = String(result).trim();

        // Place a subtle decoration AFTER the cursor position.
        decorations = editor.deltaDecorations(decorations, [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            ),
            options: {
              after: {
                contentText: ' ← ' + suggestion,
                margin: '0 8px',
                color: '#6a9955',
                fontStyle: 'italic',
                opacity: '0.7'
              },
              className: 'ai-suggestion-decoration'
            }
          }
        ]);

        // Auto-clear after a short timeout so it doesn't stick forever
        setTimeout(() => {
          decorations = editor.deltaDecorations(decorations, []);
        }, 4500);
      } catch (err) {
        console.error('Decorated suggestion error:', err);
      }
    }, 700); // 700ms debounce after typing stops
  });

  // Clear when cursor moves
  editor.onDidChangeCursorPosition(() => {
    if (decorations.length > 0) {
      decorations = editor.deltaDecorations(decorations, []);
    }
  });
}

setupDecoratedSuggestions();


// ---------------------- OPTIONAL: acceptance telemetry --------------------
// Add a simple command so we can detect when user explicitly accepted an inline completion.
waitForEditor().then(() => {
  if (!window.monaco) return;
  try {
    monaco.editor.registerCommand && monaco.editor.registerCommand('ai.completionAccepted', () => {
      // For now, just log — you can send telemetry to main via ipc if desired
      console.log('AI inline completion accepted by user');
    });
  } catch (e) {
    // registerCommand may not be present depending on Monaco build
  }
});
