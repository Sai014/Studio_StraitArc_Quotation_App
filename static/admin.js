let categories = [];
let subcategories = [];

// Load categories on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    populateCategoryDropdowns();
    // Initialize items list message
    document.getElementById('itemsList').innerHTML = '<p>Select a category to start adding items</p>';
});

// Load all categories
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
        displayCategories();
        populateCategoryDropdowns();
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('Error loading categories');
    }
}

// Display categories
function displayCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = '';
    
    categories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <span class="list-item-name">${category.name}</span>
            <div class="list-item-actions">
                <button onclick="deleteCategory(${category.id})" class="btn btn-danger">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Add category
async function addCategory() {
    const nameInput = document.getElementById('categoryName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showWarning('Please enter a category name');
        return;
    }
    
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            nameInput.value = '';
            await loadCategories();
        } else {
            const error = await response.json();
            showError(error.detail || 'Error adding category');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showError('Error adding category');
    }
}

// Delete category
async function deleteCategory(id) {
    const confirmed = await showConfirm(
        'Are you sure you want to delete this category? This will also delete all associated subcategories and items.',
        { title: 'Delete Category', confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/categories/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadCategories();
            await loadSubcategories();
        } else {
            showError('Error deleting category');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showError('Error deleting category');
    }
}

// Populate category dropdowns
function populateCategoryDropdowns() {
    const subcategoryDropdown = document.getElementById('subcategoryCategory');
    const itemCategoryDropdown = document.getElementById('itemCategory');
    
    // Clear existing options (except first)
    subcategoryDropdown.innerHTML = '<option value="">Select Category</option>';
    itemCategoryDropdown.innerHTML = '<option value="">Select Category</option>';
    
    categories.forEach(category => {
        const option1 = document.createElement('option');
        option1.value = category.id;
        option1.textContent = category.name;
        subcategoryDropdown.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = category.id;
        option2.textContent = category.name;
        itemCategoryDropdown.appendChild(option2);
    });
    
    // Add event listener for item category dropdown
    itemCategoryDropdown.addEventListener('change', async (e) => {
        const categoryId = e.target.value;
        if (categoryId) {
            const selectedCategory = categories.find(c => c.id == categoryId);
            if (selectedCategory) {
                document.getElementById('selectedCategoryName').textContent = selectedCategory.name;
                document.getElementById('itemCategoryDisplay').style.display = 'block';
                document.getElementById('itemFormGroup').style.display = 'flex';
                document.getElementById('itemCategory').style.display = 'none';
                document.getElementById('changeCategoryBtn').style.display = 'inline-block';
                await loadSubcategoriesForCategory(categoryId);
                await loadItemsForCategory(categoryId);
            }
        }
    });
}

// Change category - reset to allow selecting a new category
function changeCategory() {
    document.getElementById('itemCategory').value = '';
    document.getElementById('itemCategoryDisplay').style.display = 'none';
    document.getElementById('itemFormGroup').style.display = 'none';
    document.getElementById('itemCategory').style.display = 'block';
    document.getElementById('changeCategoryBtn').style.display = 'none';
    document.getElementById('itemSubcategory').innerHTML = '<option value="">Select Subcategory</option>';
    document.getElementById('itemName').value = '';
    document.getElementById('itemUOM').value = '';
    document.getElementById('itemRate').value = '';
    document.getElementById('itemsList').innerHTML = '<p>Select a category to start adding items</p>';
}

// Load subcategories for a category
async function loadSubcategoriesForCategory(categoryId) {
    try {
        const response = await fetch(`/api/subcategories/${categoryId}`);
        const subs = await response.json();
        
        const dropdown = document.getElementById('itemSubcategory');
        dropdown.innerHTML = '<option value="">Select Subcategory</option>';
        
        subs.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading subcategories:', error);
    }
}

// Add subcategory
async function addSubcategory() {
    const categoryId = document.getElementById('subcategoryCategory').value;
    const nameInput = document.getElementById('subcategoryName');
    const name = nameInput.value.trim();
    
    if (!categoryId) {
        showWarning('Please select a category');
        return;
    }
    
    if (!name) {
        showWarning('Please enter a subcategory name');
        return;
    }
    
    try {
        const response = await fetch('/api/subcategories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, category_id: parseInt(categoryId) })
        });
        
        if (response.ok) {
            nameInput.value = '';
            document.getElementById('subcategoryCategory').value = '';
            await loadSubcategories();
        } else {
            const error = await response.json();
            showError(error.detail || 'Error adding subcategory');
        }
    } catch (error) {
        console.error('Error adding subcategory:', error);
        showError('Error adding subcategory');
    }
}

// Load all subcategories
async function loadSubcategories() {
    try {
        // Load subcategories for the selected category in the dropdown
        const categoryId = document.getElementById('subcategoryCategory').value;
        if (categoryId) {
            const response = await fetch(`/api/subcategories/${categoryId}`);
            subcategories = await response.json();
            displaySubcategories();
        } else {
            document.getElementById('subcategoriesList').innerHTML = '<p>Select a category to view subcategories</p>';
        }
    } catch (error) {
        console.error('Error loading subcategories:', error);
    }
}

