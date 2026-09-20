import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';

/**
 * Vista previa visual de cómo se va a ver una llamada — sin backend
 * real todavía (WebRTC/SFU es infraestructura nueva grande, ver
 * PENDING-WORK.md). Pedido explícito: "esto debe estar así sea en
 * mockup o con data quemada mientras confirmo" — los controles cambian
 * de estado (mute/cámara) pero no conectan a nada real; "Colgar" sólo
 * cierra el diálogo.
 */
export function CallMockDialog({
    open,
    onOpenChange,
    type,
    contactName,
    contactAvatar,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: 'audio' | 'video';
    contactName: string;
    contactAvatar: string | null;
}) {
    const getInitials = useInitials();
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[560px] max-w-sm flex-col items-center justify-between overflow-hidden border-none bg-[linear-gradient(160deg,#1a1a2e,#16213e)] p-8 text-white sm:rounded-[28px] [&>button:last-child]:text-white/70 [&>button:last-child]:hover:bg-white/10 [&>button:last-child]:hover:text-white">
                <DialogTitle className="sr-only">
                    Llamada {type === 'video' ? 'de video' : 'de voz'} con{' '}
                    {contactName}
                </DialogTitle>

                <div className="flex flex-col items-center gap-3 pt-6">
                    <Avatar className="size-24 ring-4 ring-white/10">
                        {contactAvatar && (
                            <AvatarImage
                                src={contactAvatar}
                                alt={contactName}
                            />
                        )}
                        <AvatarFallback className="bg-white/10 text-2xl text-white">
                            {getInitials(contactName)}
                        </AvatarFallback>
                    </Avatar>
                    <p className="text-lg font-semibold">{contactName}</p>
                    <p className="text-sm text-white/60">
                        {type === 'video'
                            ? 'Videollamada — vista previa'
                            : 'Llamada de voz — vista previa'}
                    </p>
                </div>

                {type === 'video' && (
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
                    {type === 'video' && (
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
                        onClick={() => onOpenChange(false)}
                        className="flex size-12 items-center justify-center rounded-full bg-red-500 transition-transform active:scale-90"
                    >
                        <PhoneOff className="size-5" />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
