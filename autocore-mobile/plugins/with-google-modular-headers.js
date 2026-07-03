const { withPodfile } = require('@expo/config-plugins');

const MARKER = '# autocore-google-modular-headers';

/**
 * Google Sign-In / AppCheck pods need module maps when linked statically.
 * @see https://github.com/react-native-google-signin/google-signin/issues
 */
function withGoogleModularHeaders(config) {
  return withPodfile(config, (podfileConfig) => {
    const contents = podfileConfig.modResults.contents;
    if (contents.includes(MARKER)) {
      return podfileConfig;
    }

    podfileConfig.modResults.contents = contents.replace(
      /target 'AutoCore' do/,
      `target 'AutoCore' do\n  ${MARKER}\n  use_modular_headers!`,
    );

    return podfileConfig;
  });
}

module.exports = withGoogleModularHeaders;
