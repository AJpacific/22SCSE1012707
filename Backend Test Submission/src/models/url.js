const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  shortcode: { type: String, required: true, unique: true, index: true },
  originalUrl: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true },
  clicks: [{
    timestamp: { type: Date, default: () => new Date() },
    referrer: { type: String, default: 'direct' },
    location: { type: String, default: 'unknown' },
  }],
});

module.exports = mongoose.model('Url', urlSchema);
