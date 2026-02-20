# ThereforeSharer

[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors)

A native desktop application for quickly sharing files via Therefore™ document management system.

## Overview

ThereforeSharer is a lightweight desktop application that streamlines the process of sharing files through Therefore. Simply drag and drop files, set optional security parameters, and instantly generate shareable links.

## Screenshots

| Demo | Main |
|:---:|:---:|
| ![Demo](docs/ThereforeSharer.gif) | ![Main](docs/ThereforeSharer-Main.png) |

| History | Settings |
|:---:|:---:|
| ![History](docs/ThereforeSharer-History.png) | ![Settings](docs/ThereforeSharer-Settings.png) |

## Features

- **Drag & Drop Interface** - Drop files directly into the app or onto the drop zone
- **Batch File Support** - Share multiple files at once (automatically zipped)
- **Password Protection** - Optionally secure shared links with passwords
- **Expiry Settings** - Set automatic link expiration (7, 30, 90 days, or custom date)
- **Share History** - View, manage, and revoke previously shared links
- **Progress Tracking** - Real-time upload progress with cancellation support
- **Native Integration** - Built as a native desktop application using Wails (macOS & Windows)

## ThereforeSharer Web

In addition to the desktop application, a web-based version is available in the `web/` directory. This version is designed for server-side deployment and team sharing.

### Web Features

- **Single Binary** - The Go backend embeds the entire frontend using `go:embed`, resulting in a single, portable executable.
- **Server-Side Security** - Authentication tokens and configuration are stored securely on the server, never reaching the user's browser.
- **Role-Based Access** - Two levels of access:
  - **Admin**: Full access to configuration, Therefore credentials, and link management.
  - **User**: Restricted access to sharing files and viewing history only.
- **Docker Ready** - Includes a multi-stage Dockerfile and Docker Compose for easy deployment.
- **Zero Local Dependencies** - The Docker build handles both Node.js (frontend) and Go (backend) compilation.

### Running with Docker

#### Option 1: Pull from Docker Hub (Recommended)
The easiest way to run ThereforeSharer Web is by using the pre-built multi-architecture image from Docker Hub:

```yaml
# Save this as docker-compose.yml
services:
  therefore-sharer:
    image: fybre/thereforesharer:latest
    container_name: therefore-sharer
    ports:
      - "8080:8080"
    volumes:
      - ./data:/root/
    restart: always
```

Then run:
```bash
docker compose up -d
```

#### Option 2: Build from Source
If you want to build the image yourself:

```bash
cd web/server
docker compose up --build -d
```

Access the web portal at `http://localhost:8080`. On first run, you will be prompted to create an Admin Password.

## Requirements

- macOS 10.13 (High Sierra) or later, or Windows 10+
- Active Therefore™ account with API access
- Therefore REST API endpoint

## Installation

### From Release

