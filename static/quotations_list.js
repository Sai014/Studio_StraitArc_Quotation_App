let quotations = [];
let categories = [];
let currentEditId = null;
let editCategorySectionCounter = 0;

const editSubcategoriesCache = {};
const editItemsCache = {};

// Load on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuotations();
    await loadCategories();
    
    // Hook up Add Category button in edit modal
    const editAddCategoryBtn = document.getElementById('editAddCategoryBtn');
    if (editAddCategoryBtn) {
        editAddCategoryBtn.addEventListener('click', () => addEditCategorySection());
    }
});

// Load all quotations
async function loadQuotations() {
    try {
        const response = await fetch('/api/quotations');
        quotations = await response.json();
        displayQuotations();
    } catch (error) {
        console.error('Error loading quotations:', error);
        showError('Error loading quotations');
    }
}

// Display quotations in table
function displayQuotations() {
    const tbody = document.getElementById('quotationsTableBody');
    
    if (quotations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-text-muted">
                    No quotations found. <a href="/quotation" class="text-brand hover:underline">Create your first quotation</a>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    quotations.forEach(q => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';
        
        const dateStr = new Date(q.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-text-dark">#${q.id}</td>
            <td class="px-6 py-4 text-sm text-text-dark">${q.customer_name}</td>
            <td class="px-6 py-4 text-sm text-text-dark">${q.project_name}</td>
            <td class="px-6 py-4 text-sm text-text-muted">${dateStr}</td>
            <td class="px-6 py-4 text-sm text-text-dark text-right font-medium">Rs. ${q.total_amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="editQuotation(${q.id})" class="text-xs text-brand hover:text-brand-accent underline underline-offset-4">
                        Edit
                    </button>
                    <span class="text-text-muted">|</span>
                    <button onclick="downloadPDF(${q.id})" class="text-xs text-brand hover:text-brand-accent underline underline-offset-4">
                        Download
                    </button>
                    <span class="text-text-muted">|</span>
                    <button onclick="deleteQuotation(${q.id})" class="text-xs text-red-500 hover:text-red-700 underline underline-offset-4">
                        Delete
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load categories for edit form
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Edit quotation
async function editQuotation(id) {
    currentEditId = id;
    editCategorySectionCounter = 0;
    
    try {
        const response = await fetch(`/api/quotation/${id}`);
        const quotation = await response.json();
        
        // Populate form
        document.getElementById('editCustomerName').value = quotation.customer_name;
        document.getElementById('editProjectName').value = quotation.project_name;
        document.getElementById('editDate').value = quotation.date;
        
        // Clear container
        const container = document.getElementById('editItemsContainer');
        container.innerHTML = '';
        
        // Load items grouped by category
        await loadQuotationItemsForEdit(quotation.items);
        
        // Show modal
        document.getElementById('editModal').classList.remove('hidden');
        document.getElementById('editModal').classList.add('flex');
        
        // Update grand total
        updateEditGrandTotal();
    } catch (error) {
        console.error('Error loading quotation:', error);
        showError('Error loading quotation');
    }
}

// Load quotation items for editing - create category sections with full functionality
async function loadQuotationItemsForEdit(items) {
    const container = document.getElementById('editItemsContainer');
    
    // Group items by category
    const itemsByCategory = {};
    items.forEach(item => {
        if (!itemsByCategory[item.category_name]) {
            itemsByCategory[item.category_name] = [];
        }
        itemsByCategory[item.category_name].push(item);
    });
    
    // Create category sections
    for (const [categoryName, categoryItems] of Object.entries(itemsByCategory)) {
        // Find category ID from name
        const category = categories.find(c => c.name === categoryName);
        if (!category) continue;
        
        // Create category section
        const section = await createEditCategorySection(category.id, categoryName);
        
        // Add rows for each item
        for (const item of categoryItems) {
            await addEditRowToSection(section, item);
        }
    }
}

// Create a category section in edit modal
async function createEditCategorySection(categoryId, categoryName) {
    editCategorySectionCounter += 1;
    const sectionId = editCategorySectionCounter;
    
    const container = document.getElementById('editItemsContainer');
    const section = document.createElement('div');
    section.className = 'category-section bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 space-y-4';
    section.dataset.sectionId = String(sectionId);
    section.dataset.categoryId = categoryId;
    section.dataset.categoryName = categoryName;
    
    section.innerHTML = `
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex-1">
                <label class="block text-xs font-medium tracking-wide text-text-muted uppercase mb-1">Category</label>
                <select class="category-select w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand">
                    <option value="">Select Category</option>
                </select>
            </div>
            <button type="button" class="remove-category-btn text-xs text-red-500 hover:text-red-700 transition-all duration-200 self-start sm:self-auto">
                Remove Category
            </button>
        </div>
        <div class="mt-4 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
            <table class="min-w-full text-left text-sm">
                <thead>
                    <tr class="border-b border-neutral-200">
                        <th class="px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">S.No</th>
                        <th class="px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Subcategory</th>
                        <th class="px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Item</th>
                        <th class="px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">UOM</th>
                        <th class="px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Rate</th>
                        <th class="px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Qty</th>
                        <th class="px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Amount</th>
                        <th class="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody class="items-tbody divide-y divide-neutral-100">
                </tbody>
            </table>
        </div>
        <button type="button" class="add-row-btn inline-flex items-center justify-center rounded-full px-4 py-2 text-xs tracking-wide uppercase border border-brand text-brand hover:bg-brand hover:text-white transition-all duration-200 mt-4">
            Add Row
        </button>
    `;
    
    container.appendChild(section);
    
    const categorySelect = section.querySelector('.category-select');
    const addRowBtn = section.querySelector('.add-row-btn');
    const removeCategoryBtn = section.querySelector('.remove-category-btn');
    
    // Populate category dropdown
    if (categorySelect) {
        populateEditCategorySelect(categorySelect);
        categorySelect.value = categoryId;
        categorySelect.addEventListener('change', () => {
            const newCategoryId = categorySelect.value;
            const newCategoryName = categorySelect.options[categorySelect.selectedIndex]?.textContent || '';
            section.dataset.categoryId = newCategoryId;
            section.dataset.categoryName = newCategoryName;
            // Clear rows when category changes
            const tbody = section.querySelector('.items-tbody');
            if (tbody) tbody.innerHTML = '';
            updateEditGrandTotal();
        });
    }
    
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => addEditRowToSection(section));
    }
    
    if (removeCategoryBtn) {
        removeCategoryBtn.addEventListener('click', () => {
            section.remove();
            updateEditGrandTotal();
        });
    }
    
    return section;
}

// Add a new empty category section
function addEditCategorySection() {
    createEditCategorySection('', '');
}

// Populate category select dropdown
function populateEditCategorySelect(selectEl) {
    selectEl.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        selectEl.appendChild(opt);
    });
}

// Add row to section (with optional pre-filled item data)
async function addEditRowToSection(section, existingItem = null) {
    const categoryId = section.dataset.categoryId;
    if (!categoryId && !existingItem) {
        showWarning('Please select a category first');
        return;
    }
    
    const tbody = section.querySelector('.items-tbody');
    if (!tbody) return;
    
    const rowIndex = tbody.children.length + 1;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="row-index px-4 py-3 align-top text-sm text-text-muted">${rowIndex}</td>
        <td class="px-4 py-3 align-top">
            <select class="subcategory-select w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="">Select Subcategory</option>
            </select>
        </td>
        <td class="px-4 py-3 align-top">
            <select class="item-select w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="">Select Item</option>
            </select>
        </td>
        <td class="px-4 py-3 align-top">
            <input type="text" class="uom-input w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50" readonly>
        </td>
        <td class="px-4 py-3 align-top">
            <input type="number" class="rate-input w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50" step="0.01" readonly>
        </td>
        <td class="px-4 py-3 align-top">
            <input type="number" class="quantity-input w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white" step="0.01" min="0">
        </td>
        <td class="px-4 py-3 align-top">
            <input type="number" class="amount-input w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50" step="0.01" readonly>
        </td>
        <td class="px-3 py-3 align-top text-right">
            <button type="button" class="remove-row-btn text-xs text-red-500 hover:text-red-700 transition-all duration-200">✕</button>
        </td>
    `;
    
    tbody.appendChild(tr);
    
    const subcatSelect = tr.querySelector('.subcategory-select');
    const itemSelect = tr.querySelector('.item-select');
    const qtyInput = tr.querySelector('.quantity-input');
    const removeRowBtn = tr.querySelector('.remove-row-btn');
    const uomInput = tr.querySelector('.uom-input');
    const rateInput = tr.querySelector('.rate-input');
    const amountInput = tr.querySelector('.amount-input');
    
    const activeCategoryId = categoryId || (existingItem ? categories.find(c => c.name === existingItem.category_name)?.id : null);
    
    // Load subcategories
    if (subcatSelect && activeCategoryId) {
        const subcategories = await loadEditSubcategories(activeCategoryId);
        subcatSelect.innerHTML = '<option value="">Select Subcategory</option>';
        subcategories.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.textContent = sub.name;
            subcatSelect.appendChild(opt);
        });
        
        // If existing item, select the subcategory
        if (existingItem) {
            const subcategory = subcategories.find(s => s.name === existingItem.subcategory_name);
            if (subcategory) {
                subcatSelect.value = subcategory.id;
            }
        }
        
        subcatSelect.addEventListener('change', async () => {
            const subId = subcatSelect.value;
            if (!itemSelect) return;
            itemSelect.innerHTML = '<option value="">Select Item</option>';
            uomInput.value = '';
            rateInput.value = '';
            qtyInput.value = '';
            amountInput.value = '';
            updateEditGrandTotal();
            
            if (!subId) return;
            const items = await loadEditItems(subId);
            items.forEach(it => {
                const opt = document.createElement('option');
                opt.value = it.id;
                opt.textContent = it.name;
                opt.dataset.uom = it.uom;
                opt.dataset.rate = it.rate;
                itemSelect.appendChild(opt);
            });
            
            // If existing item, select the item
            if (existingItem && subId) {
                const item = items.find(i => i.name === existingItem.item_name);
                if (item) {
                    itemSelect.value = item.id;
                    uomInput.value = item.uom;
                    rateInput.value = item.rate;
                    qtyInput.value = existingItem.quantity;
                    amountInput.value = existingItem.amount.toFixed(2);
                    updateEditGrandTotal();
                }
            }
        });
        
        // Trigger change if we have existing item
        if (existingItem) {
            subcatSelect.dispatchEvent(new Event('change'));
        }
    }
    
    if (itemSelect) {
        itemSelect.addEventListener('change', () => {
            const opt = itemSelect.options[itemSelect.selectedIndex];
            if (opt && opt.value) {
                uomInput.value = opt.dataset.uom || '';
                rateInput.value = opt.dataset.rate || '';
            } else {
                uomInput.value = '';
                rateInput.value = '';
            }
            updateEditRowAmount(tr);
        });
    }
    
    if (qtyInput) {
        qtyInput.addEventListener('input', () => updateEditRowAmount(tr));
    }
    
    if (removeRowBtn) {
        removeRowBtn.addEventListener('click', () => {
            tr.remove();
            renumberEditRows(tbody);
            updateEditGrandTotal();
        });
    }
}

async function loadEditSubcategories(categoryId) {
    if (editSubcategoriesCache[categoryId]) return editSubcategoriesCache[categoryId];
    try {
        const res = await fetch(`/api/subcategories/${categoryId}`);
        const data = await res.json();
        editSubcategoriesCache[categoryId] = data;
        return data;
    } catch (err) {
        console.error('Error loading subcategories', err);
        return [];
    }
}

async function loadEditItems(subcategoryId) {
    if (editItemsCache[subcategoryId]) return editItemsCache[subcategoryId];
    try {
        const res = await fetch(`/api/items/${subcategoryId}`);
        const data = await res.json();
        editItemsCache[subcategoryId] = data;
        return data;
    } catch (err) {
        console.error('Error loading items', err);
        return [];
    }
}

function updateEditRowAmount(tr) {
    const rate = parseFloat(tr.querySelector('.rate-input').value) || 0;
    const qty = parseFloat(tr.querySelector('.quantity-input').value) || 0;
    const amount = rate * qty;
    tr.querySelector('.amount-input').value = amount.toFixed(2);
    updateEditGrandTotal();
}

function renumberEditRows(tbody) {
    Array.from(tbody.children).forEach((row, index) => {
        const idxCell = row.querySelector('.row-index');
        if (idxCell) idxCell.textContent = index + 1;
    });
}

function updateEditGrandTotal() {
    let total = 0;
    document.querySelectorAll('#editItemsContainer .amount-input').forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val)) total += val;
    });
    const grandTotalEl = document.getElementById('editGrandTotal');
    if (grandTotalEl) {
        grandTotalEl.textContent = `Rs. ${total.toFixed(2)}`;
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('editModal').classList.remove('flex');
    currentEditId = null;
    const container = document.getElementById('editItemsContainer');
    container.innerHTML = '';
}

// Save edited quotation
document.getElementById('editQuotationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentEditId) return;
    
    try {
        // Collect all items from the form
        const items = [];
        const sections = document.querySelectorAll('#editItemsContainer .category-section');
        
        sections.forEach(section => {
            const categoryId = section.dataset.categoryId;
            const categoryName = section.dataset.categoryName;
            if (!categoryId) return;
            
            const rows = section.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const subcatSelect = row.querySelector('.subcategory-select');
                const itemSelect = row.querySelector('.item-select');
                const uomInput = row.querySelector('.uom-input');
                const rateInput = row.querySelector('.rate-input');
                const qtyInput = row.querySelector('.quantity-input');
                const amountInput = row.querySelector('.amount-input');
                
                const subcatId = subcatSelect.value;
                const itemId = itemSelect.value;
                const qty = parseFloat(qtyInput.value) || 0;
                if (!subcatId || !itemId || qty <= 0) return;
                
                const subcatName = subcatSelect.options[subcatSelect.selectedIndex]?.textContent || '';
                const itemName = itemSelect.options[itemSelect.selectedIndex]?.textContent || '';
                
                items.push({
                    category_name: categoryName,
                    subcategory_name: subcatName,
                    item_name: itemName,
                    uom: uomInput.value,
                    quantity: qty,
                    rate: parseFloat(rateInput.value) || 0,
                    amount: parseFloat(amountInput.value) || 0
                });
            });
        });
        
        if (items.length === 0) {
            showWarning('Please add at least one complete item row');
            return;
        }
        
        const updateData = {
            customer_name: document.getElementById('editCustomerName').value,
            project_name: document.getElementById('editProjectName').value,
            date: document.getElementById('editDate').value,
            items: items
        };
        
        const response = await fetch(`/api/quotation/${currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            showSuccess('Quotation updated successfully!');
            closeEditModal();
            await loadQuotations();
        } else {
            const error = await response.json();
            showError(error.detail || 'Error updating quotation');
        }
    } catch (error) {
        console.error('Error updating quotation:', error);
        showError('Error updating quotation');
    }
});

// Download PDF
function downloadPDF(id) {
    window.open(`/api/quotation/${id}/pdf`, '_blank');
}

// Delete quotation
async function deleteQuotation(id) {
    const confirmed = await showConfirm(
        'Are you sure you want to delete this quotation? This action cannot be undone.',
        { title: 'Delete Quotation', confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/quotation/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Quotation deleted successfully');
            await loadQuotations();
        } else {
            const error = await response.json();
            showError(error.detail || 'Error deleting quotation');
        }
    } catch (error) {
        console.error('Error deleting quotation:', error);
        showError('Error deleting quotation');
    }
}
