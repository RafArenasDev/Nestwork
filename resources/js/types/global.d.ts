import type { Auth } from '@/types/auth';
import type {
    ActivityItem,
    ConversationSummary,
    SavedMessageSummary,
    TeamMemberOption,
} from '@/types/conversations';
import type { StatusPresetOption } from '@/types/status';
import type { Team } from '@/types/teams';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            appearance: 'light' | 'dark' | 'system';
            currentTeam: Team | null;
            teams: Team[];
            conversations: ConversationSummary[];
            archivedConversations: ConversationSummary[];
            groupConversations: ConversationSummary[];
            channelConversations: ConversationSummary[];
            discoverableChannels: ConversationSummary[];
            favoriteConversations: ConversationSummary[];
            savedMessages: SavedMessageSummary[];
            activityItems: ActivityItem[];
            teamMembers: TeamMemberOption[];
            presencePresets: StatusPresetOption[];
            statusPresets: StatusPresetOption[];
            [key: string]: unknown;
        };
    }
}
