## Why
目前需要一个现代化、界面美观、体验流畅的网页版IPTV播放器，以满足在线观看直播流的需求。

## What Changes
- 新建一个完整的Web应用，包含前端和后端。
- **前端**: 实现一个简洁、布局合理的播放器核心UI和频道列表。
- **后端**: 提供API接口，用于加载和解析IPTV播放列表 (`.m3u`/`.m3u8`)。

## Impact
- **Affected specs**:
  - `player-core` (new)
  - `playlist-management` (new)
  - `user-interface` (new)
- **Affected code**:
  - `frontend/` (new directory)
  - `backend/` (new directory)
