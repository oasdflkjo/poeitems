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
    'Flask': 'Flask',
    'Sceptre': 'Sceptre'
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

                // Skip dummy base items
                if ((name === "Ring" && block.includes('type = "Ring"') && block.includes('tags = { ring = true, default = true, }')) ||
                    (name === "Random Wand" && block.includes('type = "Wand"'))) {
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
                }

                // Extract tags
                const tags = [];
                const tagsMatch = block.match(/tags = {([^}]+)}/);
                if (tagsMatch) {
                    const tagsBlock = tagsMatch[1];
                    const tagMatches = tagsBlock.match(/(\w+)\s*=\s*true/g);
                    if (tagMatches) {
                        tagMatches.forEach(match => {
                            const tag = match.split('=')[0].trim();
                            tags.push(tag);
                        });
                    }
                }

                // Extract spirit for sceptres
                let spirit = null;
                if (itemClass === "Sceptre") {
                    const spiritMatch = block.match(/spirit = ([0-9]+)/);
                    if (spiritMatch) {
                        spirit = parseInt(spiritMatch[1]);
                    }
                }

                // Extract weapon stats
                const weaponStats = {
                    damage: {},
                    attacksPerSecond: null,
                    criticalStrikeChance: null,
                    range: null
                };

                const weaponBlock = block.match(/weapon = {([^}]+)}/);
                if (weaponBlock) {
                    const blockContent = weaponBlock[1];
                    const damageTypes = ['Physical', 'Fire', 'Cold', 'Lightning', 'Chaos'];
                    
                    // Extract all damage types
                    damageTypes.forEach(type => {
                        const minMatch = blockContent.match(new RegExp(type + 'Min = ([0-9.]+)'));
                        const maxMatch = blockContent.match(new RegExp(type + 'Max = ([0-9.]+)'));
                        
                        if (minMatch && maxMatch) {
                            weaponStats.damage[type.toLowerCase()] = {
                                min: parseInt(minMatch[1]),
                                max: parseInt(maxMatch[1])
                            };
                        }
                    });

                    const attackSpeedMatch = blockContent.match(/AttackRateBase = ([0-9.]+)/);
                    const critChanceMatch = blockContent.match(/CritChanceBase = ([0-9.]+)/);
                    const rangeMatch = blockContent.match(/Range = ([0-9.]+)/);

                    weaponStats.attacksPerSecond = attackSpeedMatch ? parseFloat(attackSpeedMatch[1]) : null;
                    weaponStats.criticalStrikeChance = critChanceMatch ? parseFloat(critChanceMatch[1]) : null;
                    weaponStats.range = rangeMatch ? parseInt(rangeMatch[1]) : null;
                }

                // Extract armor stats
                const armorStats = {
                    armor: 0,
                    evasion: 0,
                    energyShield: 0,
                    ward: 0,
                    blockChance: 0
                };

                const armorBlock = block.match(/armour = {([^}]+)}/);

                if (armorBlock) {
                    const blockContent = armorBlock[1];
                    const armorBase = blockContent.match(/Armour\s*=\s*([0-9.]+)/);
                    const evasionBase = blockContent.match(/Evasion\s*=\s*([0-9.]+)/);
                    const energyShieldBase = blockContent.match(/EnergyShield\s*=\s*([0-9.]+)/);
                    const wardBase = blockContent.match(/Ward\s*=\s*([0-9.]+)/);
                    const blockChanceBase = blockContent.match(/BlockChance\s*=\s*([0-9.]+)/);

                    armorStats.armor = armorBase ? parseFloat(armorBase[1]) : 0;
                    armorStats.evasion = evasionBase ? parseFloat(evasionBase[1]) : 0;
                    armorStats.energyShield = energyShieldBase ? parseFloat(energyShieldBase[1]) : 0;
                    armorStats.ward = wardBase ? parseFloat(wardBase[1]) : 0;
                    armorStats.blockChance = blockChanceBase ? parseFloat(blockChanceBase[1]) : 0;
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
                    armorStats,
                    spirit
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