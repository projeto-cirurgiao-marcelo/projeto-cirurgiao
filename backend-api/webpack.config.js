module.exports = function (options) {
  return {
    ...options,
    externals: {
      sharp: 'commonjs sharp',
    },
  };
};
