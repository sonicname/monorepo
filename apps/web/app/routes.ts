import {
  index,
  layout,
  type RouteConfig,
} from '@react-router/dev/routes';
import { buildGlobRouteConfig, type GlobModules } from 'modules-page-routing';

const globTree = import.meta.glob('./modules/**/pages/**/*.{tsx,ts}');
const moduleRoutes = buildGlobRouteConfig(globTree as GlobModules);

export default [
  layout('modules/__root.tsx', [
    index('modules/__homepage.tsx'),
    ...moduleRoutes,
  ]),
] satisfies RouteConfig;
