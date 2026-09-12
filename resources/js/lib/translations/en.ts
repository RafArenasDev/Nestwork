export interface Dictionary {
    common: {
        cancel: string;
        save: string;
        saving: string;
        close: string;
        logOut: string;
    };
    nav: {
        dashboard: string;
    };
    userMenu: {
        profile: string;
        theme: string;
        language: string;
    };
    theme: {
        light: string;
        dark: string;
        system: string;
        switchToDark: string;
        switchToLight: string;
    };
    auth: {
        loginTitle: string;
        loginDescription: string;
        continueWithGoogle: string;
        signingIn: string;
        genericError: string;
    };
    profileModal: {
        title: string;
        description: string;
        name: string;
        email: string;
        updated: string;
    };
    terms: {
        title: string;
        description: string;
        linkLabel: string;
    };
}

const en: Dictionary = {
    common: {
        cancel: 'Cancel',
        save: 'Save',
        saving: 'Saving...',
        close: 'Close',
        logOut: 'Log out',
    },
    nav: {
        dashboard: 'Dashboard',
    },
    userMenu: {
        profile: 'Profile',
        theme: 'Theme',
        language: 'Language',
    },
    theme: {
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        switchToDark: 'Switch to dark theme',
        switchToLight: 'Switch to light theme',
    },
    auth: {
        loginTitle: 'Welcome to Nestwork',
        loginDescription: 'Sign in with your Google account to continue',
        continueWithGoogle: 'Continue with Google',
        signingIn: 'Signing in...',
        genericError: 'Something went wrong signing you in. Please try again.',
    },
    profileModal: {
        title: 'Profile',
        description: 'Update your name and email address.',
        name: 'Name',
        email: 'Email address',
        updated: 'Profile updated successfully',
    },
    terms: {
        title: 'Terms and Conditions of Use',
        description: 'Nestwork — terms of use for the service',
        linkLabel: 'Terms and Conditions',
    },
};

export default en;
