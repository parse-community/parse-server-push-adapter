import js from "@eslint/js";

export default [
  js.configs.recommended,
  { ignores: ['lib/**/*'] },
  {
    languageOptions: {
      globals: {
        __dirname: true,
        beforeEach: true,
        Buffer: true,
        console: true,
        describe: true,
        fail: true,
        expect: true,
        global: true,
        it: true,
        jasmine: true,
        module: true,
        process: true,
        require: true,
        spyOn: true,
      },
    },
    rules: {
      "indent": ["error", 2],
      "linebreak-style": ["error", "unix"],
      "no-trailing-spaces": 2,
      "eol-last": 2,
      "space-in-parens": ["error", "never"],
      "no-multiple-empty-lines": 1,
      "prefer-const": "error",
      "space-infix-ops": "error",
      "no-useless-escape": "off",
      "no-var": "error",
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-prototype-builtins": "off",
    }
  }
];
