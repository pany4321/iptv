# user-interface Specification

## Purpose
TBD - created by archiving change create-iptv-web-player. Update Purpose after archive.
## Requirements
### Requirement: 提供简洁直观的用户界面
系统 SHALL 提供一个布局清晰、易于理解且符合常见操作习惯的用户界面。

#### Scenario: 新用户首次打开应用
- **GIVEN** 用户首次加载应用
- **WHEN** 用户看到主屏幕
- **THEN** 界面布局应当直观明了，主要分为频道列表区和视频播放区，无需额外说明即可上手。

### Requirement: 展示频道列表
系统 SHALL 在界面上清晰地展示从播放列表解析出的所有频道。

#### Scenario: 用户加载了播放列表
- **GIVEN** 一个播放列表已被成功加载和解析
- **WHEN** 用户查看主界面
- **THEN** 界面上应出现一个可滚动的列表，其中每一项包含频道Logo和频道名称。

### Requirement: 切换频道
系统 SHALL 允许用户通过点击频道列表中的条目来切换当前播放的频道。

#### Scenario: 用户从频道A切换到频道B
- **GIVEN** 播放器当前正在播放频道A
- **WHEN** 用户点击频道列表中的频道B
- **THEN** 播放器应当停止播放频道A的流，并开始加载和播放频道B的流。

### Requirement: 提供节目指南(EPG)面板
系统 SHALL 提供一个节目指南面板，用于按时间线显示频道的节目信息。

#### Scenario: 用户打开节目指南
- **GIVEN** EPG数据已成功加载
- **WHEN** 用户触发显示节目指南的操作
- **THEN** 界面上应显示一个面板（`GuidePanel`），其中包含一个时间轴和各个频道的节目排列表。

### Requirement: 提供播放列表切换功能
系统 SHALL 允许用户在多个播放列表之间进行切换。

#### Scenario: 用户切换播放列表
- **GIVEN** 应用中已配置多个播放列表
- **WHEN** 用户通过播放列表切换组件（`PlaylistSwitcher`）选择一个新的播放列表
- **THEN** 应用应当加载并显示新选择的播放列表中的频道。

### Requirement: 提供设置面板
系统 SHALL 提供一个设置面板，允许用户进行应用级别的配置。

#### Scenario: 用户打开设置
- **GIVEN** 用户在应用中
- **WHEN** 用户点击设置按钮
- **THEN** 界面上应显示一个设置面板（`Settings`），提供配置选项（例如，输入播放列表URL）。

