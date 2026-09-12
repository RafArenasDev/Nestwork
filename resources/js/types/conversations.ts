export type ConversationSummary = {
    id: number;
    type: 'dm' | 'group';
    name: string;
    avatar: string | null;
    presence: 'available' | 'away' | 'busy' | 'offline' | null;
    lastMessageBody: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    isMuted: boolean;
    isArchived: boolean;
    isCurrent: boolean;
};

export type MessageData = {
    id: number;
    body: string;
    createdAt: string;
    editedAt: string | null;
    userId: number;
    userName: string;
    userAvatar: string | null;
    isMine: boolean;
    status: 'sending' | 'sent' | 'read' | 'failed';
};

export type ActiveConversation = {
    id: number;
    name: string;
    type: 'dm' | 'group';
    avatar: string | null;
    otherUserId: number | null;
    presence: 'available' | 'away' | 'busy' | 'offline' | null;
    isArchived: boolean;
    isMuted: boolean;
};

export type TeamMemberOption = {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
};
