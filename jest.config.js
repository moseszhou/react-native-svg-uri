module.exports = {
  testMatch: ['**/test/**/*.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.worktrees/'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
};
