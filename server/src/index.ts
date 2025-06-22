import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  TextContent,
  ImageContent,
  EmbeddedResource
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';

class FilesystemMCPServer {
  private server: Server;
  private workingDirectory: string;

  constructor() {
    this.server = new Server(
      {
        name: 'filesystem-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.workingDirectory = process.cwd();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_file',
            description: 'Create a new file with specified content',
            inputSchema: {
              type: 'object',
              properties: {
                filepath: {
                  type: 'string',
                  description: 'Path to the file to create (relative to working directory)'
                },
                content: {
                  type: 'string',
                  description: 'Content to write to the file'
                }
              },
              required: ['filepath', 'content']
            }
          },
          {
            name: 'edit_file',
            description: 'Edit an existing file by replacing its content',
            inputSchema: {
              type: 'object',
              properties: {
                filepath: {
                  type: 'string',
                  description: 'Path to the file to edit'
                },
                content: {
                  type: 'string',
                  description: 'New content for the file'
                }
              },
              required: ['filepath', 'content']
            }
          },
          {
            name: 'delete_file',
            description: 'Delete a file',
            inputSchema: {
              type: 'object',
              properties: {
                filepath: {
                  type: 'string',
                  description: 'Path to the file to delete'
                }
              },
              required: ['filepath']
            }
          },
          {
            name: 'read_file',
            description: 'Read the content of a file',
            inputSchema: {
              type: 'object',
              properties: {
                filepath: {
                  type: 'string',
                  description: 'Path to the file to read'
                }
              },
              required: ['filepath']
            }
          },
          {
            name: 'list_files',
            description: 'List all files in the working directory',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Directory to list (optional, defaults to working directory)'
                }
              }
            }
          },
          {
            name: 'set_working_directory',
            description: 'Set the working directory for file operations',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Path to the directory to set as working directory'
                }
              },
              required: ['directory']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_file':
            return await this.createFile(args?.filepath as string, args?.content as string);
          
          case 'edit_file':
            return await this.editFile(args?.filepath as string, args?.content as string);
          
          case 'delete_file':
            return await this.deleteFile(args?.filepath as string);
          
          case 'read_file':
            return await this.readFile(args?.filepath as string);
          
          case 'list_files':
            return await this.listFiles(args?.directory as string);
          
          case 'set_working_directory':
            return await this.setWorkingDirectory(args?.directory as string );
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    });
  }

  public async createFile(filepath: string, content: string): Promise<CallToolResult> {
    const fullPath = path.resolve(this.workingDirectory, filepath);
    
    // Ensure the file is within the working directory (security check)
    if (!fullPath.startsWith(path.resolve(this.workingDirectory))) {
      throw new Error('File path is outside the working directory');
    }

    // Create directory if it doesn't exist
    await fs.ensureDir(path.dirname(fullPath));
    
    // Write the file
    await fs.writeFile(fullPath, content, 'utf8');

    return {
      content: [
        {
          type: 'text',
          text: `File created successfully: ${filepath}`
        }
      ]
    };
  }

  public async editFile(filepath: string, content: string): Promise<CallToolResult> {
    const fullPath = path.resolve(this.workingDirectory, filepath);
    
    if (!fullPath.startsWith(path.resolve(this.workingDirectory))) {
      throw new Error('File path is outside the working directory');
    }

    // Check if file exists
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`File does not exist: ${filepath}`);
    }

    // Write the new content
    await fs.writeFile(fullPath, content, 'utf8');

    return {
      content: [
        {
          type: 'text',
          text: `File edited successfully: ${filepath}`
        }
      ]
    };
  }

  public async deleteFile(filepath: string): Promise<CallToolResult> {
    const fullPath = path.resolve(this.workingDirectory, filepath);
    
    if (!fullPath.startsWith(path.resolve(this.workingDirectory))) {
      throw new Error('File path is outside the working directory');
    }

    // Check if file exists
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`File does not exist: ${filepath}`);
    }

    // Delete the file
    await fs.remove(fullPath);

    return {
      content: [
        {
          type: 'text',
          text: `File deleted successfully: ${filepath}`
        }
      ]
    };
  }

  public async readFile(filepath: string): Promise<CallToolResult> {
    const fullPath = path.resolve(this.workingDirectory, filepath);
    
    if (!fullPath.startsWith(path.resolve(this.workingDirectory))) {
      throw new Error('File path is outside the working directory');
    }

    // Check if file exists
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`File does not exist: ${filepath}`);
    }

    // Read the file
    const content = await fs.readFile(fullPath, 'utf8');

    return {
      content: [
        {
          type: 'text',
          text: `Content of ${filepath}:\n\n${content}`
        }
      ]
    };
  }

  public async listFiles(directory?: string): Promise<CallToolResult> {
    const targetDir = directory ? path.resolve(this.workingDirectory, directory) : this.workingDirectory;
    
    if (!targetDir.startsWith(path.resolve(this.workingDirectory))) {
      throw new Error('Directory path is outside the working directory');
    }

    // Check if directory exists
    if (!await fs.pathExists(targetDir)) {
      throw new Error(`Directory does not exist: ${directory || 'working directory'}`);
    }

    // List files and directories
    const items = await fs.readdir(targetDir);
    const itemsWithTypes = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(targetDir, item);
        const stats = await fs.stat(itemPath);
        return `${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${item}`;
      })
    );

    return {
      content: [
        {
          type: 'text',
          text: `Contents of ${directory || 'working directory'}:\n\n${itemsWithTypes.join('\n')}`
        }
      ]
    };
  }

  public async setWorkingDirectory(directory: string): Promise<CallToolResult> {
    const fullPath = path.resolve(directory);
    
    // Check if directory exists
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`Directory does not exist: ${directory}`);
    }

    // Check if it's actually a directory
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${directory}`);
    }

    this.workingDirectory = fullPath;

    return {
      content: [
        {
          type: 'text',
          text: `Working directory set to: ${this.workingDirectory}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP Server running on stdio');
  }
}

// Start the server
const server = new FilesystemMCPServer();
server.run().catch(console.error);
export { FilesystemMCPServer };