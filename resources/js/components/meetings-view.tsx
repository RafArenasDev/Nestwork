import { usePage } from '@inertiajs/react';
import {
    Calendar,
    Check,
    Mic,
    MicOff,
    Phone,
    PhoneOff,
    Users,
    Video,
    VideoOff,
    Volume2,
} from 'lucide-react';
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

type MeetingKind = 'audio' | 'video';

type MockMeeting = {
    id: number;
    name: string;
    kind: MeetingKind;
    recording: boolean;
    /** 'now' o una fecha/hora ISO cuando se programó para después. */
    when: string;
    participantIds: number[];
};

/**
 * Vista completa de "Reuniones" — sin backend todavía (WebRTC/SFU real
 * es infraestructura nueva grande, ver PENDING-WORK.md). Pedido
 * explícito: verla en mockup/data quemada antes de decidir qué
 * construir de verdad. Las reuniones que se crean acá viven sólo en
 * memoria de este componente (se pierden al recargar) — a propósito,
 * para no simular datos reales que después confundan con algo
 * persistido de verdad.
 */
export function MeetingsView() {
    const page = usePage();
    const teamMembers = page.props.teamMembers ?? [];
    const getInitials = useInitials();

    const [meetings, setMeetings] = useState<MockMeeting[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [activeCall, setActiveCall] = useState<MockMeeting | null>(null);

    const [name, setName] = useState('');
    const [kind, setKind] = useState<MeetingKind>('video');
    const [recording, setRecording] = useState(false);
    const [when, setWhen] = useState<'now' | 'later'>('now');
    const [scheduledAt, setScheduledAt] = useState('');
    const [participantIds, setParticipantIds] = useState<number[]>([]);

    const resetForm = () => {
        setName('');
        setKind('video');
        setRecording(false);
        setWhen('now');
        setScheduledAt('');
        setParticipantIds([]);
    };

    const handleCreate = () => {
        if (name.trim() === '') {
            return;
        }

        const meeting: MockMeeting = {
            id: Date.now(),
            name: name.trim(),
            kind,
            recording,
            when: when === 'now' ? 'now' : scheduledAt || 'later',
            participantIds,
        };

        setMeetings((previous) => [meeting, ...previous]);
        setCreateOpen(false);
        resetForm();

        if (when === 'now') {
            setActiveCall(meeting);
        }
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6 overflow-y-auto p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Reuniones
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Llamadas de voz y videollamadas — vista previa, sin
                        conexión real todavía.
                    </p>
                </div>
                <Dialog
                    open={createOpen}
                    onOpenChange={(next) => {
                        setCreateOpen(next);

                        if (!next) {
                            resetForm();
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button type="button">Nueva reunión</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nueva reunión</DialogTitle>
                            <DialogDescription>
                                Vista previa de cómo se va a configurar — al
                                confirmar todavía no conecta audio/video real.
                            </DialogDescription>
                        </DialogHeader>

                        <Input
                            autoFocus
                            placeholder="Nombre de la reunión"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={100}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setKind('audio')}
                                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                                    kind === 'audio'
                                        ? 'border-foreground bg-foreground/5'
                                        : 'border-border'
                                }`}
                            >
                                <Phone className="size-4" />
                                Audio
                            </button>
                            <button
                                type="button"
                                onClick={() => setKind('video')}
                                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                                    kind === 'video'
                                        ? 'border-foreground bg-foreground/5'
                                        : 'border-border'
                                }`}
                            >
                                <Video className="size-4" />
                                Video
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setWhen('now')}
                                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                                    when === 'now'
                                        ? 'border-foreground bg-foreground/5'
                                        : 'border-border'
                                }`}
                            >
                                Ahora
                            </button>
                            <button
                                type="button"
                                onClick={() => setWhen('later')}
                                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                                    when === 'later'
                                        ? 'border-foreground bg-foreground/5'
                                        : 'border-border'
                                }`}
                            >
                                Programar
                            </button>
                        </div>

                        {when === 'later' && (
                            <Input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(event) =>
                                    setScheduledAt(event.target.value)
                                }
                            />
                        )}

                        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                            <div className="pr-4">
                                <Label
                                    htmlFor="meeting-recording"
                                    className="text-sm font-medium"
                                >
                                    Grabar esta reunión
                                </Label>
                                <p className="text-muted-foreground text-xs">
                                    Vista previa del control — sin
                                    almacenamiento real todavía.
                                </p>
                            </div>
                            <Switch
                                id="meeting-recording"
                                checked={recording}
                                onCheckedChange={setRecording}
                            />
                        </div>

                        <div>
                            <p className="mb-1.5 text-sm font-medium">
                                Invitar
                            </p>
                            <ScrollArea className="h-36 rounded-lg border">
                                <ul className="flex flex-col gap-0.5 p-1.5">
                                    {teamMembers.map((member) => {
                                        const isSelected =
                                            participantIds.includes(member.id);

                                        return (
                                            <li key={member.id}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setParticipantIds(
                                                            (previous) =>
                                                                previous.includes(
                                                                    member.id,
                                                                )
                                                                    ? previous.filter(
                                                                          (
                                                                              id,
                                                                          ) =>
                                                                              id !==
                                                                              member.id,
                                                                      )
                                                                    : [
                                                                          ...previous,
                                                                          member.id,
                                                                      ],
                                                        )
                                                    }
                                                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                                                >
                                                    <Avatar className="size-6 shrink-0">
                                                        {member.avatar && (
                                                            <AvatarImage
                                                                src={
                                                                    member.avatar
                                                                }
                                                                alt={
                                                                    member.name
                                                                }
                                                            />
                                                        )}
                                                        <AvatarFallback className="text-[10px]">
                                                            {getInitials(
                                                                member.name,
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="flex-1 truncate">
                                                        {member.name}
                                                    </span>
                                                    {isSelected && (
                                                        <Check className="size-3.5 shrink-0 text-emerald-500" />
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </ScrollArea>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                disabled={name.trim() === ''}
                                onClick={handleCreate}
                            >
                                {when === 'now'
                                    ? 'Iniciar ahora'
                                    : 'Programar reunión'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {meetings.length === 0 ? (
                <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm">
                    <span className="bg-foreground/5 flex size-12 items-center justify-center rounded-full">
                        <Video className="size-6" strokeWidth={1.6} />
                    </span>
                    <p className="max-w-xs">
                        No tienes reuniones todavía. Crea una para ver cómo se
                        vería.
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {meetings.map((meeting) => (
                        <li
                            key={meeting.id}
                            className="border-border flex items-center gap-3 rounded-xl border px-4 py-3"
                        >
                            <span className="bg-foreground/5 flex size-10 shrink-0 items-center justify-center rounded-full">
                                {meeting.kind === 'video' ? (
                                    <Video className="size-4" />
                                ) : (
                                    <Phone className="size-4" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {meeting.name}
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                    {meeting.when === 'now' ? (
                                        'Iniciada ahora'
                                    ) : (
                                        <>
                                            <Calendar className="size-3" />
                                            {meeting.when}
                                        </>
                                    )}
                                    {meeting.recording && ' · Grabando'}
                                    {meeting.participantIds.length > 0 && (
                                        <>
                                            {' · '}
                                            <Users className="size-3" />
                                            {meeting.participantIds.length}
                                        </>
                                    )}
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setActiveCall(meeting)}
                            >
                                Unirse
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            {activeCall && (
                <MeetingCallMock
                    meeting={activeCall}
                    onClose={() => setActiveCall(null)}
                />
            )}
        </div>
    );
}

function MeetingCallMock({
    meeting,
    onClose,
}: {
    meeting: MockMeeting;
    onClose: () => void;
}) {
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="flex h-[560px] max-w-sm flex-col items-center justify-between overflow-hidden border-none bg-[linear-gradient(160deg,#1a1a2e,#16213e)] p-8 text-white sm:rounded-[28px] [&>button:last-child]:text-white/70 [&>button:last-child]:hover:bg-white/10 [&>button:last-child]:hover:text-white">
                <DialogTitle className="sr-only">{meeting.name}</DialogTitle>

                <div className="flex flex-col items-center gap-3 pt-6 text-center">
                    <span className="flex size-24 items-center justify-center rounded-full bg-white/10 text-2xl">
                        <Users className="size-9" />
                    </span>
                    <p className="text-lg font-semibold">{meeting.name}</p>
                    <p className="text-sm text-white/60">
                        {meeting.participantIds.length + 1} participantes —
                        vista previa
                        {meeting.recording && ' · Grabando'}
                    </p>
                </div>

                {meeting.kind === 'video' && (
                    <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-black/30 text-sm text-white/50">
                        {cameraOff
                            ? 'Cámara apagada'
                            : 'Tu video se vería acá — sin conexión real todavía'}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        aria-label={muted ? 'Activar micrófono' : 'Silenciar'}
                        onClick={() => setMuted((value) => !value)}
                        className={`flex size-12 items-center justify-center rounded-full transition-colors ${
                            muted ? 'bg-white text-black' : 'bg-white/15'
                        }`}
                    >
                        {muted ? (
                            <MicOff className="size-5" />
                        ) : (
                            <Mic className="size-5" />
                        )}
                    </button>
                    {meeting.kind === 'video' && (
                        <button
                            type="button"
                            aria-label={
                                cameraOff ? 'Encender cámara' : 'Apagar cámara'
                            }
                            onClick={() => setCameraOff((value) => !value)}
                            className={`flex size-12 items-center justify-center rounded-full transition-colors ${
                                cameraOff
                                    ? 'bg-white text-black'
                                    : 'bg-white/15'
                            }`}
                        >
                            {cameraOff ? (
                                <VideoOff className="size-5" />
                            ) : (
                                <Video className="size-5" />
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        aria-label="Altavoz"
                        className="flex size-12 items-center justify-center rounded-full bg-white/15"
                    >
                        <Volume2 className="size-5" />
                    </button>
                    <button
                        type="button"
                        aria-label="Colgar"
                        onClick={onClose}
                        className="flex size-12 items-center justify-center rounded-full bg-red-500 transition-transform active:scale-90"
                    >
                        <PhoneOff className="size-5" />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
