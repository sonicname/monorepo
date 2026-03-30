// Manual mock for @monorepo/proto
// Provides the constant and re-exports interfaces as values are not needed at runtime.

export const AUTH_GRPC_SERVICE_NAME = 'AuthService';
export const AUTH_GRPC_PACKAGE_NAME = 'auth';
export const getAuthProtoPath = jest.fn().mockReturnValue('/mock/auth.proto');
