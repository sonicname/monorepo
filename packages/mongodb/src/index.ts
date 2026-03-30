import mongoose, { type Connection, type ConnectOptions } from 'mongoose';
import { getMongoUrl, type RuntimeEnv } from '@monorepo/config';

export type MongoInstance = {
  connection: Connection;
  uri: string;
};

/**
 * Create a Mongoose connection to MongoDB.
 */
export async function createMongoConnection(
  env: RuntimeEnv,
  options?: ConnectOptions,
): Promise<MongoInstance> {
  const uri = getMongoUrl(env);
  const conn = await mongoose.createConnection(uri, options).asPromise();
  return { connection: conn, uri };
}

/**
 * Close a Mongoose connection gracefully.
 */
export async function closeMongoConnection(
  instance: MongoInstance,
): Promise<void> {
  await instance.connection.close();
}

export { mongoose };
export { Schema, model, type Model, type Document } from 'mongoose';
export type { ConnectOptions } from 'mongoose';
