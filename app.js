// Configuration for Fuse.js
const fuseOptions = {
    keys: ['class'],
    threshold: 0.3,
    distance: 100
};

let fuse;
let itemsByClass = {};
let currentFocus = -1;
let selectedClass = null;

// Initialize data and search
async function initializeSearch() {
    try {
        // Load items from PathOfBuilding data
        const response = await fetch('items.json');
        itemsByClass = await response.json();
        
        // Initialize search input
        const searchInput = document.getElementById('search');
        searchInput.addEventListener('input', handleInput);
        searchInput.addEventListener('keydown', handleKeyDown);
        
        // Hide results table initially
        document.querySelector('.table-container').style.display = 'none';
        
    } catch (error) {
        console.error('Error initializing search:', error);
    }
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
        document.querySelector('.table-container').style.display = 'none';
        return;
    }
    
    // Get matching item classes
    const matches = Object.keys(itemsByClass)
        .filter(cls => cls.toLowerCase().includes(val))
        .slice(0, 10);
    
    // Create autocomplete dropdown if we have matches
    if (matches.length > 0) {
        autocompleteItems = document.createElement('div');
        autocompleteItems.id = 'autocomplete-items';
        autocompleteItems.className = 'autocomplete-items';
        
        matches.forEach((cls, index) => {
            const div = document.createElement('div');
            div.textContent = cls;
            div.addEventListener('click', () => {
                e.target.value = cls;
                selectedClass = cls;
                displayResults(itemsByClass[cls]);
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
            const cls = items[0].textContent;
            selectedClass = cls;
            e.target.value = cls;
            displayResults(itemsByClass[cls]);
            autocompleteItems.remove();
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
    
    // Determine if we're showing weapon or armor stats based on first item
    const firstItem = results[0];
    const isWeapon = firstItem.weapon !== null;
    const isArmour = firstItem.armour !== null;
    
    // Update table headers based on item type
    updateTableHeaders(isWeapon, isArmour);
    
    results.forEach(item => {
        const row = document.createElement('tr');
        
        // Helper function to format numeric values
        const formatNumber = (num) => num === 0 ? '0' : num || '';
        
        let statsHtml = '';
        if (isWeapon) {
            statsHtml = `
                <td>${formatNumber(item.weapon?.PhysicalMin)}</td>
                <td>${formatNumber(item.weapon?.PhysicalMax)}</td>
                <td>${formatNumber(item.weapon?.CritChanceBase)}</td>
                <td>${formatNumber(item.weapon?.AttackRateBase)}</td>
                <td>${formatNumber(item.weapon?.Range)}</td>
            `;
        } else if (isArmour) {
            statsHtml = `
                <td>${formatNumber(item.armour?.Armour)}</td>
                <td>${formatNumber(item.armour?.Evasion)}</td>
                <td>${formatNumber(item.armour?.EnergyShield)}</td>
                <td>${formatNumber(item.armour?.Ward)}</td>
                <td>${formatNumber(item.armour?.Block)}</td>
            `;
        }
        
        row.innerHTML = `
            <td>${item.baseType}</td>
            <td>${item.class}</td>
            <td>${item.implicit || ''}</td>
            ${statsHtml}
            <td>${formatRequirements(item.req)}</td>
        `;
        tbody.appendChild(row);
    });
    
    tableContainer.style.display = 'block';
}

function updateTableHeaders(isWeapon, isArmour) {
    const headerRow = document.querySelector('#results thead tr');
    const baseHeaders = `
        <th>Base Type</th>
        <th>Class</th>
        <th>Implicit</th>
    `;
    
    let statsHeaders = '';
    if (isWeapon) {
        statsHeaders = `
            <th>Physical Min</th>
            <th>Physical Max</th>
            <th>Crit Chance</th>
            <th>Attack Rate</th>
            <th>Range</th>
        `;
    } else if (isArmour) {
        statsHeaders = `
            <th>Armour</th>
            <th>Evasion</th>
            <th>Energy Shield</th>
            <th>Ward</th>
            <th>Block</th>
        `;
    }
    
    headerRow.innerHTML = `
        ${baseHeaders}
        ${statsHeaders}
        <th>Requirements</th>
    `;
}

function formatRequirements(req) {
    if (!req) return '';
    const parts = [];
    if (req.level) parts.push(`Level ${req.level}`);
    if (req.str) parts.push(`Str ${req.str}`);
    if (req.dex) parts.push(`Dex ${req.dex}`);
    if (req.int) parts.push(`Int ${req.int}`);
    return parts.join(', ');
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initializeSearch); 