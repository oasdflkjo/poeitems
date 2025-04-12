// Configuration for Fuse.js
const fuseOptions = {
    keys: ['text'],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    shouldSort: true,
    includeScore: true,
    findAllMatches: true,
    ignoreLocation: true
};

let fuse;
let itemsByClass = {};
let uniqueClasses = new Set();
let uniqueSubclasses = new Map(); // Map of class -> Set of subclasses
let currentFocus = -1;
let selectedClass = null;
let selectedSubclass = null;

// Add this after the items data is loaded
let maxColumnWidths = {
    name: 0,
    class: 0
};

// Add this at the top of the file with other global variables
let lastSort = {
    column: 'level',
    ascending: true
};

// Update the COLUMN_WIDTHS constant at the top
const COLUMN_WIDTHS = {
    // Dynamic columns (will be calculated)
    name: 0,  // Will be calculated dynamically
    class: 0, // Will be calculated dynamically
    
    // Fixed width columns
    numeric: {
        width: '70px',
        minWidth: '70px',
        maxWidth: '70px',
        padding: '4px 6px'
    },
    range: {
        width: '75px',
        minWidth: '75px',
        maxWidth: '75px',
        padding: '4px 6px'
    },
    implicit: 200,  // Fixed width for implicit column
    requirements: {
        level: 100,
        strength: 100,
        dexterity: 100,
        intelligence: 100
    },
    weaponStats: {
        physicalDamage: 120,
        attacksPerSecond: 100,
        criticalStrikeChance: 100,
        range: 100
    },
    armorStats: {
        armor: 100,
        evasion: 100,
        energyShield: 120,
        ward: 100
    },
    // Add specific widths for special items
    trapStats: {
        cooldown: 100,
        duration: 100,
        radius: 100
    },
    jewelStats: {
        radius: 100,
        limit: 100
    },
    quiverStats: {
        capacity: 100
    },
    fishingStats: {
        catchSpeed: 100,
        baitEfficiency: 100
    }
};

// Define all possible columns and their order at the top
const COLUMN_DEFINITIONS = [
    { id: 'name', text: 'Name', type: 'string', width: '200px', always: true },
    { id: 'class', text: 'Class', type: 'string', width: '150px', always: true },
    // Requirements - always in the same position
    { id: 'level', text: 'Level Req', type: 'numeric', width: '100px', group: 'requirements' },
    { id: 'strength', text: 'Str Req', type: 'numeric', width: '100px', group: 'requirements' },
    { id: 'dexterity', text: 'Dex Req', type: 'numeric', width: '100px', group: 'requirements' },
    { id: 'intelligence', text: 'Int Req', type: 'numeric', width: '100px', group: 'requirements' },
    // Weapon stats - fixed positions
    { id: 'physicalDamage', text: 'Physical Damage', type: 'range', width: '120px', group: 'weaponStats' },
    { id: 'attacksPerSecond', text: 'Attacks/sec', type: 'numeric', width: '100px', group: 'weaponStats' },
    { id: 'criticalStrikeChance', text: 'Crit Chance', type: 'numeric', width: '100px', group: 'weaponStats' },
    { id: 'range', text: 'Range', type: 'numeric', width: '100px', group: 'weaponStats' },
    // Armor stats - fixed positions
    { id: 'armor', text: 'Armor', type: 'numeric', width: '100px', group: 'armorStats' },
    { id: 'evasion', text: 'Evasion', type: 'numeric', width: '100px', group: 'armorStats' },
    { id: 'energyShield', text: 'Energy Shield', type: 'numeric', width: '120px', group: 'armorStats' },
    { id: 'ward', text: 'Ward', type: 'numeric', width: '100px', group: 'armorStats' },
    // Trap stats - fixed positions
    { id: 'cooldown', text: 'Cooldown', type: 'numeric', width: '100px', group: 'trapStats' },
    { id: 'duration', text: 'Duration', type: 'numeric', width: '100px', group: 'trapStats' },
    { id: 'radius', text: 'Radius', type: 'numeric', width: '100px', group: 'trapStats' },
    // Jewel stats
    { id: 'jewelRadius', text: 'Radius', type: 'numeric', width: '100px', group: 'jewelStats' },
    { id: 'limit', text: 'Limit', type: 'numeric', width: '100px', group: 'jewelStats' },
    // Quiver stats
    { id: 'capacity', text: 'Capacity', type: 'numeric', width: '100px', group: 'quiverStats' },
    // Fishing stats
    { id: 'catchSpeed', text: 'Catch Speed', type: 'numeric', width: '100px', group: 'fishingStats' },
    { id: 'baitEfficiency', text: 'Bait Efficiency', type: 'numeric', width: '100px', group: 'fishingStats' }
];

