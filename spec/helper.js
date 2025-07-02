import { SpecReporter } from 'jasmine-spec-reporter';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
global.__dirname = __dirname;

jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.PARSE_SERVER_TEST_TIMEOUT || 50000;

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(new SpecReporter());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export {
  wait,
};
