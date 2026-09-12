import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInitials } from '@/hooks/use-initials';
import { store as startConversation } from '@/routes/conversations';

export function NewConversationModal({ children }: PropsWithChildren) {
    const page = usePage();
    const teamMembers = page.props.teamMembers ?? [];
    const currentTeam = page.props.currentTeam;
    const getInitials = useInitials();

    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [startingId, setStartingId] = useState<number | null>(null);

    const filtered = teamMembers.filter((member) => {
        const needle = search.trim().toLowerCase();

        return (
            needle === '' ||
            member.name.toLowerCase().includes(needle) ||
            member.username.toLowerCase().includes(needle)
        );
    });

    const handleSelect = (memberId: number) => {
        if (!currentTeam || startingId !== null) {
            return;
        }

        setStartingId(memberId);

        router.post(
            startConversation(currentTeam.slug).url,
            { user_id: memberId },
            {
                onFinish: () => setStartingId(null),
                onSuccess: () => {
                    setOpen(false);
                    setSearch('');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nuevo chat</DialogTitle>
                    <DialogDescription>
                        Elige a alguien de tu equipo para empezar a
                        conversar.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                    <Input
                        autoFocus
                        placeholder="Buscar por nombre o usuario..."
                        className="pl-8"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <ScrollArea className="h-72">
                    <ul className="flex flex-col gap-1 pr-3">
                        {filtered.map((member) => (
                            <li key={member.id}>
                                <button
                                    type="button"
                                    disabled={startingId !== null}
                                    onClick={() => handleSelect(member.id)}
                                    className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors disabled:opacity-50"
                                >
                                    <Avatar className="size-8 shrink-0">
                                        {member.avatar && (
                                            <AvatarImage
                                                src={member.avatar}
                                                alt={member.name}
                                            />
                                        )}
                                        <AvatarFallback className="bg-[var(--sidebar-accent)] text-xs text-[var(--sidebar-accent-foreground)]">
                                            {getInitials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate font-medium">
                                            {member.name}
                                        </span>
                                        <span className="text-muted-foreground truncate text-xs">
                                            @{member.username}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}

                        {filtered.length === 0 && (
                            <p className="text-muted-foreground px-2 py-4 text-center text-sm">
                                No hay nadie en tu equipo con ese nombre.
                            </p>
                        )}
                    </ul>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
