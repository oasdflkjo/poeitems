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

// Initialize data and search
async function initializeSearch() {
    try {
        // Load items from PathOfBuilding data
        const response = await fetch('items.json');
        const data = await response.json();
        
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
    const tableContainer = document.querySelector('.table-container');
    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';
    
    if (!results || results.length === 0) {
        tableContainer.style.display = 'none';
        return;
    }
    
    // Get the first item to determine available fields
    const firstItem = results[0];
    
    // Update table headers based on available fields
    updateTableHeaders(firstItem);
    
    results.forEach(item => {
        const row = document.createElement('tr');
        
        // Helper function to format numeric values
        const formatNumber = (num) => {
            if (Array.isArray(num)) {
                return num.map(n => n.toFixed(2)).join('-');
            }
            return num === 0 ? '0' : num?.toFixed(2) || '';
        };
        
        // Add base columns
        let cells = `
            <td>${item.name}</td>
            <td>${item.class}</td>
            <td>${item.implicit || ''}</td>
        `;
        
        // Add weapon stats if present
        if (item.weaponStats) {
            cells += `
                <td>${formatNumber(item.weaponStats.physicalDamage)}</td>
                <td>${formatNumber(item.weaponStats.criticalStrikeChance)}</td>
                <td>${formatNumber(item.weaponStats.attacksPerSecond)}</td>
                <td>${formatNumber(item.weaponStats.range)}</td>
            `;
        }
        
        // Add armor stats if present
        if (item.armorStats) {
            cells += `
                <td>${formatNumber(item.armorStats.armor)}</td>
                <td>${formatNumber(item.armorStats.evasion)}</td>
                <td>${formatNumber(item.armorStats.energyShield)}</td>
                <td>${formatNumber(item.armorStats.ward)}</td>
            `;
        }
        
        // Add requirements
        const reqs = [];
        if (item.requirements) {
            if (item.requirements.level) reqs.push(`Level ${item.requirements.level}`);
            if (item.requirements.strength) reqs.push(`Str ${item.requirements.strength}`);
            if (item.requirements.dexterity) reqs.push(`Dex ${item.requirements.dexterity}`);
            if (item.requirements.intelligence) reqs.push(`Int ${item.requirements.intelligence}`);
        }
        cells += `<td>${reqs.join(', ')}</td>`;
        
        row.innerHTML = cells;
        tbody.appendChild(row);
    });
    
    tableContainer.style.display = 'block';
}

function updateTableHeaders(item) {
    const headerRow = document.querySelector('#results thead tr');
    
    // Start with base columns
    let headers = `
        <th>Name</th>
        <th>Class</th>
        <th>Implicit</th>
    `;
    
    // Add weapon stat headers if the item has weapon stats
    if (item.weaponStats) {
        headers += `
            <th>Physical Damage</th>
            <th>Critical Strike Chance</th>
            <th>Attacks per Second</th>
            <th>Range</th>
        `;
    }
    
    // Add armor stat headers if the item has armor stats
    if (item.armorStats) {
        headers += `
            <th>Armor</th>
            <th>Evasion</th>
            <th>Energy Shield</th>
            <th>Ward</th>
        `;
    }
    
    // Add requirements header
    headers += '<th>Requirements</th>';
    
    headerRow.innerHTML = headers;
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initializeSearch); 