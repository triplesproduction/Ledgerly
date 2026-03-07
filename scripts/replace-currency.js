const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;

    // Replace $ followed by numbers or spaces then numbers
    newContent = newContent.replace(/\$(\s*\d)/g, '₹$1');

    // Replace standalone $ in JSX text like >$< or > $ <
    newContent = newContent.replace(/>(\s*)\$(\s*)</g, '>$1₹$2<');

    // Replace $ used before JSX expressions like >${amount} or > ${amount}
    newContent = newContent.replace(/>(\s*)\$(\s*)\{/g, '>$1₹$2{');

    // Replace "$", '$', {"$"}
    newContent = newContent.replace(/"\$"/g, '"₹"');
    newContent = newContent.replace(/'\$'/g, "'₹'");
    newContent = newContent.replace(/\{\"\$\"\}/g, '{"₹"}');
    newContent = newContent.replace(/\{\'\$\'\}/g, "{'₹'}");

    // Replace prefix strings like prefix="$"
    newContent = newContent.replace(/prefix="\$"/g, 'prefix="₹"');

    // Replace $ used in template literals BEFORE a variable like `\$${amount}`
    // It's usually written as `\$${` in JS strings but just `$${` in template literal
    newContent = newContent.replace(/\$\$\{/g, '₹${');

    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        console.log(`Updated: ${file}`);
        changedFiles++;
    }
});

console.log(`Done. Changed ${changedFiles} files.`);