// Display subcategories
function displaySubcategories() {
    const container = document.getElementById('subcategoriesList');
    container.innerHTML = '';
    
    if (subcategories.length === 0) {
        container.innerHTML = '<p>No subcategories found for this category</p>';
        return;
    }
    
    subcategories.forEach(subcategory => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <span class="list-item-name">${subcategory.name}</span>
            <div class="list-item-actions">
                <button onclick="deleteSubcategory(${subcategory.id})" class="btn btn-danger">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Delete subcategory
async function deleteSubcategory(id) {
    const confirmed = await showConfirm(
        'Are you sure you want to delete this subcategory? This will also delete all associated items.',
        { title: 'Delete Subcategory', confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/subcategories/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadSubcategories();
            await loadItems();
        } else {
            showError('Error deleting subcategory');
        }
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        showError('Error deleting subcategory');
    }
}

// Add event listener for subcategory category dropdown
document.getElementById('subcategoryCategory').addEventListener('change', loadSubcategories);

// Add item
async function addItem() {
    const categoryId = document.getElementById('itemCategory').value;
    const subcategoryId = document.getElementById('itemSubcategory').value;
    const nameInput = document.getElementById('itemName');
    const uomInput = document.getElementById('itemUOM');
    const rateInput = document.getElementById('itemRate');
    
    const name = nameInput.value.trim();
    const uom = uomInput.value.trim();
    const rate = parseFloat(rateInput.value);
    
    if (!categoryId) {
        showWarning('Please select a category');
        return;
    }
    
    if (!subcategoryId) {
        showWarning('Please select a subcategory');
        return;
    }
    
    if (!name) {
        showWarning('Please enter an item name');
        return;
    }
    
    if (!uom) {
        showWarning('Please enter unit of measure');
        return;
    }
    
    if (isNaN(rate) || rate <= 0) {
        showWarning('Please enter a valid rate');
        return;
    }
    
    try {
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                subcategory_id: parseInt(subcategoryId),
                uom,
                rate
            })
        });
        
        if (response.ok) {
            // Clear only item fields, keep category and subcategory dropdowns
            nameInput.value = '';
            uomInput.value = '';
            rateInput.value = '';
            // Don't reset category or subcategory - allow adding more items
            await loadItemsForCategory(categoryId);
        } else {
            const error = await response.json();
            showError(error.detail || 'Error adding item');
        }
    } catch (error) {
        console.error('Error adding item:', error);
        showError('Error adding item');
    }
}

// Load items for a category (all subcategories)
let items = [];
let currentCategoryId = null;

async function loadItemsForCategory(categoryId) {
    if (!categoryId) {
        document.getElementById('itemsList').innerHTML = '<p>Select a category to view items</p>';
        return;
    }
    
    try {
        // Get all subcategories for this category
        const subcatsResponse = await fetch(`/api/subcategories/${categoryId}`);
        const subcategories = await subcatsResponse.json();
        
        // Load items from all subcategories
        items = [];
        for (const subcat of subcategories) {
            const itemsResponse = await fetch(`/api/items/${subcat.id}`);
            const subcatItems = await itemsResponse.json();
            // Add subcategory name to each item for display
            subcatItems.forEach(item => {
                item.subcategory_name = subcat.name;
            });
            items = items.concat(subcatItems);
        }
        
        displayItems();
    } catch (error) {
        console.error('Error loading items:', error);
        showError('Error loading items');
    }
}

// Load items for a specific subcategory (legacy function, kept for compatibility)
async function loadItems() {
    const subcategoryId = document.getElementById('itemSubcategory').value;
    const categoryId = document.getElementById('itemCategory').value;
    
    if (categoryId) {
        await loadItemsForCategory(categoryId);
    } else if (subcategoryId) {
        try {
            const response = await fetch(`/api/items/${subcategoryId}`);
            items = await response.json();
            displayItems();
        } catch (error) {
            console.error('Error loading items:', error);
            showError('Error loading items');
        }
    } else {
        document.getElementById('itemsList').innerHTML = '<p>Select a category to view items</p>';
    }
}

// Display items
function displayItems() {
    const container = document.getElementById('itemsList');
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = '<p>No items found for this category</p>';
        return;
    }
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div>
                <span class="list-item-name">${item.name}</span>
                <div style="font-size: 0.9em; color: #718096; margin-top: 5px;">
                    ${item.subcategory_name ? `Subcategory: ${item.subcategory_name} | ` : ''}UOM: ${item.uom} | Rate: ₹${item.rate.toFixed(2)}
                </div>
            </div>
            <div class="list-item-actions">
                <button onclick="deleteItem(${item.id})" class="btn btn-danger">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Delete item
async function deleteItem(id) {
    const confirmed = await showConfirm(
        'Are you sure you want to delete this item?',
        { title: 'Delete Item', confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/items/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const categoryId = document.getElementById('itemCategory').value;
            if (categoryId) {
                await loadItemsForCategory(categoryId);
            } else {
                await loadItems();
            }
        } else {
            showError('Error deleting item');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showError('Error deleting item');
    }
}

// Add event listener for item subcategory dropdown - reload items when subcategory changes
document.getElementById('itemSubcategory').addEventListener('change', async function() {
    const categoryId = document.getElementById('itemCategory').value;
    if (categoryId) {
        await loadItemsForCategory(categoryId);
    }
});
