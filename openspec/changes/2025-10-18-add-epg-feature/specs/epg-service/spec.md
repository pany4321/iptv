# EPG 服务 API 规范

## 端点: `GET /epg`

### 概述
此端点用于获取并解析一个远程的XMLTV文件，并以JSON格式返回节目单数据。

### 查询参数
- `url` (string, **必需**): XMLTV文件的完整URL地址。该URL可以指向一个纯文本XML文件，也可以指向一个Gzip压缩文件（例如，以 `.gz` 结尾）。

### 成功响应 (200 OK)
当成功获取并解析XMLTV文件后，服务器将返回一个包含节目信息的JSON对象。

**响应体结构:**
```json
{
  "programmes": [
    {
      "channel": "I-GUIDE-SITE-CHANNEL-ID",
      "title": "The Morning Show",
      "description": "A daily news and talk show.",
      "start": "2025-10-18T09:00:00.000Z",
      "stop": "2025-10-18T11:00:00.000Z"
    },
    {
      "channel": "I-GUIDE-SITE-CHANNEL-ID",
      "title": "Midday Report",
      "description": "In-depth analysis of the day's top stories.",
      "start": "2025-10-18T11:00:00.000Z",
      "stop": "2025-10-18T12:00:00.000Z"
    }
  ]
}
```

### 错误响应

- **400 Bad Request**
  - **原因:** 请求中缺少 `url` 查询参数。
  - **响应体:**
    ```json
    {
      "error": "url query parameter is required"
    }
    ```

- **500 Internal Server Error**
  - **原因:** 服务器在获取或解析XMLTV文件时发生错误（例如，URL无效、网络问题、文件格式错误）。
  - **响应体:**
    ```json
    {
      "error": "Failed to fetch or parse EPG data",
      "details": "Specific error message here"
    }
    ```
