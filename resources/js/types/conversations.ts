export type ConversationKind = 'dm' | 'group_chat' | 'group' | 'channel';

export type ConversationSummary = {
    id: number;
    type: ConversationKind;
    name: string;
    avatar: string | null;
    otherUserId: number | null;
    presence: 'available' | 'away' | 'busy' | 'dnd' | 'offline' | null;
    statusEmoji: string | null;
    statusText: string | null;
    memberCount: number | null;
    lastMessageBody: string | null;
    lastMessageType:
        | 'text'
        | 'image'
        | 'video'
        | 'audio'
        | 'file'
        | 'code'
        | 'system'
        | 'call_log'
        | null;
    lastMessageAttachmentName: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    isMuted: boolean;
    isArchived: boolean;
    isFavorite: boolean;
    isCurrent: boolean;
};

export type AttachmentData = {
    id: number;
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    thumbnailUrl: string | null;
};

export type ReactionData = {
    emoji: string;
    userId: number;
    userName: string;
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
    replyToId: number | null;
    replyToUserName: string | null;
    replyToBody: string | null;
    status: 'sending' | 'sent' | 'read' | 'failed';
    attachments: AttachmentData[];
    reactions: ReactionData[];
    isForwarded: boolean;
    editableUntil: string | null;
    editsRemaining: number;
    isDeleted: boolean;
    isSaved: boolean;
};

export type ActiveConversation = {
    id: number;
    name: string;
    type: ConversationKind;
    avatar: string | null;
    otherUserId: number | null;
    presence: 'available' | 'away' | 'busy' | 'dnd' | 'offline' | null;
    statusEmoji: string | null;
    statusText: string | null;
    memberCount: number | null;
    /** Sólo relevante en group/channel — DM y minichat no tienen
     *  jerarquía (ConversationType::isFlatChat()). */
    isAdmin: boolean;
    isArchived: boolean;
    isMuted: boolean;
    viewerLastReadMessageId: number | null;
    pinnedMessageId: number | null;
};

export type TeamMemberOption = {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
    presence: 'available' | 'away' | 'busy' | 'dnd' | 'offline';
    statusEmoji: string | null;
    statusText: string | null;
};

export type SavedMessageSummary = {
    messageId: number;
    conversationId: number;
    conversationName: string;
    senderName: string;
    senderAvatar: string | null;
    excerpt: string;
    messageCreatedAt: string;
    savedAt: string;
    isMine: boolean;
};

export type ActivityItem = {
    id: string;
    type: 'reaction';
    conversationId: number;
    conversationName: string;
    messageId: number;
    messageExcerpt: string;
    actorName: string;
    actorAvatar: string | null;
    emoji: string | null;
    createdAt: string;
};