// Define the fixed table structure at the top
const TABLE_STRUCTURE = [
    { id: 'name', text: 'Name', type: 'string', class: 'col-name', always: true },
    { id: 'class', text: 'Class', type: 'string', class: 'col-class', always: true },
    { id: 'implicit', text: 'Implicit', type: 'string', class: 'col-implicit', always: true },
    { id: 'level', text: 'Level', type: 'numeric', class: 'col-numeric', group: 'requirements' },
    { id: 'strength', text: 'Str', type: 'numeric', class: 'col-numeric', group: 'requirements' },
    { id: 'dexterity', text: 'Dex', type: 'numeric', class: 'col-numeric', group: 'requirements' },
    { id: 'intelligence', text: 'Int', type: 'numeric', class: 'col-numeric', group: 'requirements' },
    { id: 'armor', text: 'Armor', type: 'numeric', class: 'col-numeric', group: 'armorStats' },
    { id: 'evasion', text: 'Evasion', type: 'numeric', class: 'col-numeric', group: 'armorStats' },
    { id: 'energyShield', text: 'ES', type: 'numeric', class: 'col-numeric', group: 'armorStats' },
    { id: 'ward', text: 'Ward', type: 'numeric', class: 'col-numeric', group: 'armorStats' },
    { id: 'physicalDamage', text: 'Physical', type: 'range', class: 'col-numeric', group: 'weaponStats' },
    { id: 'criticalStrikeChance', text: 'Crit', type: 'numeric', class: 'col-numeric', group: 'weaponStats' },
    { id: 'attacksPerSecond', text: 'APS', type: 'numeric', class: 'col-numeric', group: 'weaponStats' },
    { id: 'range', text: 'Range', type: 'numeric', class: 'col-numeric', group: 'weaponStats' }
];

// Update the armor tag mapping
const armorTagToSubclass = {
    'str_armour': 'Str',
    'dex_armour': 'Dex',
    'int_armour': 'Int',
    'str_dex_armour': 'Str/Dex',
    'str_int_armour': 'Str/Int',
    'dex_int_armour': 'Dex/Int',
    'str_dex_int_armour': 'Str/Dex/Int',
    'str_shield': 'Str',
    'dex_shield': 'Dex',
    'int_shield': 'Int',
    'str_dex_shield': 'Str/Dex',
    'str_int_shield': 'Str/Int',
    'dex_int_shield': 'Dex/Int',
    'str_dex_int_shield': 'Str/Dex/Int'
};

// Add at the top of the file
const ARMOR_TYPES = ['Body Armour', 'Boots', 'Gloves', 'Helmet', 'Shield'];

// Define armor and weapon categories
const armorTypes = ['Body Armour', 'Boots', 'Gloves', 'Helmet', 'Shield'];
const weaponTypes = ['One Handed Sword', 'Two Handed Sword', 'One Handed Axe', 'Two Handed Axe', 
    'One Handed Mace', 'Two Handed Mace', 'Bow', 'Claw', 'Dagger', 'Staff', 'Warstaff', 'Wand', 
    'Fishing Rod', 'Crossbow', 'Flail'];

function calculateMaxColumnWidths(items) {
    // Reset name and class widths
    COLUMN_WIDTHS.name = 0;
    COLUMN_WIDTHS.class = 0;
    
    // Calculate max widths from all items
    items.forEach(item => {
        COLUMN_WIDTHS.name = Math.max(COLUMN_WIDTHS.name, item.name.length);
        COLUMN_WIDTHS.class = Math.max(COLUMN_WIDTHS.class, item.class.length);
    });
    
    // Add padding to the character-based widths
    COLUMN_WIDTHS.name = Math.min(Math.max(COLUMN_WIDTHS.name + 2, 20), 40); // Min 20ch, Max 40ch
    COLUMN_WIDTHS.class = Math.min(Math.max(COLUMN_WIDTHS.class + 2, 15), 30); // Min 15ch, Max 30ch
    
    applyColumnWidths();
}

