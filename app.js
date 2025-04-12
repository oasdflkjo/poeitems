// Configuration for Fuse.js
const fuseOptions = {
    keys: ['class', 'subclass', 'searchText'],
    threshold: 0.2,
    distance: 50
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

function calculateMaxColumnWidths(items) {
    // Reset max widths
    maxColumnWidths = {
        name: 0,
        class: 0
    };
    
    // Calculate max widths from all items
    items.forEach(item => {
        maxColumnWidths.name = Math.max(maxColumnWidths.name, item.name.length);
        maxColumnWidths.class = Math.max(maxColumnWidths.class, item.class.length);
    });
    
    // Add some padding to the max widths
    maxColumnWidths.name += 2;
    maxColumnWidths.class += 2;
    
    // Apply the max widths to the CSS
    applyColumnWidths();
}

function applyColumnWidths() {
    // Create or update the style element
    let styleEl = document.getElementById('column-widths-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'column-widths-style';
        document.head.appendChild(styleEl);
    }
    
    // Calculate widths in characters (ch units)
    const nameWidth = maxColumnWidths.name;
    const classWidth = maxColumnWidths.class;
    
    // Update the styles
    styleEl.textContent = `
        .table-container th:nth-child(1),
        .table-container td:nth-child(1) {
            min-width: ${nameWidth}ch;
            max-width: ${nameWidth}ch;
            width: ${nameWidth}ch;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .table-container th:nth-child(2),
        .table-container td:nth-child(2) {
            min-width: ${classWidth}ch;
            max-width: ${classWidth}ch;
            width: ${classWidth}ch;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    `;
}

// Initialize data and search
async function initializeSearch() {
    try {
        // Load items from PathOfBuilding data
        const response = await fetch('items.json');
        const data = await response.json();
        
        // Calculate max column widths first
        calculateMaxColumnWidths(data);
        
        // Group items by class and prepare search data
        itemsByClass = {};
        const searchData = [];
        
        data.forEach(item => {
            if (!itemsByClass[item.class]) {
                itemsByClass[item.class] = [];
            }
            itemsByClass[item.class].push(item);
            
            // Track subclasses for each class
            if (item.subclass) {
                if (!uniqueSubclasses.has(item.class)) {
                    uniqueSubclasses.set(item.class, new Set());
                }
                uniqueSubclasses.get(item.class).add(item.subclass);
            }
        });
        
        // Create search entries for classes and subclasses
        Object.entries(itemsByClass).forEach(([cls, items]) => {
            // Add main class entry
            searchData.push({
                text: cls,
                type: 'class',
                class: cls
            });
            
            // Add subclass entries if any
            const subclasses = uniqueSubclasses.get(cls);
            if (subclasses) {
                subclasses.forEach(subclass => {
                    searchData.push({
                        text: `${cls} - ${subclass}`,
                        type: 'subclass',
                        class: cls,
                        subclass: subclass
                    });
                });
            }
        });
        
        // Initialize Fuse.js with search data
        fuse = new Fuse(searchData, fuseOptions);
        
        // Extract all unique classes
        uniqueClasses = new Set(Object.keys(itemsByClass));
        
        // Initialize search input
        const searchInput = document.getElementById('search');
        searchInput.addEventListener('input', handleInput);
        searchInput.addEventListener('keydown', handleKeyDown);
        
        // Create class buttons for quick access
        createClassButtons();
        
        // Hide results table initially
        document.querySelector('.table-container').style.display = 'none';
        
    } catch (error) {
        console.error('Error initializing search:', error);
    }
}

function createClassButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'class-buttons';
    
    // Sort classes for better organization
    const sortedClasses = Array.from(uniqueClasses).sort();
    
    sortedClasses.forEach(cls => {
        const button = document.createElement('button');
        button.textContent = cls;
        button.addEventListener('click', () => {
            const searchInput = document.getElementById('search');
            searchInput.value = cls;
            selectedClass = cls;
            selectedSubclass = null;
            
            // Remove active class from all buttons
            buttonContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show subclass buttons if available
            updateSubclassButtons(cls);
            
            // Display all items of this class
            const results = itemsByClass[cls] || [];
            displayResults(results);
        });
        buttonContainer.appendChild(button);
    });
    
    // Insert after search container
    const searchContainer = document.querySelector('.search-container');
    searchContainer.parentNode.insertBefore(buttonContainer, searchContainer.nextSibling);
    
    // Create subclass button container
    const subclassContainer = document.createElement('div');
    subclassContainer.className = 'subclass-buttons';
    subclassContainer.style.display = 'none';
    buttonContainer.parentNode.insertBefore(subclassContainer, buttonContainer.nextSibling);
}

