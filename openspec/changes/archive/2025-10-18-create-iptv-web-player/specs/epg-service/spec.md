## ADDED Requirements

### Requirement: 从URL加载XMLTV节目指南
系统 SHALL 能够通过一个给定的URL下载并解析 XMLTV (`.xml`) 格式的节目指南文件。

#### Scenario: 用户提供一个有效的EPG文件URL
- **GIVEN** 用户提供了一个有效的XMLTV文件URL
- **WHEN** 后端服务接收到请求并下载解析该文件
- **THEN** 系统应当能解析出各个频道在不同时间段的节目信息，包括节目名称、开始和结束时间。

### Requirement: 按频道和时间查询节目信息
系统 SHALL 提供一个API，允许前端根据频道ID和时间范围查询对应的节目信息。

#### Scenario: 前端请求当前频道的节目指南
- **GIVEN** EPG数据已被成功加载
- **WHEN** 前端请求特定频道ID从现在起24小时内的节目信息
- **THEN** 后端应当返回一个包含多个节目条目的JSON数组。
