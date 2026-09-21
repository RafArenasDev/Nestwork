export type User = {
    id: number;
    name: string;
    username: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    status_preset: 'available' | 'away' | 'busy' | 'dnd' | null;
    status_emoji: string | null;
    status_text: string | null;
    presence: 'available' | 'away' | 'busy' | 'dnd' | 'offline';
    read_receipts_enabled: boolean;
    country_id: number | null;
    state_id: number | null;
    city_id: number | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
