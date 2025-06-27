const axios = require('axios');

const logger = {
  async info(stack, pkg, message) {
    await logToTestServer('backend', 'info', pkg, message);
  },
  async error(stack, pkg, message) {
    await logToTestServer('backend', 'error', pkg, message);
  },
};

async function logToTestServer(stack, level, pkg, message) {
  try {
    const response = await axios.post(
      'http://20.244.56.144/evaluation-service/logs',
      { stack, level, package: pkg, message },
      { headers: { Authorization: `Bearer ${process.env.ACCESS_TOKEN}` } }
    );
    console.log(`Log created: ${response.data.logID}`);
  } catch (err) {
    console.error(`Failed to log to Test Server: ${err.message}`);
  }
}

module.exports = (req, res, next) => {
  req.logger = logger;
  const start = Date.now();
  res.on('finish', async () => {
    const duration = Date.now() - start;
    await logger.info('backend', 'middleware', `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
};
