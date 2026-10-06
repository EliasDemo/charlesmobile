// Config plugin for the Izipay (Lyra) payment SDK on iOS: its frameworks must be dynamic.
// Based on the official Expo example of @lyracom/react-native-sdk-payment-module.
const { withPodfile } = require('expo/config-plugins');

const DYNAMIC_FRAMEWORKS = ['LyraPaymentSDK', 'LyraMotion', 'LyraMaterial', 'SnapKit'];

const BLOCK = `
  lyra_dynamic_frameworks = ${JSON.stringify(DYNAMIC_FRAMEWORKS)}

  pre_install do |installer|
    installer.pod_targets.each do |pod|
      if lyra_dynamic_frameworks.include?(pod.name)
        def pod.dynamic_framework?; true; end
        def pod.build_type; Pod::BuildType.dynamic_framework; end
      end
    end
  end
`;

function withLyraPaymentSDK(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('lyra_dynamic_frameworks')) {
      contents = contents.includes('post_install do')
        ? contents.replace(/post_install do/m, `${BLOCK}\n  post_install do`)
        : `${contents}\n${BLOCK}`;
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withLyraPaymentSDK;
