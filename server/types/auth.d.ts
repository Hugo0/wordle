declare module '#auth-utils' {
    interface User {
        id: string;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        authProvider: 'google' | 'email' | 'passkey';
    }
}

export {};
