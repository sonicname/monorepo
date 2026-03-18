export type ApiHealth = {
  name: string;
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
};

export type ProjectStatus = 'planned' | 'in-progress' | 'complete';

export type ProjectSummary = {
  id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  stack: string[];
  updatedAt: string;
};

export type ProjectsResponse = {
  items: ProjectSummary[];
  generatedAt: string;
};
