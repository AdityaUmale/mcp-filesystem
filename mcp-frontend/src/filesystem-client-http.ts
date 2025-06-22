export class FilesystemMCPClient {
  baseUrl = 'http://localhost:3001/api';

  async callTool(name: string, args: any) {
    const res = await fetch(`${this.baseUrl}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, args }),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }

  createFile(filepath: string, content: string) {
    return this.callTool('create_file', { filepath, content });
  }
  editFile(filepath: string, content: string) {
    return this.callTool('edit_file', { filepath, content });
  }
  deleteFile(filepath: string) {
    return this.callTool('delete_file', { filepath });
  }
  readFile(filepath: string) {
    return this.callTool('read_file', { filepath });
  }
  listFiles(directory?: string) {
    return this.callTool('list_files', { directory });
  }
  setWorkingDirectory(directory: string) {
    return this.callTool('set_working_directory', { directory });
  }
  connect() {
    // No-op for HTTP client
    return Promise.resolve();
  }
} 