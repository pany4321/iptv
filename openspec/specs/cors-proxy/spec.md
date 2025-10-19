# cors-proxy Specification

## Purpose
This service acts as a server-side proxy to bypass Cross-Origin Resource Sharing (CORS) restrictions. Many IPTV video streams (.m3u8 files) are served without the necessary CORS headers, which prevents web browsers from fetching them directly due to security policies. This proxy fetches the stream on behalf of the client and forwards it, effectively circumventing the issue.

## Requirements
### Requirement: Proxy HLS video streams
- **GIVEN** The client requests a video stream URL via the proxy service.
- **WHEN** The backend receives the request.
- **THEN** The backend shall fetch the content from the given URL and stream it back to the client with the appropriate `Content-Type` header.

#### Scenario: Client requests a valid video stream
- **GIVEN** A user has selected a channel with a valid stream URL.
- **WHEN** The frontend requests the stream via `/proxy?url=<stream_url>`.
- **THEN** The backend should successfully fetch the stream and send the data back to the player, allowing the video to play.

#### Scenario: The target stream URL is invalid or fails
- **GIVEN** A user has selected a channel with an invalid or unreachable stream URL.
- **WHEN** The frontend requests the stream via the proxy.
- **THEN** The backend should detect the failure and return an appropriate HTTP error code (e.g., 502 Bad Gateway) to the client.
