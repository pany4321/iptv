## ADDED Requirements

### Requirement: 从URL加载M3U播放列表
系统 SHALL 能够通过一个给定的URL下载并解析 `.m3u` 或 `.m3u8` 格式的播放列表文件。

#### Scenario: 用户提供一个有效的播放列表URL
- **GIVEN** 用户在输入框中提供了一个可访问的播放列表URL
- **WHEN** 后端服务接收到该URL并发起请求
- **THEN** 系统应当成功下载文件内容，并解析出频道名称、Logo和流地址等信息。

#### Scenario: 用户提供一个无效的播放列表URL
- **GIVEN** 用户提供了一个无法访问或格式错误的URL
- **WHEN** 后端服务尝试下载或解析
- **THEN** 系统应当返回一个明确的错误信息给前端。
