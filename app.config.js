const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
    if (IS_DEV) {
        return 'com.herutility.app.dev';
    }

    if (IS_PREVIEW) {
        return 'com.herutility.app.preview';
    }

    return 'com.herutility.app';
};

const getAppName = () => {
    if (IS_DEV) {
        return 'Her Utility (Dev)';
    }

    if (IS_PREVIEW) {
        return 'Her Utility (Preview)';
    }

    return 'Her Utility';
};


export default ({ config }) => ({
    ...config,
    name: getAppName(),
    ios: {
        ...config.ios,
        bundleIdentifier: getUniqueIdentifier(),
    },
    android: {
        ...config.android,
        package: getUniqueIdentifier(),
    },
});
