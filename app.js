// ⚠️ هام جداً: ضع الرابط الخاص بك بين علامتي التنصيص
const GOOGLE_SCRIPT_URL = 'ضع_رابط_جوجل_شيت_هنا'; 

let tempSelectedItems = []; 
let localCustomers = JSON.parse(localStorage.getItem('localCustomers')) || [];
let localEquipment = JSON.parse(localStorage.getItem('localEquipment')) || [];
let localRentals = JSON.parse(localStorage.getItem('localRentals')) || [];
let currentActiveCustomer = null; 

// دالة التنقل
window.showPage = function(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    }
    if (pageId === 'customers-page') updateNextCustomerSerial();
    if (pageId === 'rentals-page') updateEquipmentDropdown();
    if (pageId === 'stats-page') renderStatsTable();
};

window.updateNextCustomerSerial = function() {
    const input = document.getElementById('cust-serial-auto');
    if (input) input.value = String(localCustomers.length + 1).padStart(5, '0');
};

window.updateEquipmentDropdown = function() {
    const select = document.getElementById('available-equipment-select');
    if (!select) return;
    select.innerHTML = '';
    
    if (localEquipment.length === 0) {
        let opt = document.createElement('option');
        opt.value = ""; opt.text = "⚠️ لا توجد معدات مسجلة";
        select.appendChild(opt);
        return;
    }
    
    localEquipment.forEach((eq, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = `${eq.type} - ${eq.company} (S/N: ${eq.serial}) | ${eq.price} ريال`;
        select.appendChild(option);
    });
};

window.addSelectedEquipmentToInvoice = function() {
    const select = document.getElementById('available-equipment-select');
    if (!select || select.value === "") {
        alert("⚠️ الرجاء اختيار معدة."); return;
    }
    const eq = localEquipment[select.value];
    tempSelectedItems.push(eq);
    
    const previewZone = document.getElementById('selected-items-preview');
    const itemBadge = document.createElement('div');
    itemBadge.style.cssText = "background: #1e1e1e; padding: 10px; margin: 5px 0; border-radius: 6px; border-right: 4px solid #ff8c00; display: flex; justify-content: space-between;";
    itemBadge.innerHTML = `<span>🤿 ${eq.type} (${eq.company})</span> <strong>${eq.price} ريال</strong>`;
    previewZone.appendChild(itemBadge);
    
    calculateTotal();
};

window.calculateTotal = function() {
    const days = parseFloat(document.getElementById('rental-days').value) || 1;
    const discount = parseFloat(document.getElementById('rental-discount').value) || 0;
    let subtotal = tempSelectedItems.reduce((acc, item) => acc + (parseFloat(item.price) * days), 0);
    let total = subtotal - discount;
    document.getElementById('final-total').innerText = total < 0 ? 0 : total;
};

window.saveEquipment = async function() {
    const serial = document.getElementById('eq-serial').value.trim();
    const company = document.getElementById('eq-company').value.trim();
    const type = document.getElementById('eq-type').value.trim();
    const size = document.getElementById('eq-size').value.trim();
    const color = document.getElementById('eq-color').value.trim();
    const price = document.getElementById('eq-price').value.trim();

    if(!serial || !company || !type || !price) {
        alert("⚠️ الرجاء تعبئة السيريال، الشركة، النوع، والسعر!"); return;
    }

    const eq = { serial, company, type, size, color, price };
    localEquipment.push(eq);
    localStorage.setItem('localEquipment', JSON.stringify(localEquipment));
    
    sendToGoogleSheet({ action: 'addEquipment', ...eq });
    alert("✅ تم حفظ المعدة بنجاح!");
    
    document.getElementById('eq-serial').value = '';
    document.getElementById('eq-company').value = '';
    document.getElementById('eq-type').value = '';
    document.getElementById('eq-size').value = '';
    document.getElementById('eq-color').value = '';
    document.getElementById('eq-price').value = '';
    updateEquipmentDropdown();
};

window.saveCustomer = async function() {
    const id = document.getElementById('cust-id').value.trim();
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const center = document.getElementById('cust-center').value.trim();
    const license = document.getElementById('cust-license').value.trim();

    if(!id || !name || !phone) {
        alert("⚠️ الرجاء إدخال الهوية والاسم ورقم الجوال!"); return;
    }

    let assignedSerial = String(localCustomers.length + 1).padStart(5, '0');
    const cust = { serial: assignedSerial, id, name, phone, center, license };
    
    localCustomers.push(cust);
    localStorage.setItem('localCustomers', JSON.stringify(localCustomers));
    
    sendToGoogleSheet({ action: 'addCustomer', customerSerial: assignedSerial, ...cust });
    alert(`✅ تم تسجيل العميل! السيريال: ${assignedSerial}`);
    
    document.getElementById('cust-id').value = '';
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('cust-center').value = '';
    document.getElementById('cust-license').value = '';
    updateNextCustomerSerial();
};

window.searchCustomer = function() {
    const idToSearch = document.getElementById('search-customer-id').value.trim();
    if(!idToSearch) { alert("أدخل رقماً للبحث!"); return; }
    
    const customer = localCustomers.find(c => c.serial === idToSearch || c.id === idToSearch);
    if (customer) {
        currentActiveCustomer = customer;
        document.getElementById('rental-customer-name').value = customer.name;
        document.getElementById('rental-customer-phone').value = customer.phone;
        alert(`✅ تم إيجاد العميل: ${customer.name}`);
    } else {
        currentActiveCustomer = null;
        alert("❌ العميل غير مسجل بالنظام.");
    }
};

