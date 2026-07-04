const fs = require('fs');
const path = require('path');

const baseContent = fs.readFileSync(path.join(__dirname, 'src/locales/en/translation.json'), 'utf8');
const languages = ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa', 'or', 'as', 'ur'];

languages.forEach(lang => {
    const dir = path.join(__dirname, 'public/locales', lang);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const targetFile = path.join(dir, 'translation.json');

    // For existing translations, we keep them if they exist in src
    const srcFile = path.join(__dirname, 'src/locales', lang, 'translation.json');
    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, targetFile);
    } else {
        // Otherwise use English as a base for now to ensure keys are present
        fs.writeFileSync(targetFile, baseContent);
    }
});

console.log('Language files distributed to public/locales');
