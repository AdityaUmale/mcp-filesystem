import React, { useState, useEffect } from 'react';
import { FilesystemMCPClient } from './filesystem-client-http';

function App() {
  const [client] = useState(new FilesystemMCPClient());
  const [files, setFiles] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    const res = await client.listFiles();
    const txt = String(res.content[0].text);
    const fileList = txt.split('\n').slice(2).map((line: string) => line.replace(/^\[FILE\]\s*/, ''));
    setFiles(fileList.filter(f => f));
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      let result;
      const createMatch = prompt.match(/create\s+file\s+((?:[\w]+\/)*[\w]+\.\w+)/i);
      if (createMatch) {
        const filename = createMatch[1];
        const contentMatch = prompt.match(/(?:with content|containing)\s+(.+)/i);
        const content = contentMatch ? contentMatch[1] : 'Default content';
        result = await client.createFile(filename, content);
        setResponse(result.content[0].text);
        await loadFiles();
        setPrompt('');
      } else {
        const deleteMatch = prompt.match(/delete\s+file\s+((?:[\w]+\/)*[\w]+\.\w+)/i);
        if (deleteMatch) {
          const filename = deleteMatch[1];
          result = await client.deleteFile(filename);
          setResponse(result.content[0].text);
          await loadFiles();
          setPrompt('');
        } else {
          const editMatch = prompt.match(/edit\s+file\s+((?:[\w]+\/)*[\w]+\.\w+)\s+(replace|append)/i);
          if (editMatch) {
            const filename = editMatch[1];
            const editType = editMatch[2].toLowerCase();
            if (editType === 'replace') {
              const replaceMatch = prompt.match(/replace\s+'(.+?)'\s+with\s+'(.+?)'/i);
              if (replaceMatch) {
                const oldText = replaceMatch[1];
                const newText = replaceMatch[2];
                const fileContentRes = await client.readFile(filename);
                let content = fileContentRes.content[0].text.replace(/^.*?\n\n/, '');
                content = content.replace(new RegExp(oldText, 'g'), newText);
                await client.editFile(filename, content);
                setResponse(`Replaced '${oldText}' with '${newText}' in ${filename}`);
              } else {
                setResponse('Invalid replace command format');
              }
            } else if (editType === 'append') {
              const appendMatch = prompt.match(/append\s+'(.+?)'/i);
              if (appendMatch) {
                const appendText = appendMatch[1];
                const fileContentRes = await client.readFile(filename);
                let content = fileContentRes.content[0].text.replace(/^.*?\n\n/, '');
                content += `\n${appendText}`;
                await client.editFile(filename, content);
                setResponse(`Appended '${appendText}' to ${filename}`);
              } else {
                setResponse('Invalid append command format');
              }
            } else {
              setResponse('Unsupported edit operation');
            }
            await loadFiles();
            setPrompt('');
          } else if (prompt.toLowerCase().includes('list')) {
            result = await client.listFiles();
            setResponse(result.content[0].text);
            setPrompt('');
            await loadFiles();
          } else {
            setResponse('Try: "create file subfolder/test.txt with content hello" or "list files" or "edit file subfolder/test.txt replace \'old\' with \'new\'"');
            setPrompt('');
          }
        }
      }
    } catch (error: any) {
      setResponse(`Error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: string) => {
    setSelectedFile(file);
    const res = await client.readFile(file);
    setEditContent(res.content[0].text.replace(/^.*?\n\n/, ''));
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    await client.editFile(selectedFile, editContent);
    setResponse(`Updated ${selectedFile}`);
    await loadFiles();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    for (const file of Array.from(e.target.files)) {
      const text = await file.text();
      const relativePath = file.webkitRelativePath || file.name;
      await client.createFile(relativePath, text);
    }
    await loadFiles();
    setResponse('Folder uploaded successfully');
  };

  return (
    <div className="min-h-screen min-w-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">MCP Filesystem Manager</h1>
          <p className="text-gray-600 mt-2">Manage files using natural language prompts</p>
        </div>
        {/* Folder Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Folder</label>
          <input
            type="file"
            {...({ webkitdirectory: "" } as any)}
            multiple
            onChange={handleFileUpload}
            className="mb-2"
          />
        </div>
        {/* Prompt Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handlePromptSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Operation Prompt
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'create file subfolder/hello.txt with content Hello World' or 'edit file subfolder/hello.txt replace 'Hello' with 'Hi''"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-black px-6 py-2 rounded-md transition-colors"
            >
              {loading ? 'Processing...' : 'Execute'}
            </button>
          </form>
          {response && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{response}</pre>
            </div>
          )}
        </div>
        {/* File Explorer */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Files</h2>
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file}
                onClick={() => handleFileSelect(file)}
                className={`p-2 rounded-md cursor-pointer ${
                  selectedFile === file ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                {file}
              </li>
            ))}
          </ul>
        </div>
        {/* File Editor */}
        {selectedFile && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit: {selectedFile}</h2>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="File content..."
            />
            <button
              onClick={handleSaveFile}
              className="mt-4 bg-green-500 hover:bg-green-600 text-black px-6 py-2 rounded-md transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;