function applyColumnWidths() {
    let styleEl = document.getElementById('column-widths-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'column-widths-style';
        document.head.appendChild(styleEl);
    }
    
    styleEl.textContent = `
        /* Fixed width columns */
        .table-container th:nth-child(1),
        .table-container td:nth-child(1) {
            width: ${COLUMN_WIDTHS.name}ch;
            min-width: ${COLUMN_WIDTHS.name}ch;
            max-width: ${COLUMN_WIDTHS.name}ch;
            padding: 4px 6px;
        }
        .table-container th:nth-child(2),
        .table-container td:nth-child(2) {
            width: ${COLUMN_WIDTHS.class}ch;
            min-width: ${COLUMN_WIDTHS.class}ch;
            max-width: ${COLUMN_WIDTHS.class}ch;
            padding: 4px 6px;
        }
        
        /* All numeric columns get consistent width */
        .table-container th.numeric,
        .table-container td.numeric {
            width: ${COLUMN_WIDTHS.numeric.width};
            min-width: ${COLUMN_WIDTHS.numeric.minWidth};
            max-width: ${COLUMN_WIDTHS.numeric.maxWidth};
            padding: ${COLUMN_WIDTHS.numeric.padding};
            text-align: right;
        }
        
        /* Range columns (for physical damage etc) */
        .table-container th.range-col,
        .table-container td.range-col {
            width: ${COLUMN_WIDTHS.range.width};
            min-width: ${COLUMN_WIDTHS.range.minWidth};
            max-width: ${COLUMN_WIDTHS.range.maxWidth};
            padding: ${COLUMN_WIDTHS.range.padding};
            text-align: right;
        }
        
        /* Ensure table maintains width */
        .table-container table {
            min-width: 600px; /* Reduced minimum width */
            table-layout: fixed;
            width: 100%;
        }
        
        /* Hide overflow with ellipsis */
        .table-container th,
        .table-container td {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        /* Make headers more compact */
        .table-container th {
            padding: 4px 6px;
            font-size: 0.95em;
        }
    `;
}

// Update the initialization function
async function initializeSearch() {
    try {
        // Check URL parameters for buttonless mode
        const urlParams = new URLSearchParams(window.location.search);
        const isButtonless = urlParams.has('buttonless');
        
        // Create containers only if not in buttonless mode
        const searchContainer = document.querySelector('.search-container');
        
        if (!isButtonless) {
            // Create class buttons container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'class-buttons';
            searchContainer.parentNode.insertBefore(buttonContainer, searchContainer.nextSibling);
            
            // Create subclass buttons container
            const subclassContainer = document.createElement('div');
            subclassContainer.className = 'subclass-buttons';
            subclassContainer.style.display = 'none';
            buttonContainer.parentNode.insertBefore(subclassContainer, buttonContainer.nextSibling);
        }
        
        // Load and process data
        const response = await fetch('items.json');
        const data = await response.json();
        
        calculateMaxColumnWidths(data);
        
        // Group items and prepare search data
        itemsByClass = {};
        const searchData = [];
        const subtypesByClass = new Map();

        data.forEach(item => {
            // Group items by class
            if (!itemsByClass[item.class]) {
                itemsByClass[item.class] = [];
                // Add class to search data
                searchData.push({
                    text: item.class,
                    type: 'class',
                    class: item.class
                });
            }
            itemsByClass[item.class].push(item);

            // Track armor subtypes
            if (ARMOR_TYPES.includes(item.class)) {
                item.tags.forEach(tag => {
                    if (armorTagToSubclass[tag]) {
                        // Add subtype to search data if not already added
                        const searchText = `${item.class} - ${armorTagToSubclass[tag]}`;
                        if (!searchData.some(sd => sd.text === searchText)) {
                            searchData.push({
                                text: searchText,
                                type: 'subclass',
                                class: item.class,
                                subclass: tag
                            });
                        }
                    }
                });
            }
        });
        
        // Initialize Fuse.js with complete search data
        fuse = new Fuse(searchData, fuseOptions);

        uniqueClasses = new Set(Object.keys(itemsByClass));
        uniqueSubclasses = subtypesByClass;
        
        // Initialize search input
        const searchInput = document.getElementById('search');
        searchInput.addEventListener('input', handleInput);
        searchInput.addEventListener('keydown', handleKeyDown);
        
        // Create buttons only if not in buttonless mode
        if (!isButtonless) {
            createButtons();
        }
        
        // Hide results table initially
        document.querySelector('.table-container').style.display = 'none';
        
    } catch (error) {
        console.error('Error initializing search:', error);
    }
}

