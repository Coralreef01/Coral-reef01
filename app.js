// ⚠️ هام جداً: ضع الرابط الخاص بك بين علامتي التنصيص بالأسفل
const GOOGLE_SCRIPT_URL = 'ضع_رابط_جوجل_شيت_هنا'; 

let tempSelectedItems = []; 
let localCustomers = JSON.parse(localStorage.getItem('localCustomers')) || [];
let localEquipment = JSON.parse(localStorage.getItem('localEquipment')) || [];
let localRentals = JSON.parse(localStorage.getItem('localRentals')) || [];
let currentActiveCustomer = null; 
let currentActiveRental = null; // لمتابعة الفاتورة الجاري إرجاعها حالياً

// نظام دالة التنقل الشامل والآمن بين كل الصفحات لمنع التداخل
window.showPage = function(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    }
    
    // تحديث البيانات تلقائياً عند فتح الصفحات المحددة
    if (pageId === 'customers-page') updateNextCustomerSerial();
    if (pageId === 'rentals-page') updateEquipmentDropdown();
    if (pageId === 'invoices-page') renderInvoices('all');
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
        opt.value = ""; opt.text = "⚠️ لا توجد معدات مسجلة بالنظام";
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
        alert("⚠️ الرجاء اختيار معدة صحيحة لإضافتها."); return;
    }
    const eq = localEquipment[select.value];
    tempSelectedItems.push(eq);
    
    const previewZone = document.getElementById('selected-items-preview');
    const itemBadge = document.createElement('div');
    itemBadge.style.cssText = "background: #1e1e1e; padding: 10px; margin: 5px 0; border-radius: 6px; border-right: 4px solid #ff8c00; display: flex; justify-content: space-between;";
    itemBadge.innerHTML = `<span>🤿 ${eq.type} (${eq.company}) [S/N: ${eq.serial}]</span> <strong>${eq.price} ريال</strong>`;
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
        alert("⚠️ الرجاء تعبئة السيريال، الشركة، النوع، والسعر الحقيقي!"); return;
    }

    const eq = { serial, company, type, size, color, price };
    localEquipment.push(eq);
    localStorage.setItem('localEquipment', JSON.stringify(localEquipment));
    
    sendToGoogleSheet({ action: 'addEquipment', ...eq });
    alert("✅ تم حفظ وتخزين المعدة بنجاح بالنظام!");
    
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
        alert("⚠️ الهوية، الاسم بالكامل، ورقم الجوال متطلبات أساسية!"); return;
    }

    let assignedSerial = String(localCustomers.length + 1).padStart(5, '0');
    const cust = { serial: assignedSerial, id, name, phone, center, license };
    
    localCustomers.push(cust);
    localStorage.setItem('localCustomers', JSON.stringify(localCustomers));
    
    sendToGoogleSheet({ action: 'addCustomer', customerSerial: assignedSerial, ...cust });
    alert(`✅ تم تسجيل العميل بنجاح الحقيقي!\nرقم العميل الموحد هو: ${assignedSerial}`);
    
    document.getElementById('cust-id').value = '';
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('cust-center').value = '';
    document.getElementById('cust-license').value = '';
    updateNextCustomerSerial();
};

window.searchCustomer = function() {
    const idToSearch = document.getElementById('search-customer-id').value.trim();
    if(!idToSearch) { alert("أدخل رقم العميل أو الهوية للبحث!"); return; }
    
    const customer = localCustomers.find(c => c.serial === idToSearch || c.id === idToSearch);
    if (customer) {
        currentActiveCustomer = customer;
        document.getElementById('rental-customer-name').value = customer.name;
        document.getElementById('rental-customer-phone').value = customer.phone;
        alert(`✅ تم العثور على العميل: ${customer.name}`);
    } else {
        currentActiveCustomer = null;
        alert("❌ العميل غير مسجل بالنظام حالياً.");
    }
};

