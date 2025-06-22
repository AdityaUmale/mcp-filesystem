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
      // Simple prompt parsing for demo
      const lower = prompt.toLowerCase();
      let result;
      if (lower.includes('create') && lower.includes('file')) {
        const filename = prompt.match(/(\w+\.\w+)/)?.[1] || 'newfile.txt';
        const contentMatch = prompt.match(/(?:with content|containing)\s+(.+)/i);
        const content = contentMatch?.[1] || 'Default content';
        result = await client.createFile(filename, content);
        setResponse(result.content[0].text);
        await loadFiles();
        setPrompt('');
      } else if (lower.includes('delete') && lower.includes('file')) {
        const filename = prompt.match(/(\w+\.\w+)/)?.[1];
        if (filename) {
          result = await client.deleteFile(filename);
          setResponse(result.content[0].text);
          await loadFiles();
          setPrompt('');
        } else {
          setResponse('File not found in prompt');
        }
      } else if (lower.includes('list')) {
        result = await client.listFiles();
        setResponse(result.content[0].text);
        setPrompt('');
        await loadFiles();
      } else {
        setResponse('Try: "create file test.txt with content hello" or "list files"');
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
      await client.createFile(file.name, text);
    }
    await loadFiles();
    setResponse('Files uploaded successfully');
  };

  return (
    <div className="min-h-screen min-w-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">MCP Filesystem Manager</h1>
          <p className="text-gray-600 mt-2">Manage files using natural language prompts</p>
        </div>
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files</label>
          <input
            type="file"
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
                placeholder="e.g., 'create file hello.txt with content Hello World'"
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
            <div className={`mt-4 p-3 rounded-md ${
              response.includes('Error') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
            }`}>
              {response}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Files ({files.length})</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No files yet. Create one using a prompt!</p>
              ) : (
                files.map((file) => (
                  <div
                    key={file}
                    onClick={() => handleFileSelect(file)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedFile === file 
                        ? 'bg-blue-100 border-2 border-blue-300' 
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium">{file}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* File Editor */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedFile ? `Edit: ${selectedFile}` : 'Select a file to edit'}
            </h2>
            {selectedFile ? (
              <div className="space-y-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  rows={10}
                  placeholder="File content..."
                />
                <button
                  onClick={handleSaveFile}
                  className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Click on a file from the list to start editing
              </div>
            )}
          </div>
        </div>
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Try these prompts:</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• "create file readme.md with content This is a readme file"</li>
            <li>• "create file script.js with content console.log('hello')"</li>
            <li>• "list files"</li>
            <li>• "delete file readme.md"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;