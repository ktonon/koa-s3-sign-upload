# koa-s3-sign-upload

Middleware for [Koa][] to sign AWS S3 upload requests.

Specifically, this middleware is designed to work with [react-s3-uploader][]. Credit is given to [@OKNoah][] for [PR #80][] from which this package is derived.

__Install__

```shell
$ npm install -S koa-s3-sign-upload
```

__Usage__

```js
const signS3 = require('koa-s3-sign-upload');

app.use(signS3({
  bucket: 'MyS3Bucket',

  // optional
  region: 'us-east-1',

  // optional (use for some amazon regions: frankfurt and others)
  signatureVersion: 'v4',

  // optional
  headers: { 'Access-Control-Allow-Origin': '*' },

  // this is default
  ACL: 'private',

  // optional. useful for s3-compatible APIs
  endpoint: 'https://rest.s3alternative.com',

  // optional. default is /s3. useful if you version your API endpoints
  prefix: '/v1/s3',
}));
```

This also provides another endpoint: GET /s3/img/(.*) and GET /s3/uploads/(.*). This will create a temporary URL that provides access to the uploaded file (which are uploaded privately by default). The request is then redirected to the URL, so that the image is served to the client.

__Access/Secret Keys__

The [aws-sdk][] must be configured with your account's Access Key and Secret Access Key. [There are a number of ways to provide these](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html), but setting up environment variables is the quickest. You just have to configure environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, and AWS automatically picks them up.

[@OKNoah]:https://github.com/OKNoah
[aws-sdk]:https://github.com/aws/aws-sdk-js
[Koa]:http://koajs.com/
[PR #80]:https://github.com/odysseyscience/react-s3-uploader/pull/80
[react-s3-uploader]:https://github.com/odysseyscience/react-s3-uploader
