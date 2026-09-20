import { router, usePage } from '@inertiajs/react';
import { Check, Search } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInitials } from '@/hooks/use-initials';
import { store as startConversation } from '@/routes/conversations';

/** 1 persona elegida ⇒ DM al instante (mismo gesto rápido de siempre).
 *  2+ ⇒ hay que confirmar con un botón — arma un minichat nuevo, no un
 *  DM, así que conviene una pausa antes de crearlo (ver
 *  ConversationsController::store, que decide DM vs minichat por la
 *  cantidad de gente elegida). */
export function NewConversationModal({ children }: PropsWithChildren) {
    const page = usePage();
    const teamMembers = page.props.teamMembers ?? [];
    const currentTeam = page.props.currentTeam;
    const getInitials = useInitials();

    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const filtered = teamMembers.filter((member) => {
        const needle = search.trim().toLowerCase();

        return (
            needle === '' ||
            member.name.toLowerCase().includes(needle) ||
            member.username.toLowerCase().includes(needle)
        );
    });

    const reset = () => {
        setSearch('');
        setSelectedIds([]);
    };

    const startWith = (ids: number[]) => {
        if (!currentTeam || submitting || ids.length === 0) {
            return;
        }

        setSubmitting(true);

        router.post(
            startConversation(currentTeam.slug).url,
            ids.length === 1 ? { user_id: ids[0] } : { user_ids: ids },
            {
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setOpen(false);
                    reset();
                },
            },
        );
    };

    const toggleSelected = (memberId: number) => {
        setSelectedIds((previous) =>
            previous.includes(memberId)
                ? previous.filter((id) => id !== memberId)
                : [...previous, memberId],
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset();
                }
            }}
        >
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nuevo chat</DialogTitle>
                    <DialogDescription>
                        Elige a alguien de tu equipo para empezar a conversar, o
                        marca varias personas para armar un minichat.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                    <Input
                        autoFocus
                        placeholder="Buscar por nombre o usuario..."
                        className="rounded-full pl-8"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <ScrollArea className="h-72">
                    <ul className="flex flex-col gap-1 pr-3">
                        {filtered.map((member) => {
                            const isSelected = selectedIds.includes(member.id);

                            return (
                                <li key={member.id}>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => {
                                            // Nada elegido todavía: un tap
                                            // arranca el DM al instante, sin
                                            // pedir confirmación de más.
                                            if (selectedIds.length === 0) {
                                                startWith([member.id]);

                                                return;
                                            }

                                            toggleSelected(member.id);
                                        }}
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
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate font-medium">
                                                {member.name}
                                            </span>
                                            <span className="text-muted-foreground truncate text-xs">
                                                @{member.username}
                                            </span>
                                        </span>
                                        <span
                                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                                                isSelected
                                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                                    : 'border-border'
                                            }`}
                                        >
                                            {isSelected && (
                                                <Check className="size-3.5" />
                                            )}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}

                        {filtered.length === 0 && (
                            <p className="text-muted-foreground px-2 py-4 text-center text-sm">
                                No hay nadie en tu equipo con ese nombre.
                            </p>
                        )}
                    </ul>
                </ScrollArea>

                {selectedIds.length > 0 && (
                    <DialogFooter className="sm:justify-between">
                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="text-muted-foreground hover:text-foreground text-xs"
                        >
                            Cancelar selección
                        </button>
                        <Button
                            type="button"
                            disabled={submitting || selectedIds.length < 2}
                            onClick={() => startWith(selectedIds)}
                        >
                            {selectedIds.length < 2
                                ? 'Elige al menos una persona más'
                                : `Crear minichat con ${selectedIds.length} personas`}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
