import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const srcDir = path.resolve('src');
walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Match line starting with import (possibly with spaces) and referencing a .css file
    const regex = /^\s*import\s+['"][^'"]+\.css['"];?\s*$/gm;
    if (regex.test(content)) {
      console.log(`Commenting CSS imports in: ${filePath}`);
      const newContent = content.replace(regex, (match) => {
        return `// next-disabled: ${match.trim()}`;
      });
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
  }
});

console.log("All CSS imports commented successfully.");
