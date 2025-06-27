const express = require('express');
const Joi = require('joi');
const geoip = require('geoip-lite');
const Url = require('../models/url');
const { generateShortcode } = require('../utils/shortcode');
const { validateUrl } = require('../utils/validator');
const router = express.Router();

// Validation schema for POST /shorturls
const createUrlSchema = Joi.object({
  url: Joi.string().uri().required(),
  validity: Joi.number().integer().min(1).optional(),
  shortcode: Joi.string().alphanum().min(5).max(10).optional(),
});

// POST /shorturls
router.post('/shorturls', async (req, res) => {
  const { error } = createUrlSchema.validate(req.body);
  if (error) {
    await req.logger.error('backend', 'route', `Invalid input: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }

  const { url, validity = 30, shortcode } = req.body;

  if (!validateUrl(url)) {
    await req.logger.error('backend', 'route', 'Invalid URL format');
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  let finalShortcode = shortcode || (await generateShortcode());
  try {
    const existingUrl = await Url.findOne({ shortcode: finalShortcode });
    if (existingUrl) {
      await req.logger.error('backend', 'db', `Shortcode ${finalShortcode} already in use`);
      return res.status(409).json({ error: 'Shortcode already in use' });
    }

    const expiresAt = new Date(Date.now() + validity * 60 * 1000);
    const newUrl = new Url({
      shortcode: finalShortcode,
      originalUrl: url,
      expiresAt,
    });

    await newUrl.save();
    await req.logger.info('backend', 'route', `Created short URL: ${finalShortcode}`);
    res.status(201).json({
      shortLink: `https://${process.env.HOSTNAME}/${finalShortcode}`,
      expiry: expiresAt.toISOString(),
    });
  } catch (err) {
    await req.logger.error('backend', 'db', `Error creating short URL: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /shorturls/:shortcode
router.get('/shorturls/:shortcode', async (req, res) => {
  try {
    const url = await Url.findOne({ shortcode: req.params.shortcode });
    if (!url) {
      await req.logger.error('backend', 'db', `Shortcode ${req.params.shortcode} not found`);
      return res.status(404).json({ error: 'Shortcode not found' });
    }
    if (url.expiresAt < new Date()) {
      await req.logger.error('backend', 'db', `Shortcode ${req.params.shortcode} expired`);
      return res.status(410).json({ error: 'Shortcode expired' });
    }

    await req.logger.info('backend', 'route', `Retrieved stats for shortcode: ${req.params.shortcode}`);
    res.status(200).json({
      shortcode: url.shortcode,
      originalUrl: url.originalUrl,
      shortLink: `https://${process.env.HOSTNAME}/${url.shortcode}`,
      createdAt: url.createdAt.toISOString(),
      expiry: url.expiresAt.toISOString(),
      totalClicks: url.clicks.length,
      clicks: url.clicks.map(click => ({
        timestamp: click.timestamp.toISOString(),
        referrer: click.referrer,
        location: click.location,
      })),
    });
  } catch (err) {
    await req.logger.error('backend', 'db', `Error retrieving stats: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:shortcode
router.get('/:shortcode', async (req, res) => {
  try {
    const url = await Url.findOne({ shortcode: req.params.shortcode });
    if (!url) {
      await req.logger.error('backend', 'db', `Shortcode ${req.params.shortcode} not found`);
      return res.status(404).json({ error: 'Shortcode not found' });
    }
    if (url.expiresAt < new Date()) {
      await req.logger.error('backend', 'db', `Shortcode ${req.params.shortcode} expired`);
      return res.status(410).json({ error: 'Shortcode expired' });
    }

    // Log click
    const ip = req.ip || '127.0.0.1';
    const geo = geoip.lookup(ip) || { country: 'unknown' };
    url.clicks.push({
      timestamp: new Date(),
      referrer: req.get('Referer') || 'direct',
      location: geo.country,
    });
    await url.save();

    await req.logger.info('backend', 'route', `Redirecting for shortcode: ${req.params.shortcode}`);
    res.redirect(301, url.originalUrl);
  } catch (err) {
    await req.logger.error('backend', 'db', `Error redirecting: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
