'use strict';

const Router = require('koa-router');
const uuid = require('node-uuid');
const AWS = require('aws-sdk');

const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_ENDPOINT = process.env.S3_ENDPOINT;

function checkTrailingSlash (path) {
  let newPath;

  if (path && path[path.length - 1] !== '/') {
    newPath = path + '/';
  }

  return newPath;
}

module.exports = function S3Router (options) {
  const S3_BUCKET = options.bucket;

  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET is required.');
  }

  const s3Options = {};
  if (options.region) {
    s3Options.region = options.region;
  }
  if (options.signatureVersion) {
    s3Options.signatureVersion = options.signatureVersion;
  }
  if (options.endpoint) {
    s3Options.endpoint = options.endpoint;
  }

  const s3 = new AWS.S3(Object.assign({
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    endpoint: S3_ENDPOINT
  }, s3Options));

  const router = new Router({
    prefix: options.prefix || '/s3'
  });

  /**
   * Redirects image requests with a temporary signed URL, giving access
   * to GET an upload.
   */
  function * tempRedirect() {
    const self = this;

    const params = {
      Bucket: S3_BUCKET,
      Key: options.key
    };

    s3.getSignedUrl('getObject', params, function (err, url) {
      self.redirect(url);
    });
  }

  /**
   * Image specific route.
   */
  router.get(/\/img\/(.*)/, tempRedirect);

  /**
   * Other file type(s) route.
   */
  router.get(/\/uploads\/(.*)/, tempRedirect);

  /**
   * Returns an object with `signedUrl` and `publicUrl` properties that
   * give temporary access to PUT an object in an S3 bucket.
   */
  router.get('/sign', function * () {
    const self = this;
    const filename = uuid.v4() + '_' + this.query.objectName;
    const mimeType = this.query.contentType;

    // Set any custom headers
    if (options.headers) {
      this.set(options.headers);
    }

    const params = {
      Bucket: S3_BUCKET,
      Key: checkTrailingSlash(options.key) + filename,
      Expires: 60,
      ContentType: mimeType,
      ACL: options.ACL || 'private'
    };

    s3.getSignedUrl('putObject', params, function (err, data) {
      if (err) {
        console.log(err);
        self.status = 500;
        self.body = 'Cannot create S3 signed URL';
      }

      self.body = {
        signedUrl: data,
        publicUrl: '/s3/uploads/' + filename,
        filename
      };
    });
  });

  return router.routes();
}
