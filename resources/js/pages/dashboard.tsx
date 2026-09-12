import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useInitials } from '@/hooks/use-initials';
import { dashboard } from '@/routes';
import { show as showMessage } from '@/routes/messages';
import type { DashboardInvitation } from '@/types';

type Props = {
    pendingInvitations?: DashboardInvitation[];
};

export default function Dashboard({ pendingInvitations = [] }: Props) {
    const page = usePage();
    const auth = page.props.auth;
    const currentTeam = page.props.currentTeam;
    const conversations = page.props.conversations ?? [];
    const getInitials = useInitials();
    const [showInvitations, setShowInvitations] = useState(
        pendingInvitations.length > 0,
    );

    const unreadTotal = conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );
    const recentConversations = conversations.slice(0, 6);

    return (
        <>
            <Head title="Inicio" />
            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-y-auto p-6">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Hola, {auth.user.name.split(' ')[0]}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {currentTeam
                            ? `Estás en ${currentTeam.name}${currentTeam.domain ? ` · ${currentTeam.domain}` : ''}`
                            : 'Elige un equipo para empezar.'}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-card rounded-xl border p-4">
                        <p className="text-muted-foreground text-xs">
                            Mensajes sin leer
                        </p>
                        <p className="text-3xl font-semibold">{unreadTotal}</p>
                    </div>
                    <div className="bg-card rounded-xl border p-4">
                        <p className="text-muted-foreground text-xs">
                            Conversaciones activas
                        </p>
                        <p className="text-3xl font-semibold">
                            {conversations.length}
                        </p>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <h2 className="mb-2 text-sm font-semibold">
                        Chats recientes
                    </h2>

                    {recentConversations.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Todavía no tienes conversaciones — usa el botón "+"
                            del sidebar para empezar una.
                        </p>
                    ) : (
                        <ul className="divide-y overflow-y-auto rounded-xl border">
                            {recentConversations.map((conversation) => (
                                <li key={conversation.id}>
                                    <Link
                                        href={
                                            currentTeam
                                                ? showMessage([
                                                      currentTeam.slug,
                                                      conversation.id,
                                                  ]).url
                                                : '#'
                                        }
                                        className="hover:bg-accent flex items-center gap-3 px-4 py-3 text-sm"
                                    >
                                        <Avatar className="size-8 shrink-0">
                                            {conversation.avatar && (
                                                <AvatarImage
                                                    src={conversation.avatar}
                                                    alt={conversation.name}
                                                />
                                            )}
                                            <AvatarFallback className="bg-[var(--sidebar-accent)] text-[10px] text-[var(--sidebar-accent-foreground)]">
                                                {getInitials(conversation.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">
                                                {conversation.name}
                                            </span>
                                            {conversation.lastMessageBody && (
                                                <span className="text-muted-foreground block truncate text-xs">
                                                    {
                                                        conversation.lastMessageBody
                                                    }
                                                </span>
                                            )}
                                        </span>
                                        {conversation.unreadCount > 0 && (
                                            <Badge
                                                variant="destructive"
                                                className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1 text-[10px]"
                                            >
                                                {conversation.unreadCount}
                                            </Badge>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}

Dashboard.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Inicio',
            href: props.currentTeam ? dashboard(props.currentTeam.slug) : '/',
        },
    ],
});
