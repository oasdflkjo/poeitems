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
    'Warstaff': 'Warstaff',
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

function extractItems() {
    const files = fs.readdirSync('./PathOfBuilding-PoE2/src/Data/Bases');
    const itemMap = new Map(); // Use a map to prevent duplicates

    files.forEach(file => {
        if (!file.endsWith('.lua')) return;

        const content = fs.readFileSync(`./PathOfBuilding-PoE2/src/Data/Bases/${file}`, 'utf8');
        const itemBlocks = content.split('itemBases["').slice(1);

        itemBlocks.forEach(block => {
            try {
                // Extract name
                const nameMatch = block.match(/^([^"]+)"\]/);
                if (!nameMatch) return;
                const name = nameMatch[1];

                // Skip ONLY the dummy Ring base item
                if (name === "Ring" && block.includes('type = "Ring"') && block.includes('tags = { ring = true, default = true, }')) {
                    return;
                }

                // Extract implicit
                const implicitMatch = block.match(/implicit = "([^"]+)"/);
                const implicit = implicitMatch ? implicitMatch[1] : null;

                // Extract class and subType
                const classMatch = block.match(/type = "([^"]+)"/);
                const subTypeMatch = block.match(/subType = "([^"]+)"/);
                if (!classMatch) return;
                
                let itemClass = classMatch[1];
                // Handle staff types properly
                if (itemClass === "Staff") {
                    if (subTypeMatch && subTypeMatch[1] === "Warstaff") {
                        itemClass = "Warstaff";
                    }
                    // Keep it as "Staff" for regular staves
                }

                // Extract tags properly from the tags block
                const tagsBlock = block.match(/tags = {([^}]+)}/);
                const tags = [];
                if (tagsBlock) {
                    const tagContent = tagsBlock[1];
                    // Match all "tag = true" patterns
                    const tagMatches = tagContent.match(/(\w+)\s*=\s*true/g) || [];
                    tagMatches.forEach(match => {
                        const tag = match.split('=')[0].trim();
                        tags.push(tag);
                    });
                }

                // Extract weapon stats from the weapon block
                const weaponBlock = block.match(/weapon = {([^}]+)}/);
                const weaponStats = {
                    physicalDamage: null,
                    attacksPerSecond: null,
                    criticalStrikeChance: null,
                    range: null
                };

                if (weaponBlock) {
                    const blockContent = weaponBlock[1];
                    const physMin = parseFloat(blockContent.match(/PhysicalMin = ([0-9.]+)/)?.[1] || 0);
                    const physMax = parseFloat(blockContent.match(/PhysicalMax = ([0-9.]+)/)?.[1] || 0);
                    
                    if (physMin > 0 || physMax > 0) {
                        weaponStats.physicalDamage = [physMin, physMax];
                    }

                    const aps = parseFloat(blockContent.match(/AttackRateBase = ([0-9.]+)/)?.[1] || 0);
                    if (aps > 0) {
                        weaponStats.attacksPerSecond = aps;
                    }

                    const crit = parseFloat(blockContent.match(/CritChanceBase = ([0-9.]+)/)?.[1] || 0);
                    if (crit > 0) {
                        weaponStats.criticalStrikeChance = crit;
                    }

                    const range = parseInt(blockContent.match(/Range = ([0-9]+)/)?.[1] || 0);
                    if (range > 0) {
                        weaponStats.range = range;
                    }
                }

                // Extract armor stats from the armour block
                const armorBlock = block.match(/armour = {([^}]+)}/);
                const armorStats = {
                    armor: 0,
                    evasion: 0,
                    energyShield: 0,
                    ward: 0
                };

                if (armorBlock) {
                    const blockContent = armorBlock[1];
                    const armorBase = blockContent.match(/Armour\s*=\s*([0-9.]+)/);
                    const evasionBase = blockContent.match(/Evasion\s*=\s*([0-9.]+)/);
                    const energyShieldBase = blockContent.match(/EnergyShield\s*=\s*([0-9.]+)/);
                    const wardBase = blockContent.match(/Ward\s*=\s*([0-9.]+)/);

                    armorStats.armor = armorBase ? parseFloat(armorBase[1]) : 0;
                    armorStats.evasion = evasionBase ? parseFloat(evasionBase[1]) : 0;
                    armorStats.energyShield = energyShieldBase ? parseFloat(energyShieldBase[1]) : 0;
                    armorStats.ward = wardBase ? parseFloat(wardBase[1]) : 0;
                }

                // Extract requirements from the req block
                const reqBlock = block.match(/req = {([^}]+)}/);
                const requirements = {
                    level: 0,
                    strength: 0,
                    dexterity: 0,
                    intelligence: 0
                };

                if (reqBlock) {
                    const blockContent = reqBlock[1];
                    requirements.level = parseInt(blockContent.match(/level = ([0-9]+)/)?.[1] || 0);
                    requirements.strength = parseInt(blockContent.match(/str = ([0-9]+)/)?.[1] || 0);
                    requirements.dexterity = parseInt(blockContent.match(/dex = ([0-9]+)/)?.[1] || 0);
                    requirements.intelligence = parseInt(blockContent.match(/int = ([0-9]+)/)?.[1] || 0);
                }

                // Use name as key to prevent duplicates
                itemMap.set(name, {
                    name,
                    class: itemClass,
                    implicit,
                    tags,
                    requirements,
                    weaponStats,
                    armorStats
                });
            } catch (error) {
                console.error(`Error processing item block: ${error}`);
            }
        });
    });

    // Convert map to array and write to file
    const items = Array.from(itemMap.values());
    fs.writeFileSync('items.json', JSON.stringify(items, null, 4));
    console.log(`Extracted ${items.length} items`);
}

function extractNumber(block, key) {
    const match = block.match(new RegExp(key + '\\s*=\\s*([0-9.]+)'));
    return match ? parseFloat(match[1]) : 0;
}

function extractRange(block, minKey, maxKey) {
    const min = extractNumber(block, minKey);
    const max = extractNumber(block, maxKey);
    return min || max ? [min, max] : null;
}

extractItems(); 