// Minimal test server - no dependencies on database or other services
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3008;

console.log('='.repeat(50));
console.log('MINIMAL TEST SERVER');
console.log('PORT:', PORT);
console.log('='.repeat(50));

app.get('/', (req, res) => {
  console.log('Root request received');
  res.json({ 
    status: 'success',
    message: 'Minimal test server is working!',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('Health check received');
  res.json({ status: 'ok', port: PORT });
});

app.get('/test', (req, res) => {
  console.log('Test endpoint received');
  res.json({ 
    test: 'passed',
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`✅ SERVER STARTED SUCCESSFULLY`);
  console.log(`✅ Listening on 0.0.0.0:${PORT}`);
  console.log(`✅ Try: http://localhost:${PORT}/`);
  console.log('='.repeat(50));
});

server.on('error', (err) => {
  console.error('SERVER ERROR:', err);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
