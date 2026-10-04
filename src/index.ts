import { config } from './config.js';
import { createApp } from './server.js';

createApp().listen(config.port, () => {
  console.log(`Startup Jury listening on http://localhost:${config.port}`);
});