function createButtons() {
    const categories = {
        'Armour': ['Body Armour', 'Boots', 'Gloves', 'Helmet'],
        'Weapons': ['Bow', 'Claw', 'Crossbow', 'Dagger', 'Fishing Rod', 'Flail', 'One Handed Axe', 
                   'One Handed Mace', 'One Handed Sword', 'Sceptre', 'Spear', 'Staff', 'Warstaff', 
                   'Two Handed Axe', 'Two Handed Mace', 'Two Handed Sword', 'Wand'],
        'Jewelry': ['Amulet', 'Belt', 'Ring'],
        'Off-hand': ['Quiver', 'TrapTool', 'Focus', 'Shield'],
        'Misc': ['Charm', 'Flask', 'Jewel', 'Rune', 'SoulCore']
    };

    const buttonContainer = document.querySelector('.class-buttons');
    buttonContainer.innerHTML = ''; // Clear existing buttons

    Object.entries(categories).forEach(([category, items]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'button-category';
        
        const categoryLabel = document.createElement('div');
        categoryLabel.className = 'category-label';
        categoryLabel.textContent = category;
        categoryDiv.appendChild(categoryLabel);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'category-buttons';
        
        items.sort().forEach(itemClass => {
            const button = document.createElement('button');
            button.textContent = itemClass;
            button.dataset.class = itemClass;  // Add data attribute for class
            button.addEventListener('click', () => {
                // Clear all active states first
                document.querySelectorAll('.category-buttons button').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                handleClassButtonClick(button, itemClass);
                // Update search input to match
                document.getElementById('search').value = itemClass;
            });
            buttonsDiv.appendChild(button);
        });

        categoryDiv.appendChild(buttonsDiv);
        buttonContainer.appendChild(categoryDiv);
    });
}

function handleClassButtonClick(button, itemClass) {
    // Remove active state from all class buttons
    document.querySelectorAll('.category-buttons button').forEach(btn => btn.classList.remove('active'));
    
    // Add active state to clicked button
    button.classList.add('active');
    
    // Clear subclass selection if switching between armor and weapons
    const isNewArmor = armorTypes.includes(itemClass);
    const isOldArmor = armorTypes.includes(selectedClass);
    const isNewWeapon = weaponTypes.includes(itemClass);
    const isOldWeapon = weaponTypes.includes(selectedClass);
    
    if ((isNewArmor && isOldWeapon) || (isNewWeapon && isOldArmor) || selectedClass !== itemClass) {
        selectedSubclass = null;
    }
    
    selectedClass = itemClass;
    
    // Update subclass buttons first
    if (ARMOR_TYPES.includes(itemClass)) {
        updateSubclassButtons(itemClass);
        document.querySelector('.subclass-buttons').style.display = 'flex';
    } else {
        document.querySelector('.subclass-buttons').style.display = 'none';
    }
    
    // Then update results
    let results = itemsByClass[itemClass] || [];
    if (selectedSubclass) {
        results = results.filter(item => item.tags.includes(selectedSubclass));
    }
    displayResults(results);
}

function updateSubclassButtons(itemClass) {
    const subclassContainer = document.querySelector('.subclass-buttons');
    if (!subclassContainer) return;

    subclassContainer.innerHTML = '';

    // Show subclass buttons for armor types and shields
    if (ARMOR_TYPES.includes(itemClass)) {
        subclassContainer.style.display = 'flex';

        // Add "All" button
        const allButton = document.createElement('button');
        allButton.textContent = 'All';
        allButton.addEventListener('click', () => handleSubclassButtonClick(allButton, null));
        if (!selectedSubclass) allButton.classList.add('active');
        subclassContainer.appendChild(allButton);

        // Define the order of armor types
        const armorTypeOrder = [
            'str_armour', 'dex_armour', 'int_armour',
            'str_dex_armour', 'str_int_armour', 'dex_int_armour',
            'str_dex_int_armour',
            'str_shield', 'dex_shield', 'int_shield',
            'str_dex_shield', 'str_int_shield', 'dex_int_shield',
            'str_dex_int_shield'
        ];

        // Get available subtypes for this armor class
        const availableSubtypes = new Set();
        const isShield = itemClass === 'Shield';
        
        (itemsByClass[itemClass] || []).forEach(item => {
            item.tags.forEach(tag => {
                if (armorTagToSubclass[tag]) {
                    if ((isShield && tag.includes('_shield')) || 
                        (!isShield && tag.includes('_armour'))) {
                        availableSubtypes.add(tag);
                    }
                }
            });
        });

        // Add subclass buttons in the correct order
        armorTypeOrder.forEach(tag => {
            if (availableSubtypes.has(tag)) {
                const button = document.createElement('button');
                button.textContent = armorTagToSubclass[tag];
                if (selectedSubclass === tag) button.classList.add('active');
                button.addEventListener('click', () => handleSubclassButtonClick(button, tag));
                subclassContainer.appendChild(button);
            }
        });
    } else {
        subclassContainer.style.display = 'none';
    }
}

