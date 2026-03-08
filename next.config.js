/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['@solana/web3.js', 'bs58'],
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
            };
        }
        return config;
    },
};

module.exports = nextConfig;
