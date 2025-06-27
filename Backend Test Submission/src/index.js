const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const shortUrlRoutes = require('./routes/shorturls');
const loggerMiddleware = require('../../LoggingMiddleware/logger');
const { connectDB } = require('./config/db');

dotenv.config({ path: './.env' });
const app = express();

// Middleware
app.use(express.json());
app.use(loggerMiddleware);

// Routes
app.use('/', shortUrlRoutes);

// Start server
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
