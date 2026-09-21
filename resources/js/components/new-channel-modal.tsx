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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useInitials } from '@/hooks/use-initials';
import { store as createChannel } from '@/routes/channels';

/** "Canal" — sólo el admin/creador publica en la línea principal
 *  (`ConversationType::restrictsTopLevelPostingToAdmin`, forzado en el
 *  backend); el resto responde a lo publicado. Público: cualquiera del
 *  equipo se puede unir solo después (`ListDiscoverableChannelsForUser`) —
 *  agregar gente acá es opcional, no obligatorio como en un grupo. */
export function NewChannelModal({ children }: PropsWithChildren) {
    const page = usePage();
    const teamMembers = page.props.teamMembers ?? [];
    const currentTeam = page.props.currentTeam;
    const getInitials = useInitials();

    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
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
        setName('');
        setDescription('');
        setIsPublic(true);
        setSelectedIds([]);
    };

    const handleSubmit = () => {
        if (!currentTeam || submitting || name.trim() === '') {
            return;
        }

        setSubmitting(true);

        router.post(
            createChannel(currentTeam.slug).url,
            {
                name: name.trim(),
                description: description.trim() || null,
                is_public: isPublic,
                member_ids: selectedIds,
            },
            {
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setOpen(false);
                    reset();
                },
            },
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
                    <DialogTitle>Nuevo canal</DialogTitle>
                    <DialogDescription>
                        Sólo tú vas a poder publicar en la línea principal — el
                        resto responde en las publicaciones.
                    </DialogDescription>
                </DialogHeader>

                <Input
                    autoFocus
                    placeholder="Nombre del canal"
                    className="rounded-full"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                />

                <Input
                    placeholder="Descripción (opcional)"
                    className="rounded-full"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={500}
                />

                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div className="pr-4">
                        <Label
                            htmlFor="channel-public"
                            className="text-sm font-medium"
                        >
                            Público
                        </Label>
                        <p className="text-muted-foreground text-xs">
                            Cualquiera del equipo lo puede encontrar y unirse
                            solo, sin invitación.
                        </p>
                    </div>
                    <Switch
                        id="channel-public"
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                    />
                </div>

                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                    <Input
                        placeholder="Agregar gente ahora (opcional)..."
                        className="rounded-full pl-8"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <ScrollArea className="h-48">
                    <ul className="flex flex-col gap-1 pr-3">
                        {filtered.map((member) => {
                            const isSelected = selectedIds.includes(member.id);

                            return (
                                <li key={member.id}>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() =>
                                            setSelectedIds((previous) =>
                                                previous.includes(member.id)
                                                    ? previous.filter(
                                                          (id) =>
                                                              id !== member.id,
                                                      )
                                                    : [...previous, member.id],
                                            )
                                        }
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
                    </ul>
                </ScrollArea>

                <DialogFooter>
                    <Button
                        type="button"
                        disabled={submitting || name.trim() === ''}
                        onClick={handleSubmit}
                    >
                        Crear canal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
