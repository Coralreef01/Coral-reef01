// رابط جوجل شيت (اتركه كما هو إذا كنت تريد الحفظ محلياً فقط حالياً)
const GOOGLE_SCRIPT_URL = 'ضع_رابط_جوجل_شيت_هنا'; 

let tempSelectedItems = []; 
let localCustomers = [];
let localEquipment = [];
let localRentals = [];
let currentActiveCustomer = null; 

// 1. محاولة جلب البيانات بأمان (لتفادي تعطل التطبيق بسبب بيانات قديمة تالفة)
try {
    localCustomers = JSON.parse(localStorage.getItem('localCustomers')) || [];
    localEquipment = JSON.parse(localStorage.getItem('localEquipment')) || [];
    localRentals = JSON.parse(localStorage.getItem('localRentals')) || [];
} catch (e) {
    console.error("تم اكتشاف بيانات قديمة تالفة، تم إعادة ضبط الذاكرة.", e);
    localCustomers = []; localEquipment = []; localRentals = [];
}

// 2. دوال النظام الأساسية (متاحة عالمياً لتعمل مع أزرار HTML)
window.showPage = function(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.style.setProperty('display', 'none', 'important');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.setProperty('display', 'block', 'important');
        window.scrollTo(0, 0);
    }
    if (pageId === 'customers-page') window.updateNextCustomerSerial();
    if (pageId === 'rentals-page') window.updateEquipmentDropdown();
    if (pageId === 'stats-page') window.renderStatsTable();
};

window.updateNextCustomerSerial = function() {
    const input = document.getElementById('cust-serial-auto');
    if (input) {
        let nextSerial = String(localCustomers.length + 1).padStart(5, '0');
        input.value = nextSerial;
    }
};

window.updateEquipmentDropdown = function() {
    const select = document.getElementById('available-equipment-select');
    if (!select) return;
    select.innerHTML = '';
    
    if (localEquipment.length === 0) {
        let opt = document.createElement('option');
        opt.value = "";
        opt.text = "⚠️ لا توجد معدات مسجلة بالنظام حالياً";
        select.appendChild(opt);
        return;
    }
    
    localEquipment.forEach((eq, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = `${eq.type} - ${eq.company} (سيريال: ${eq.serial}) | ${eq.price} ريال`;
        select.appendChild(option);
    });
};

window.addSelectedEquipmentToInvoice = function() {
    const select = document.getElementById('available-equipment-select');
    if (!select || select.value === "") {
        alert("⚠️ الرجاء اختيار معدة من القائمة أولاً.");
        return;
    }
    
    const eq = localEquipment[select.value];
    tempSelectedItems.push(eq);
    
    const previewZone = document.getElementById('selected-items-preview');
    if (previewZone) {
        const itemBadge = document.createElement('div');
        itemBadge.style.cssText = "background: #1e1e1e; padding: 10px; margin: 5px 0; border-radius: 6px; border-right: 4px solid #ff8c00; font-size: 14px; display: flex; justify-content: space-between;";
        itemBadge.innerHTML = `<span>🤿 ${eq.type} (S/N: ${eq.serial})</span> <strong>${eq.price} ريال</strong>`;
        previewZone.appendChild(itemBadge);
    }
    window.calculateTotal();
};

window.calculateTotal = function() {
    const daysInput = document.getElementById('rental-days');
    const discountInput = document.getElementById('rental-discount');
    const totalDisplay = document.getElementById('final-total');
    
    if (!daysInput || !discountInput || !totalDisplay) return;

    const days = parseFloat(daysInput.value) || 1;
    const discount = parseFloat(discountInput.value) || 0;
    let subtotal = tempSelectedItems.reduce((acc, item) => acc + (parseFloat(item.price) * days), 0);
    let total = subtotal - discount;
    totalDisplay.innerText = total < 0 ? 0 : total;
};

window.searchCustomer = function() {
    const searchInput = document.getElementById('search-customer-id');
    if (!searchInput) return;

    const idToSearch = searchInput.value.trim();
    if(!idToSearch) { alert("الرجاء إدخال رقم للبحث!"); return; }
    
    const customer = localCustomers.find(c => c.serial === idToSearch || c.id === idToSearch);
    
    if (customer) {
        currentActiveCustomer = customer;
        document.getElementById('rental-customer-name').value = customer.name;
        document.getElementById('rental-customer-phone').value = customer.phone;
        alert(`✅ تم العثور على العميل: ${customer.name}`);
    } else {
        currentActiveCustomer = null;
        alert("❌ العميل غير مسجل بالنظام.");
    }
};

