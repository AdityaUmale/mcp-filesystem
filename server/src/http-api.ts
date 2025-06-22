import express from 'express';
import bodyParser from 'body-parser';
import { FilesystemMCPServer } from '../src/index';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Instantiate the MCP server
const mcp = new FilesystemMCPServer();

// Helper to call MCP tool methods
async function callTool(name: string, args: any) {
  switch (name) {
    case 'create_file':
      return await mcp.createFile(args.filepath, args.content);
    case 'edit_file':
      return await mcp.editFile(args.filepath, args.content);
    case 'delete_file':
      return await mcp.deleteFile(args.filepath);
    case 'read_file':
      return await mcp.readFile(args.filepath);
    case 'list_files':
      return await mcp.listFiles(args.directory);
    case 'set_working_directory':
      return await mcp.setWorkingDirectory(args.directory);
    default:
      throw new Error('Unknown tool');
  }
}

app.post('/api/tool', async (req, res) => {
  const { name, args } = req.body;
  try {
    const result = await callTool(name, args);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP HTTP API running on http://localhost:${PORT}`);
}); 