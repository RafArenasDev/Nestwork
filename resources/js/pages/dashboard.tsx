import { Head, Link, usePage } from '@inertiajs/react';
import { MessageCircle, MessagesSquare } from 'lucide-react';
import { useState } from 'react';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { PresenceDot } from '@/components/presence-dot';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useInitials } from '@/hooks/use-initials';
import { dashboard } from '@/routes';
import { show as showMessage } from '@/routes/messages';
import type { DashboardInvitation } from '@/types';

type Props = {
    pendingInvitations?: DashboardInvitation[];
};

/** "Hace 5 min" / "Hace 3 h" / "Ayer" / "12 sep" — sin librería de
 *  fechas, sólo lo que necesita esta lista (nunca más de unos días de
 *  antigüedad en "recientes"). */
function formatRelativeTime(iso: string): string {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) {
        return 'Ahora';
    }

    if (minutes < 60) {
        return `Hace ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `Hace ${hours} h`;
    }

    const days = Math.floor(hours / 24);

    if (days === 1) {
        return 'Ayer';
    }

    if (days < 7) {
        return `Hace ${days} d`;
    }

    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/** Misma tarjeta para las dos métricas — ícono en una placa tenue,
 *  número grande con tabular-nums (para que no "baile" el ancho si
 *  cambia en vivo) y la misma sombra en dos capas que ya usan las
 *  burbujas de mensaje (ver MessageBubble en messages/index.tsx), así
 *  el Home comparte el mismo material que el resto de la app en vez de
 *  quedar con el borde plano por defecto de shadcn. */
function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof MessageCircle;
    label: string;
    value: number;
}) {
    return (
        <div className="bg-card border-border/60 flex items-center gap-4 rounded-2xl border p-5 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.16)] transition-transform duration-150 ease-out hover:-translate-y-0.5 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_6px_18px_rgba(0,0,0,0.5)]">
            <span className="bg-foreground/5 text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
                <span className="text-muted-foreground block text-xs">
                    {label}
                </span>
                <span className="block text-3xl font-semibold tracking-tight tabular-nums">
                    {value}
                </span>
            </span>
        </div>
    );
}

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
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Hola, {auth.user.name.split(' ')[0]}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {currentTeam
                            ? `Estás en ${currentTeam.name}${currentTeam.domain ? ` · ${currentTeam.domain}` : ''}`
                            : 'Elige un equipo para empezar.'}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                        icon={MessageCircle}
                        label="Mensajes sin leer"
                        value={unreadTotal}
                    />
                    <StatCard
                        icon={MessagesSquare}
                        label="Conversaciones activas"
                        value={conversations.length}
                    />
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <h2 className="mb-3 text-sm font-semibold">
                        Chats recientes
                    </h2>

                    {recentConversations.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Todavía no tienes conversaciones — usa el botón "+"
                            del sidebar para empezar una.
                        </p>
                    ) : (
                        <ul className="flex min-h-0 flex-col overflow-y-auto">
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
                                        className="hover:bg-foreground/5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150"
                                    >
                                        <span className="relative shrink-0">
                                            <Avatar className="size-9">
                                                {conversation.avatar && (
                                                    <AvatarImage
                                                        src={
                                                            conversation.avatar
                                                        }
                                                        alt={conversation.name}
                                                    />
                                                )}
                                                <AvatarFallback className="bg-[var(--sidebar-accent)] text-[10px] text-[var(--sidebar-accent-foreground)]">
                                                    {getInitials(
                                                        conversation.name,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            {conversation.presence && (
                                                <PresenceDot
                                                    presence={
                                                        conversation.presence
                                                    }
                                                    surfaceTone="var(--card)"
                                                />
                                            )}
                                        </span>
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
                                        <span className="flex shrink-0 flex-col items-end gap-1">
                                            {conversation.lastMessageAt && (
                                                <span className="text-muted-foreground text-[11px]">
                                                    {formatRelativeTime(
                                                        conversation.lastMessageAt,
                                                    )}
                                                </span>
                                            )}
                                            {conversation.unreadCount > 0 && (
                                                <Badge
                                                    variant="destructive"
                                                    className="h-5 min-w-5 justify-center rounded-full bg-[oklch(0.577_0.245_27.325)] px-1 text-[10px] dark:bg-[oklch(0.577_0.245_27.325)]"
                                                >
                                                    {conversation.unreadCount}
                                                </Badge>
                                            )}
                                        </span>
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
