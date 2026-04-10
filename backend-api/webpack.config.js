module.exports = function (options) {
  return {
    ...options,
    externals: [
      // Preservar externals existentes do NestJS
      ...(Array.isArray(options.externals) ? options.externals : options.externals ? [options.externals] : []),
      // Modulos nativos C++ que nao podem ser bundlados
      function ({ request }, callback) {
        if (/^(sharp|bcrypt|@mapbox\/node-pre-gyp|mock-aws-s3|aws-sdk|nock)$/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
  };
};
