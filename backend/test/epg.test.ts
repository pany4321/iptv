import t from 'tap';
import nock from 'nock';
import { gzip } from 'zlib';
import { promisify } from 'util';
import app from '../src/app';

const gzipAsync = promisify(gzip);

// Sample XMLTV data
const xmltvSample = `
<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="My EPG Generator">
  <channel id="channel1.example.com">
    <display-name lang="en">Channel 1</display-name>
  </channel>
  <programme start="20251018120000 +0000" stop="20251018130000 +0000" channel="channel1.example.com">
    <title lang="en">The Morning Show</title>
    <desc lang="en">A daily news and talk show.</desc>
  </programme>
  <programme start="20251018130000 +0000" stop="20251018140000 +0000" channel="channel1.example.com">
    <title lang="en">Midday Report</title>
  </programme>
</tv>
`;

t.test('GET /epg - success case', async (t) => {
  const epgUrl = 'http://test.com/epg.xml';

  // Mock the external EPG service
  nock('http://test.com')
    .get('/epg.xml')
    .reply(200, xmltvSample);

  const response = await app.inject({
    method: 'GET',
    url: `/epg?url=${encodeURIComponent(epgUrl)}`,
  });

  t.equal(response.statusCode, 200, 'should return 200 OK');
  const body = response.json();
  t.ok(body.programmes, 'response should have a programmes property');
  t.equal(body.programmes.length, 2, 'should return two programmes');
  t.equal(body.programmes[0].title, 'The Morning Show', 'title should be correct');
  t.equal(body.programmes[0].start, '2025-10-18T12:00:00.000Z', 'start time should be correct UTC');
  t.equal(body.programmes[1].description, '', 'description should be empty string if not present');

  nock.cleanAll();
  t.end();
});

t.test('GET /epg - success case with .gz file', async (t) => {
    const epgUrl = 'http://test.com/epg.xml.gz';
    const compressedData = await gzipAsync(Buffer.from(xmltvSample, 'utf-8'));

    nock('http://test.com')
        .get('/epg.xml.gz')
        .reply(200, compressedData, { 'Content-Type': 'application/gzip' });

    const response = await app.inject({
        method: 'GET',
        url: `/epg?url=${encodeURIComponent(epgUrl)}`,
    });

    t.equal(response.statusCode, 200, 'should return 200 OK for gzipped file');
    const body = response.json();
    t.ok(body.programmes, 'gzipped response should have a programmes property');
    t.equal(body.programmes.length, 2, 'gzipped should return two programmes');
    t.equal(body.programmes[0].title, 'The Morning Show', 'gzipped title should be correct');

    nock.cleanAll();
    t.end();
});

t.test('GET /epg - caching case', async (t) => {
    const epgUrl = 'http://cached-test.com/epg.xml';

    const scope = nock('http://cached-test.com')
        .get('/epg.xml')
        .reply(200, xmltvSample);

    // First call - should hit the network
    await app.inject({
        method: 'GET',
        url: `/epg?url=${encodeURIComponent(epgUrl)}`,
    });

    t.ok(scope.isDone(), 'nock scope should be done after first call');

    // Second call - should be cached
    const response = await app.inject({
        method: 'GET',
        url: `/epg?url=${encodeURIComponent(epgUrl)}`,
    });

    t.equal(response.statusCode, 200, 'second call should return 200 OK');
    // Nock would throw an error if an unexpected call was made, so if we get here, it was cached.

    nock.cleanAll();
    t.end();
});

t.test('GET /epg - missing url query parameter', async (t) => {
  const response = await app.inject({
    method: 'GET',
    url: '/epg',
  });

  t.equal(response.statusCode, 400, 'should return 400 Bad Request');
  t.end();
});

t.test('GET /epg - fetch error', async (t) => {
  const epgUrl = 'http://error.com/epg.xml';

  nock('http://error.com')
    .get('/epg.xml')
    .reply(500);

  const response = await app.inject({
    method: 'GET',
    url: `/epg?url=${encodeURIComponent(epgUrl)}`,
  });

  t.equal(response.statusCode, 500, 'should return 500 Internal Server Error');
  nock.cleanAll();
  t.end();
});

t.test('GET /epg - parse error (invalid XML)', async (t) => {
    const epgUrl = 'http://invalid-xml.com/epg.xml';
  
    nock('http://invalid-xml.com')
      .get('/epg.xml')
      .reply(200, '<tv><programme></invalid></tv>');
  
    const response = await app.inject({
      method: 'GET',
      url: `/epg?url=${encodeURIComponent(epgUrl)}`,
    });
  
    t.equal(response.statusCode, 500, 'should return 500 on parse error');
    const body = response.json();
    t.equal(body.error, 'Failed to fetch or parse EPG data', 'should have correct error message');

    nock.cleanAll();
    t.end();
});