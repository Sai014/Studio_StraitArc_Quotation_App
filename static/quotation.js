// Simple, section-based quotation builder

let categories = [];
let categorySectionCounter = 0;

const subcategoriesCache = {};
const itemsCache = {};

// Load on page ready
document.addEventListener('DOMContentLoaded', async () => {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('quotationDate');
    if (dateInput) dateInput.value = today;

    // Load categories once
    try {
        const res = await fetch('/api/categories');
        categories = await res.json();
    } catch (err) {
        console.error('Error loading categories', err);
        categories = [];
    }

    // Hook up Add Category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => addCategorySection());
    }
});

function populateCategorySelect(selectEl) {
    selectEl.innerHTML = '<option value=\"\">Select Category</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        selectEl.appendChild(opt);
    });
}

let subcategorySectionCounter = 0;

function addCategorySection() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    categorySectionCounter += 1;
    const sectionId = categorySectionCounter;

    const section = document.createElement('div');
    section.className =
        'category-section bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 space-y-4';
    section.dataset.sectionId = String(sectionId);

    section.innerHTML = `
        <div class=\"flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between\">
            <div class=\"flex-1\">
                <label class=\"block text-xs font-medium tracking-wide text-text-muted uppercase mb-1\">Category</label>
                <select class=\"category-select w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand\">
                    <option value=\"\">Select Category</option>
                </select>
            </div>
            <button
                type=\"button\"
                class=\"remove-category-btn text-xs text-red-500 hover:text-red-700 transition-all duration-200 self-start sm:self-auto\">
                Remove Category
            </button>
        </div>
        <div class=\"subcategories-container space-y-4 mt-4\">
        </div>
        <button
            type=\"button\"
            class=\"add-subcategory-btn inline-flex items-center justify-center rounded-full px-4 py-2 text-xs tracking-wide uppercase border border-brand text-brand hover:bg-brand hover:text-white transition-all duration-200\">
            Add Subcategory
        </button>
    `;

    container.appendChild(section);

    const categorySelect = section.querySelector('.category-select');
    const addSubcategoryBtn = section.querySelector('.add-subcategory-btn');
    const removeCategoryBtn = section.querySelector('.remove-category-btn');
    const subcategoriesContainer = section.querySelector('.subcategories-container');

    if (categorySelect) {
        populateCategorySelect(categorySelect);
        categorySelect.addEventListener('change', () => {
            const categoryId = categorySelect.value;
            const categoryName = categorySelect.options[categorySelect.selectedIndex]?.textContent || '';
            section.dataset.categoryId = categoryId;
            section.dataset.categoryName = categoryName;
            // Clear all subcategory sections when category changes
            if (subcategoriesContainer) subcategoriesContainer.innerHTML = '';
            updateGrandTotal();
        });
    }

    if (addSubcategoryBtn) {
        addSubcategoryBtn.addEventListener('click', () => {
            console.log('Add Subcategory button clicked');
            const categoryId = section.dataset.categoryId;
            console.log('Category ID:', categoryId);
            if (!categoryId) {
                showWarning('Please select a category first');
                return;
            }
            console.log('Calling addSubcategorySection');
            addSubcategorySection(section, categoryId);
        });
    }

    if (removeCategoryBtn) {
        removeCategoryBtn.addEventListener('click', () => {
            section.remove();
            updateGrandTotal();
        });
    }
}

