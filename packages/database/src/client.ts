import postgres from 'postgres';

export type DatabaseClient = ReturnType<typeof postgres>;
