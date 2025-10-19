# playlist-management Specification

## Purpose
TBD - created by archiving change create-iptv-web-player. Update Purpose after archive.
## Requirements
### Requirement: 从URL加载M3U播放列表
系统 SHALL 能够通过一个给定的URL下载并解析 `.m3u` 或 `.m3u8` 格式的播放列表文件。

### Requirement: 兼容非标准格式的播放列表
系统 SHALL 能够解析并加载一种特殊的、非M3U的播放列表格式（类“BJYD”格式），其特征为每行一条记录，格式为 `名称,URL`。

#### Scenario: 用户提供一个有效的播放列表URL
- **GIVEN** 用户在输入框中提供了一个可访问的播放列表URL
- **WHEN** 后端服务接收到该URL并发起请求
- **THEN** 系统应当成功下载文件内容，并解析出频道名称、Logo和流地址等信息。

#### Scenario: 用户提供一个无效的播放列表URL
- **GIVEN** 用户提供了一个无法访问或格式错误的URL
- **WHEN** 后端服务尝试下载或解析
- **THEN** 系统应当返回一个简单易懂的中文错误信息给前端。

#### Scenario: 访问受Cloudflare保护的网站
- **GIVEN** 用户提供一个受Cloudflare保护的有效播放列表URL
- **WHEN** 后端服务尝试下载该文件
- **THEN** 系统应能模拟标准浏览器行为，成功下载文件内容。

#### Scenario: 访问使用自签名证书的内网网站
- **GIVEN** 用户提供一个来自内网（使用HTTPS及自签名或不匹配证书）的有效播放列表URL
- **WHEN** 后端服务尝试下载该文件
- **THEN** 系统应能忽略SSL证书验证错误，成功下载文件内容。

