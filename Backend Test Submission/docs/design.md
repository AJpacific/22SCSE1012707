URL Shortener Microservice Design
Overview
This microservice provides URL shortening functionality with analytics, implemented using Node.js, Express, and MongoDB. It supports creating shortened URLs, redirecting to original URLs, and retrieving usage statistics.
Architecture

Components:
Express server for handling RESTful API requests.
MongoDB for persistent storage of URL mappings and click data.
Logging Middleware (from LoggingMiddleware/) for request and error logging to the Test Server.
Utility modules for shortcode generation and URL validation.


Data Flow:
POST /shorturls: Validates input, generates/stores shortcode, returns shortened URL.
GET /:shortcode: Looks up shortcode, logs click, redirects to original URL.
GET /shorturls/:shortcode: Retrieves URL metadata and click statistics.



Data Model

URL Collection (MongoDB):
shortcode: String, unique, indexed.
originalUrl: String, required.
createdAt: Date, default to current UTC time.
expiresAt: Date, calculated as createdAt + validity minutes.
clicks: Array of click objects:
timestamp: Date (UTC).
referrer: String (HTTP Referer or "direct").
location: String (country code from geo-IP).




Indexes: Unique index on shortcode for fast lookups and uniqueness.

Technology Choices

Node.js/Express: Lightweight, fast, and suitable for RESTful APIs.
MongoDB: NoSQL database for flexible JSON-like storage, ideal for click data arrays.
geoip-lite: Free library for coarse-grained geo-IP lookup (country codes).
Joi: Robust input validation for URLs and shortcodes.
nanoid: Generates unique, random shortcodes.
Jest/Supertest: For unit testing API endpoints.
dotenv: Manages environment variables.
axios: For sending logs to the Test Server.
Logging Middleware: Integrated with Test Server’s Log API.

Shortcode Generation

Uses nanoid to generate 6-character alphanumeric shortcodes (A-Z, a-z, 0-9).
Low collision probability due to large character set (~2.2M combinations).
Custom shortcodes are validated (alphanumeric, 5-10 chars) and checked for uniqueness.

Error Handling

Input validation with Joi (URL format, shortcode constraints).
HTTP status codes:
400: Invalid URL or shortcode.
404: Shortcode not found.
409: Shortcode collision.
410: Expired link.
500: Server errors.


All errors logged via Logging Middleware to the Test Server.

Scalability Considerations

MongoDB unique index on shortcode ensures fast lookups.
Stateless Express server supports horizontal scaling.
MongoDB supports sharding for large datasets.
Shortcode generation is collision-resistant.

Assumptions

HOSTNAME environment variable provides the base URL (e.g., localhost:3000).
Logging Middleware sends logs to the Test Server using ACCESS_TOKEN.
Geo-IP data available via geoip-lite (MaxMind GeoLite2 or similar).
Validity input is in minutes.
No authentication required for API endpoints.

Trade-offs

MongoDB vs. Redis: MongoDB chosen for persistence and flexible querying over Redis’s in-memory performance.
Shortcode Length: Fixed at 6 characters for brevity and uniqueness.
Geo-IP: Uses country codes for simplicity, avoiding complex mappings.
