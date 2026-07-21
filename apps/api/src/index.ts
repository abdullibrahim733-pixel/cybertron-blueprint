import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { readFileSync } from 'fs';
import { join } from 'path';
import { closeDb } from './db/pool.js';
import { resolvers } from './graphql/resolvers.js';
import { getContext, type GraphQLContext } from './graphql/context.js';

const PORT = parseInt(process.env.API_PORT || '4000', 10);

async function main() {
  const app = express();

  // Security middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.WEB_PORT ? `http://localhost:${process.env.WEB_PORT}` : true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  // Build GraphQL schema
  const typeDefs = readFileSync(
    join(__dirname, 'graphql', 'schema.graphql'),
    'utf-8'
  );

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    schema,
    introspection: true,
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => getContext(req),
    })
  );

  // Health check
  app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Cybertron API running at http://localhost:${PORT}/graphql`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await server.stop();
    closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
