import { Head, router, usePage } from '@inertiajs/react';
import {
    ArchiveBoxIcon,
    BellIcon,
    BookmarkIcon,
} from '@heroicons/react/24/outline';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { PresenceDot } from '@/components/presence-dot';
import {
    SWITCH_MODULE_EVENT,
    type RailModuleKey,
} from '@/components/curved-nav-rail';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { useLivePresence } from '@/hooks/use-live-presence';
import { dashboard } from '@/routes';
import { store as startConversation } from '@/routes/conversations';
import type { DashboardInvitation } from '@/types';
import type { TeamMemberOption } from '@/types/conversations';
import { useState } from 'react';

type Props = {
    pendingInvitations?: DashboardInvitation[];
};

const PRESENCE_LABEL: Record<TeamMemberOption['presence'], string> = {
    available: 'Disponible',
    away: 'Ausente',
    busy: 'Ocupado',
    dnd: 'No molestar',
    offline: 'Desconectado',
};

const QUICK_ACCESS: {
    key: RailModuleKey;
    label: string;
    description: string;
    icon: typeof BellIcon;
}[] = [
    {
        key: 'activity',
        label: 'Actividad',
        description: 'Novedades en tus conversaciones',
        icon: BellIcon,
    },
    {
        key: 'saved',
        label: 'Guardados',
        description: 'Mensajes que marcaste para después',
        icon: BookmarkIcon,
    },
    {
        key: 'archived',
        label: 'Archivo',
        description: 'Chats que sacaste de tu lista',
        icon: ArchiveBoxIcon,
    },
];

function switchModule(key: RailModuleKey): void {
    window.dispatchEvent(new CustomEvent(SWITCH_MODULE_EVENT, { detail: key }));
}

function TeammateRow({ member }: { member: TeamMemberOption }) {
    const getInitials = useInitials();
    const [starting, setStarting] = useState(false);
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const live = useLivePresence(member.id, member);

    const handleClick = () => {
        if (!currentTeam || starting) {
            return;
        }

        setStarting(true);
        router.post(
            startConversation(currentTeam.slug).url,
            { user_id: member.id },
            { onFinish: () => setStarting(false) },
        );
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={starting}
            className="hover:bg-foreground/5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 disabled:opacity-60"
        >
            <span className="relative shrink-0">
                <Avatar className="size-9">
                    {member.avatar && (
                        <AvatarImage src={member.avatar} alt={member.name} />
                    )}
                    <AvatarFallback className="bg-[var(--sidebar-accent)] text-[10px] text-[var(--sidebar-accent-foreground)]">
                        {getInitials(member.name)}
                    </AvatarFallback>
                </Avatar>
                <PresenceDot
                    presence={live.presence}
                    surfaceTone="var(--card)"
                />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                    {member.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                    {live.statusText
                        ? `${live.statusEmoji ?? ''} ${live.statusText}`.trim()
                        : PRESENCE_LABEL[live.presence]}
                </span>
            </span>
        </button>
    );
}

export default function Dashboard({ pendingInvitations = [] }: Props) {
    const page = usePage();
    const auth = page.props.auth;
    const currentTeam = page.props.currentTeam;
    const teamMembers = page.props.teamMembers ?? [];
    // Ni Slack ni Teams ponen un directorio completo del equipo en su
    // landing — acá sólo tiene sentido mostrar quién está activo AHORA
    // (información que de verdad cambia), nunca la lista entera con la
    // mayoría "Desconectado" (eso ya está, con búsqueda, en "Nuevo
    // chat"). Tope de 8: si hay más gente conectada que eso, ya no es
    // un vistazo rápido.
    const onlineMembers = teamMembers
        .filter((member) => member.presence !== 'offline')
        .slice(0, 8);
    const [showInvitations, setShowInvitations] = useState(
        pendingInvitations.length > 0,
    );

    return (
        <>
            <Head title="Inicio" />
            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />
            <div className="mx-auto flex h-full w-full max-w-2xl flex-1 flex-col gap-6 overflow-y-auto p-6">
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

                <div className="grid grid-cols-3 gap-3">
                    {QUICK_ACCESS.map(
                        ({ key, label, description, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => switchModule(key)}
                                className="hover:bg-foreground/5 flex flex-col items-start gap-2 rounded-xl px-3 py-3 text-left transition-colors duration-150"
                            >
                                <span className="bg-foreground/5 text-foreground flex size-9 items-center justify-center rounded-lg">
                                    <Icon
                                        className="size-4.5"
                                        strokeWidth={1.8}
                                    />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium">
                                        {label}
                                    </span>
                                    <span className="text-muted-foreground block truncate text-[11px]">
                                        {description}
                                    </span>
                                </span>
                            </button>
                        ),
                    )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <h2 className="mb-1 text-sm font-semibold">
                        En línea ahora
                    </h2>

                    {onlineMembers.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Nadie más de tu equipo está conectado en este
                            momento.
                        </p>
                    ) : (
                        <ul className="flex min-h-0 flex-col overflow-y-auto">
                            {onlineMembers.map((member) => (
                                <li key={member.id}>
                                    <TeammateRow member={member} />
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