window.saveRental = async function() {
    if (tempSelectedItems.length === 0) { alert("⚠️ الرجاء اختيار وإضافة قطعة معدة واحدة على الأقل لفاتورة الإيجار!"); return; }
    
    const name = document.getElementById('rental-customer-name').value;
    const phone = document.getElementById('rental-customer-phone').value;
    const days = document.getElementById('rental-days').value;
    const total = document.getElementById('final-total').innerText;

    if(!name) { alert("⚠️ ابحث عن العميل أولاً لملء بيانات الفاتورة!"); return; }
    
    const invoiceSerial = 'R-' + Math.floor(1000 + Math.random() * 9000);
    const eqDetails = tempSelectedItems.map(i => `${i.type} (${i.company})`).join(', ');
    
    const rentalRecord = {
        invoiceId: invoiceSerial,
        customerSerial: currentActiveCustomer ? currentActiveCustomer.serial : '',
        customerId: currentActiveCustomer ? currentActiveCustomer.id : '',
        customer: name, 
        phone: phone, 
        equipmentDetails: eqDetails,
        items: tempSelectedItems.map(i => ({ serial: i.serial, type: i.type, company: i.company, price: i.price })), // حفظ تفصيلي للقطع
        total: total, 
        days: parseInt(days),
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

// تحديث محرك البحث في صفحة الإرجاع (يدعم الفاتورة أو رقم العميل أو الجوال) وعرض القطع تفصيلياً
window.searchReturnData = function() {
    const searchValue = document.getElementById('return-search-input').value.trim();
    if(!searchValue) { alert("⚠️ الرجاء إدخال قيمة للبحث!"); return; }
    
    // البحث في الفواتير التنازلية (الأحدث أولاً)
    const rental = localRentals.slice().reverse().find(r => 
        r.invoiceId === searchValue || r.customerSerial === searchValue || r.phone === searchValue
    );
    
    if (rental) {
        currentActiveRental = rental;
        document.getElementById('ret-invoice-id').innerText = rental.invoiceId;
        document.getElementById('ret-cust-name').innerText = rental.customer;
        
        // بناء قائمة اختيار القطع قطعة قطعة
        const itemsContainer = document.getElementById('items-checkbox-list');
        itemsContainer.innerHTML = '<label style="color: #ff8c00; font-weight: bold; display:block; margin-bottom:10px;">حدد القطع المستلمة والموجودة بالفاتورة حالياً:</label>';
        
        // التحقق من وجود مصفوفة تفصيلية للقطع، إذا لم توجد (للفواتير القديمة جداً) يتم بناؤها من النص
        const itemsArray = rental.items || rental.serialsUsed.map((s, idx) => ({ serial: s, type: rental.equipmentDetails.split(', ')[idx] || 'معدة غوص', company: '' }));
        
        itemsArray.forEach((item, index) => {
            itemsContainer.innerHTML += `
                <div style="display: flex; align-items: center; gap: 10px; margin: 8px 0; padding: 8px; background: #2c2c2c; border-radius: 4px;">
                    <input type="checkbox" class="return-item-check" value="${item.serial}" id="item-chk-${index}" checked style="width:18px; height:18px; cursor:pointer;">
                    <label for="item-chk-${index}" style="color: #fff; cursor:pointer; font-size:14px;">
                        🤿 ${item.type} ${item.company ? '(' + item.company + ')' : ''} — <span>[S/N: ${item.serial}]</span>
                    </label>
                </div>
            `;
        });
        
        document.getElementById('invoice-details-card').style.display = 'block';
    } else {
        currentActiveRental = null;
        alert("❌ لم يتم العثور على أي فاتورة مطابقة للبحث (تأكد من الرقم).");
    }
};

window.toggleDamageNote = function() {
    const isChecked = document.getElementById('is-damaged-checkbox').checked;
    document.getElementById('damage-note-container').style.display = isChecked ? 'block' : 'none';
};

// حفظ الإرجاع قطعة قطعة وصياغة وإرسال رسالة الواتساب الاحترافية للعميل عند الاستلام والتأكيد
window.saveReturn = async function() {
    if (!currentActiveRental) return;
    
    const allCheckboxes = document.querySelectorAll('.return-item-check');
    const checkedBoxes = document.querySelectorAll('.return-item-check:checked');
    
    if (checkedBoxes.length === 0) { 
        alert("⚠️ الرجاء تحديد قطعة واحدة مستلمة على الأقل لإتمام الإجراء!"); 
        return; 
    }
    
    const isDamaged = document.getElementById('is-damaged-checkbox').checked;
    const damageNote = document.getElementById('damage-note').value.trim();
    
    // بناء وتحديد حالة الفاتورة النهائية بناءً على كمية القطع المستلمة والضرر
    let statusText = '';
    if (checkedBoxes.length < allCheckboxes.length) {
        statusText = 'مستلمة جزئياً';
    } else {
        statusText = isDamaged ? `مقفلة (تالفة: ${damageNote})` : 'مغلقة (سليمة)';
    }
    
    // تحديث الحالة في قاعدة البيانات المحلية LocalStorage
    let rentalIndex = localRentals.findIndex(r => r.invoiceId === currentActiveRental.invoiceId);
    if(rentalIndex !== -1) {
        localRentals[rentalIndex].status = statusText;
        localStorage.setItem('localRentals', JSON.stringify(localRentals));
    }
    
    // إرسال التحديث إلى جوجل شيت
    sendToGoogleSheet({ action: 'updateStatus', invoiceId: currentActiveRental.invoiceId, status: statusText });
    
    // صياغة أسماء القطع المستلمة لعرضها في الرسالة للعميل لزيادة الموثوقية
    const itemsArray = currentActiveRental.items || currentActiveRental.serialsUsed.map((s, idx) => ({ serial: s, type: currentActiveRental.equipmentDetails.split(', ')[idx] || 'معدة غوص' }));
    const returnedItemsNames = Array.from(checkedBoxes).map(cb => {
        const found = itemsArray.find(i => i.serial === cb.value);
        return found ? found.type : 'معدة';
    }).join(' ، ');

    // صياغة رسالة الواتساب الاحترافية المعتمدة
    const whatsappMsg = `مرحباً بك في Coral Reef Center 🌊\n\nأستاذ/ة *${currentActiveRental.customer}*\n\nنود إبلاغك بأنه تم تأكيد استلام المعدات التالية بنجاح وجرى فحصها ومطابقتها بالسيستم:\n👈 ${returnedItemsNames}\n\nرقم الفاتورة المرجعي: ${currentActiveRental.invoiceId}\nحالة الفاتورة النهائية: *${statusText}*\n\nنشكرك لثقتك واختيارك لـ Coral Reef Center ونطمح دوماً لرؤيتك وخدمتك في رحلات الغوص القادمة! 🤿🐋`;
    
    // فتح الواتساب مباشرة لإرسال الرسالة التلقائية
    window.open(`https://wa.me/${currentActiveRental.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
    
    alert(`✅ تم معالجة الإرجاع بنجاح وتحديث الفاتورة إلى (${statusText}).\nجاري الآن فتح الواتساب تلقائياً لإرسال رسالة الاستلام الفنية للعميل.`);
    
    // تصفية وإعادة تهيئة الحقول بالكامل لعملية مستخدم جديدة
    document.getElementById('invoice-details-card').style.display = 'none';
    document.getElementById('is-damaged-checkbox').checked = false;
    document.getElementById('damage-note').value = '';
    document.getElementById('damage-note-container').style.display = 'none';
    document.getElementById('return-search-input').value = '';
    currentActiveRental = null;
};

// دالة عرض وتصفية واستعلام الفواتير في الصفحة الجديدة
window.renderInvoices = function(filter = 'all') {
    const tbody = document.getElementById('invoices-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if (localRentals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد فواتير مسجلة في النظام حالياً.</td></tr>';
        return;
    }
    
    // عرض الفواتير من الأحدث إلى الأقدم
    localRentals.slice().reverse().forEach(r => {
        const isActive = (r.status === 'تحت التأجير' || r.status === 'مستلمة جزئياً');
        
        if (filter === 'active' && !isActive) return;
        if (filter === 'closed' && isActive) return;
        
        const statusColor = isActive ? '#ff8c00' : '#00ffcc';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${r.invoiceId}</code></td>
            <td><strong>${r.customer}</strong></td>
            <td style="font-size: 13px; color: #aaa;">${r.equipmentDetails}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${r.status}</td>
            <td style="text-align: center; font-weight: bold; color: #ff8c00;">${r.total} ريال</td>
        `;
        tbody.appendChild(row);
    });
};

window.renderStatsTable = function() {
    const tbody = document.getElementById('stats-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (localEquipment.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا توجد معدات مسجلة حالياً لعرض إحصائياتها.</td></tr>'; return;
    }
    
    localEquipment.forEach(eq => {
        let timesRented = 0; let totalDaysRented = 0;
        localRentals.forEach(rental => {
            if (rental.serialsUsed && rental.serialsUsed.includes(eq.serial)) {
                timesRented++; totalDaysRented += rental.days;
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
    if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.startsWith('http')) return;
    try {
        await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (e) { console.error("Google Sheet Communication Error:", e); }
}

// دالة التشغيل التلقائي عند بداية تشغيل السيرفر والموقع لأول مرة لفتح صفحة المعدات
window.onload = () => { showPage('equipment-page'); };
