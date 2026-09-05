const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'react-native-screens', 'android', 'CMakeLists.txt');
if (fs.existsSync(file)) {
  let text = fs.readFileSync(file, 'utf8');
  const marker = 'target_link_options(rnscreens PRIVATE "-lc++_shared")';
  if (!text.includes(marker)) {
    text += `\n# Required for RN 0.81/NDK 27 standalone screens library linking.\n${marker}\n`;
    fs.writeFileSync(file, text);
  }
}
