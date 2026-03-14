
import https from 'https';

const url = 'https://mycbtplatform.cc/api';

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Server:', res.headers.server);
  console.log('Powered-By:', res.headers['x-powered-by']);

  res.on('data', (d) => {});
}).on('error', (e) => {
  console.error(e);
});
