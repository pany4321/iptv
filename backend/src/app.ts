import Fastify from 'fastify';
import { parse as parsePlaylist } from 'iptv-playlist-parser';
import { Parser as XmlParser } from 'xml2js';
import cors from '@fastify/cors';
import { gunzip } from 'zlib';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import fastifyStatic from '@fastify/static';
import { execFile } from 'child_process';
import axios from 'axios'; // Keep for proxy

const gunzipAsync = promisify(gunzip);
const execFileAsync = promisify(execFile);

const app = Fastify({
  logger: true
});

// Serve frontend files
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
const publicPath = path.join(__dirname, 'public');

const staticRootPath = fs.existsSync(publicPath)
  ? publicPath // Production: serve from 'publish/public'
  : frontendDistPath; // Development: serve from 'frontend/dist'

app.register(fastifyStatic, {
  root: staticRootPath,
});

// SPA fallback
app.setNotFoundHandler((req, reply) => {
  reply.sendFile('index.html');
});

app.register(cors, {
  origin: true,
});

// --- EPG Cache ---
const epgCache = new Map<string, any>();
const epgCacheTimestamps = new Map<string, number>();
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// --- Helper Functions ---
function parseXmltvDate(dateStr: string): string {
    if (!dateStr || dateStr.length < 14) {
        return new Date().toISOString();
    }
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    const hours = parseInt(dateStr.substring(8, 10), 10);
    const minutes = parseInt(dateStr.substring(10, 12), 10);
    const seconds = parseInt(dateStr.substring(12, 14), 10);
    const date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    if (dateStr.length > 15) {
        const offsetSign = dateStr.substring(15, 16) === '+' ? 1 : -1;
        const offsetHours = parseInt(dateStr.substring(16, 18), 10);
        const offsetMinutes = parseInt(dateStr.substring(18, 20), 10);
        const totalOffsetMinutes = (offsetHours * 60 + offsetMinutes) * offsetSign;
        date.setUTCMinutes(date.getUTCMinutes() - totalOffsetMinutes);
    }
    return date.toISOString();
}

// --- Routes ---
interface PlaylistQuery {
  url: string;
}

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";

app.get<{ Querystring: PlaylistQuery }>('/playlist', async (request, reply) => {
  const { url } = request.query;
  if (!url) {
    reply.code(400).send({ error: 'url query parameter is required' });
    return;
  }

  const parseBjydPlaylist = (data: string) => {
    const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
    const items = lines.map(line => {
      const parts = line.split(',');
      if (parts.length < 2) return null;
      const name = parts[0].trim();
      const url = parts.slice(1).join(',').trim();
      if (!name || !url) return null;
      return {
        name: name,
        url: url,
        tvg: { id: '', name: name, logo: '', url: '', rec: '' },
        group: { title: 'Default' },
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    return { items };
  };

  try {
    /*
     * Use curl via execFile to fetch remote resources.
     * This approach is used instead of a standard HTTP client like axios because:
     * 1. It bypasses Cloudflare's bot detection that blocks default Node.js/axios requests.
     * 2. It allows ignoring SSL certificate errors for local/private servers using the -k flag.
     *
     * curl arguments:
     * -L: Follow redirects.
     * -k: Insecure. Ignore SSL certificate validation.
     * -A: User-Agent. Impersonate a browser.
     * --compressed: Request a compressed response and decompress it automatically.
     */
    // Use execFile for security to prevent command injection
    const args = ['-L', '-k', '-A', userAgent, '--compressed', url];
    const { stdout } = await execFileAsync('curl', args);
    const playlistData: string = stdout;

    let playlist;
    if (typeof playlistData === 'string' && !playlistData.includes('#EXTM3U')) {
      app.log.info('BJYD-like format detected. Using custom parser.');
      playlist = parseBjydPlaylist(playlistData);
    } else {
      app.log.info('M3U format detected. Using iptv-playlist-parser.');
      playlist = parsePlaylist(playlistData);
    }
    reply.send(playlist.items);
  } catch (error) {
    app.log.error(error); // Log detailed error for server-side debugging
    reply.code(500).send({ error: '获取播放列表失败', details: '请检查网络连接或URL地址是否正确。' });
  }
});

app.get<{ Querystring: { url: string } }>('/epg', async (request, reply) => {
    const { url } = request.query;
    if (!url) {
        reply.code(400).send({ error: 'url query parameter is required' });
        return;
    }

    const cachedTimestamp = epgCacheTimestamps.get(url);
    if (cachedTimestamp && (Date.now() - cachedTimestamp < CACHE_DURATION)) {
        app.log.info(`Returning cached EPG for ${url}`);
        reply.send(epgCache.get(url));
        return;
    }

    try {
        app.log.info(`Fetching EPG from ${url}`);
        /*
         * Use curl via execFile to fetch remote resources.
         * This approach is used instead of a standard HTTP client like axios because:
         * 1. It bypasses Cloudflare's bot detection that blocks default Node.js/axios requests.
         * 2. It allows ignoring SSL certificate errors for local/private servers using the -k flag.
         *
         * curl arguments:
         * -L: Follow redirects.
         * -k: Insecure. Ignore SSL certificate validation.
         * -A: User-Agent. Impersonate a browser.
         * --compressed: Request a compressed response and decompress it automatically.
         */
        // Use execFile for security to prevent command injection
        const args = ['-L', '-k', '-A', userAgent, '--compressed', url];
        
        let xmlData: string;
        if (url.endsWith('.gz')) {
            const { stdout } = await execFileAsync('curl', args, { encoding: 'buffer' });
            const decompressed = await gunzipAsync(stdout);
            xmlData = decompressed.toString('utf-8');
        } else {
            const { stdout } = await execFileAsync('curl', args);
            xmlData = stdout;
        }

        const parser = new XmlParser();
        const xmlDoc = await parser.parseStringPromise(xmlData);
        const programmes = xmlDoc.tv.programme.map((p: any) => {
            return {
                channel: p.$.channel,
                title: p.title[0]._,
                description: p.desc ? p.desc[0]._ : '',
                start: parseXmltvDate(p.$.start),
                stop: parseXmltvDate(p.$.stop),
            };
        }).filter((p: any) => p.start && p.stop);
        const epgData = { programmes };
        epgCache.set(url, epgData);
        epgCacheTimestamps.set(url, Date.now());
        reply.send(epgData);
    } catch (error) {
        app.log.error(error); // Log detailed error for server-side debugging
        reply.code(500).send({ error: '获取节目单失败', details: '请检查网络连接或URL地址是否正确。' });
    }
});

app.get<{ Querystring: { url: string } }>('/proxy', async (request, reply) => {
  const { url } = request.query;
  if (!url) {
    reply.code(400).send({ error: 'url query parameter is required' });
    return;
  }

  try {
    // Forward important headers from the client to the target server
    const headers: Record<string, string> = {
      'User-Agent': request.headers['user-agent'] || userAgent, // Fallback to default UA
    };
    if (request.headers['referer']) {
      headers['Referer'] = request.headers['referer'];
    }

    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      headers: headers,
      proxy: false,
    });

    reply.header('Content-Type', response.headers['content-type']);
    reply.send(response.data);
  } catch (error) {
    app.log.error(error);
    if (error instanceof Error) {
        reply.code(502).send({ error: 'Failed to proxy stream', details: error.message });
    } else {
        reply.code(500).send({ error: 'Failed to proxy stream', details: 'An unknown error occurred' });
    }
  }
});

export default app;