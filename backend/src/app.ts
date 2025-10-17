import Fastify from 'fastify';
import axios from 'axios';
import { parse } from 'iptv-playlist-parser';
import cors from '@fastify/cors';

const app = Fastify({
  logger: true
});

app.register(cors, {
  origin: true,
});

// Declare a route
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

  try {
    const response = await axios.get(url, { proxy: false });
    const playlist = parse(response.data);
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
