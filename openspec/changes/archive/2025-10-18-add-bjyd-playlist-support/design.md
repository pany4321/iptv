# Design: BJYD Playlist Support

## 1. Technical Design

The implementation will be confined to the backend service in `backend/src/app.ts`.

### 1.1. Format Detection

The `/playlist` endpoint will be modified. After fetching the playlist content from the provided URL, it will inspect the raw string data.
- If the content contains the string `#EXTM3U`, it will be processed by the existing `iptv-playlist-parser`.
- If the content does **not** contain `#EXTM3U`, it will be considered to be in the `bjyd` format and passed to a new, custom parser.

### 1.2. Custom Parser (`parseBjydPlaylist`)

A new function, `parseBjydPlaylist`, will be implemented with the following logic:
1.  Accept the raw playlist string as input.
2.  Split the string into individual lines.
3.  For each line, split the content by the first comma (`,`) to separate the channel name from the URL. This handles cases where the URL itself might contain a comma.
4.  Trim whitespace from both the name and the URL.
5.  For each valid name/URL pair, construct a `Channel` object that conforms to the data structure expected by the frontend.
    - `name`: From the parsed name.
    - `url`: From the parsed URL.
    - `tvg`: A default object will be created, e.g., `{ id: '', name: [parsed_name], logo: '', url: '', rec: '' }`.
    - `group`: A default object will be created, e.g., `{ title: 'Default' }`.
6.  The function will return an object with an `items` property containing the array of parsed channel objects, mimicking the structure of the `iptv-playlist-parser` library's output.

### 1.3. Data Flow

1.  Frontend requests `/playlist?url=...`.
2.  Backend fetches content from the URL.
3.  Backend detects format (M3U or BJYD).
4.  Backend calls the appropriate parser.
5.  Both parsers return a `{ items: [...] }` structure.
6.  Backend sends the `items` array to the frontend.
7.  Frontend renders the channel list as usual.
