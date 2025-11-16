# ClassIO - MCP Server for Course Management

A Model Context Protocol (MCP) server that provides AI assistants with access to course schedules, exams, announcements, lecture notes, and integrations with Notion and Google Calendar.

## Features

- **Course Schedule Management**: Query upcoming exams, lectures, and assignments
- **Lecture Summaries**: Access and search through lecture notes
- **Announcements**: Check latest course announcements
- **Notion Integration**: Write notes and content to Notion pages
- **Google Calendar**: Add meetings and events via n8n webhook
- **Smart Fuzzy Matching**: Find lectures even with approximate names

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Notion integration token (optional, for Notion features)
- An n8n webhook URL (optional, for Google Calendar features)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ClassIO
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
NOTION_TOKEN=your_notion_token_here
DEFAULT_BLOCK_ID=your_default_block_id_here
N8N_WEBHOOK_URL=your_webhook_url_here
PORT=8000
```

## Getting API Credentials

### Notion Token
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name and select your workspace
4. Copy the "Internal Integration Token"
5. Share your Notion pages with the integration

### n8n Webhook URL
1. Create a workflow in n8n
2. Add a "Webhook" trigger node
3. Copy the webhook URL
4. Add it to your `.env` file

## Running the Server

### Development Mode
```bash
npm run watch
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:8000/mcp` (or the port specified in your `.env`).

## Connecting to AI Tools with MCP Support

### Local Connection (Claude Desktop, etc.)

Add this configuration to your MCP client settings:

```json
{
  "mcpServers": {
    "classio": {
      "url": "http://localhost:8000/mcp"
    }
  }
}
```

### Remote Connection via ngrok

To expose your MCP server to cloud-based AI tools:

1. **Install ngrok**:
```bash
# macOS
brew install ngrok

# Linux
snap install ngrok

# Windows
choco install ngrok
```

2. **Start your MCP server**:
```bash
npm start
```

3. **Expose the server with ngrok**:
```bash
ngrok http 8000
```

4. **Copy the public URL** from ngrok output (e.g., `https://abc123.ngrok.io`)

5. **Configure your AI tool** with the ngrok URL:
```json
{
  "mcpServers": {
    "classio": {
      "url": "https://abc123.ngrok.io/mcp"
    }
  }
}
```

### Supported AI Tools

Any AI tool with MCP support can connect to this server:
- **Claude Desktop** (via local or ngrok)
- **Claude.ai** (via ngrok)
- **Custom AI applications** using the MCP SDK
- **Other MCP-compatible clients**

## Available Tools

### 1. `get_next_course_exam`
Get the next upcoming exam for a specific course.

**Example**: "When is my next exam in CSC254?"

### 2. `get_all_course_next_exam`
Get next exams across all courses.

**Example**: "Show me all my upcoming exams"

### 3. `find_closest_lectures`
Find the 3 most recent lectures before a given date.

**Example**: "What topics did we cover recently in CSC160?"

### 4. `summarize_lectures`
Get detailed content from a specific lecture.

**Example**: "Give me a summary of the data structures lecture"

### 5. `notion_write`
Create and write content to a Notion page.

**Example**: "Create a study guide page in my CSC254 notebook"

### 6. `google_calendar`
Add events to Google Calendar via n8n.

**Example**: "Add a meeting to Google Calendar for tomorrow at 2pm"

### 7. `latest_announcement_check`
Check recent announcements for a class.

**Example**: "Any announcements about the curve in CSC160?"

## Project Structure

```
ClassIO/
├── src/
│   └── index.ts          # Main MCP server implementation
├── static/
│   ├── csc160/
│   │   ├── schedule.json
│   │   ├── announcements/
│   │   └── lectures/
│   ├── csc171/
│   └── csc254/
├── build/                # Compiled JavaScript
├── .env                  # Environment variables (not tracked)
├── .env.example          # Environment template
└── package.json
```

## Adding New Courses

1. Create a folder in `static/` with your course ID (e.g., `csc999`)
2. Add a `schedule.json` file:
```json
{
  "course_code": "CSC999",
  "schedule": [
    {
      "date": "2025-01-20",
      "type": "lecture",
      "topic": "Introduction",
      "className": "Lecture 1"
    },
    {
      "date": "2025-02-15",
      "type": "exam",
      "topic": "Midterm Exam",
      "className": "Midterm"
    }
  ]
}
```
3. (Optional) Add lecture notes in `lectures/` as `.txt` files
4. (Optional) Add announcements in `announcements/announcement.json`

## Security Notes

- **Never commit `.env`** - it contains sensitive credentials
- **Rotate credentials** after making the repository public
- **Use ngrok auth** for production deployments
- **Limit ngrok session time** for temporary access

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Inspect MCP Server
```bash
npm run inspector
```

## Troubleshooting

### Server won't start
- Check that port 8000 is not already in use
- Verify all environment variables are set in `.env`

### Notion integration not working
- Ensure you've shared your Notion pages with the integration
- Verify the `NOTION_TOKEN` is correct
- Check that `DEFAULT_BLOCK_ID` points to a valid page

### ngrok connection issues
- Ensure your local server is running before starting ngrok
- Check firewall settings
- Verify the ngrok URL matches in your AI tool configuration

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
