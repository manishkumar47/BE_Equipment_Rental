import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "tests/e2e"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://unit-tests-do-not-hit-a-real-db@localhost:5432/unused",
      JWT_SECRET: "unit_test_jwt_secret_placeholder",
      JWT_EXPIRES_IN: "1h",
      PASSWORD_RESET_EXPIRES_MINUTES: "15",
      FRONTEND_URL: "http://localhost:5173",
    },
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/service/**", "src/helpers/**", "src/api/validators/**", "src/util/appError.ts"],
    },
  },
});
