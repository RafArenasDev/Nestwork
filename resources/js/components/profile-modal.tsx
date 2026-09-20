import { router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { LanguageToggle } from '@/components/language-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';
import { useLocale } from '@/hooks/use-locale';
import { update as updateProfile } from '@/routes/profile';
import { countries, states, cities } from '@/routes/geo';
import type { Auth } from '@/types';

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type PageProps = { auth: Auth };
type GeoOption = { id: number; name: string };

function GeoFields({
    countryId,
    stateId,
    cityId,
    onChangeCountry,
    onChangeState,
    onChangeCity,
}: {
    countryId: number | null;
    stateId: number | null;
    cityId: number | null;
    onChangeCountry: (id: number | null) => void;
    onChangeState: (id: number | null) => void;
    onChangeCity: (id: number | null) => void;
}) {
    const [countryOptions, setCountryOptions] = useState<GeoOption[]>([]);
    const [stateOptions, setStateOptions] = useState<GeoOption[]>([]);
    const [cityOptions, setCityOptions] = useState<GeoOption[]>([]);

    useEffect(() => {
        fetch(countries().url, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((data: { countries: GeoOption[] }) =>
                setCountryOptions(data.countries),
            )
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!countryId) {
            setStateOptions([]);

            return;
        }

        fetch(states({ query: { country_id: countryId } }).url, {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data: { states: GeoOption[] }) =>
                setStateOptions(data.states),
            )
            .catch(() => {});
    }, [countryId]);

    // El dataset de ciudades no trae `state_id` (siempre null) — sólo
    // se puede filtrar por país, no en cascada real desde el
    // departamento (aunque el campo de departamento sigue sirviendo
    // como dato propio, guardado aparte).
    useEffect(() => {
        if (!countryId) {
            setCityOptions([]);

            return;
        }

        fetch(cities({ query: { country_id: countryId } }).url, {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data: { cities: GeoOption[] }) =>
                setCityOptions(data.cities),
            )
            .catch(() => {});
    }, [countryId]);

    const toOptions = (list: GeoOption[]): ComboboxOption[] =>
        list.map((item) => ({ value: String(item.id), label: item.name }));

    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">
                    País
                </span>
                <Combobox
                    options={toOptions(countryOptions)}
                    value={countryId ? String(countryId) : ''}
                    onChange={(value) => {
                        onChangeCountry(value ? Number(value) : null);
                        onChangeState(null);
                        onChangeCity(null);
                    }}
                    placeholder="Elige un país…"
                    searchPlaceholder="Buscar país…"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">
                    Departamento / estado
                </span>
                <Combobox
                    options={toOptions(stateOptions)}
                    value={stateId ? String(stateId) : ''}
                    onChange={(value) => {
                        onChangeState(value ? Number(value) : null);
                        onChangeCity(null);
                    }}
                    placeholder={
                        countryId ? 'Elige uno…' : 'Elige un país primero'
                    }
                    searchPlaceholder="Buscar…"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">
                    Ciudad
                </span>
                <Combobox
                    options={toOptions(cityOptions)}
                    value={cityId ? String(cityId) : ''}
                    onChange={(value) =>
                        onChangeCity(value ? Number(value) : null)
                    }
                    placeholder={
                        countryId ? 'Elige una…' : 'Elige un país primero'
                    }
                    searchPlaceholder="Buscar…"
                />
            </div>
        </div>
    );
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
    const { auth } = usePage<PageProps>().props;
    const { t } = useLocale();
    const getInitials = useInitials();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const { data, setData, patch, processing, errors, recentlySuccessful } =
        useForm({
            name: auth.user.name,
            country_id: auth.user.country_id,
            state_id: auth.user.state_id,
            city_id: auth.user.city_id,
        });

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setUploading(true);
        router.post(
            '/settings/profile/avatar',
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setUploading(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-lg"
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{t.profileModal.title}</DialogTitle>
                    <DialogDescription>
                        {t.profileModal.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-4">
                    <Avatar className="size-16">
                        {auth.user.avatar && (
                            <AvatarImage
                                src={auth.user.avatar}
                                alt={auth.user.name}
                            />
                        )}
                        <AvatarFallback className="text-lg">
                            {getInitials(auth.user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1.5">
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-border/60 hover:bg-foreground/5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            {uploading ? 'Subiendo…' : 'Cambiar foto'}
                        </button>
                        <span className="text-muted-foreground text-[11px]">
                            JPG, PNG o WEBP · máx. 2 MB
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>
                </div>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        patch(updateProfile().url, { preserveScroll: true });
                    }}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor="profile-name"
                                className="text-muted-foreground text-xs font-medium"
                            >
                                {t.profileModal.name}
                            </label>
                            <input
                                id="profile-name"
                                type="text"
                                value={data.name}
                                onChange={(event) =>
                                    setData('name', event.target.value)
                                }
                                className="border-border/60 h-10 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus:border-[var(--accent-1)]"
                            />
                            {errors.name && (
                                <span className="text-xs text-red-500">
                                    {errors.name}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-muted-foreground text-xs font-medium">
                                {t.profileModal.email}
                            </label>
                            <div className="border-border/40 bg-foreground/5 text-muted-foreground flex h-10 items-center rounded-xl border px-3 text-sm">
                                {auth.user.email}
                            </div>
                        </div>
                    </div>

                    <GeoFields
                        countryId={data.country_id}
                        stateId={data.state_id}
                        cityId={data.city_id}
                        onChangeCountry={(id) => setData('country_id', id)}
                        onChangeState={(id) => setData('state_id', id)}
                        onChangeCity={(id) => setData('city_id', id)}
                    />

                    <div className="flex items-center justify-between gap-2 border-t border-[var(--border)]/50 pt-3">
                        <span className="text-sm font-medium">Idioma</span>
                        <LanguageToggle />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                        >
                            {t.common.cancel}
                        </button>
                        <div className="flex items-center gap-2">
                            {recentlySuccessful && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                    Guardado
                                </span>
                            )}
                            <button
                                type="submit"
                                disabled={processing}
                                className="bg-foreground text-background h-9 rounded-full px-5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-40"
                            >
                                {processing ? t.common.saving : t.common.save}
                            </button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
