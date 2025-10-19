# Project Context

## Purpose
This project is an IPTV web player. It allows users to manage IPTV playlists, browse channels, and watch live video streams in a web browser. The application consists of a React-based frontend and a Fastify-based backend.

## Tech Stack
- **Frontend:**
  - TypeScript
  - React
  - Vite
  - HLS.js for video streaming
  - Axios for HTTP requests
- **Backend:**
  - TypeScript
  - Node.js
  - Fastify
  - `iptv-playlist-parser` for parsing M3U playlists
  - `curl`: Used via `child_process` to fetch external playlists and EPG files. This was implemented to bypass Cloudflare bot detection and handle servers with invalid SSL certificates.
  - `axios`: Used for proxying video streams.
- **Testing:**
  - `tap` and `nock` for backend testing

## Project Conventions

### Code Style
- Code is formatted using standard TypeScript and React conventions.
- ESLint is used for linting in the frontend.
- Naming conventions should follow camelCase for variables and functions, and PascalCase for components and classes.

### Architecture Patterns
- **Client-Server Architecture:** The application is split into a frontend single-page application (SPA) and a backend API server.
- **Backend API:** The backend provides a RESTful API for fetching and parsing playlists, and for proxying video streams to avoid CORS issues.
- **React Components:** The frontend is built with React functional components and hooks.

### Testing Strategy
- **Backend:** Unit and integration tests are written using `tap`. Mocks for external services are created using `nock`.
- **Frontend:** (To be defined) Currently, no testing framework is set up for the frontend.

### Git Workflow
- (To be defined) A branching strategy and commit conventions need to be established.

## Domain Context
- **IPTV:** The core domain is Internet Protocol Television (IPTV).
- **M3U Playlists:** The application works with M3U playlist files, which are plain text files that specify the locations of media streams.
- **HLS:** The primary streaming protocol used is HTTP Live Streaming (HLS).
- **CORS Proxy:** A backend proxy is necessary because many IPTV streams do not have the correct CORS headers, which would prevent them from being loaded directly in the browser.

## Important Constraints
- The application must be able to handle various M3U playlist formats.
- The video player should be robust and handle different stream types gracefully.
- The backend proxy needs to be efficient to not introduce significant latency.

## External Dependencies
- The application relies on users providing URLs to external IPTV playlists.
- The application fetches video streams from various external servers.