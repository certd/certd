module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/test/fixtures"],
  coveragePathIgnorePatterns: ["<rootDir>/test/"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs", isolatedModules: true }, diagnostics: { ignoreCodes: [151002] } }],
  },
};