function addSubcategorySection(categorySection, categoryId) {
    console.log('addSubcategorySection called with categoryId:', categoryId);
    subcategorySectionCounter += 1;
    const subcategorySectionId = subcategorySectionCounter;
    const subcategoriesContainer = categorySection.querySelector('.subcategories-container');
    console.log('Subcategories container found:', !!subcategoriesContainer);
    if (!subcategoriesContainer) {
        console.error('Subcategories container not found!');
        return;
    }

    const subcategorySection = document.createElement('div');
    subcategorySection.className =
        'subcategory-section bg-gray-50 rounded-xl border border-neutral-200 p-4 space-y-3';
    subcategorySection.dataset.subcategorySectionId = String(subcategorySectionId);
    subcategorySection.dataset.categoryId = categoryId;

    subcategorySection.innerHTML = `
        <div class=\"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between\">
            <div class=\"flex-1\">
                <label class=\"block text-xs font-medium tracking-wide text-text-muted uppercase mb-1\">Subcategory</label>
                <select class=\"subcategory-select w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand\">
                    <option value=\"\">Select Subcategory</option>
                </select>
            </div>
            <button
                type=\"button\"
                class=\"remove-subcategory-btn text-xs text-red-500 hover:text-red-700 transition-all duration-200 self-start sm:self-auto mt-6 sm:mt-0\">
                Remove Subcategory
            </button>
        </div>
        <div class=\"mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white\">
            <table class=\"min-w-full text-left text-sm\">
                <thead>
                    <tr class=\"border-b border-neutral-200\">
                        <th class=\"px-4 py-2 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">S.No</th>
                        <th class=\"px-4 py-2 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Item</th>
                        <th class=\"px-4 py-2 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">UOM</th>
                        <th class=\"px-4 py-2 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Rate</th>
                        <th class=\"px-4 py-2 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Qty</th>
                        <th class=\"px-4 py-2 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Amount</th>
                        <th class=\"px-4 py-2\"></th>
                    </tr>
                </thead>
                <tbody class=\"items-tbody divide-y divide-neutral-100\">
                </tbody>
            </table>
        </div>
        <button
            type=\"button\"
            class=\"add-row-btn inline-flex items-center justify-center rounded-full px-4 py-2 text-xs tracking-wide uppercase border border-brand text-brand hover:bg-brand hover:text-white transition-all duration-200\">
            Add Row
        </button>
    `;

    subcategoriesContainer.appendChild(subcategorySection);

    const subcategorySelect = subcategorySection.querySelector('.subcategory-select');
    const addRowBtn = subcategorySection.querySelector('.add-row-btn');
    const removeSubcategoryBtn = subcategorySection.querySelector('.remove-subcategory-btn');

    // Load subcategories for the category
    if (subcategorySelect) {
        loadSubcategories(categoryId).then(subcategories => {
            subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
            subcategories.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub.id;
                opt.textContent = sub.name;
                subcategorySelect.appendChild(opt);
            });
        });

        subcategorySelect.addEventListener('change', () => {
            const subcategoryId = subcategorySelect.value;
            const subcategoryName = subcategorySelect.options[subcategorySelect.selectedIndex]?.textContent || '';
            subcategorySection.dataset.subcategoryId = subcategoryId;
            subcategorySection.dataset.subcategoryName = subcategoryName;
            // Clear rows when subcategory changes
            const tbody = subcategorySection.querySelector('.items-tbody');
            if (tbody) tbody.innerHTML = '';
            updateGrandTotal();
        });
    }

    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => addRowToSubcategorySection(subcategorySection, categoryId));
    }

    if (removeSubcategoryBtn) {
        removeSubcategoryBtn.addEventListener('click', () => {
            subcategorySection.remove();
            updateGrandTotal();
        });
    }
}

