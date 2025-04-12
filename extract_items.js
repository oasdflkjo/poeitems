const fs = require('fs');
const path = require('path');

// Path to PoE2 items data
const POE_ITEMS_PATH = path.join(__dirname, 'PathOfBuilding-PoE2', 'src', 'Data', 'Bases');

// Map of internal types to PoE filter classes
const typeToClass = {
    'Amulet': 'Amulet',
    'Ring': 'Ring',
    'Belt': 'Belt',
    'Body Armour': 'Body Armour',
    'Boots': 'Boots',
    'Gloves': 'Gloves',
    'Helmet': 'Helmet',
    'Shield': 'Shield',
    'Quiver': 'Quiver',
    'One Handed Sword': 'One Handed Sword',
    'Two Handed Sword': 'Two Handed Sword',
    'One Handed Axe': 'One Handed Axe',
    'Two Handed Axe': 'Two Handed Axe',
    'One Handed Mace': 'One Handed Mace',
    'Two Handed Mace': 'Two Handed Mace',
    'Bow': 'Bow',
    'Claw': 'Claw',
    'Dagger': 'Dagger',
    'Staff': 'Staff',
    'Wand': 'Wand',
    'Fishing Rod': 'Fishing Rod',
    'Crossbow': 'Crossbow',
    'Flail': 'Flail',
    'Focus': 'Focus',
    'Charm': 'Charm',
    'Flask': 'Flask'
};

// Armor tag mapping for subcategories
const armorTagToSubclass = {
    'str_armour': 'Strength Armor',
    'dex_armour': 'Dexterity Armor',
    'int_armour': 'Intelligence Armor',
    'str_dex_armour': 'Strength/Dexterity Armor',
    'str_int_armour': 'Strength/Intelligence Armor',
    'dex_int_armour': 'Dexterity/Intelligence Armor',
    'str_dex_int_armour': 'Strength/Dexterity/Intelligence Armor'
};

// Read all Lua files from the PoE2 data directory
const baseDir = './PathOfBuilding-PoE2/src/Data/Bases';
const files = fs.readdirSync(baseDir).filter(file => file.endsWith('.lua'));

const items = [];

files.forEach(file => {
    const content = fs.readFileSync(`${baseDir}/${file}`, 'utf8');
    const itemBlocks = content.split('itemBases["').slice(1);

    itemBlocks.forEach(block => {
        try {
            // Extract item name
            const nameMatch = block.match(/^([^"]+)"\]/);
            if (!nameMatch) return;
            const name = nameMatch[1];

            // Extract type
            const typeMatch = block.match(/type = "([^"]+)"/);
            if (!typeMatch) return;
            const type = typeMatch[1];

            // Map type to class
            const itemClass = typeToClass[type] || type;

            // Extract tags
            const tagsMatch = block.match(/tags\s*=\s*{([^}]+)}/);
            const tags = [];
            let subclass = null;

            if (tagsMatch) {
                const tagContent = tagsMatch[1];
                const tagMatches = tagContent.match(/(\w+)\s*=\s*true/g) || [];
                tagMatches.forEach(tag => {
                    const tagName = tag.split('=')[0].trim();
                    tags.push(tagName);
                    
                    // Check if this is an armor subclass tag
                    if (armorTagToSubclass[tagName]) {
                        subclass = armorTagToSubclass[tagName];
                    }
                });
            }

            // Create base item object
            const item = {
                name,
                class: itemClass,
                baseType: name,
                tags,
                subclass,
                requirements: {
                    level: 0,
                    strength: 0,
                    dexterity: 0,
                    intelligence: 0
                }
            };

            // Extract weapon stats if present
            const weaponBlock = block.match(/weapon = {([^}]+)}/s);
            if (weaponBlock) {
                const weaponStats = {
                    physicalDamage: [
                        parseFloat(weaponBlock[1].match(/PhysicalMin\s*=\s*([0-9.]+)/)?.[1] || 0),
                        parseFloat(weaponBlock[1].match(/PhysicalMax\s*=\s*([0-9.]+)/)?.[1] || 0)
                    ],
                    criticalStrikeChance: parseFloat(weaponBlock[1].match(/CritChance\s*=\s*([0-9.]+)/)?.[1] || 0),
                    attacksPerSecond: parseFloat(weaponBlock[1].match(/AttackRateBase\s*=\s*([0-9.]+)/)?.[1] || 0),
                    range: parseInt(weaponBlock[1].match(/Range\s*=\s*([0-9]+)/)?.[1] || 0)
                };
                
                // Only add weapon stats if any value is non-zero
                if (Object.values(weaponStats).some(v => Array.isArray(v) ? v.some(n => n > 0) : v > 0)) {
                    item.weaponStats = weaponStats;
                }
            }

            // Extract armor stats if present
            const armorBlock = block.match(/armour = {([^}]+)}/s);
            if (armorBlock) {
                const armorStats = {
                    armor: parseInt(armorBlock[1].match(/Armour\s*=\s*([0-9]+)/)?.[1] || 0),
                    evasion: parseInt(armorBlock[1].match(/Evasion\s*=\s*([0-9]+)/)?.[1] || 0),
                    energyShield: parseInt(armorBlock[1].match(/EnergyShield\s*=\s*([0-9]+)/)?.[1] || 0),
                    ward: parseInt(armorBlock[1].match(/Ward\s*=\s*([0-9]+)/)?.[1] || 0)
                };
                
                // Only add armor stats if any value is non-zero
                if (Object.values(armorStats).some(v => v > 0)) {
                    item.armorStats = armorStats;
                }
            }

            // Extract requirements if present
            const reqBlock = block.match(/req = {([^}]+)}/s);
            if (reqBlock) {
                item.requirements = {
                    level: parseInt(reqBlock[1].match(/level\s*=\s*([0-9]+)/i)?.[1] || 0),
                    strength: parseInt(reqBlock[1].match(/str\s*=\s*([0-9]+)/i)?.[1] || 0),
                    dexterity: parseInt(reqBlock[1].match(/dex\s*=\s*([0-9]+)/i)?.[1] || 0),
                    intelligence: parseInt(reqBlock[1].match(/int\s*=\s*([0-9]+)/i)?.[1] || 0)
                };
            }

            // Extract implicit mods if present
            const implicitBlock = block.match(/implicit = {([^}]+)}/s);
            if (implicitBlock) {
                item.implicit = implicitBlock[1].trim();
            }

            items.push(item);
        } catch (error) {
            console.error('Error processing item block:', error);
        }
    });
});

// Write the extracted data to items.json
fs.writeFileSync('items.json', JSON.stringify(items, null, 2));
console.log(`Successfully extracted ${items.length} items`); 