"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const iptv_playlist_parser_1 = require("iptv-playlist-parser");
const xml2js_1 = require("xml2js");
const cors_1 = __importDefault(require("@fastify/cors"));
const zlib_1 = require("zlib");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const static_1 = __importDefault(require("@fastify/static"));
const child_process_1 = require("child_process");
const axios_1 = __importDefault(require("axios")); // Keep for proxy
const gunzipAsync = (0, util_1.promisify)(zlib_1.gunzip);
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const app = (0, fastify_1.default)({
    logger: true
});
// Serve frontend files
app.register(static_1.default, {
    root: path_1.default.join(__dirname, '..', '..', 'frontend', 'dist'),
});
// SPA fallback
app.setNotFoundHandler((req, reply) => {
    reply.sendFile('index.html');
});
app.register(cors_1.default, {
    origin: true,
});
// --- EPG Cache ---
const epgCache = new Map();
const epgCacheTimestamps = new Map();
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
// --- Helper Functions ---
function parseXmltvDate(dateStr) {
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
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
app.get('/playlist', async (request, reply) => {
    const { url } = request.query;
    if (!url) {
        reply.code(400).send({ error: 'url query parameter is required' });
        return;
    }
    const parseBjydPlaylist = (data) => {
        const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
        const items = lines.map(line => {
            const parts = line.split(',');
            if (parts.length < 2)
                return null;
            const name = parts[0].trim();
            const url = parts.slice(1).join(',').trim();
            if (!name || !url)
                return null;
            return {
                name: name,
                url: url,
                tvg: { id: '', name: name, logo: '', url: '', rec: '' },
                group: { title: 'Default' },
            };
        }).filter((item) => item !== null);
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
        const playlistData = stdout;
        let playlist;
        if (typeof playlistData === 'string' && !playlistData.includes('#EXTM3U')) {
            app.log.info('BJYD-like format detected. Using custom parser.');
            playlist = parseBjydPlaylist(playlistData);
        }
        else {
            app.log.info('M3U format detected. Using iptv-playlist-parser.');
            playlist = (0, iptv_playlist_parser_1.parse)(playlistData);
        }
        reply.send(playlist.items);
    }
    catch (error) {
        app.log.error(error); // Log detailed error for server-side debugging
        reply.code(500).send({ error: '获取播放列表失败', details: '请检查网络连接或URL地址是否正确。' });
    }
});
app.get('/epg', async (request, reply) => {
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
        let xmlData;
        if (url.endsWith('.gz')) {
            const { stdout } = await execFileAsync('curl', args, { encoding: 'buffer' });
            const decompressed = await gunzipAsync(stdout);
            xmlData = decompressed.toString('utf-8');
        }
        else {
            const { stdout } = await execFileAsync('curl', args);
            xmlData = stdout;
        }
        const parser = new xml2js_1.Parser();
        const xmlDoc = await parser.parseStringPromise(xmlData);
        const programmes = xmlDoc.tv.programme.map((p) => {
            return {
                channel: p.$.channel,
                title: p.title[0]._,
                description: p.desc ? p.desc[0]._ : '',
                start: parseXmltvDate(p.$.start),
                stop: parseXmltvDate(p.$.stop),
            };
        }).filter((p) => p.start && p.stop);
        const epgData = { programmes };
        epgCache.set(url, epgData);
        epgCacheTimestamps.set(url, Date.now());
        reply.send(epgData);
    }
    catch (error) {
        app.log.error(error); // Log detailed error for server-side debugging
        reply.code(500).send({ error: '获取节目单失败', details: '请检查网络连接或URL地址是否正确。' });
    }
});
app.get('/proxy', async (request, reply) => {
    const { url } = request.query;
    if (!url) {
        reply.code(400).send({ error: 'url query parameter is required' });
        return;
    }
    try {
        const response = await (0, axios_1.default)({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            proxy: false,
        });
        reply.header('Content-Type', response.headers['content-type']);
        reply.send(response.data);
    }
    catch (error) {
        app.log.error(error);
        if (error instanceof Error) {
            reply.code(502).send({ error: 'Failed to proxy stream', details: error.message });
        }
        else {
            reply.code(500).send({ error: 'Failed to proxy stream', details: 'An unknown error occurred' });
        }
    }
});
exports.default = app;
