import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth", "routes/auth.tsx"),
  route("logout", "routes/logout.tsx"),
  route("admin", "routes/admin.tsx"),
] satisfies RouteConfig;