function updateSubclassButtons(cls) {
    const subclassContainer = document.querySelector('.subclass-buttons');
    subclassContainer.innerHTML = '';
    
    const subclasses = uniqueSubclasses.get(cls);
    if (!subclasses || subclasses.size === 0) {
        subclassContainer.style.display = 'none';
        return;
    }
    
    // Add "All" button
    const allButton = document.createElement('button');
    allButton.textContent = 'All';
    allButton.classList.add('active');
    allButton.addEventListener('click', () => {
        selectedSubclass = null;
        const results = itemsByClass[cls] || [];
        displayResults(results);
        
        // Update active state
        subclassContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        allButton.classList.add('active');
    });
    subclassContainer.appendChild(allButton);
    
    // Add subclass buttons
    Array.from(subclasses).sort().forEach(subclass => {
        const button = document.createElement('button');
        button.textContent = subclass;
        button.addEventListener('click', () => {
            selectedSubclass = subclass;
            const results = (itemsByClass[cls] || []).filter(item => item.subclass === subclass);
            displayResults(results);
            
            // Update active state
            subclassContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
        });
        subclassContainer.appendChild(button);
    });
    
    subclassContainer.style.display = 'flex';
}

function handleInput(e) {
    const searchContainer = document.querySelector('.search-container');
    const val = e.target.value.toLowerCase();
    
    // Remove existing autocomplete items
    let autocompleteItems = document.getElementById('autocomplete-items');
    if (autocompleteItems) {
        autocompleteItems.remove();
    }
    
    if (!val) {
        selectedClass = null;
        selectedSubclass = null;
        document.querySelector('.table-container').style.display = 'none';
        return;
    }
    
    // Get fuzzy search matches
    const matches = fuse.search(val).slice(0, 10);
    
    // Create autocomplete dropdown if we have matches
    if (matches.length > 0) {
        autocompleteItems = document.createElement('div');
        autocompleteItems.id = 'autocomplete-items';
        autocompleteItems.className = 'autocomplete-items';
        
        matches.forEach((match, index) => {
            const div = document.createElement('div');
            const item = match.item;
            
            // Style differently based on type
            div.className = item.type === 'class' ? 'class-option' : 'subclass-option';
            div.textContent = item.text;
            
            div.addEventListener('click', () => {
                e.target.value = item.text;
                selectedClass = item.class;
                selectedSubclass = item.subclass;
                
                // Get and filter results
                let results = itemsByClass[item.class] || [];
                if (item.subclass) {
                    results = results.filter(r => r.subclass === item.subclass);
                }
                
                displayResults(results);
                autocompleteItems.remove();
            });
            
            autocompleteItems.appendChild(div);
        });
        
        // Position the dropdown below the search input
        const searchBox = e.target.getBoundingClientRect();
        autocompleteItems.style.width = searchBox.width + 'px';
        autocompleteItems.style.left = '50%';
        autocompleteItems.style.transform = 'translateX(-50%)';
        searchContainer.appendChild(autocompleteItems);
        
        // Reset current focus
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
            // If no item is focused but we have matches, select the first one
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
    resultsDiv.innerHTML = '';

    if (results.length === 0) {
        resultsDiv.innerHTML = 'No items found';
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Show table container
    document.querySelector('.table-container').style.display = 'block';
    
    // Analyze which fields are actually used in the results
    const usedFields = analyzeUsedFields(results);
    
    // Create header row based on used fields
    updateTableHeaders(usedFields, thead);
    
    // Create data rows
    results.forEach(item => {
        const row = document.createElement('tr');
        
        // Basic info (always show name and class)
        const cells = [
            createCell(item.name),
            createCell(item.class)
        ];
        
        // Requirements (only if they exist)
        if (usedFields.requirements.level) cells.push(createCell(item.requirements.level || 0, 'numeric level-col'));
        if (usedFields.requirements.strength) cells.push(createCell(item.requirements.strength || 0, 'numeric'));
        if (usedFields.requirements.dexterity) cells.push(createCell(item.requirements.dexterity || 0, 'numeric'));
        if (usedFields.requirements.intelligence) cells.push(createCell(item.requirements.intelligence || 0, 'numeric'));
        
        // Add stats based on item type
        if (item.weaponStats && usedFields.weaponStats) {
            const ws = item.weaponStats;
            if (usedFields.weaponStats.physicalDamage) {
                cells.push(createCell(ws.physicalDamage ? `${ws.physicalDamage[0]}-${ws.physicalDamage[1]}` : '0-0', 'range-col'));
            }
            if (usedFields.weaponStats.attacksPerSecond) {
                cells.push(createCell((ws.attacksPerSecond || 0).toFixed(2), 'numeric'));
            }
            if (usedFields.weaponStats.criticalStrikeChance) {
                cells.push(createCell((ws.criticalStrikeChance || 0) + '%', 'numeric'));
            }
            if (usedFields.weaponStats.range) {
                cells.push(createCell(ws.range || 0, 'numeric'));
            }
        } else if (item.armorStats && usedFields.armorStats) {
            const as = item.armorStats;
            if (usedFields.armorStats.armor && as.armor !== undefined) cells.push(createCell(as.armor, 'numeric'));
            if (usedFields.armorStats.evasion && as.evasion !== undefined) cells.push(createCell(as.evasion, 'numeric'));
            if (usedFields.armorStats.energyShield && as.energyShield !== undefined) cells.push(createCell(as.energyShield, 'numeric'));
            if (usedFields.armorStats.ward && as.ward !== undefined) cells.push(createCell(as.ward, 'numeric'));
        }
        
        cells.forEach(cell => row.appendChild(cell));
        tbody.appendChild(row);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    resultsDiv.appendChild(table);
}

function analyzeUsedFields(results) {
    const fields = {
        requirements: {
            level: false,
            strength: false,
            dexterity: false,
            intelligence: false
        },
        weaponStats: null,
        armorStats: null
    };
    
    // Check each item for used fields
    results.forEach(item => {
        // Check requirements
        if (item.requirements) {
            if (item.requirements.level > 0) fields.requirements.level = true;
            if (item.requirements.strength > 0) fields.requirements.strength = true;
            if (item.requirements.dexterity > 0) fields.requirements.dexterity = true;
            if (item.requirements.intelligence > 0) fields.requirements.intelligence = true;
        }
        
        // Initialize weapon stats tracking if we find any
        if (item.weaponStats) {
            if (!fields.weaponStats) {
                fields.weaponStats = {
                    physicalDamage: false,
                    attacksPerSecond: false,
                    criticalStrikeChance: false,
                    range: false
                };
            }
            const ws = item.weaponStats;
            if (ws.physicalDamage && (ws.physicalDamage[0] > 0 || ws.physicalDamage[1] > 0)) {
                fields.weaponStats.physicalDamage = true;
            }
            if (ws.attacksPerSecond > 0) fields.weaponStats.attacksPerSecond = true;
            if (ws.criticalStrikeChance > 0) fields.weaponStats.criticalStrikeChance = true;
            if (ws.range > 0) fields.weaponStats.range = true;
        }
        
        // Initialize armor stats tracking if we find any
        if (item.armorStats) {
            if (!fields.armorStats) {
                fields.armorStats = {
                    armor: false,
                    evasion: false,
                    energyShield: false,
                    ward: false
                };
            }
            const as = item.armorStats;
            if (as.armor > 0) fields.armorStats.armor = true;
            if (as.evasion > 0) fields.armorStats.evasion = true;
            if (as.energyShield > 0) fields.armorStats.energyShield = true;
            if (as.ward > 0) fields.armorStats.ward = true;
        }
    });
    
    return fields;
}

function updateTableHeaders(usedFields, thead) {
    const headerRow = document.createElement('tr');
    
    // Define base headers that are always shown
    const headers = [
        { text: 'Name', sortable: true, type: 'string' },
        { text: 'Class', sortable: true, type: 'string' }
    ];
    
    // Add requirement headers if they're used
    if (usedFields.requirements.level) {
        headers.push({ text: 'Level Req', sortable: true, type: 'numeric', className: 'level-col' });
    }
    if (usedFields.requirements.strength) {
        headers.push({ text: 'Str Req', sortable: true, type: 'numeric' });
    }
    if (usedFields.requirements.dexterity) {
        headers.push({ text: 'Dex Req', sortable: true, type: 'numeric' });
    }
    if (usedFields.requirements.intelligence) {
        headers.push({ text: 'Int Req', sortable: true, type: 'numeric' });
    }
    
    // Add weapon stats headers if they're used
    if (usedFields.weaponStats) {
        if (usedFields.weaponStats.physicalDamage) {
            headers.push({ text: 'Physical Damage', sortable: true, type: 'range', className: 'range-col' });
        }
        if (usedFields.weaponStats.attacksPerSecond) {
            headers.push({ text: 'Attacks/sec', sortable: true, type: 'numeric' });
        }
        if (usedFields.weaponStats.criticalStrikeChance) {
            headers.push({ text: 'Crit Chance', sortable: true, type: 'numeric' });
        }
        if (usedFields.weaponStats.range) {
            headers.push({ text: 'Range', sortable: true, type: 'numeric' });
        }
    }
    
    // Add armor stats headers if they're used
    if (usedFields.armorStats) {
        if (usedFields.armorStats.armor) {
            headers.push({ text: 'Armor', sortable: true, type: 'numeric' });
        }
        if (usedFields.armorStats.evasion) {
            headers.push({ text: 'Evasion', sortable: true, type: 'numeric' });
        }
        if (usedFields.armorStats.energyShield) {
            headers.push({ text: 'Energy Shield', sortable: true, type: 'numeric' });
        }
        if (usedFields.armorStats.ward) {
            headers.push({ text: 'Ward', sortable: true, type: 'numeric' });
        }
    }
    
    // Create header cells
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.text;
        
        if (header.sortable) {
            th.className = 'sortable';
            if (header.className) th.className += ' ' + header.className;
            th.addEventListener('click', () => sortTable(th, header.type));
        }
        
        headerRow.appendChild(th);
    });
    
    thead.innerHTML = '';
    thead.appendChild(headerRow);
}

function sortTable(header, type) {
    const table = header.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
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
            const [aMin, aMax] = (aCell.textContent.split('-').map(Number) || [0, 0]);
            const [bMin, bMax] = (bCell.textContent.split('-').map(Number) || [0, 0]);
            const aAvg = (aMin + aMax) / 2;
            const bAvg = (bMin + bMax) / 2;
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

function createCell(content, className = '') {
    const td = document.createElement('td');
    td.textContent = content;
    if (className) td.className = className;
    
    // Add title attribute for potential overflow
    td.title = content;
    
    return td;
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initializeSearch); 