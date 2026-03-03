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
        <div class=\"mt-4 overflow-x-auto rounded-2xl border border-neutral-200 bg-white\">
            <table class=\"min-w-full text-left text-sm\">
                <thead>
                    <tr class=\"border-b border-neutral-200\">
                        <th class=\"px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">S.No</th>
                        <th class=\"px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Subcategory</th>
                        <th class=\"px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Item</th>
                        <th class=\"px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">UOM</th>
                        <th class=\"px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Rate</th>
                        <th class=\"px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Qty</th>
                        <th class=\"px-4 py-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase\">Amount</th>
                        <th class=\"px-4 py-3\"></th>
                    </tr>
                </thead>
                <tbody class=\"items-tbody divide-y divide-neutral-100\">
                </tbody>
            </table>
        </div>
        <button
            type=\"button\"
            class=\"add-row-btn inline-flex items-center justify-center rounded-full px-4 py-2 text-xs tracking-wide uppercase border border-brand text-brand hover:bg-brand hover:text-white transition-all duration-200 mt-4\">
            Add Row
        </button>
    `;

    container.appendChild(section);

    const categorySelect = section.querySelector('.category-select');
    const addRowBtn = section.querySelector('.add-row-btn');
    const removeCategoryBtn = section.querySelector('.remove-category-btn');

    if (categorySelect) {
        populateCategorySelect(categorySelect);
        categorySelect.addEventListener('change', () => {
            const categoryId = categorySelect.value;
            const categoryName = categorySelect.options[categorySelect.selectedIndex]?.textContent || '';
            section.dataset.categoryId = categoryId;
            section.dataset.categoryName = categoryName;
            // Clear rows when category changes
            const tbody = section.querySelector('.items-tbody');
            if (tbody) tbody.innerHTML = '';
            updateGrandTotal();
        });
    }

    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => addRowToSection(section));
    }

    if (removeCategoryBtn) {
        removeCategoryBtn.addEventListener('click', () => {
            section.remove();
            updateGrandTotal();
        });
    }
}

async function addRowToSection(section) {
    const categoryId = section.dataset.categoryId;
    if (!categoryId) {
        showWarning('Please select a category first');
        return;
    }

    const tbody = section.querySelector('.items-tbody');
    if (!tbody) return;

    const rowIndex = tbody.children.length + 1;

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class=\"row-index px-4 py-3 align-top text-sm text-text-muted\">${rowIndex}</td>
        <td class=\"px-4 py-3 align-top\">
            <select class=\"subcategory-select w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand\">
                <option value=\"\">Select Subcategory</option>
            </select>
        </td>
        <td class=\"px-4 py-3 align-top\">
            <select class=\"item-select w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand\">
                <option value=\"\">Select Item</option>
            </select>
        </td>
        <td class=\"px-4 py-3 align-top\">
            <input type=\"text\" class=\"uom-input w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50\" readonly>
        </td>
        <td class=\"px-4 py-3 align-top\">
            <input type=\"number\" class=\"rate-input w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50\" step=\"0.01\" readonly>
        </td>
        <td class=\"px-4 py-3 align-top\">
            <input type=\"number\" class=\"quantity-input w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white\" step=\"0.01\" min=\"0\">
        </td>
        <td class=\"px-4 py-3 align-top\">
            <input type=\"number\" class=\"amount-input w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-gray-50\" step=\"0.01\" readonly>
        </td>
        <td class=\"px-3 py-3 align-top text-right\">
            <button type=\"button\" class=\"remove-row-btn text-xs text-red-500 hover:text-red-700 transition-all duration-200\">✕</button>
        </td>
    `;

    tbody.appendChild(tr);

    const subcatSelect = tr.querySelector('.subcategory-select');
    const itemSelect = tr.querySelector('.item-select');
    const qtyInput = tr.querySelector('.quantity-input');
    const removeRowBtn = tr.querySelector('.remove-row-btn');
    const uomInput = tr.querySelector('.uom-input');
    const rateInput = tr.querySelector('.rate-input');

    // Load subcategories for the selected category
    if (subcatSelect) {
        const subcategories = await loadSubcategories(categoryId);
        subcatSelect.innerHTML = '<option value=\"\">Select Subcategory</option>';
        subcategories.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.textContent = sub.name;
            subcatSelect.appendChild(opt);
        });

        subcatSelect.addEventListener('change', async () => {
            const subId = subcatSelect.value;
            if (!itemSelect) return;
            itemSelect.innerHTML = '<option value=\"\">Select Item</option>';
            uomInput.value = '';
            rateInput.value = '';
            qtyInput.value = '';
            tr.querySelector('.amount-input').value = '';
            updateGrandTotal();

            if (!subId) return;
            const items = await loadItems(subId);
            items.forEach(it => {
                const opt = document.createElement('option');
                opt.value = it.id;
                opt.textContent = it.name;
                opt.dataset.uom = it.uom;
                opt.dataset.rate = it.rate;
                itemSelect.appendChild(opt);
            });
        });
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
    const sections = document.querySelectorAll('.category-section');

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

    try {
        const res = await fetch('/api/quotation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: customerName,
                project_name: projectName,
                date: date,
                items
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error saving quotation');
        }

        const quotation = await res.json();
        window.open(`/api/quotation/${quotation.id}/pdf`, '_blank');
        showSuccess('Quotation saved and PDF generated successfully!');
    } catch (err) {
        console.error('Error generating PDF', err);
        showError('Error generating PDF');
    }
}

