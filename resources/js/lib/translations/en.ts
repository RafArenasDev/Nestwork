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
        password: string;
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
        email: string;
        password: string;
        rememberMe: string;
        forgotPassword: string;
        logIn: string;
        noAccount: string;
        signUp: string;
    };
    profileModal: {
        title: string;
        description: string;
        name: string;
        email: string;
        updated: string;
    };
    passwordModal: {
        title: string;
        description: string;
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
        generate: string;
        mismatch: string;
        savePassword: string;
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
        password: 'Password',
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
        loginTitle: 'Log in to your account',
        loginDescription: 'Enter your email and password below to log in',
        email: 'Email address',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot password?',
        logIn: 'Log in',
        noAccount: "Don't have an account?",
        signUp: 'Sign up',
    },
    profileModal: {
        title: 'Profile',
        description: 'Update your name and email address.',
        name: 'Name',
        email: 'Email address',
        updated: 'Profile updated successfully',
    },
    passwordModal: {
        title: 'Password',
        description: 'Use a long, random password to keep your account secure.',
        currentPassword: 'Current password',
        newPassword: 'New password',
        confirmPassword: 'Confirm password',
        generate: 'Generate password',
        mismatch: 'Passwords do not match.',
        savePassword: 'Save password',
    },
    terms: {
        title: 'Terms and Conditions of Use',
        description: 'Nestwork — terms of use for the service',
        linkLabel: 'Terms and Conditions',
    },
};

export default en;
