'use strict';

const Router = require('koa-router');
const uuid = require('node-uuid');
const AWS = require('aws-sdk');

module.exports = function S3Router(options) {
  if (!options.bucket) {
    throw new Error('bucket is required.');
  }

  const s3Options = {};
  if (options.region) {
    s3Options.region = options.region;
  }
  if (options.signatureVersion) {
    s3Options.signatureVersion = options.signatureVersion;
  }
  if (options.accessKeyId) {
    s3Options.accessKeyId = options.accessKeyId;
  }
  if (options.secretAccessKey) {
    s3Options.secretAccessKey = options.secretAccessKey;
  }
  if (options.endpoint) {
    s3Options.endpoint = options.endpoint;
  }

  const s3 = new AWS.S3(s3Options);

  const router = new Router({
    prefix: options.prefix || '/s3'
  });

  if (options.enableRedirect) {
    /**
     * Redirects requests with a temporary signed URL, giving access
     * to GET an upload.
     */
    router.get('/uploads/:key', function* tempRedirect() {
      const self = this;

      const params = {
        Bucket: options.bucket,
        Key: this.params.key,
      };

      s3.getSignedUrl('getObject', params, function (err, url) {
        self.redirect(url);
      });
    });
  }

  /**
   * Returns an object with `signedUrl` and `publicUrl` properties that
   * give temporary access to PUT an object in an S3 bucket.
   */
  router.get('/sign', function * () {
    if (!this.query.objectName && !this.query.fileName) {
      this.throw(400, 'Either objectName or fileName is required as a query parameter');
    }
    if (!this.query.contentType) {
      this.throw(400, 'contentType is a required query parameter');
    }
    const self = this;
    let filename = this.query.fileName || this.query.objectName;
    if (options.randomizeFilename) {
      filename = uuid.v4() + '_' + filename;
    }
    const mimeType = this.query.contentType;

    // Set any custom headers
    if (options.headers) {
      this.set(options.headers);
    }

    const key = options.keyPrefix
      ? options.keyPrefix.replace(/\/$/, '') + '/' + filename
      : filename;

    const params = {
      Bucket: options.bucket,
      Key: key,
      Expires: 60,
      ContentType: mimeType,
      ACL: options.ACL || 'private'
    };

    s3.getSignedUrl('putObject', params, function(err, data) {
      if (err) {
        console.log('Error:'.concat(err,'.Data:',data,'.'));
        self.status = 500;
        self.body = 'Cannot create S3 signed URL';
        return;
      }

      self.body = {
        filename: filename,
        key: key,
        signedUrl: data,
      };

      if (options.enableRedirect) {
        self.body.publicUrl = '/s3/uploads/' + filename;
      }
    });
  });

  return router.routes();
}
