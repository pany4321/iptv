# Proposal: Add Support for BJYD Playlist Format

## 1. Goal

To extend the application's functionality to support a new, simple, comma-separated playlist format, as exemplified by `bjyd.txt`. This will allow users to use playlists that follow the `channel_name,channel_url` structure in addition to the existing M3U format.

## 2. Motivation

Users may have playlists in various formats. Supporting this simple and common text-based format increases the application's flexibility and usability.

## 3. Scope

- **Backend:** Modify the `/playlist` endpoint to detect and parse the new format.
- **Frontend:** No changes are required. The backend will transform the new format into the existing `Channel` data structure that the frontend already consumes.