function handleSubclassButtonClick(button, subclass) {
    // Remove active state from all subclass buttons
    document.querySelectorAll('.subclass-buttons button').forEach(btn => btn.classList.remove('active'));
    
    // Add active state to clicked button
    button.classList.add('active');
    
    selectedSubclass = subclass;
    
    // Update search box text
    const searchInput = document.getElementById('search');
    if (button.textContent === 'All') {
        searchInput.value = selectedClass;
    } else {
        searchInput.value = `${selectedClass} - ${button.textContent}`;
    }
    
    // Update results with selected subclass filter
    let results = itemsByClass[selectedClass] || [];
    if (subclass) {
        results = results.filter(item => item.tags.includes(subclass));
    }
    displayResults(results);
}

function handleInput(e) {
    const searchContainer = document.querySelector('.search-container');
    const val = e.target.value.trim().toLowerCase();
    
    // Remove existing autocomplete items
    let autocompleteItems = document.getElementById('autocomplete-items');
    if (autocompleteItems) {
        autocompleteItems.remove();
    }
    
    if (!val) {
        selectedClass = null;
        selectedSubclass = null;
        document.querySelector('.table-container').style.display = 'none';
        document.getElementById('results').innerHTML = '';
        // Clear all button selections
        document.querySelectorAll('.category-buttons button').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.subclass-buttons').style.display = 'none';
        return;
    }
    
    // Get fuzzy search matches
    const matches = fuse.search(val)
        .filter(match => match.score < 0.6) // Only keep good matches
        .slice(0, 10);
    
    // Create autocomplete dropdown if we have matches
    if (matches.length > 0) {
        autocompleteItems = document.createElement('div');
        autocompleteItems.id = 'autocomplete-items';
        autocompleteItems.className = 'autocomplete-items';
        
        matches.forEach((match, index) => {
            const div = document.createElement('div');
            const item = match.item;
            
            div.className = item.type === 'class' ? 'class-option' : 'subclass-option';
            div.textContent = item.text;
            
            div.addEventListener('click', () => {
                e.target.value = item.text;
                selectedClass = item.class;
                selectedSubclass = item.subclass;
                
                // Highlight the corresponding button
                if (item.class) {
                    const button = document.querySelector(`.category-buttons button[data-class="${item.class}"]`);
                    if (button) {
                        // Clear all active states first
                        document.querySelectorAll('.category-buttons button').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        button.classList.add('active');
                        button.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        
                        // Update subclass buttons if it's an armor type
                        if (ARMOR_TYPES.includes(item.class)) {
                            updateSubclassButtons(item.class);
                            document.querySelector('.subclass-buttons').style.display = 'flex';
                            
                            // If a subclass was selected from search, highlight the corresponding subclass button
                            if (item.subclass) {
                                const subclassButtons = document.querySelectorAll('.subclass-buttons button');
                                subclassButtons.forEach(btn => {
                                    btn.classList.remove('active');
                                    if (btn.textContent === armorTagToSubclass[item.subclass]) {
                                        btn.classList.add('active');
                                    }
                                });
                            }
                        } else {
                            document.querySelector('.subclass-buttons').style.display = 'none';
                        }
                    }
                }
                
                let results = itemsByClass[item.class] || [];
                if (item.subclass) {
                    results = results.filter(r => r.tags.includes(item.subclass));
                }
                
                displayResults(results);
                autocompleteItems.remove();
            });
            
            autocompleteItems.appendChild(div);
        });
        
        searchContainer.appendChild(autocompleteItems);
        currentFocus = -1;
    }
}

