# player-core Specification

## Purpose
TBD - created by archiving change create-iptv-web-player. Update Purpose after archive.
## Requirements
### Requirement: 播放HLS直播流
系统 SHALL 能够接收一个 HLS 格式的 URL (`.m3u8`) 并在视频播放器中播放。该功能通过 `HLS.js` 库实现。

#### Scenario: 用户选择一个频道进行播放
- **GIVEN** 用户在频道列表中选择了一个有效的频道
- **WHEN** 播放器组件加载该频道的 HLS 流地址
- **THEN** 视频应当开始缓冲并播放直播内容。

### Requirement: 控制视频播放
系统 SHALL 提供标准的视频播放控件，包括播放/暂停、音量调节和全屏切换。

#### Scenario: 用户暂停视频
- **GIVEN** 视频正在播放
- **WHEN** 用户点击暂停按钮
- **THEN** 视频画面应当定格，声音停止。

