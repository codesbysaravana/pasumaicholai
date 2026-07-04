import http from 'http';
import app from './app';
import { handleExpertChatUpgrade } from './chat/websocketServer.js';
import { handleCommunityUpgrade } from './community/realtime.gateway.js';
import { env } from './config/env.config.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { startCropPricingScheduler } from './modules/crop-pricing/crop-pricing.scheduler.js';

const PORT = env.PORT;

const server = http.createServer(app);

server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/ws/expert-chat/')) {
    handleExpertChatUpgrade(req, socket, head);
    return;
  }

  if (req.url?.startsWith('/ws/community')) {
    handleCommunityUpgrade(req, socket, head);
    return;
  }

  socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
  socket.destroy();
});

async function startServer(): Promise<void> {
  await connectDB();
  startCropPricingScheduler();

  server.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Closing server.`);

  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

startServer().catch((error) => {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : 'Unknown startup error',
  });
  process.exit(1);
});
