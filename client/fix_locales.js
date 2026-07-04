const fs = require('fs');
const path = require('path');

const baseContent = fs.readFileSync(path.join(__dirname, 'src/locales/en/translation.json'), 'utf8');
const languages = ['te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa', 'or', 'as', 'ur'];

languages.forEach(lang => {
    const dir = path.join(__dirname, 'src/locales', lang);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const targetFile = path.join(dir, 'translation.json');

    // Use existing from public if it exists, else use baseContent
    const publicFile = path.join(__dirname, 'public/locales', lang, 'translation.json');
    if (fs.existsSync(publicFile)) {
        fs.copyFileSync(publicFile, targetFile);
    } else {
        fs.writeFileSync(targetFile, baseContent);
    }
});

console.log('Language files successfully created in src/locales');
