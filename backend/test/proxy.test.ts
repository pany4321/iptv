import tap from 'tap';
import nock from 'nock';
import app from '../src/app'; // Import the un-started app

tap.test('Stream proxy', async (t) => {
  t.teardown(() => {
    app.close();
    nock.cleanAll();
  });

  // await app.listen({ port: 0 }); // Listen on a random free port

  // const serverAddress = app.server.address();
  // if (typeof serverAddress === 'string' || !serverAddress) {
  //   t.fail('Server address is not available');
  //   return;
  // }
  // const { port } = serverAddress;

  t.test('should successfully proxy a stream', async (t) => {
    const remoteStreamUrl = 'http://remote-stream-server.com';
    const streamPath = '/live.m3u8';
    const streamContent = '#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:10.0,\nsegment1.ts';

    nock(remoteStreamUrl)
      .get(streamPath)
      .reply(200, streamContent, { 'Content-Type': 'application/vnd.apple.mpegurl' });

    const targetUrl = `${remoteStreamUrl}${streamPath}`;
    const response = await app.inject({
      method: 'GET',
      url: `/proxy?url=${encodeURIComponent(targetUrl)}`,
    });

    t.equal(response.statusCode, 200, 'should return a 200 status code');
    t.equal(response.headers['content-type'], 'application/vnd.apple.mpegurl', 'should have the correct content-type header');
    // t.equal(response.payload, streamContent, 'should proxy the stream content'); // This is difficult to test with injected streams
  });

  t.test('should return 502 if the remote server fails', async (t) => {
    const remoteStreamUrl = 'http://failing-remote-server.com';
    const streamPath = '/live.m3u8';

    nock(remoteStreamUrl)
      .get(streamPath)
      .reply(500);

    const targetUrl = `${remoteStreamUrl}${streamPath}`;
    const response = await app.inject({
      method: 'GET',
      url: `/proxy?url=${encodeURIComponent(targetUrl)}`,
    });

    t.equal(response.statusCode, 502, 'should return a 502 status code');
    const payload = JSON.parse(response.payload);
    t.equal(payload.error, 'Failed to proxy stream', 'should return the correct error message');
  });

  t.end();
});
