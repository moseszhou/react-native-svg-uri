module.exports = {
  testMatch: ['**/test/**/*.js', '**/test/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.worktrees/'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
};
