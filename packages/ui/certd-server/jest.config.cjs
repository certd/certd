module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/test/fixtures"],
  coveragePathIgnorePatterns: ["<rootDir>/test/"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs", isolatedModules: true }, diagnostics: { ignoreCodes: [151002] } }],
  },
};