function handleKeyDown(e) {
    const autocompleteItems = document.getElementById('autocomplete-items');
    if (!autocompleteItems) return;
    
    const items = autocompleteItems.getElementsByTagName('div');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentFocus++;
        addActive(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentFocus--;
        addActive(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentFocus > -1 && currentFocus < items.length) {
            items[currentFocus].click();
        } else if (items.length > 0) {
            items[0].click();
        }
    } else if (e.key === 'Escape') {
        autocompleteItems.remove();
    }
}

function addActive(items) {
    if (!items) return;
    
    removeActive(items);
    
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    
    items[currentFocus].classList.add('autocomplete-active');
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('autocomplete-active');
    }
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const tableContainer = document.querySelector('.table-container');
    
    if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<p>No results found</p>';
        tableContainer.style.display = 'none';
        return;
    }

    const damageTypes = ['physical', 'fire', 'cold', 'lightning', 'chaos'];
    const usedColumns = analyzeColumns(results);
    
    let table = '<table><thead><tr>';
    table += '<th class="sortable" onclick="sortTable(this, \'string\')">Name</th>';
    table += '<th class="sortable" onclick="sortTable(this, \'string\')">Implicit</th>';
    
    // Add requirement headers if used
    if (usedColumns.level) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Level</th>';
    if (usedColumns.strength) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Str</th>';
    if (usedColumns.dexterity) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Dex</th>';
    if (usedColumns.intelligence) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Int</th>';
    
    // Add armor stats headers if any armor stats are used
    let hasArmorStats = false;
    const armorStats = {
        armor: results.some(item => item.armorStats?.armor > 0),
        evasion: results.some(item => item.armorStats?.evasion > 0),
        energyShield: results.some(item => item.armorStats?.energyShield > 0),
        ward: results.some(item => item.armorStats?.ward > 0)
    };

    if (Object.values(armorStats).some(Boolean)) {
        hasArmorStats = true;
        if (armorStats.armor) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Armor</th>';
        if (armorStats.evasion) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Evasion</th>';
        if (armorStats.energyShield) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Energy Shield</th>';
        if (armorStats.ward) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Ward</th>';
    }
    
    // Add damage type headers if any weapon stats are used
    let hasWeaponStats = false;
    const weaponStats = {
        damage: {},
        attacksPerSecond: results.some(item => item.weaponStats?.attacksPerSecond > 0),
        criticalStrikeChance: results.some(item => item.weaponStats?.criticalStrikeChance > 0),
        range: results.some(item => item.weaponStats?.range > 0)
    };

    // Check each damage type
    damageTypes.forEach(type => {
        weaponStats.damage[type] = results.some(item => {
            const dmg = item.weaponStats?.damage?.[type];
            return dmg && (dmg.min > 0 || dmg.max > 0);
        });
        if (weaponStats.damage[type]) hasWeaponStats = true;
    });

    // Add damage type headers
    damageTypes.forEach(type => {
        if (weaponStats.damage[type]) {
            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
            table += `<th class="sortable numeric range-col" onclick="sortTable(this, 'range')">${typeName}</th>`;
        }
    });
    
    // Add other weapon stats if we have any damage types
    if (hasWeaponStats) {
        if (weaponStats.attacksPerSecond) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">APS</th>';
        if (weaponStats.criticalStrikeChance) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Crit</th>';
        if (weaponStats.range) table += '<th class="sortable numeric" onclick="sortTable(this, \'numeric\')">Range</th>';
    }

    table += '</tr></thead><tbody>';

    results.forEach(item => {
        table += '<tr>';
        table += `<td>${item.name || ''}</td>`;
        const implicit = item.implicit ? item.implicit.replace(/\\n/g, '<br>') : '';
        table += `<td>${implicit}</td>`;
        
        // Add requirement values if used
        if (usedColumns.level) table += `<td class="numeric">${item.requirements?.level || ''}</td>`;
        if (usedColumns.strength) table += `<td class="numeric">${item.requirements?.strength || ''}</td>`;
        if (usedColumns.dexterity) table += `<td class="numeric">${item.requirements?.dexterity || ''}</td>`;
        if (usedColumns.intelligence) table += `<td class="numeric">${item.requirements?.intelligence || ''}</td>`;
        
        // Add armor stats if we have any
        if (hasArmorStats) {
            if (armorStats.armor) table += `<td class="numeric">${item.armorStats?.armor || ''}</td>`;
            if (armorStats.evasion) table += `<td class="numeric">${item.armorStats?.evasion || ''}</td>`;
            if (armorStats.energyShield) table += `<td class="numeric">${item.armorStats?.energyShield || ''}</td>`;
            if (armorStats.ward) table += `<td class="numeric">${item.armorStats?.ward || ''}</td>`;
        }
        
        // Add damage values for each type
        damageTypes.forEach(type => {
            if (weaponStats.damage[type]) {
                const dmg = item.weaponStats?.damage?.[type];
                table += `<td class="numeric range-col">${dmg ? `${dmg.min}-${dmg.max}` : ''}</td>`;
            }
        });
        
        // Add other weapon stats if we have any damage types
        if (hasWeaponStats) {
            if (weaponStats.attacksPerSecond) table += `<td class="numeric">${item.weaponStats?.attacksPerSecond?.toFixed(2) || ''}</td>`;
            if (weaponStats.criticalStrikeChance) table += `<td class="numeric">${item.weaponStats?.criticalStrikeChance?.toFixed(2) || ''}</td>`;
            if (weaponStats.range) table += `<td class="numeric">${item.weaponStats?.range || ''}</td>`;
        }
        
        table += '</tr>';
    });

    table += '</tbody></table>';
    resultsDiv.innerHTML = table;
    tableContainer.style.display = 'block';
}