window.saveRental = async function() {
    if (tempSelectedItems.length === 0) { alert("⚠️ الرجاء اختيار معدة!"); return; }
    
    const name = document.getElementById('rental-customer-name').value;
    const phone = document.getElementById('rental-customer-phone').value;
    const days = document.getElementById('rental-days').value;
    const total = document.getElementById('final-total').innerText;

    if(!name) { alert("⚠️ ابحث عن العميل أولاً لملء بياناته!"); return; }
    
    const invoiceSerial = 'R-' + Math.floor(1000 + Math.random() * 9000);
    const eqDetails = tempSelectedItems.map(i => `${i.type} (${i.company})`).join(', ');
    
    const rentalRecord = {
        invoiceId: invoiceSerial,
        customerSerial: currentActiveCustomer ? currentActiveCustomer.serial : '',
        customerId: currentActiveCustomer ? currentActiveCustomer.id : '',
        customer: name, phone: phone, equipmentDetails: eqDetails,
        total: total, days: parseInt(days),
        serialsUsed: tempSelectedItems.map(i => i.serial),
        status: 'تحت التأجير'
    };
    
    localRentals.push(rentalRecord);
    localStorage.setItem('localRentals', JSON.stringify(localRentals));
    
    sendToGoogleSheet({ action: 'addRental', ...rentalRecord, date: new Date().toLocaleDateString('ar-SA') });
    
    const msg = `أهلاً بك في Coral Reef Center 🌊\nفاتورة رقم (${invoiceSerial})\nالعميل: ${name}\nالمعدات: ${eqDetails}\nالمدة: ${days} أيام.\nالإجمالي: ${total} ريال.`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    
    tempSelectedItems = [];
    document.getElementById('selected-items-preview').innerHTML = '';
    document.getElementById('final-total').innerText = '0';
    document.getElementById('rental-customer-name').value = '';
    document.getElementById('rental-customer-phone').value = '';
    document.getElementById('search-customer-id').value = '';
    currentActiveCustomer = null;
};

window.searchReturnData = function() {
    const searchValue = document.getElementById('return-search-input').value.trim();
    if(!searchValue) return;
    
    const rental = localRentals.slice().reverse().find(r => 
        r.invoiceId === searchValue || r.customerSerial === searchValue || r.customerId === searchValue
    );
    
    if (rental) {
        document.getElementById('ret-invoice-id').innerText = rental.invoiceId;
        document.getElementById('ret-cust-name').innerText = rental.customer;
        document.getElementById('ret-eq-details').innerText = rental.equipmentDetails;
        document.getElementById('ret-total').innerText = rental.total;
        document.getElementById('invoice-details-card').style.display = 'block';
    } else {
        alert("❌ لم يتم العثور على الفاتورة.");
    }
};

window.toggleDamageNote = function() {
    const isChecked = document.getElementById('is-damaged-checkbox').checked;
    document.getElementById('damage-note-container').style.display = isChecked ? 'block' : 'none';
};

window.saveReturn = async function() {
    const invId = document.getElementById('ret-invoice-id').innerText;
    if (invId === '-' || !invId) { alert("⚠️ ابحث عن الفاتورة أولاً!"); return; }
    
    const isDamaged = document.getElementById('is-damaged-checkbox').checked;
    const damageNote = document.getElementById('damage-note').value;
    let statusText = isDamaged ? `تالفة: ${damageNote}` : 'مستلمة سليمة';
    
    let rentalIndex = localRentals.findIndex(r => r.invoiceId === invId);
    if(rentalIndex !== -1) {
        localRentals[rentalIndex].status = statusText;
        localStorage.setItem('localRentals', JSON.stringify(localRentals));
    }
    
    sendToGoogleSheet({ action: 'updateStatus', invoiceId: invId, status: statusText });
    alert("✅ تم إرجاع المعدات وإغلاق الفاتورة!");
    
    document.getElementById('invoice-details-card').style.display = 'none';
    document.getElementById('is-damaged-checkbox').checked = false;
    document.getElementById('damage-note').value = '';
    document.getElementById('damage-note-container').style.display = 'none';
    document.getElementById('return-search-input').value = '';
};

window.renderStatsTable = function() {
    const tbody = document.getElementById('stats-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (localEquipment.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا توجد معدات</td></tr>'; return;
    }
    
    localEquipment.forEach(eq => {
        let timesRented = 0; let totalDaysRented = 0;
        localRentals.forEach(rental => {
            if (rental.serialsUsed && rental.serialsUsed.includes(eq.serial)) {
                timesRented++; totalDaysRented += rental.days;
            }
        });
        const row = document.createElement('tr');
        row.innerHTML = `<td><code>${eq.serial}</code></td><td>${eq.type} (${eq.company})</td>
        <td style="color: #ff8c00; font-weight: bold; text-align: center;">${timesRented}</td>
        <td style="color: #00ffcc; font-weight: bold; text-align: center;">${totalDaysRented}</td>`;
        tbody.appendChild(row);
    });
};

async function sendToGoogleSheet(payload) {
    if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.startsWith('http')) return;
    try {
        await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (e) { console.error("Error", e); }
}

window.onload = () => { showPage('equipment-page'); };
