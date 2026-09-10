import TermsContent from '@/components/terms-content';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/use-locale';

interface TermsAndConditionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Vista de solo lectura de los Términos y Condiciones, enlazada desde el pie
 * del login para consulta libre — no exige checks ni bloquea nada. Mismo
 * patrón que Inventory-Manager: un paso de aceptación obligatoria post-login
 * (con checks) es un incremento aparte, todavía no construido acá.
 */
export default function TermsAndConditionsModal({
    open,
    onOpenChange,
}: TermsAndConditionsModalProps) {
    const { t } = useLocale();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>{t.terms.title}</DialogTitle>
                <DialogDescription>{t.terms.description}</DialogDescription>

                <TermsContent />
            </DialogContent>
        </Dialog>
    );
}