function analyzeColumns(results) {
    const usedColumns = {
        name: true,
        implicit: false,
        level: false,
        strength: false,
        dexterity: false,
        intelligence: false,
        physical: false,
        fire: false,
        cold: false,
        lightning: false,
        chaos: false
    };

    results.forEach(item => {
        // Check requirements
        if (item.requirements?.level) usedColumns.level = true;
        if (item.requirements?.strength) usedColumns.strength = true;
        if (item.requirements?.dexterity) usedColumns.dexterity = true;
        if (item.requirements?.intelligence) usedColumns.intelligence = true;

        // Check implicit
        if (item.implicit) usedColumns.implicit = true;

        // Check weapon damage types
        if (item.weaponStats?.damage) {
            Object.keys(item.weaponStats.damage).forEach(type => {
                usedColumns[type] = true;
            });
        }
    });

    return usedColumns;
}

function sortTable(header, type) {
    const table = header.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
    
    // Toggle sort direction
    const isAscending = !header.classList.contains('asc');
    
    // Remove sort indicators from all headers
    header.parentNode.querySelectorAll('th').forEach(th => {
        th.classList.remove('asc', 'desc');
    });
    
    // Add sort indicator to current header
    header.classList.add(isAscending ? 'asc' : 'desc');
    
    // Sort the rows
    rows.sort((a, b) => {
        const aCell = a.cells[columnIndex];
        const bCell = b.cells[columnIndex];
        
        if (type === 'numeric') {
            const aValue = parseFloat(aCell.textContent.replace(/[^0-9.-]/g, '')) || 0;
            const bValue = parseFloat(bCell.textContent.replace(/[^0-9.-]/g, '')) || 0;
            return isAscending ? aValue - bValue : bValue - aValue;
        } else if (type === 'range') {
            // For range values (e.g. "10-20"), sort by the average
            const aRange = aCell.textContent.split('-').map(n => parseFloat(n) || 0);
            const bRange = bCell.textContent.split('-').map(n => parseFloat(n) || 0);
            
            // Calculate averages, handle empty cells
            const aAvg = aRange.length === 2 ? (aRange[0] + aRange[1]) / 2 : 0;
            const bAvg = bRange.length === 2 ? (bRange[0] + bRange[1]) / 2 : 0;
            
            return isAscending ? aAvg - bAvg : bAvg - aAvg;
        } else {
            // Default string comparison
            const aValue = aCell.textContent.trim().toLowerCase();
            const bValue = bCell.textContent.trim().toLowerCase();
            return isAscending ? 
                aValue.localeCompare(bValue) : 
                bValue.localeCompare(aValue);
        }
    });
    
    // Reorder the rows in the table
    rows.forEach(row => tbody.appendChild(row));
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initializeSearch); 