1. Download the latest release from the [Releases](https://github.com/Fybre/ThereforeSharer/releases) page
2. **macOS**: Open the `.dmg` and drag the app to your Applications folder
3. **Windows**: Extract the `.zip` file and run `ThereforeSharer.exe`
4. Launch the application

### Building from Source

#### Prerequisites

- [Go](https://golang.org/dl/) 1.21 or later
- [Node.js](https://nodejs.org/) 18 or later
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) v2.x

#### Build Steps

```bash
# Clone the repository
git clone https://github.com/Fybre/ThereforeSharer.git
cd ThereforeSharer/ThereforeSharer

# Install dependencies
wails doctor  # Check your environment
npm install --prefix frontend

# Build the application
wails build

# The built app will be in build/bin/ThereforeSharer.app
```

#### Development Mode

```bash
# Run in development mode with hot reload
wails dev
```

## Configuration

On first launch, you'll be guided through the setup process:

1. **Therefore Server URL** - Your Therefore REST API endpoint (e.g., `https://therefore.company.com`)
2. **Tenant Name** - Your Therefore tenant identifier
3. **Authentication** - Choose between:
   - Basic Authentication (username/password)
   - Bearer Token
4. **Default Category** - Select the Therefore category where files will be uploaded
5. **Archive Name** (Optional) - Default name for multi-file archives (default: "Archive")

Configuration is stored in:
- macOS: `~/Library/Application Support/ThereforeSharer/config.json`
- Windows: `%APPDATA%\ThereforeSharer\config.json`

Credentials are securely stored in the system keychain.

## Usage

### Sharing Files

1. **Add Files**:
   - Drag and drop files onto the drop zone, or
   - Click "Browse" to select files manually

2. **Set Options** (optional):
   - **Password**: Enable checkbox and enter a password
   - **Expiry**: Choose when the link should expire (Never, 7, 30, 90 days, or custom date)

3. **Share**:
   - Click "Share Files"
   - Progress bar shows upload status
   - Copy the generated link when complete

### Managing Shares

1. Click the history icon (top right) to view shared links
2. For each share you can:
   - Copy the link
   - Revoke access
   - Delete the document from Therefore

### Canceling Uploads

During an upload:
- Click the "Cancel" button in the progress bar to abort the operation

## Project Structure

```
ThereforeSharer/
├── frontend/           # Vite-based frontend
│   ├── src/
│   │   ├── main.js    # Main application logic
│   │   ├── app.css    # Styles
│   │   └── index.html # Entry point
│   └── package.json
├── build/             # Build assets and outputs
│   ├── darwin/        # macOS-specific files
│   ├── appicon.png    # Application icon
│   └── appicon.svg    # Icon source
├── *.go               # Go backend files
│   ├── main.go        # Application entry point
│   ├── app.go         # Core application logic
│   ├── api.go         # Therefore REST API client
│   ├── config.go      # Configuration management
│   ├── zip.go         # File compression
│   └── progress.go    # Upload progress tracking
└── wails.json         # Wails configuration
```

## Technologies

- **Backend**: Go 1.21+
- **Frontend**: Vanilla JavaScript + Vite
- **Framework**: [Wails v2](https://wails.io/) - Go + Web GUI framework
- **API**: Therefore™ REST API
- **Storage**: System keychain for credentials (using `go-keyring`)

## API Integration

ThereforeSharer integrates with the Therefore REST API v1, supporting:
- Document creation with file attachments
- Shared link generation with password and expiry options
- Category browsing
- Link management (list, revoke)
- Document deletion

For more information about the Therefore API, refer to your Therefore documentation.

## Troubleshooting

### "Application not configured" error
- Go to Settings (gear icon) and complete the configuration

### "No authentication token found"
- Re-enter your credentials in Settings

### Upload fails
- Check your network connection
- Verify your Therefore server URL is correct
- Ensure you have permission to upload to the selected category

### Files don't appear after dropping
- Make sure files (not folders) are being dropped
- Check the file drawer (badge icon) to see selected files

### Reset to default settings
To completely reset the application:

**macOS:**
```bash
rm ~/Library/Application\ Support/ThereforeSharer/config.json
```

**Windows:**
```cmd
del %APPDATA%\ThereforeSharer\config.json
```

The app will show the initial setup screen on next launch. Credentials stored in the system keychain will be overwritten when you reconfigure.

## Development

### Code Structure

- `app.go` - Application methods exposed to frontend
- `api.go` - Therefore REST API client
- `config.go` - Configuration and credential management
- `zip.go` - File archiving utilities
- `progress.go` - Upload progress tracking
- `frontend/src/main.js` - Frontend application logic

### Building for Release

```bash
# Build for current platform
wails build

# Build with additional flags
wails build -clean -upx

# The application will be code-signed if you have a Developer ID
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributors

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Thanks to these wonderful contributors:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Fybre"><img src="https://avatars.githubusercontent.com/u/48275667?v=4" width="100px;" alt="Fybre"/><br /><sub><b>Fybre</b></sub></a><br /><a href="https://github.com/Fybre/ThereforeSharer/commits?author=fybre" title="Code">💻</a> <a href="#ideas-fybre" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/Fybre/ThereforeSharer/commits?author=fybre" title="Documentation">📖</a> <a href="#design-fybre" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://claude.ai"><img src="https://www.anthropic.com/favicon.ico" width="100px;" alt="Claude"/><br /><sub><b>Claude</b></sub></a><br /><a href="https://github.com/Fybre/ThereforeSharer/commits" title="Code">💻</a> <a href="#ideas-claude" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/Fybre/ThereforeSharer/commits" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://gemini.google.com"><img src="https://lh3.googleusercontent.com/pw/AP1GczPl6XF9FvC1o7O341P02R-v237Hn1K6G8T_YI6yN-P6_N0l20B1k12=s100" width="100px;" alt="Gemini CLI"/><br /><sub><b>Gemini CLI</b></sub></a><br /><a href="https://github.com/Fybre/ThereforeSharer/commits" title="Code">💻</a> <a href="#ideas-gemini" title="Ideas, Planning, & Feedback">🤔</a> <a href="#design-gemini" title="Design">🎨</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

## Acknowledgments

- Built with [Wails](https://wails.io/)
- Icons from [Font Awesome](https://fontawesome.com/)
- Integrates with Therefore™ document management system
- Developed with assistance from Claude Code and **Gemini CLI** (Web version, Docker, and Multi-arch support)

---

**Note**: Therefore™ is a trademark of Therefore Corporation. This application is an independent tool and is not officially affiliated with or endorsed by Therefore Corporation.
