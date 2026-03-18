export type ApiHealth = {
  name: string;
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
};