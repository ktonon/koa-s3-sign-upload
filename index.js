'use strict';

const Router = require('koa-router');
const uuid = require('uuid');
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

  const s3 = options.S3 ? options.S3 : new AWS.S3(s3Options);
  // Promisifier for the getSignedUrl call
  const getSignedUrlAsync = (command, params) => {
    return new Promise((resolve, reject) => {
      s3.getSignedUrl(command, params, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    });
  }

  const router = new Router({
    prefix: options.prefix || '/s3'
  });

  if (options.enableRedirect) {
    /**
     * Redirects requests with a temporary signed URL, giving access
     * to GET an upload.
     */
    router.get('/uploads/:key', async function tempRedirect(ctx) {
      const self = ctx;

      const params = {
        Bucket: options.bucket,
        Key: ctx.params.key,
      };
      try {
        self.redirect(await getSignedUrlAsync('getObject', params));
      } catch(err) {
        console.log(`Error: ${err}.`);
        self.status = err.status || 500;
        self.body = err.message || 'Getting signed for the object failed';
      }
    });
  }

  /**
   * Returns an object with `signedUrl` and `publicUrl` properties that
   * give temporary access to PUT an object in an S3 bucket.
   */
  router.get('/sign', async function(ctx) {
    if (!ctx.query.objectName && !ctx.query.fileName) {
      ctx.throw(400, 'Either objectName or fileName is required as a query parameter');
    }
    if (!ctx.query.contentType) {
      ctx.throw(400, 'contentType is a required query parameter');
    }
    const self = ctx;
    let filename = ctx.query.fileName || ctx.query.objectName;
    if (options.randomizeFilename) {
      filename = `${uuid.v4()}_${filename}`;
    }
    const mimeType = ctx.query.contentType;

    // Set any custom headers
    if (options.headers) {
      ctx.set(options.headers);
    }

    const key = options.keyPrefix
      ? `${options.keyPrefix.replace(/\/$/, '')}/${filename}`
      : filename;

    const params = {
      Bucket: options.bucket,
      Key: key,
      Expires: options.expires || 60,
      ContentType: mimeType,
      ACL: options.ACL || 'private'
    };

    try {
      const url = await getSignedUrlAsync('putObject', params);
      self.body = {
        filename: filename,
        key: key,
        signedUrl: url,
      };
  
      if (options.enableRedirect) {
        self.body.publicUrl = `/s3/uploads/${filename}`;
      }
    } catch(err) {
      console.log(`Error: ${err}.`);
      self.body = 'Cannot create S3 signed URL';
      self.status = 500;
    }
  });

  return router.routes();
}
