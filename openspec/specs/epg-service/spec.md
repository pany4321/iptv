# epg-service Specification

## Purpose
This service is responsible for fetching, parsing, caching, and providing EPG (Electronic Program Guide) data from external XMLTV sources.
## Requirements
### Requirement: 从URL加载XMLTV节目指南
系统 SHALL 能够通过一个给定的URL下载并解析 XMLTV (`.xml`) 格式的节目指南文件。

#### Scenario: 用户提供一个有效的EPG文件URL
- **GIVEN** 用户提供了一个有效的XMLTV文件URL
- **WHEN** 后端服务接收到请求并下载解析该文件
- **THEN** 系统应当能解析出各个频道在不同时间段的节目信息，包括节目名称、开始和结束时间。

#### Scenario: 用户提供一个无效的EPG文件URL
- **GIVEN** 用户提供了一个无法访问或格式错误的EPG文件URL
- **WHEN** 后端服务尝试下载或解析
- **THEN** 系统应当返回一个简单易懂的中文错误信息给前端。

#### Scenario: 访问受Cloudflare保护的网站
- **GIVEN** 用户提供一个受Cloudflare保护的有效EPG文件URL
- **WHEN** 后端服务尝试下载该文件
- **THEN** 系统应能模拟标准浏览器行为，成功下载文件内容。

#### Scenario: 访问使用自签名证书的内网网站
- **GIVEN** 用户提供一个来自内网（使用HTTPS及自签名或不匹配证书）的有效EPG文件URL
- **WHEN** 后端服务尝试下载该文件
- **THEN** 系统应能忽略SSL证书验证错误，成功下载文件内容。

### Requirement: 按频道和时间查询节目信息
系统 SHALL 提供一个API，允许前端根据频道ID和时间范围查询对应的节目信息。

### Requirement: 缓存EPG数据 (Non-Functional)
为了提升性能并减少不必要的网络请求，系统 SHALL 在后端对获取到的EPG数据进行缓存（例如，缓存4小时）。在缓存有效期内，对同一EPG URL的请求应直接返回缓存数据。

#### Scenario: 前端请求当前频道的节目指南
- **GIVEN** EPG数据已被成功加载
- **WHEN** 前端请求特定频道ID从现在起24小时内的节目信息
- **THEN** 后端应当返回一个包含多个节目条目的JSON数组。

