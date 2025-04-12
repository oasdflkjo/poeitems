const fs = require('fs');
const path = require('path');

// Path to PoE2 items data
const POE_ITEMS_PATH = path.join(__dirname, 'PathOfBuilding-PoE2', 'src', 'Data', 'Bases');

function extractItems() {
    const items = {};
    
    try {
        const files = fs.readdirSync(POE_ITEMS_PATH);
        
        files.forEach(file => {
            if (!file.endsWith('.lua')) return;
            
            const baseType = file.replace('.lua', '');
            const content = fs.readFileSync(path.join(POE_ITEMS_PATH, file), 'utf8');
            const itemsInFile = parseFile(content, baseType);
            
            // Add items to their respective categories
            itemsInFile.forEach(item => {
                const category = item.subType || baseType;
                if (!items[category]) {
                    items[category] = [];
                }
                items[category].push(item);
            });
        });
        
        fs.writeFileSync('items.json', JSON.stringify(items, null, 2));
        console.log(`Successfully extracted items into ${Object.keys(items).length} categories`);
        
    } catch (error) {
        console.error('Error extracting items:', error);
        process.exit(1);
    }
}

function parseFile(content, baseType) {
    const items = [];
    let currentItem = null;
    let currentBlock = null;
    let blockDepth = 0;
    let blockContent = '';
    
    // Split content into lines and process each line
    const lines = content.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Start of new item
        if (line.startsWith('itemBases["')) {
            if (currentItem) {
                if (currentItem.type) {
                    currentItem.class = currentItem.type;
                    delete currentItem.type;
                }
                items.push(currentItem);
            }
            const itemName = line.match(/itemBases\["([^"]+)"\]/)[1];
            currentItem = { baseType: itemName };
            currentBlock = null;
            blockDepth = 0;
            continue;
        }
        
        // End of item
        if (line === '}' && blockDepth === 0) {
            if (currentItem) {
                if (currentItem.type) {
                    currentItem.class = currentItem.type;
                    delete currentItem.type;
                }
                items.push(currentItem);
                currentItem = null;
            }
            continue;
        }
        
        // Handle nested blocks
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        
        // Start of a block
        if (openBraces > closeBraces) {
            if (blockDepth === 0) {
                currentBlock = line.split('=')[0].trim();
                blockContent = '';
            } else {
                blockContent += line + '\n';
            }
            blockDepth += (openBraces - closeBraces);
            continue;
        }
        
        // End of a block
        if (closeBraces > openBraces) {
            blockDepth -= (closeBraces - openBraces);
            if (blockDepth === 0 && currentBlock) {
                blockContent += line;
                if (currentItem) {
                    currentItem[currentBlock] = parseLuaTable(blockContent);
                }
                currentBlock = null;
                blockContent = '';
            } else {
                blockContent += line + '\n';
            }
            continue;
        }
        
        // Inside a block
        if (blockDepth > 0) {
            blockContent += line + '\n';
            continue;
        }
        
        // Skip if we're not in an item
        if (!currentItem) continue;
        
        // Parse key-value pairs
        if (line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=').trim(); // Handle values that might contain =
            let cleanKey = key.trim().replace(/"/g, '');
            
            if (cleanKey === 'type') {
                cleanKey = 'class';
            }
            
            if (value.endsWith(',')) {
                currentItem[cleanKey] = parseLuaValue(value.slice(0, -1));
            } else {
                currentItem[cleanKey] = parseLuaValue(value);
            }
        }
    }
    
    // Add the last item if exists
    if (currentItem) {
        if (currentItem.type) {
            currentItem.class = currentItem.type;
            delete currentItem.type;
        }
        items.push(currentItem);
    }
    
    return items;
}

function parseLuaTable(content) {
    // Handle empty tables
    if (content.trim().match(/^{[\s,}]*}$/)) {
        return {};
    }
    
    const result = {};
    const lines = content.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        if (!line || line === '{' || line === '}' || line === '},') continue;
        
        // Handle key-value pairs
        if (line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=').trim();
            const cleanKey = key.trim().replace(/"/g, '');
            
            if (value.endsWith(',')) {
                result[cleanKey] = parseLuaValue(value.slice(0, -1));
            } else {
                result[cleanKey] = parseLuaValue(value);
            }
        }
    }
    
    return result;
}

function parseLuaValue(value) {
    value = value.trim();
    
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Number
    if (!isNaN(value) && value !== '') return Number(value);
    
    // String (with or without quotes)
    if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1);
    }
    
    // Empty table
    if (value === '{ }' || value === '{}') return {};
    
    // Table with values
    if (value.startsWith('{') && value.endsWith('}')) {
        const tableContent = value.slice(1, -1).trim();
        const items = tableContent.split(',').map(item => item.trim()).filter(item => item);
        
        // If it looks like a key-value table
        if (items.some(item => item.includes('='))) {
            const result = {};
            items.forEach(item => {
                if (item.includes('=')) {
                    const [key, val] = item.split('=').map(s => s.trim());
                    const cleanKey = key.replace(/"/g, '');
                    result[cleanKey] = parseLuaValue(val);
                }
            });
            return result;
        }
        
        // If it looks like an array
        return items.map(item => parseLuaValue(item));
    }
    
    // Return as is for other cases
    return value;
}

// Run the extraction
extractItems(); 