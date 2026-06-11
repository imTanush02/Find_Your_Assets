const https = require('https');

const apiKey = 'XFi6uo7w8S68kbS1Q1d6byyw';
const imageUrl = 'https://images.unsplash.com/photo-1596727147705-611529e7e780?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400';

const payload = JSON.stringify({
  image_url: imageUrl,
  size: 'auto'
});

const req = https.request({
  hostname: 'api.remove.bg',
  path: '/v1.0/removebg',
  method: 'POST',
  family: 4,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent': 'FindYourAssets/1.0',
    'X-Api-Key': apiKey
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    if (res.statusCode >= 300) {
      console.log('Error Response:', buffer.toString());
    } else {
      console.log('Success! Received binary size:', buffer.length);
    }
  });
});

req.on('error', err => console.error('Request Error:', err));
req.setTimeout(30000, () => {
  console.log('Request Timed Out!');
  req.destroy();
});
req.write(payload);
req.end();
