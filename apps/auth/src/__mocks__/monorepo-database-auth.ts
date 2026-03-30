// Manual mock for @monorepo/database/auth
// Only exports the types/interfaces used by DatabaseService in tests.
// The actual DB implementation is always mocked via Test.createTestingModule providers.

export const createAuthDatabase = jest.fn();
export const closeAuthDatabase = jest.fn();
export const createUsersRepository = jest.fn();
export const createRefreshTokensRepository = jest.fn();
export const createAuditLogsRepository = jest.fn();
export const createVerificationTokensRepository = jest.fn();