window.searchReturnData = function() {
    const searchInput = document.getElementById('return-search-input');
    if (!searchInput) return;

    const searchValue = searchInput.value.trim();
    if(!searchValue) { alert("الرجاء إدخال بيانات للبحث!"); return; }
    
    const rental = localRentals.slice().reverse().find(r => 
        r.invoiceId === searchValue || r.customerSerial === searchValue || r.customerId === searchValue
    );
    
    if (rental) {
        document.getElementById('ret-invoice-id').innerText = rental.invoiceId;
        document.getElementById('ret-cust-name').innerText = rental.customer;
        document.getElementById('ret-cust-phone').innerText = rental.phone || '-';
        document.getElementById('ret-eq-details').innerText = rental.equipmentDetails;
        document.getElementById('ret-total').innerText = rental.total;
        document.getElementById('invoice-details-card').style.display = 'block';
        alert(`✅ تم إيجاد الفاتورة: ${rental.invoiceId}`);
    } else {
        alert("❌ لم يتم العثور على الفاتورة.");
        document.getElementById('invoice-details-card').style.display = 'none';
    }
};

window.renderStatsTable = function() {
    const tbody = document.getElementById('stats-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (localEquipment.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا توجد معدات مسجلة</td></tr>';
        return;
    }
    
    localEquipment.forEach(eq => {
        let timesRented = 0;
        let totalDaysRented = 0;
        
        localRentals.forEach(rental => {
            if (rental.serialsUsed && rental.serialsUsed.includes(eq.serial)) {
                timesRented++;
                totalDaysRented += rental.days;
            }
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${eq.serial}</code></td>
            <td>${eq.type} (${eq.company})</td>
            <td style="color: #ff8c00; font-weight: bold; text-align: center;">${timesRented}</td>
            <td style="color: #00ffcc; font-weight: bold; text-align: center;">${totalDaysRented}</td>
        `;
        tbody.appendChild(row);
    });
};

async function sendToGoogleSheet(payload) {
    if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.startsWith('http')) return true;
    try {
        await fetch(GOOGLE_SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        return true;
    } catch (e) { 
        console.error("خطأ الرفع:", e); 
        return false; 
    }
}

// 3. تفعيل الأزرار عند تحميل الصفحة بالكامل (لتجنب أخطاء عدم وجود العنصر)
document.addEventListener('DOMContentLoaded', () => {
    
    window.showPage('equipment-page');
    window.updateNextCustomerSerial();
    window.updateEquipmentDropdown();

    // مستمعات الأحداث للتحديث المباشر للأسعار
    const daysInput = document.getElementById('rental-days');
    const discountInput = document.getElementById('rental-discount');
    const damagedCheck = document.getElementById('is-damaged-checkbox');
    
    if(daysInput) daysInput.addEventListener('input', window.calculateTotal);
    if(discountInput) discountInput.addEventListener('input', window.calculateTotal);
    if(damagedCheck) {
        damagedCheck.addEventListener('change', function() {
            const noteContainer = document.getElementById('damage-note-container');
            if(noteContainer) noteContainer.style.display = this.checked ? 'block' : 'none';
        });
    }

    // فورم إضافة معدة
    const eqForm = document.getElementById('equipment-form');
    if (eqForm) {
        eqForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const eq = {
                serial: document.getElementById('eq-serial').value,
                company: document.getElementById('eq-company').value,
                type: document.getElementById('eq-type').value,
                size: document.getElementById('eq-size').value,
                color: document.getElementById('eq-color').value,
                price: document.getElementById('eq-price').value
            };
            localEquipment.push(eq);
            localStorage.setItem('localEquipment', JSON.stringify(localEquipment));
            await sendToGoogleSheet({ action: 'addEquipment', ...eq });
            alert("تم حفظ المعدة بنجاح!");
            this.reset();
            window.updateEquipmentDropdown();
        });
    }

    // فورم إضافة عميل
    const custForm = document.getElementById('customer-form');
    if (custForm) {
        custForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            let assignedSerial = String(localCustomers.length + 1).padStart(5, '0');
            const cust = {
                serial: assignedSerial,
                id: document.getElementById('cust-id').value,
                name: document.getElementById('cust-name').value,
                phone: document.getElementById('cust-phone').value,
                center: document.getElementById('cust-center').value,
                license: document.getElementById('cust-license').value
            };
            localCustomers.push(cust);
            localStorage.setItem('localCustomers', JSON.stringify(localCustomers));
            await sendToGoogleSheet({ action: 'addCustomer', customerSerial: cust.serial, ...cust });
            alert(`تم تسجيل العميل بنجاح! السيريال: ${assignedSerial}`);
            this.reset();
            window.updateNextCustomerSerial();
        });
    }

    // فورم التأجير
    const rentalForm = document.getElementById('rental-form');
    if (rentalForm) {
        rentalForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (tempSelectedItems.length === 0) { alert("الرجاء اختيار معدة!"); return; }
            
            const invoiceSerial = 'R-' + Math.floor(1000 + Math.random() * 9000);
            const name = document.getElementById('rental-customer-name').value;
            const phone = document.getElementById('rental-customer-phone').value;
            const days = document.getElementById('rental-days').value;
            const total = document.getElementById('final-total').innerText;
            const eqDetails = tempSelectedItems.map(i => `${i.type} (${i.company})`).join(', ');
            
            const rentalRecord = {
                invoiceId: invoiceSerial,
                customerSerial: currentActiveCustomer ? currentActiveCustomer.serial : '',
                customerId: currentActiveCustomer ? currentActiveCustomer.id : '',
                customer: name,
                phone: phone,
                equipmentDetails: eqDetails,
                total: total,
                days: parseInt(days),
                serialsUsed: tempSelectedItems.map(i => i.serial),
                status: 'تحت التأجير'
            };
            
            localRentals.push(rentalRecord);
            localStorage.setItem('localRentals', JSON.stringify(localRentals));
            await sendToGoogleSheet({ action: 'addRental', ...rentalRecord, date: new Date().toLocaleDateString('ar-SA') });
            
            const msg = `أهلاً بك في Coral Reef Center 🌊\nفاتورة رقم (${invoiceSerial})\nالعميل: ${name}\nالمعدات: ${eqDetails}\nالمدة: ${days} أيام.\nالإجمالي: ${total} ريال.`;
            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            
            tempSelectedItems = [];
            document.getElementById('selected-items-preview').innerHTML = '';
            document.getElementById('final-total').innerText = '0';
            currentActiveCustomer = null;
            this.reset();
        });
    }

    // فورم الإرجاع
    const returnForm = document.getElementById('return-form');
    if (returnForm) {
        returnForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const invId = document.getElementById('ret-invoice-id').innerText;
            if (invId === '-' || !invId) { alert("ابحث عن الفاتورة أولاً!"); return; }
            
            const isDamaged = document.getElementById('is-damaged-checkbox').checked;
            const damageNote = document.getElementById('damage-note').value;
            let statusText = isDamaged ? `تالفة: ${damageNote}` : 'مستلمة سليمة';
            
            let rentalIndex = localRentals.findIndex(r => r.invoiceId === invId);
            if(rentalIndex !== -1) {
                localRentals[rentalIndex].status = statusText;
                localStorage.setItem('localRentals', JSON.stringify(localRentals));
            }
            
            await sendToGoogleSheet({ action: 'updateStatus', invoiceId: invId, status: statusText });
            alert("تم إرجاع المعدات وإغلاق الفاتورة!");
            this.reset();
            document.getElementById('invoice-details-card').style.display = 'none';
        });
    }
});
    if (!select || select.value === "") {
        alert("⚠️ لا توجد أي معدة مختارة! الرجاء إضافة معدات أولاً من صفحة (المعدات) وتأكيد اختيارها من القائمة هنا.");
        return;
    }
    
    const eq = localEquipment[select.value];
    tempSelectedItems.push(eq);
    
    const previewZone = document.getElementById('selected-items-preview');
    if (previewZone) {
        const itemBadge = document.createElement('div');
        itemBadge.style.cssText = "background: #1e1e1e; padding: 10px; margin: 5px 0; border-radius: 6px; border-right: 4px solid #ff8c00; font-size: 14px; display: flex; justify-content: space-between;";
        itemBadge.innerHTML = `<span>🤿 ${eq.type} (${eq.company} - S/N: ${eq.serial})</span> <strong>${eq.price} ريال/يوم</strong>`;
        previewZone.appendChild(itemBadge);
    }
    
    calculateTotal();
}

function calculateTotal() {
    const days = parseFloat(document.getElementById('rental-days').value) || 1;
    const discount = parseFloat(document.getElementById('rental-discount').value) || 0;
    let subtotal = tempSelectedItems.reduce((acc, item) => acc + (parseFloat(item.price) * days), 0);
    let total = subtotal - discount;
    document.getElementById('final-total').innerText = total < 0 ? 0 : total;
}

// البحث الذكي عن العميل برقم العميل الموحد أو رقم الهوية الوطنية
function searchCustomer() {
    const idToSearch = document.getElementById('search-customer-id').value.trim();
    if(!idToSearch) { alert("الرجاء إدخال قيمة للبحث!"); return; }
    
    // البحث عن تطابق في السيريال التلقائي أو رقم الهوية الحقيقي
    const customer = localCustomers.find(c => c.serial === idToSearch || c.id === idToSearch);
    
    if (customer) {
        currentActiveCustomer = customer;
        document.getElementById('rental-customer-name').value = customer.name;
        document.getElementById('rental-customer-phone').value = customer.phone;
        alert(`✅ تم العثور على العميل بنجاح: ${customer.name} (رقم موحد: ${customer.serial})`);
    } else {
        currentActiveCustomer = null;
        alert("❌ عذراً، رقم العميل أو الهوية غير مسجل بالنظام. الرجاء تسجيله أولاً من صفحة العملاء.");
    }
}

// جلب تفاصيل الفاتورة عند الإرجاع بالبحث الشامل (رقم الفاتورة أو رقم العميل أو الهوية)
function searchReturnData() {
    const searchValue = document.getElementById('return-search-input').value.trim();
    if(!searchValue) { alert("الرجاء إدخال رقم فاتورة أو عميل للبحث!"); return; }
    
    // البحث عن آخر عملية تأجير نشطة تطابق رقم الفاتورة أو هوية العميل أو سيريال العميل
    const rental = localRentals.slice().reverse().find(r => 
        r.invoiceId === searchValue || 
        r.customerSerial === searchValue || 
        r.customerId === searchValue
    );
    
    if (rental) {
        document.getElementById('ret-invoice-id').innerText = rental.invoiceId;
        document.getElementById('ret-cust-name').innerText = rental.customer;
        document.getElementById('ret-cust-phone').innerText = rental.phone || 'غير مسجل';
        document.getElementById('ret-eq-details').innerText = rental.equipmentDetails;
        document.getElementById('ret-total').innerText = rental.total;
        document.getElementById('invoice-details-card').style.display = 'block';
        alert(`✅ تم العثور على الفاتورة الحالية رقم: ${rental.invoiceId}`);
    } else {
        alert("❌ لم يتم العثور على أي عمليات تأجير مفتوحة تحت هذا الرقم.");
        document.getElementById('invoice-details-card').style.display = 'none';
    }
}

// دالة الإرسال الآمنة لمنع كراش السكربت إذا كان الرابط غير مدخل
async function sendToGoogleSheet(payload) {
    if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.startsWith('http')) {
        console.warn("تنبيه: لم يتم ربط تطبيق جوجل شيت برابط حقيقي وصحيح حتى الآن، تم الحفظ محلياً فقط.");
        return true;
    }
    try {
        await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return true;
    } catch (e) { 
        console.error("خطأ أثناء الرفع لجوجل شيت:", e); 
        return false; 
    }
}

// 1. حفظ المعدة
document.getElementById('equipment-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const eq = {
        serial: document.getElementById('eq-serial').value,
        company: document.getElementById('eq-company').value,
        type: document.getElementById('eq-type').value,
        size: document.getElementById('eq-size').value,
        color: document.getElementById('eq-color').value,
        price: document.getElementById('eq-price').value
    };
    localEquipment.push(eq);
    localStorage.setItem('localEquipment', JSON.stringify(localEquipment));
    
    await sendToGoogleSheet({ action: 'addEquipment', ...eq });
    alert("👍 تم حفظ المعدة بنجاح في النظام وفي جوجل شيت!");
    this.reset();
    updateEquipmentDropdown();
});

// 2. حفظ العميل مع السيريال التلقائي التصاعدي
document.getElementById('customer-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    let assignedSerial = String(localCustomers.length + 1).padStart(5, '0');
    
    const cust = {
        serial: assignedSerial,
        id: document.getElementById('cust-id').value,
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        center: document.getElementById('cust-center').value,
        license: document.getElementById('cust-license').value
    };
    
    localCustomers.push(cust);
    localStorage.setItem('localCustomers', JSON.stringify(localCustomers));
    
    await sendToGoogleSheet({ action: 'addCustomer', customerSerial: cust.serial, ...cust });
    alert(`👍 تم تسجيل العميل بنجاح! السيريال الموحد له هو: ${assignedSerial}`);
    this.reset();
    updateNextCustomerSerial();
});

// 3. إصدار الفاتورة وإرسال واتساب للعميل المختار تلقائياً
document.getElementById('rental-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (tempSelectedItems.length === 0) { alert("⚠️ الرجاء اختيار معدة واحدة على الأقل قبل إصدار الفاتورة!"); return; }
    
    const invoiceSerial = 'R-' + Math.floor(1000 + Math.random() * 9000);
    const name = document.getElementById('rental-customer-name').value;
    const phone = document.getElementById('rental-customer-phone').value;
    const days = document.getElementById('rental-days').value;
    const total = document.getElementById('final-total').innerText;
    const eqDetails = tempSelectedItems.map(i => `${i.type} (${i.company} - مقاس: ${i.size})`).join(', ');
    
    const rentalRecord = {
        invoiceId: invoiceSerial,
        customerSerial: currentActiveCustomer ? currentActiveCustomer.serial : '',
        customerId: currentActiveCustomer ? currentActiveCustomer.id : '',
        customer: name,
        phone: phone,
        equipmentDetails: eqDetails,
        total: total,
        days: parseInt(days),
        serialsUsed: tempSelectedItems.map(i => i.serial),
        status: 'تحت التأجير'
    };
    
    localRentals.push(rentalRecord);
    localStorage.setItem('localRentals', JSON.stringify(localRentals));
    
    await sendToGoogleSheet({ action: 'addRental', ...rentalRecord, date: new Date().toLocaleDateString('ar-SA') });
    
    const msg = `أهلاً بك في Coral Reef Center 🌊\n\nتم تسجيل فاتورة تأجير رقم (${invoiceSerial}).\n\nالتفاصيل:\n- العميل: ${name}\n- المعدات: ${eqDetails}\n- المدة: ${days} أيام.\n- الإجمالي: ${total} ريال.\n\nنتمنى لك غوصة ممتعة وآمنة! 🤿`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    
    tempSelectedItems = [];
    document.getElementById('selected-items-preview').innerHTML = '';
    document.getElementById('final-total').innerText = '0';
    currentActiveCustomer = null;
    this.reset();
});

// 4. تأكيد الإرجاع ومطالبة الأضرار والتالف
document.getElementById('return-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const invId = document.getElementById('ret-invoice-id').innerText;
    if (invId === '-' || !invId) { alert("الرجاء البحث عن الفاتورة أولاً وجلب بياناتها!"); return; }
    
    const isDamaged = document.getElementById('is-damaged-checkbox').checked;
    const damageNote = document.getElementById('damage-note').value;
    let statusText = isDamaged ? `تالفة: ${damageNote}` : 'مستلمة سليمة';
    
    let rentalIndex = localRentals.findIndex(r => r.invoiceId === invId);
    if(rentalIndex !== -1) {
        localRentals[rentalIndex].status = statusText;
        localStorage.setItem('localRentals', JSON.stringify(localRentals));
    }
    
    await sendToGoogleSheet({ action: 'updateStatus', invoiceId: invId, status: statusText });
    alert("👍 تم استلام المعدات وإغلاق ملف الفاتورة بنجاح!");
    this.reset();
    document.getElementById('invoice-details-card').style.display = 'none';
});

// 5. بناء كشف حساب الإحصائيات وجدول التحليل السنوي
function renderStatsTable() {
    const tbody = document.getElementById('stats-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (localEquipment.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا توجد معدات مسجلة حتى الآن لعرضها.</td></tr>';
        return;
    }
    
    localEquipment.forEach(eq => {
        let timesRented = 0;
        let totalDaysRented = 0;
        
        localRentals.forEach(rental => {
            if (rental.serialsUsed && rental.serialsUsed.includes(eq.serial)) {
                timesRented++;
                totalDaysRented += rental.days;
            }
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${eq.serial}</code></td>
            <td>${eq.type} (${eq.company} - ${eq.size})</td>
            <td style="color: #ff8c00; font-weight: bold; text-align: center;">${timesRented} مرات</td>
            <td style="color: #00ffcc; font-weight: bold; text-align: center;">${totalDaysRented} يوم</td>
        `;
        tbody.appendChild(row);
    });
}

// مراقبة تفعيل حقل الأضرار والتالف
document.getElementById('is-damaged-checkbox')?.addEventListener('change', function() {
    document.getElementById('damage-note-container').style.display = this.checked ? 'block' : 'none';
});
// تحديث الأسعار الفورية عند تغيير المدة أو الخصم يدوياً
document.getElementById('rental-days')?.addEventListener('input', calculateTotal);
document.getElementById('rental-discount')?.addEventListener('input', calculateTotal);
