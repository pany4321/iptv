import Fastify from 'fastify';
import axios from 'axios';
import { parse as parsePlaylist } from 'iptv-playlist-parser';
import { Parser as XmlParser } from 'xml2js';
import cors from '@fastify/cors';
import { gunzip } from 'zlib';
import { promisify } from 'util';

const gunzipAsync = promisify(gunzip);

const app = Fastify({
  logger: true
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
        // Invalid date string format, return as is or handle error
        return new Date().toISOString(); // fallback to now
    }
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);
    const hours = parseInt(dateStr.substring(8, 10), 10);
    const minutes = parseInt(dateStr.substring(10, 12), 10);
    const seconds = parseInt(dateStr.substring(12, 14), 10);

    const date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

    // Handle timezone offset if present
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

app.get('/', async (request, reply) => {
  return { hello: 'world' }
});

interface PlaylistQuery {
  url: string;
}

app.get<{ Querystring: PlaylistQuery }>('/playlist', async (request, reply) => {
  const { url } = request.query;

  if (!url) {
    reply.code(400).send({ error: 'url query parameter is required' });
    return;
  }

  // --- BJYD Parser ---
  const parseBjydPlaylist = (data: string) => {
    const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
    const items = lines.map(line => {
      const parts = line.split(',');
      if (parts.length < 2) {
        return null;
      }
      const name = parts[0].trim();
      const url = parts.slice(1).join(',').trim(); // Join back in case URL contains commas

      if (!name || !url) {
        return null;
      }

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
    const response = await axios.get(url, { proxy: false });
    const playlistData: string = response.data;
    let playlist;

    // Detect playlist format
    if (typeof playlistData === 'string' && !playlistData.includes('#EXTM3U')) {
      app.log.info('BJYD-like format detected. Using custom parser.');
      playlist = parseBjydPlaylist(playlistData);
    } else {
      app.log.info('M3U format detected. Using iptv-playlist-parser.');
      playlist = parsePlaylist(playlistData);
    }
    
    reply.send(playlist.items);
  } catch (error) {
    app.log.error(error);
    if (error instanceof Error) {
        reply.code(500).send({ error: 'Failed to fetch or parse playlist', details: error.message });
    } else {
        reply.code(500).send({ error: 'Failed to fetch or parse playlist', details: 'An unknown error occurred' });
    }
  }
});

app.get<{ Querystring: { url: string } }>('/epg', async (request, reply) => {
    const { url } = request.query;

    if (!url) {
        reply.code(400).send({ error: 'url query parameter is required' });
        return;
    }

    // Check cache
    const cachedTimestamp = epgCacheTimestamps.get(url);
    if (cachedTimestamp && (Date.now() - cachedTimestamp < CACHE_DURATION)) {
        app.log.info(`Returning cached EPG for ${url}`);
        reply.send(epgCache.get(url));
        return;
    }

    try {
        app.log.info(`Fetching EPG from ${url}`);
        let xmlData: string;

        if (url.endsWith('.gz')) {
            const response = await axios.get(url, { proxy: false, responseType: 'arraybuffer' });
            const decompressed = await gunzipAsync(response.data);
            xmlData = decompressed.toString('utf-8');
        } else {
            const response = await axios.get(url, { proxy: false, responseType: 'text' });
            xmlData = response.data;
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
        }).filter((p: any) => p.start && p.stop); // Filter out invalid records

        const epgData = { programmes };

        // Store in cache
        epgCache.set(url, epgData);
        epgCacheTimestamps.set(url, Date.now());

        reply.send(epgData);

    } catch (error) {
        app.log.error(error);
        if (error instanceof Error) {
            reply.code(500).send({ error: 'Failed to fetch or parse EPG data', details: error.message });
        } else {
            reply.code(500).send({ error: 'Failed to fetch or parse EPG data', details: 'An unknown error occurred' });
        }
    }
});

app.get<{ Querystring: { url: string } }>('/proxy', async (request, reply) => {
  const { url } = request.query;

  if (!url) {
    reply.code(400).send({ error: 'url query parameter is required' });
    return;
  }

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer', // Download content as a buffer
      proxy: false,
    });

    // Set the original Content-Type and send the buffered data
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
