const { withAndroidManifest, withDangerousMods } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="false">192.168.0.166</domain>
        <trust-anchors>
            <certificates src="@raw/logbook_api"/>
        </trust-anchors>
    </domain-config>
</network-security-config>
`;

const withNetworkSecurity = (config) => {
    config = withAndroidManifest(config, (config) => {
        const app = config.modResults.manifest.application[0];
        app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
        return config;
    });

    config = withDangerousMods(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const platformRoot = config.modRequest.platformProjectRoot;

            const rawDir = path.join(platformRoot, 'app/src/main/res/raw');
            fs.mkdirSync(rawDir, { recursive: true });
            fs.copyFileSync(
                path.join(projectRoot, 'logbook-api.crt'),
                path.join(rawDir, 'logbook_api.crt')
            );

            const xmlDir = path.join(platformRoot, 'app/src/main/res/xml');
            fs.mkdirSync(xmlDir, { recursive: true });
            fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), NETWORK_SECURITY_XML);

            return config;
        },
    ]);

    return config;
};

module.exports = withNetworkSecurity;
