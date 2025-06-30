// =================================================================
//           نظام إدارة المحل - حزمة التطوير الشاملة V5.2 (إدارة المخزون)
// =================================================================

// -------------------- الحالة العامة والإعدادات --------------------
const API_URL = 'http://127.0.0.1:5000/api';
let allProducts = [], allOrders = [], allCategories = [], governoratesData = {}, allSuppliers = [];
const orderStatuses = ["جديد", "مؤكد", "للتوصيل", "تم التسليم", "ملغي"];
const paymentMethods = ["كاش", "محفظة إلكترونية", "إنستا باي"];
const CURRENT_USER_ID = 1;

// -------------------- نقطة بداية التطبيق --------------------
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    console.log("--- بدء تهيئة التطبيق ---");
    try {
        await checkServerStatus();
        setupEventListeners();
        await loadInitialData();
        showPage('orders');
        console.log("--- اكتملت تهيئة التطبيق بنجاح ---");
    } catch (error) {
        console.error("!!! خطأ فادح أثناء تهيئة التطبيق !!!", error);
        document.body.innerHTML = `<div class="fixed inset-0 flex items-center justify-center bg-red-100 text-red-800 p-8"><div class="text-center"><h1>حدث خطأ فادح</h1><p class="mt-2">لا يمكن تشغيل التطبيق.</p></div></div>`;
    }
}

function setupEventListeners() {
    // Event listeners القديمة
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('location-form').addEventListener('submit', handleAddLocation);
    document.getElementById('openAddOrderModalBtn').addEventListener('click', openAddOrderModal);
    document.getElementById('generateReportBtn').addEventListener('click', loadDashboardReport);
    document.getElementById('orderSearchInput').addEventListener('input', debounce(() => loadOrders(true), 300));
    document.getElementById('detailedReportBtn').addEventListener('click', loadDetailedReport);

    // Event listeners الجديدة الخاصة بالمخزون
    document.getElementById('supplierForm').addEventListener('submit', handleAddSupplier);
    document.getElementById('purchaseForm').addEventListener('submit', handlePurchaseSubmit);
}

async function loadInitialData() {
    // إضافة تحميل الموردين عند بدء التشغيل
    await Promise.all([ loadLocations(), loadCategories(), loadProducts(), loadSuppliers() ]);
    await loadOrders(false);
    populateStaticDropdowns();
    setDefaultDates();
    await loadDashboardReport();
    const statusFilter = document.getElementById('detailedReportStatus');
    statusFilter.innerHTML = '<option value="">-- كل الحالات --</option>';
    orderStatuses.forEach(s => statusFilter.innerHTML += `<option value="${s}">${s}</option>`);
    addPurchaseItemRow(); // إضافة صف شراء فارغ عند التحميل
}

// -------------------- دوال استدعاء الـ API وتحميل البيانات --------------------

async function loadResource(url, resourceName) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.success) return result.data;
        else throw new Error(result.error || `Failed to load ${resourceName}`);
    } catch (e) {
        console.error(`Failed to load ${resourceName}:`, e);
        throw e;
    }
}

async function checkServerStatus() {
    const statusIndicator = document.getElementById('status-indicator');
    try {
        await fetch(`${API_URL}/health`);
        statusIndicator.textContent = 'متصل';
        statusIndicator.style.color = '#10b981';
    } catch (e) {
        statusIndicator.textContent = 'غير متصل بالخادم';
        statusIndicator.style.color = '#ef4444';
        throw new Error("Server connection failed");
    }
}

async function loadLocations() {
    governoratesData = await loadResource(`${API_URL}/locations`, 'Locations');
    renderLocationsList();
    populateGovernorates('governorate');
}
async function loadCategories() {
    allCategories = await loadResource(`${API_URL}/categories`, 'Categories');
    populateCategories('productCategory');
}
async function loadProducts() {
    allProducts = await loadResource(`${API_URL}/products`, 'Products');
    renderProducts();
}
async function loadOrders(isSearch = false) {
    const list = document.getElementById('saved-orders-list');
    list.innerHTML = `<div class="text-center p-4 text-gray-500">جاري التحميل...</div>`;
    const searchTerm = document.getElementById('orderSearchInput').value;
    const url = searchTerm && isSearch ? `${API_URL}/orders?search=${searchTerm}` : `${API_URL}/orders`;
    allOrders = await loadResource(url, 'Orders');
    renderOrders();
}
// دالة جديدة لتحميل الموردين
async function loadSuppliers() {
    allSuppliers = await loadResource(`${API_URL}/suppliers`, 'Suppliers');
    renderSuppliersList();
    populateSupplierDropdown();
}


