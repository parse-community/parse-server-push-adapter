import { SpecReporter } from 'jasmine-spec-reporter';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
global.__dirname = __dirname;

jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.PARSE_SERVER_TEST_TIMEOUT || 5000;

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(new SpecReporter());
