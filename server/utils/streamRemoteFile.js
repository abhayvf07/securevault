const http = require('http');
const https = require('https');
const { URL } = require('url');

const streamRemoteFile = (fileUrl, res, filename) => {
  return new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(fileUrl);
    } catch (error) {
      return reject(new Error('Invalid remote file URL'));
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;
    const request = client.get(parsedUrl, (remoteRes) => {
      if (remoteRes.statusCode !== 200) {
        return reject(new Error(`Remote file request failed with status ${remoteRes.statusCode}`));
      }

      const contentType = remoteRes.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      remoteRes.pipe(res);

      remoteRes.on('end', resolve);
      remoteRes.on('error', reject);
    });

    request.on('error', reject);
  });
};

module.exports = { streamRemoteFile };