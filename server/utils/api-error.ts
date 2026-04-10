/**
 * Standardized API error handling for user endpoints.
 *
 * Wraps Prisma errors into user-friendly HTTP responses.
 * Never exposes raw stack traces or internal details.
 */
import { Prisma } from '@prisma/client';

export function handleApiError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                throw createError({ statusCode: 409, message: 'Resource already exists' });
            case 'P2025':
                throw createError({ statusCode: 404, message: 'Resource not found' });
            default:
                console.error('[api] Prisma error:', error.code, error.message);
                throw createError({ statusCode: 500, message: 'Database error' });
        }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        console.error('[api] Prisma validation:', error.message);
        throw createError({ statusCode: 400, message: 'Invalid request data' });
    }

    console.error('[api] Unexpected error:', error);
    throw createError({ statusCode: 500, message: 'Internal server error' });
}
