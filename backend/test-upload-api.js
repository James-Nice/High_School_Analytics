const http = require('http');

// 测试 /api/scores/uploads 端点
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/scores/uploads',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

req.end();
