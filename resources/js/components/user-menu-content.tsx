import { Link, router } from '@inertiajs/react';
import { KeyRound, LogOut, SunMoon, UserRound } from 'lucide-react';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useLocale } from '@/hooks/use-locale';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import type { User } from '@/types';

type Props = {
    user: User;
    onOpenProfile: () => void;
    onOpenPassword: () => void;
};

/**
 * Los modales de Perfil/Contraseña NO viven acá: Radix desmonta
 * DropdownMenuContent (y todo lo que hay dentro) al cerrarse, así que si el
 * estado "open" viviera dentro de este componente, el modal se cerraría de
 * inmediato junto con el menú que lo abrió. Por eso reciben callbacks y el
 * estado real vive un nivel arriba (nav-user.tsx / app-header.tsx), mismo
 * patrón que Inventory-Manager.
 */
export function UserMenuContent({
    user,
    onOpenProfile,
    onOpenPassword,
}: Props) {
    const cleanup = useMobileNavigation();
    const { t } = useLocale();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem onClick={onOpenProfile}>
                    <UserRound className="mr-2" />
                    {t.userMenu.profile}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenPassword}>
                    <KeyRound className="mr-2" />
                    {t.userMenu.password}
                </DropdownMenuItem>
                {/* preventDefault en onSelect: sin esto Radix cierra el menú
                    apenas se hace click en el switch, antes de que se alcance
                    a ver el cambio aplicado. */}
                <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="justify-between"
                >
                    <span className="flex items-center gap-2">
                        <SunMoon className="mr-0" />
                        {t.userMenu.theme}
                    </span>
                    <ThemeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="justify-between"
                >
                    <span className="flex items-center gap-2">
                        {t.userMenu.language}
                    </span>
                    <LanguageToggle />
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    {t.common.logOut}
                </Link>
            </DropdownMenuItem>
        </>
    );
}