async function addRowToSubcategorySection(subcategorySection, categoryId) {
    const subcategoryId = subcategorySection.dataset.subcategoryId;
    if (!subcategoryId) {
        showWarning('Please select a subcategory first');
        return;
    }

    const tbody = subcategorySection.querySelector('.items-tbody');
    if (!tbody) return;

    const rowIndex = tbody.children.length + 1;

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class=\"row-index px-4 py-2 align-top text-sm text-text-muted\">${rowIndex}</td>
        <td class=\"px-4 py-2 align-top\">
            <select class=\"item-select w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand\">
                <option value=\"\">Select Item</option>
            </select>
        </td>
        <td class=\"px-4 py-2 align-top\">
            <input type=\"text\" class=\"uom-input w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50\" readonly>
        </td>
        <td class=\"px-4 py-2 align-top\">
            <input type=\"number\" class=\"rate-input w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50\" step=\"0.01\" readonly>
        </td>
        <td class=\"px-4 py-2 align-top\">
            <input type=\"number\" class=\"quantity-input w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white\" step=\"0.01\" min=\"0\">
        </td>
        <td class=\"px-4 py-2 align-top\">
            <input type=\"number\" class=\"amount-input w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50\" step=\"0.01\" readonly>
        </td>
        <td class=\"px-3 py-2 align-top text-right\">
            <button type=\"button\" class=\"remove-row-btn text-xs text-red-500 hover:text-red-700 transition-all duration-200\">✕</button>
        </td>
    `;

    tbody.appendChild(tr);

    const itemSelect = tr.querySelector('.item-select');
    const qtyInput = tr.querySelector('.quantity-input');
    const removeRowBtn = tr.querySelector('.remove-row-btn');
    const uomInput = tr.querySelector('.uom-input');
    const rateInput = tr.querySelector('.rate-input');

    // Load items for the selected subcategory
    if (itemSelect) {
        const items = await loadItems(subcategoryId);
        itemSelect.innerHTML = '<option value="">Select Item</option>';
        items.forEach(it => {
            const opt = document.createElement('option');
            opt.value = it.id;
            opt.textContent = it.name;
            opt.dataset.uom = it.uom;
            opt.dataset.rate = it.rate;
            itemSelect.appendChild(opt);
        });

        itemSelect.addEventListener('change', () => {
            const opt = itemSelect.options[itemSelect.selectedIndex];
            if (opt && opt.value) {
                uomInput.value = opt.dataset.uom || '';
                rateInput.value = opt.dataset.rate || '';
            } else {
                uomInput.value = '';
                rateInput.value = '';
            }
            updateRowAmount(tr);
        });
    }

    if (qtyInput) {
        qtyInput.addEventListener('input', () => updateRowAmount(tr));
    }

    if (removeRowBtn) {
        removeRowBtn.addEventListener('click', () => {
            tr.remove();
            renumberRows(tbody);
            updateGrandTotal();
        });
    }
}

async function loadSubcategories(categoryId) {
    if (subcategoriesCache[categoryId]) return subcategoriesCache[categoryId];
    try {
        const res = await fetch(`/api/subcategories/${categoryId}`);
        const data = await res.json();
        subcategoriesCache[categoryId] = data;
        return data;
    } catch (err) {
        console.error('Error loading subcategories', err);
        return [];
    }
}

async function loadItems(subcategoryId) {
    if (itemsCache[subcategoryId]) return itemsCache[subcategoryId];
    try {
        const res = await fetch(`/api/items/${subcategoryId}`);
        const data = await res.json();
        itemsCache[subcategoryId] = data;
        return data;
    } catch (err) {
        console.error('Error loading items', err);
        return [];
    }
}

function updateRowAmount(tr) {
    const rate = parseFloat(tr.querySelector('.rate-input').value) || 0;
    const qty = parseFloat(tr.querySelector('.quantity-input').value) || 0;
    const amount = rate * qty;
    tr.querySelector('.amount-input').value = amount.toFixed(2);
    updateGrandTotal();
}

function renumberRows(tbody) {
    Array.from(tbody.children).forEach((row, index) => {
        const idxCell = row.querySelector('.row-index');
        if (idxCell) idxCell.textContent = index + 1;
    });
}

function updateGrandTotal() {
    let total = 0;
    document.querySelectorAll('.amount-input').forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val)) total += val;
    });
    const grandTotalEl = document.getElementById('grandTotal');
    if (grandTotalEl) {
        grandTotalEl.textContent = `₹${total.toFixed(2)}`;
    }
}

// PDF Modal functions
function openPDFModal() {
    const modal = document.getElementById('pdfModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }
}

function closePDFModal() {
    const modal = document.getElementById('pdfModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// Make modal functions globally available
window.openPDFModal = openPDFModal;
window.closePDFModal = closePDFModal;

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('pdfModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePDFModal();
            }
        });
    }
});

// Get column visibility settings
function getColumnVisibility() {
    return {
        showSNo: document.getElementById('colSNo').checked,
        showSubcategory: document.getElementById('colSubcategory').checked,
        showItem: document.getElementById('colItem').checked,
        showUOM: document.getElementById('colUOM').checked,
        showRate: document.getElementById('colRate').checked,
        showQty: document.getElementById('colQty').checked,
        showAmount: document.getElementById('colAmount').checked
    };
}

// Generate PDF using all sections
async function generatePDF() {
    const customerName = document.getElementById('customerName').value.trim();
    const projectName = document.getElementById('projectName').value.trim();
    const date = document.getElementById('quotationDate').value;

    if (!customerName) {
        showWarning('Please enter customer name');
        return;
    }
    if (!projectName) {
        showWarning('Please enter project name');
        return;
    }
    if (!date) {
        showWarning('Please select a date');
        return;
    }

    const items = [];
    const categorySections = document.querySelectorAll('.category-section');

    categorySections.forEach(categorySection => {
        const categoryId = categorySection.dataset.categoryId;
        const categoryName = categorySection.dataset.categoryName;
        if (!categoryId) return;

        // Get all subcategory sections within this category
        const subcategorySections = categorySection.querySelectorAll('.subcategory-section');
        subcategorySections.forEach(subcategorySection => {
            const subcategoryId = subcategorySection.dataset.subcategoryId;
            const subcategoryName = subcategorySection.dataset.subcategoryName;
            if (!subcategoryId) return;

            // Get all rows within this subcategory section
            const rows = subcategorySection.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const itemSelect = row.querySelector('.item-select');
                const uomInput = row.querySelector('.uom-input');
                const rateInput = row.querySelector('.rate-input');
                const qtyInput = row.querySelector('.quantity-input');
                const amountInput = row.querySelector('.amount-input');

                const itemId = itemSelect.value;
                const qty = parseFloat(qtyInput.value) || 0;
                if (!itemId || qty <= 0) return;

                const itemName = itemSelect.options[itemSelect.selectedIndex]?.textContent || '';

                items.push({
                    category_name: categoryName,
                    subcategory_name: subcategoryName,
                    item_name: itemName,
                    uom: uomInput.value,
                    quantity: qty,
                    rate: parseFloat(rateInput.value) || 0,
                    amount: parseFloat(amountInput.value) || 0
                });
            });
        });
    });

    if (items.length === 0) {
        showWarning('Please add at least one complete item row');
        return;
    }

    // Get column visibility settings
    const columnVisibility = getColumnVisibility();
    
    // Ensure at least one column is selected
    const hasAnyColumn = Object.values(columnVisibility).some(v => v === true);
    if (!hasAnyColumn) {
        showWarning('Please select at least one column to display');
        return;
    }

    try {
        const res = await fetch('/api/quotation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: customerName,
                project_name: projectName,
                date: date,
                items,
                column_visibility: columnVisibility
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error saving quotation');
        }

        const quotation = await res.json();
        // Pass column visibility as query parameters
        // Convert boolean values to strings for URLSearchParams
        const params = new URLSearchParams();
        Object.keys(columnVisibility).forEach(key => {
            params.append(key, columnVisibility[key].toString());
        });
        window.open(`/api/quotation/${quotation.id}/pdf?${params.toString()}`, '_blank');
        showSuccess('Quotation saved and PDF generated successfully!');
        
        // Close the modal after successful generation
        closePDFModal();
    } catch (err) {
        console.error('Error generating PDF', err);
        showError('Error generating PDF');
    }
}