// --- (Render functions) ---
function renderProducts() {
    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = '';
    if (allProducts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">لا توجد منتجات.</td></tr>`;
        return;
    }
    allProducts.forEach(p => {
        const weightsHtml = p.weights.map(w =>
            `<div class="text-xs my-1 p-1 rounded ${w.Stock > 10 ? 'bg-green-100 text-green-800' : (w.Stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}"> 
                ${w.WeightName}: <strong>${w.Price}</strong> ج.م (مخزون: ${w.Stock})
            </div>`
        ).join('');

        tableBody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-semibold">${p.ProductName}</td>
                <td class="p-3 text-gray-600">${p.CategoryName}</td>
                <td class="p-3">${weightsHtml}</td>
                <td class="p-3">
                    <button onclick="editProduct(${p.ProductID})" class="text-blue-600 hover:text-blue-800" title="تعديل"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct(${p.ProductID})" class="text-red-600 hover:text-red-800 mr-2" title="حذف"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}
function renderOrders() {
    const list = document.getElementById('saved-orders-list');
    list.innerHTML = '';
    if (allOrders.length === 0) {
        list.innerHTML = `<div class="text-center p-8 text-gray-500">لا توجد طلبات لعرضها.</div>`;
        return;
    }
    allOrders.forEach(order => {
        const orderCard = `
            <div class="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-bold text-lg text-gray-800">${order.CustomerName || 'عميل غير مسجل'}</span>
                        <span class="text-sm text-gray-500 block">${order.PhoneNumber || ''}</span>
                        <span class="text-xs text-gray-400">#${order.InvoiceNumber}</span>
                    </div>
                    <div class="text-left">
                        <span class="font-bold text-xl text-blue-600">${order.FinalAmount.toFixed(2)} ج.م</span>
                        <span class="text-sm font-semibold text-white px-2 py-1 rounded-full ${getStatusColor(order.OrderStatus)}">${order.OrderStatus}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center mt-3 text-xs text-gray-500">
                    <span><i class="fas fa-calendar-alt mr-1"></i>${new Date(order.OrderDate).toLocaleString('ar-EG')}</span>
                    <button onclick="openEditOrderModal(${order.OrderID})" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-lg">عرض التفاصيل</button>
                </div>
            </div>
        `;
        list.innerHTML += orderCard;
    });
}
function renderLocationsList() {
    const listContainer = document.getElementById('locations-list');
    const datalist = document.getElementById('governorate-list');
    if (!listContainer || !datalist) return;
    listContainer.innerHTML = '';
    datalist.innerHTML = '';
    Object.keys(governoratesData).sort().forEach(gov => {
        datalist.innerHTML += `<option value="${gov}">`;
        const groupDiv = document.createElement('div');
        groupDiv.className = 'mb-3';
        const regionsHtml = governoratesData[gov].sort().map(region => `<li>${region}</li>`).join('');
        groupDiv.innerHTML = `<h4 class="font-bold text-gray-700">${gov}</h4><ul class="list-disc list-inside pr-4 text-sm">${regionsHtml}</ul>`;
        listContainer.appendChild(groupDiv);
    });
}
// دالة جديدة لعرض الموردين
function renderSuppliersList() {
    const container = document.getElementById('suppliers-list');
    container.innerHTML = '';
    if (allSuppliers.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-sm">لا يوجد موردين.</p>`;
        return;
    }
    allSuppliers.forEach(s => {
        container.innerHTML += `
            <div class="p-2 border-b text-sm">
                <p class="font-bold">${s.SupplierName}</p>
                <p class="text-xs text-gray-600">${s.PhoneNumber || 'لا يوجد رقم هاتف'}</p>
            </div>
        `;
    });
}


// --- (Modal management functions) ---
function openAddOrderModal() {
    resetOrderForm();
    const modal = document.getElementById('add-order-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
async function openEditOrderModal(orderId) {
    const order = await loadResource(`${API_URL}/orders/${orderId}`, 'Single Order');
    if (!order) { return alert('لم يتم العثور على الطلب'); }
    
    document.getElementById('edit-order-title').textContent = `تعديل الطلب #${order.InvoiceNumber}`;
    const invoiceHtml = createInvoiceHTML(order);
    document.getElementById('invoice-details-customer').innerHTML = invoiceHtml.replace('{{COPY_TITLE}}', 'نسخة العميل');
    document.getElementById('invoice-details-store').innerHTML = invoiceHtml.replace('{{COPY_TITLE}}', 'نسخة المحل');

    const formContainer = document.getElementById('editOrderForm');
    formContainer.innerHTML = `
        <input type="hidden" id="edit-orderId" value="${order.OrderID}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <input type="text" class="p-3 border rounded-lg bg-gray-200" value="${order.CustomerName || ''}" disabled>
             <input type="tel" class="p-3 border rounded-lg bg-gray-200" value="${order.PhoneNumber || ''}" disabled>
        </div>
        <div id="edit-order-product-list" class="space-y-2 mb-4"></div>
        <button type="button" onclick="addOrderProductRow('edit-order-product-list')" class="btn bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 w-full mb-4"><i class="fas fa-plus"></i> إضافة منتج</button>
        <div class="space-y-4">
            <div><label for="edit-orderNotes">الملاحظات</label><textarea id="edit-orderNotes" class="w-full p-3 border rounded-lg" rows="2">${order.Notes || ''}</textarea></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label for="edit-shippingCost">الشحن</label><input type="number" id="edit-shippingCost" value="${order.ShippingCost}" min="0" class="w-full p-2 border rounded-lg" oninput="updateEditOrderTotal()"></div>
                <div><label for="edit-discount">الخصم</label><input type="number" id="edit-discount" value="${order.DiscountAmount}" min="0" class="w-full p-2 border rounded-lg" oninput="updateEditOrderTotal()"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                 <div><label for="edit-paymentMethod">طريقة الدفع</label><select id="edit-paymentMethod" class="w-full p-2 border rounded-lg">${paymentMethods.map(p => `<option value="${p}" ${order.PaymentMethod === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
                 <div><label for="edit-amountPaid">المبلغ المدفوع</label><input type="number" id="edit-amountPaid" value="${order.AmountPaid}" min="0" class="w-full p-2 border rounded-lg" oninput="updateEditOrderTotal()"></div>
            </div>
             <div class="grid grid-cols-2 gap-4">
                <div><label for="edit-orderStatus">حالة الطلب</label><select id="edit-orderStatus" class="w-full p-2 border rounded-lg bg-gray-100">${orderStatuses.map(s => `<option value="${s}" ${order.OrderStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
                <div><label>حالة الدفع</label><div id="edit-paymentStatus" class="w-full p-2 rounded-lg text-white text-center font-semibold ${getPaymentStatusColor(order.PaymentStatus)}">${order.PaymentStatus}</div></div>
             </div>
            <div class="mt-4 pt-4 border-t text-lg"><div class="flex justify-between font-bold text-2xl text-blue-600"><span>الإجمالي:</span><span id="edit-total-price">${order.FinalAmount.toFixed(2)}</span></div></div>
        </div>`;

    order.items.forEach(item => addOrderProductRow('edit-order-product-list', item));
    
    document.getElementById('edit-order-modal').classList.remove('hidden');
    document.getElementById('edit-order-modal').classList.add('flex');
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}


// --- (Order creation and update logic) ---
function resetOrderForm() {
    document.getElementById('orderForm').reset();
    document.getElementById('order-product-list').innerHTML = '';
    document.getElementById('total-price').textContent = '0.00';
    addOrderProductRow('order-product-list');
}
async function handleOrderSubmit(event) {
    event.preventDefault();
    const finalTotal = parseFloat(document.getElementById('total-price').textContent);
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    const orderData = {
        customerName: document.getElementById('customerName').value,
        customerPhone: document.getElementById('customerPhone').value,
        governorate: document.getElementById('governorate').value,
        region: document.getElementById('region').value,
        notes: document.getElementById('orderNotes').value,
        shippingCost: parseFloat(document.getElementById('shippingCost').value) || 0,
        discount: parseFloat(document.getElementById('discount').value) || 0,
        finalTotal: finalTotal,
        paymentMethod: document.getElementById('paymentMethod').value,
        amountPaid: amountPaid,
        userId: CURRENT_USER_ID,
        paymentStatus: determinePaymentStatus(finalTotal, amountPaid),
        items: []
    };
    let subTotal = 0;
    document.querySelectorAll('#orderForm .order-item-row').forEach(row => {
        const priceId = row.querySelector('.item-price-id').value;
        if (!priceId) return;
        const unitPrice = parseFloat(row.querySelector('.item-price').value);
        const quantity = parseInt(row.querySelector('.item-qty').value, 10);
        subTotal += unitPrice * quantity;
        orderData.items.push({ priceId, quantity, unitPrice, totalPrice: unitPrice * quantity });
    });
    orderData.total = subTotal;
    if (orderData.items.length === 0) { return alert('يجب إضافة منتج واحد على الأقل للطلب.'); }
    try {
        const response = await fetch(`${API_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
        const result = await response.json();
        if (result.success) {
            alert('تم حفظ الطلب بنجاح');
            closeModal('add-order-modal');
            await Promise.all([loadOrders(), loadProducts(), loadDashboardReport()]);
        } else {
            alert(`خطأ في حفظ الطلب: ${result.error}`);
        }
    } catch (e) {
        alert('حدث خطأ في الاتصال بالخادم');
        console.error("Error submitting order:", e);
    }
}
async function handleUpdateOrder() {
    const orderId = document.getElementById('edit-orderId').value;
    const finalTotal = parseFloat(document.getElementById('edit-total-price').textContent);
    const amountPaid = parseFloat(document.getElementById('edit-amountPaid').value) || 0;
    const orderData = {
        status: document.getElementById('edit-orderStatus').value,
        paymentMethod: document.getElementById('edit-paymentMethod').value,
        amountPaid: amountPaid,
        shippingCost: parseFloat(document.getElementById('edit-shippingCost').value) || 0,
        discount: parseFloat(document.getElementById('edit-discount').value) || 0,
        finalTotal: finalTotal,
        paymentStatus: determinePaymentStatus(finalTotal, amountPaid),
        notes: document.getElementById('edit-orderNotes').value,
        items: []
    };
    let subTotal = 0;
    document.querySelectorAll('#edit-order-product-list .order-item-row').forEach(row => {
        const priceId = row.querySelector('.item-price-id').value;
        if (!priceId) return;
        const unitPrice = parseFloat(row.querySelector('.item-price').value);
        const quantity = parseInt(row.querySelector('.item-qty').value, 10);
        subTotal += unitPrice * quantity;
        orderData.items.push({ priceId, quantity, unitPrice, totalPrice: unitPrice * quantity });
    });
    orderData.total = subTotal;
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
        const result = await response.json();
        if (result.success) {
            alert('تم تحديث الطلب بنجاح');
            closeModal('edit-order-modal');
            await Promise.all([loadOrders(), loadProducts(), loadDashboardReport()]);
        } else {
            alert(`فشل التحديث: ${result.error}`);
        }
    } catch (e) {
        alert('حدث خطأ في الاتصال بالخادم');
        console.error("Error updating order:", e);
    }
}


// --- (Product management functions) ---
function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('weights-editor').innerHTML = '<h3 class="text-sm font-semibold text-gray-600">الأوزان والأسعار:</h3>';
    document.getElementById('product-form-title').textContent = 'إضافة منتج جديد';
    addWeightField();
}
async function handleProductSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById('productId').value;
    const weights = Array.from(document.querySelectorAll('#weights-editor > div')).map(div => ({
        name: div.querySelector('.weight-name').value,
        price: parseFloat(div.querySelector('.weight-price').value),
        stock: parseInt(div.querySelector('.weight-stock').value, 10),
        priceId: div.querySelector('.weight-price-id').value || null
    }));
    const data = { name: document.getElementById('productName').value, category_id: document.getElementById('productCategory').value, description: document.getElementById('productDescription').value, weights: weights };
    const url = productId ? `${API_URL}/products/${productId}` : `${API_URL}/products`;
    const method = productId ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            resetProductForm();
            await loadProducts();
        } else {
            alert(`خطأ: ${result.error}`);
        }
    } catch (err) {
        alert('فشل الاتصال بالخادم');
    }
}
function editProduct(productId) {
    const product = allProducts.find(p => p.ProductID === productId);
    if (!product) return;
    showPage('products');
    window.scrollTo(0, 0);
    document.getElementById('product-form-title').textContent = `تعديل: ${product.ProductName}`;
    document.getElementById('productId').value = product.ProductID;
    document.getElementById('productName').value = product.ProductName;
    document.getElementById('productCategory').value = product.CategoryID;
    document.getElementById('productDescription').value = product.Description;
    const weightsContainer = document.getElementById('weights-editor');
    weightsContainer.innerHTML = '<h3 class="text-sm font-semibold text-gray-600">الأوزان والأسعار:</h3>';
    product.weights.forEach(w => addWeightField({ name: w.WeightName, price: w.Price, stock: w.Stock, priceId: w.PriceID }));
}
async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ سيتم إخفاؤه من القوائم.')) return;
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            alert('تم حذف المنتج بنجاح');
            await loadProducts();
        } else {
            alert(`فشل الحذف: ${result.error}`);
        }
    } catch (e) {
        alert('فشل الاتصال بالخادم');
    }
}


// --- (Inventory & Purchase Functions) ---
async function handleAddSupplier(event) {
    event.preventDefault();
    const supplierData = {
        name: document.getElementById('supplierName').value,
        contact: document.getElementById('supplierContact').value,
        phone: document.getElementById('supplierPhone').value
    };
    if (!supplierData.name) {
        alert('اسم المورد مطلوب');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplierData)
        });
        const result = await response.json();
        if (result.success) {
            alert('تمت إضافة المورد بنجاح');
            document.getElementById('supplierForm').reset();
            await loadSuppliers(); // تحديث القائمة
        } else {
            alert(`خطأ: ${result.error}`);
        }
    } catch (err) {
        alert('فشل الاتصال بالخادم');
    }
}

async function handlePurchaseSubmit(event) {
    event.preventDefault();
    const purchaseData = {
        supplierId: document.getElementById('purchaseSupplier').value,
        notes: document.getElementById('purchaseNotes').value,
        items: []
    };

    let totalAmount = 0;
    document.querySelectorAll('.purchase-item-row').forEach(row => {
        const priceId = row.querySelector('.item-price-id').value;
        const quantity = parseInt(row.querySelector('.item-qty').value, 10);
        const costPrice = parseFloat(row.querySelector('.item-cost').value);

        if (priceId && quantity > 0 && costPrice >= 0) {
            const totalPrice = quantity * costPrice;
            totalAmount += totalPrice;
            purchaseData.items.push({ priceId, quantity, costPrice, totalPrice });
        }
    });

    if (!purchaseData.supplierId) {
        return alert('يجب اختيار مورد.');
    }
    if (purchaseData.items.length === 0) {
        return alert('يجب إضافة صنف واحد على الأقل لفاتورة الشراء.');
    }
    purchaseData.totalAmount = totalAmount;

    try {
        const response = await fetch(`${API_URL}/purchases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(purchaseData)
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            // تحديث قائمة المنتجات بالمخزون الجديد القادم من الـ API
            if (result.updated_products) {
                allProducts = result.updated_products;
                renderProducts();
            }
            // إعادة تعيين الفورم
            document.getElementById('purchaseForm').reset();
            document.getElementById('purchase-item-list').innerHTML = '<h3 class="text-md font-semibold text-gray-700">الأصناف المشتراة</h3>';
            addPurchaseItemRow();
            document.getElementById('purchase-total-price').textContent = '0.00';
        } else {
            alert(`خطأ في حفظ الفاتورة: ${result.error}`);
        }
    } catch (e) {
        alert('حدث خطأ في الاتصال بالخادم');
        console.error("Error submitting purchase:", e);
    }
}

// --- (Settings management functions) ---
async function handleAddLocation(e) {
    e.preventDefault();
    const gov = document.getElementById('new-governorate').value;
    const region = document.getElementById('new-region').value;
    try {
        const response = await fetch(`${API_URL}/locations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ governorate: gov, region: region }) });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            document.getElementById('location-form').reset();
            await loadLocations();
        } else {
            alert(`خطأ: ${result.error}`);
        }
    } catch (err) {
        alert('فشل الاتصال بالخادم');
    }
}


// --- (Reports functions) ---
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today;
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    document.getElementById('reportStartDate').value = thirtyDaysAgo;
}

async function loadDashboardReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const url = `${API_URL}/reports/dashboard?start_date=${startDate}&end_date=${endDate}`;
    try {
        const data = await loadResource(url, 'Dashboard Report');
        let totalSales = 0, totalOrders = 0;
        const statusCounts = {};
        orderStatuses.forEach(s => statusCounts[s] = 0); 

        if (data.statuses) {
            data.statuses.forEach(status => {
                const isCancelled = status.OrderStatus === 'ملغي';
                if (!isCancelled) {
                    totalSales += status.total;
                    totalOrders += status.count;
                }
                statusCounts[status.OrderStatus] = status.count;
            });
        }

        document.getElementById('kpi-total-sales').textContent = `${totalSales.toFixed(2)} ج.م`;
        document.getElementById('kpi-total-orders').textContent = totalOrders;
        const avgOrderValue = totalOrders > 0 ? (totalSales / totalOrders) : 0;
        document.getElementById('kpi-avg-order-value').textContent = `${avgOrderValue.toFixed(2)} ج.م`;

        const ctx = document.getElementById('status-chart');
        if (ctx) {
            if (window.myStatusChart) window.myStatusChart.destroy();
            window.myStatusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: Object.keys(statusCounts).map(s => getStatusColor(s, true))
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }
    } catch (e) { console.error("Failed to load dashboard report:", e); }
}

async function loadDetailedReport() {
    const tableBody = document.getElementById('detailed-report-table-body');
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">جاري البحث...</td></tr>';
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const status = document.getElementById('detailedReportStatus').value;
    const searchTerm = document.getElementById('detailedReportSearch').value;
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate, status: status, search_term: searchTerm });
    const url = `${API_URL}/reports/detailed_orders?${params.toString()}`;
    try {
        const orders = await loadResource(url, 'Detailed Report');
        renderDetailedReportTable(orders);
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-red-500">فشل تحميل التقرير.</td></tr>';
    }
}

function renderDetailedReportTable(orders) {
    const tableBody = document.getElementById('detailed-report-table-body');
    tableBody.innerHTML = '';
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">لا توجد طلبات تطابق معايير البحث.</td></tr>';
        return;
    }
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50 cursor-pointer';
        row.setAttribute('onclick', `toggleOrderDetails(${order.OrderID}, this)`);
        row.innerHTML = `
            <td class="p-3 text-center text-gray-400"><i class="fas fa-chevron-down"></i></td>
            <td class="p-3 text-sm">${order.InvoiceNumber}</td>
            <td class="p-3 text-sm">${new Date(order.OrderDate).toLocaleDateString('ar-EG')}</td>
            <td class="p-3 font-semibold">${order.CustomerName || ''}</td>
            <td class="p-3"><span class="text-xs font-semibold text-white px-2 py-1 rounded-full ${getStatusColor(order.OrderStatus)}">${order.OrderStatus}</span></td>
            <td class="p-3 font-bold text-blue-600">${order.FinalAmount.toFixed(2)} ج.م</td>
        `;
        tableBody.appendChild(row);
    });
}

async function toggleOrderDetails(orderId, rowElement) {
    const icon = rowElement.querySelector('i');
    const nextRow = rowElement.nextElementSibling;
    if (nextRow && nextRow.classList.contains('details-row')) {
        nextRow.remove();
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        return;
    }
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-spinner', 'fa-spin');
    try {
        const orderDetails = await loadResource(`${API_URL}/orders/${orderId}`, 'Single Order Details');
        if (!orderDetails) {
            alert('لا يمكن تحميل تفاصيل الطلب');
            return;
        }
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row bg-gray-50';
        const detailsCell = document.createElement('td');
        detailsCell.colSpan = 6;
        const itemsHtml = orderDetails.items.map(i => `
            <li class="flex justify-between items-center text-sm py-1">
                <span>${i.ProductName} (${i.WeightName}) x ${i.Quantity}</span>
                <span class="font-mono">${i.TotalPrice.toFixed(2)}</span>
            </li>
        `).join('');
        detailsCell.innerHTML = `
            <div class="p-4"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div>
                <h4 class="font-bold mb-2 text-gray-700">تفاصيل الأصناف:</h4>
                <ul class="space-y-1">${itemsHtml}</ul>
            </div><div>
                <h4 class="font-bold mb-2 text-gray-700">الملخص المالي:</h4>
                <div class="text-sm space-y-1">
                    <p class="flex justify-between"><span>إجمالي فرعي:</span> <span>${orderDetails.TotalAmount.toFixed(2)}</span></p>
                    <p class="flex justify-between"><span>شحن:</span> <span>${orderDetails.ShippingCost.toFixed(2)}</span></p>
                    <p class="flex justify-between text-red-500"><span>خصم:</span> <span>-${orderDetails.DiscountAmount.toFixed(2)}</span></p>
                    <hr class="my-1">
                    <p class="flex justify-between font-bold"><span>إجمالي الفاتورة:</span> <span>${orderDetails.FinalAmount.toFixed(2)}</span></p>
                    <p class="flex justify-between text-green-600"><span>المدفوع:</span> <span>${orderDetails.AmountPaid.toFixed(2)}</span></p>
                </div>
                <button onclick="openEditOrderModal(${orderId})" class="mt-4 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                    <i class="fas fa-file-invoice mr-2"></i>عرض وطباعة الفاتورة الكاملة
                </button>
            </div></div></div>`;
        detailsRow.appendChild(detailsCell);
        rowElement.parentNode.insertBefore(detailsRow, rowElement.nextSibling);
        icon.classList.remove('fa-spinner', 'fa-spin');
        icon.classList.add('fa-chevron-up');
    } catch (e) {
        console.error('Error fetching details:', e);
        icon.classList.remove('fa-spinner', 'fa-spin');
        icon.classList.add('fa-chevron-down');
    }
}


// --- (Helpers & UI functions) ---
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    const page = document.getElementById(`page-${pageId}`);
    const tab = document.getElementById(`tab-${pageId}`);
    if (page) page.style.display = 'block';
    if (tab) tab.classList.add('active-tab');
}
function debounce(func, delay) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => func.apply(this, args), delay); }; }
function printOrder() { window.print(); }

function addOrderProductRow(containerId, item = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rowId = `item-${Date.now()}${Math.random()}`;
    const rowHtml = `<div id="${rowId}" class="p-3 border rounded-lg bg-white space-y-2 order-item-row"><div class="grid grid-cols-12 gap-2 items-center"><div class="col-span-11 grid grid-cols-3 gap-2"><select class="p-2 border rounded item-category" onchange="populateProductsForCategory(this, '${rowId}')"><option value="">-- التصنيف --</option>${allCategories.map(c => `<option value="${c.CategoryID}">${c.CategoryName}</option>`).join('')}</select><select class="p-2 border rounded item-product" onchange="populateWeightsForProduct(this, '${rowId}')" disabled><option value="">-- المنتج --</option></select><select class="p-2 border rounded item-weight" onchange="updatePriceFromWeight(this, '${rowId}')" disabled><option value="">-- الوزن --</option></select></div><button type="button" onclick="removeRowAndUpdateTotal('${rowId}')" class="col-span-1 text-red-500 hover:text-red-700 text-lg justify-self-center"><i class="fas fa-trash-alt"></i></button></div><div class="grid grid-cols-4 gap-2 items-center"><div><label class="text-sm">الكمية</label><input type="number" value="${item.Quantity || 1}" min="1" class="w-full p-2 border rounded item-qty" oninput="updateOverallTotal(this)"></div><div><label class="text-sm">السعر</label><input type="text" class="w-full p-2 border rounded bg-gray-200 item-price" readonly></div><div class="col-span-2"><label class="text-sm">المخزون</label><input type="text" class="w-full p-2 border rounded bg-gray-200 item-stock" readonly></div></div><input type="hidden" class="item-price-id"></div>`;
    container.insertAdjacentHTML('beforeend', rowHtml);
    if (item.ProductID) {
        const product = allProducts.find(p => p.ProductID === item.ProductID);
        if (product) {
            const row = document.getElementById(rowId);
            row.querySelector('.item-category').value = product.CategoryID;
            populateProductsForCategory(row.querySelector('.item-category'), rowId, item.ProductID);
            populateWeightsForProduct(row.querySelector('.item-product'), rowId, item.PriceID);
            updatePriceFromWeight(row.querySelector('.item-weight'), rowId);
        }
    }
}
function addPurchaseItemRow() {
    const container = document.getElementById('purchase-item-list');
    if (!container) return;
    const rowId = `purchase-item-${Date.now()}${Math.random()}`;
    const rowHtml = `
        <div id="${rowId}" class="p-3 border rounded-lg bg-white space-y-2 purchase-item-row">
            <div class="grid grid-cols-12 gap-2 items-center">
                <div class="col-span-11 grid grid-cols-3 gap-2">
                    <select class="p-2 border rounded item-category" onchange="populateProductsForCategory(this, '${rowId}')"><option value="">-- التصنيف --</option>${allCategories.map(c => `<option value="${c.CategoryID}">${c.CategoryName}</option>`).join('')}</select>
                    <select class="p-2 border rounded item-product" onchange="populateWeightsForProduct(this, '${rowId}')" disabled><option value="">-- المنتج --</option></select>
                    <select class="p-2 border rounded item-weight" disabled><option value="">-- الوزن --</option></select>
                </div>
                <button type="button" onclick="removePurchaseRowAndUpdateTotal('${rowId}')" class="col-span-1 text-red-500 hover:text-red-700 text-lg justify-self-center"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="grid grid-cols-4 gap-2 items-center">
                <div><label class="text-sm">الكمية</label><input type="number" value="1" min="1" class="w-full p-2 border rounded item-qty" oninput="updatePurchaseTotal()"></div>
                <div><label class="text-sm">سعر التكلفة</label><input type="number" step="0.01" value="0" min="0" class="w-full p-2 border rounded item-cost" oninput="updatePurchaseTotal()"></div>
                <div class="col-span-2"><label class="text-sm">إجمالي التكلفة</label><input type="text" class="w-full p-2 border rounded bg-gray-200 item-total-cost" readonly></div>
            </div>
            <input type="hidden" class="item-price-id" onchange="updatePurchaseTotal()">
        </div>`;
    container.insertAdjacentHTML('beforeend', rowHtml);
}

function populateProductsForCategory(categorySelect, rowId, selectedProductId = null) {
    const selectedCategoryId = categorySelect.value;
    const row = document.getElementById(rowId);
    const productSelect = row.querySelector('.item-product');
    const weightSelect = row.querySelector('.item-weight');
    productSelect.innerHTML = '<option value="">-- المنتج --</option>';
    weightSelect.innerHTML = '<option value="">-- الوزن --</option>';
    productSelect.disabled = true; weightSelect.disabled = true;
    if (selectedCategoryId) {
        const products = allProducts.filter(p => p.CategoryID == selectedCategoryId);
        products.forEach(p => { productSelect.innerHTML += `<option value="${p.ProductID}">${p.ProductName}</option>`; });
        productSelect.disabled = false;
        if (selectedProductId) { productSelect.value = selectedProductId; }
    }
    // Update total for the correct form
    if (row.classList.contains('order-item-row')) updateOrderTotal();
    else if (row.classList.contains('purchase-item-row')) updatePurchaseTotal();
}
function populateWeightsForProduct(productSelect, rowId, selectedPriceId = null) {
    const selectedProductId = productSelect.value;
    const row = document.getElementById(rowId);
    const weightSelect = row.querySelector('.item-weight');
    weightSelect.innerHTML = '<option value="">-- الوزن --</option>';
    weightSelect.disabled = true;
    if (selectedProductId) {
        const product = allProducts.find(p => p.ProductID == selectedProductId);
        product.weights.forEach(w => {
            // No stock check for purchases
            weightSelect.innerHTML += `<option value="${w.PriceID}" data-price="${w.Price}" data-stock="${w.Stock}">${w.WeightName}</option>`;
        });
        weightSelect.disabled = false;
        if (selectedPriceId) { weightSelect.value = selectedPriceId; }
    }
    if (row.classList.contains('order-item-row')) {
        updatePriceFromWeight(weightSelect, rowId);
    } else if (row.classList.contains('purchase-item-row')) {
        row.querySelector('.item-price-id').value = weightSelect.value;
        updatePurchaseTotal();
    }
}
function updatePriceFromWeight(weightSelect, rowId) {
    const row = document.getElementById(rowId);
    const selectedOption = weightSelect.options[weightSelect.selectedIndex];
    const price = selectedOption.dataset.price || 0;
    const stock = selectedOption.dataset.stock || 0;
    row.querySelector('.item-price').value = parseFloat(price).toFixed(2);
    row.querySelector('.item-stock').value = stock;
    row.querySelector('.item-price-id').value = weightSelect.value;
    updateOverallTotal(weightSelect);
}
function addWeightField(weight = {}) {
    const container = document.getElementById('weights-editor');
    const id = `weight-${Date.now()}${Math.random()}`;
    container.insertAdjacentHTML('beforeend', `<div id="${id}" class="grid grid-cols-10 gap-2 items-center"><input type="hidden" class="weight-price-id" value="${weight.priceId || ''}"><input type="text" placeholder="الوزن" class="col-span-4 p-2 border rounded weight-name" value="${weight.name || ''}" required><input type="number" step="0.01" placeholder="السعر" class="col-span-2 p-2 border rounded weight-price" value="${weight.price || ''}" required><input type="number" placeholder="المخزون" class="col-span-3 p-2 border rounded weight-stock" value="${weight.stock || '0'}"><button type="button" onclick="document.getElementById('${id}').remove()" class="col-span-1 text-red-500 hover:text-red-700" title="إزالة"><i class="fas fa-times-circle"></i></button></div>`);
}
function populateGovernorates(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- اختر المحافظة --</option>';
    Object.keys(governoratesData).sort().forEach(g => select.innerHTML += `<option value="${g}">${g}</option>`);
}
function populateRegions(gov, regionSelectId) {
    const select = document.getElementById(regionSelectId);
    if (!select) return;
    const regions = governoratesData[gov] || [];
    select.innerHTML = '<option value="">-- اختر المنطقة --</option>';
    regions.sort().forEach(reg => select.innerHTML += `<option value="${reg}">${reg}</option>`);
}
function populateCategories(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- اختر الفئة --</option>';
    allCategories.forEach(c => select.innerHTML += `<option value="${c.CategoryID}">${c.CategoryName}</option>`);
}
function populateStaticDropdowns() {
    const paymentSelect = document.getElementById('paymentMethod');
    if (!paymentSelect) return;
    paymentSelect.innerHTML = '';
    paymentMethods.forEach(p => paymentSelect.innerHTML += `<option value="${p}">${p}</option>`);
}
function populateSupplierDropdown() {
    const select = document.getElementById('purchaseSupplier');
    if (!select) return;
    select.innerHTML = '<option value="">-- اختر مورد --</option>';
    allSuppliers.forEach(s => {
        select.innerHTML += `<option value="${s.SupplierID}">${s.SupplierName}</option>`;
    });
}

function updateOverallTotal(element) {
    const form = element.closest('form');
    if (form.id === 'orderForm') { updateOrderTotal(); } 
    else if (form.id === 'editOrderForm') { updateEditOrderTotal(); }
}
function removeRowAndUpdateTotal(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        const form = row.closest('form');
        row.remove();
        if (form && form.id === 'orderForm') updateOrderTotal();
        else if (form && form.id === 'editOrderForm') updateEditOrderTotal();
    }
}
function removePurchaseRowAndUpdateTotal(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updatePurchaseTotal();
    }
}

function updateOrderTotal() {
    let subTotal = 0;
    document.querySelectorAll('#orderForm .order-item-row').forEach(row => {
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        subTotal += price * qty;
    });
    const shipping = parseFloat(document.getElementById('shippingCost').value) || 0;
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    document.getElementById('total-price').textContent = (subTotal + shipping - discount).toFixed(2);
}
function updateEditOrderTotal() {
    let subTotal = 0;
    document.querySelectorAll('#editOrderForm .order-item-row').forEach(row => {
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        subTotal += price * qty;
    });
    const shipping = parseFloat(document.getElementById('edit-shippingCost').value) || 0;
    const discount = parseFloat(document.getElementById('edit-discount').value) || 0;
    const finalTotal = subTotal + shipping - discount;
    document.getElementById('edit-total-price').textContent = finalTotal.toFixed(2);
    const amountPaid = parseFloat(document.getElementById('edit-amountPaid').value) || 0;
    const paymentStatusDiv = document.getElementById('edit-paymentStatus');
    const paymentStatus = determinePaymentStatus(finalTotal, amountPaid);
    paymentStatusDiv.textContent = paymentStatus;
    paymentStatusDiv.className = `w-full p-2 rounded-lg text-white text-center font-semibold ${getPaymentStatusColor(paymentStatus)}`;
}
function updatePurchaseTotal() {
    let totalCost = 0;
    document.querySelectorAll('.purchase-item-row').forEach(row => {
        const cost = parseFloat(row.querySelector('.item-cost').value) || 0;
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        const itemTotal = cost * qty;
        row.querySelector('.item-total-cost').value = itemTotal.toFixed(2);
        totalCost += itemTotal;
    });
    document.getElementById('purchase-total-price').textContent = totalCost.toFixed(2);
}

function determinePaymentStatus(total, paid) { if (paid <= 0) return 'لم يدفع'; if (paid >= total) return 'مدفوع بالكامل'; return 'مدفوع جزئيًا'; }
function getStatusColor(status, isHex = false) {
    const colors = { 'جديد': { hex: '#3b82f6', tailwind: 'bg-blue-500' }, 'مؤكد': { hex: '#f59e0b', tailwind: 'bg-yellow-500' }, 'للتوصيل': { hex: '#8b5cf6', tailwind: 'bg-purple-500' }, 'تم التسليم': { hex: '#10b981', tailwind: 'bg-green-500' }, 'ملغي': { hex: '#ef4444', tailwind: 'bg-red-500' } };
    const color = colors[status] || { hex: '#6b7280', tailwind: 'bg-gray-500' };
    return isHex ? color.hex : color.tailwind;
}
function getPaymentStatusColor(status) {
    const colors = { 'لم يدفع': 'bg-gray-400', 'مدفوع جزئيًا': 'bg-yellow-400', 'مدفوع بالكامل': 'bg-green-400' };
    return colors[status] || 'bg-gray-400';
}
function createInvoiceHTML(order) {
    const itemsHtml = order.items.map(i => `<tr><td class="p-1 border">${i.ProductName} (${i.WeightName})</td><td class="p-1 border">${i.Quantity}</td><td class="p-1 border">${i.UnitPrice.toFixed(2)}</td><td class="p-1 border">${i.TotalPrice.toFixed(2)}</td></tr>`).join('');
    const remainingAmount = order.FinalAmount - order.AmountPaid;

    return `
        <div class="p-4 text-xs">
            <h2 class="text-xl font-bold mb-2 text-center">فاتورة مبيعات</h2>
            <p class="text-center text-lg font-semibold mb-4">{{COPY_TITLE}}</p>
            <div class="flex justify-between mb-2">
                <div><p><strong>فاتورة رقم:</strong> ${order.InvoiceNumber}</p><p><strong>التاريخ:</strong> ${new Date(order.OrderDate).toLocaleString('ar-EG')}</p></div>
                <div><p><strong>العميل:</strong> ${order.CustomerName || ''}</p><p><strong>الهاتف:</strong> ${order.PhoneNumber || ''}</p></div>
            </div>
            <table class="w-full text-right border-collapse border border-gray-400 mb-2">
                <thead class="bg-gray-200"><tr><th class="p-1 border">المنتج</th><th class="p-1 border">الكمية</th><th class="p-1 border">سعر الوحدة</th><th class="p-1 border">الإجمالي</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div class="flex justify-between">
                <div class="w-2/5">
                    ${order.Notes ? `<p class="font-bold">ملاحظات:</p><p class="border p-1 text-xs h-16">${order.Notes}</p>` : ''}
                </div>
                <div class="w-3/5">
                     <table class="w-full text-right">
                        <tbody>
                            <tr><td class="text-left p-1 font-semibold">الإجمالي الفرعي</td><td class="p-1">${order.TotalAmount.toFixed(2)}</td></tr>
                            <tr><td class="text-left p-1 font-semibold">شحن</td><td class="p-1">${order.ShippingCost.toFixed(2)}</td></tr>
                            <tr><td class="text-left p-1 font-semibold text-red-500">خصم</td><td class="p-1 text-red-500">-${order.DiscountAmount.toFixed(2)}</td></tr>
                            <tr class="font-bold bg-gray-200"><td class="text-left p-1">الإجمالي النهائي</td><td class="p-1">${order.FinalAmount.toFixed(2)}</td></tr>
                            <tr><td class="text-left p-1 font-semibold">المدفوع</td><td class="p-1">${order.AmountPaid.toFixed(2)}</td></tr>
                            <tr class="font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}"><td class="text-left p-1">المبلغ المتبقي</td><td class="p-1">${remainingAmount.toFixed(2)}</td></tr>
                        </tbody>
                     </table>
                </div>
            </div>
        </div>`;
}