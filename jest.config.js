module.exports = {
  testMatch: ['**/test/**/*.js'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
};
