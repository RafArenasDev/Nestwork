import type { Dictionary } from './en';

const es: Dictionary = {
    common: {
        cancel: 'Cancelar',
        save: 'Guardar',
        saving: 'Guardando...',
        close: 'Cerrar',
        logOut: 'Cerrar sesión',
    },
    nav: {
        dashboard: 'Panel',
    },
    userMenu: {
        profile: 'Perfil',
        theme: 'Tema',
        language: 'Idioma',
    },
    theme: {
        light: 'Claro',
        dark: 'Oscuro',
        system: 'Sistema',
        switchToDark: 'Cambiar a tema oscuro',
        switchToLight: 'Cambiar a tema claro',
    },
    auth: {
        loginTitle: 'Bienvenido a Nestwork',
        loginDescription:
            'Inicia sesión con tu cuenta de Google para continuar',
        continueWithGoogle: 'Continuar con Google',
        signingIn: 'Iniciando sesión...',
        genericError: 'Algo salió mal al iniciar sesión. Intenta de nuevo.',
    },
    profileModal: {
        title: 'Perfil',
        description: 'Actualizá el nombre y correo electrónico de tu cuenta.',
        name: 'Nombre',
        email: 'Correo electrónico',
        updated: 'Perfil actualizado correctamente',
    },
    terms: {
        title: 'Términos y Condiciones de Uso',
        description: 'Nestwork — condiciones de uso del servicio',
        linkLabel: 'Términos y Condiciones',
    },
};

export default es;
