const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const shortUrlRoutes = require('../src/routes/shorturls');
const Url = require('../src/models/url');
const loggerMiddleware = require('../../../LoggingMiddleware/logger');
const { connectDB } = require('../src/config/db');

const app = express();
app.use(express.json());
app.use(loggerMiddleware);
app.use('/', shortUrlRoutes);

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Url.deleteMany({});
});

describe('Short URL API', () => {
  test('POST /shorturls creates a short URL', async () => {
    const response = await request(app)
      .post('/shorturls')
      .send({ url: 'https://example.com', validity: 30 })
      .expect(201);

    expect(response.body.shortLink).toMatch(/^https:\/\/localhost:3000\/\w{6}$/);
    expect(response.body.expiry).toBeDefined();
  });

  test('POST /shorturls with custom shortcode', async () => {
    const response = await request(app)
      .post('/shorturls')
      .send({ url: 'https://example.com', shortcode: 'custom1', validity: 30 })
      .expect(201);

    expect(response.body.shortLink).toBe('https://localhost:3000/custom1');
    expect(response.body.expiry).toBeDefined();
  });

  test('POST /shorturls with invalid URL', async () => {
    const response = await request(app)
      .post('/shorturls')
      .send({ url: 'invalid-url', validity: 30 })
      .expect(400);

    expect(response.body.error).toBe('Invalid URL format');
  });

  test('POST /shorturls with duplicate shortcode', async () => {
    await request(app)
      .post('/shorturls')
      .send({ url: 'https://example.com', shortcode: 'dupcode', validity: 30 })
      .expect(201);

    const response = await request(app)
      .post('/shorturls')
      .send({ url: 'https://another.com', shortcode: 'dupcode', validity: 30 })
      .expect(409);

    expect(response.body.error).toBe('Shortcode already in use');
  });

  test('GET /:shortcode redirects to original URL', async () => {
    const url = new Url({
      shortcode: 'abcd12',
      originalUrl: 'https://example.com',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    await url.save();

    const response = await request(app)
      .get('/abcd12')
      .expect(301);

    expect(response.header.location).toBe('https://example.com');
  });

  test('GET /:shortcode for expired URL', async () => {
    const url = new Url({
      shortcode: 'expired1',
      originalUrl: 'https://example.com',
      expiresAt: new Date(Date.now() - 1000),
    });
    await url.save();

    const response = await request(app)
      .get('/expired1')
      .expect(410);

    expect(response.body.error).toBe('Shortcode expired');
  });

  test('GET /shorturls/:shortcode returns stats', async () => {
    const url = new Url({
      shortcode: 'abcd12',
      originalUrl: 'https://example.com',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      clicks: [{ timestamp: new Date(), referrer: 'direct', location: 'US' }],
    });
    await url.save();

    const response = await request(app)
      .get('/shorturls/abcd12')
      .expect(200);

    expect(response.body).toMatchObject({
      shortcode: 'abcd12',
      originalUrl: 'https://example.com',
      totalClicks: 1,
      clicks: expect.arrayContaining([
        expect.objectContaining({ referrer: 'direct', location: 'US' }),
      ]),
    });
  });

  test('GET /shorturls/:shortcode for non-existent shortcode', async () => {
    const response = await request(app)
      .get('/shorturls/nonexistent')
      .expect(404);

    expect(response.body.error).toBe('Shortcode not found');
  });
});
