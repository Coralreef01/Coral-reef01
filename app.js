function showPage(pageId) {
    // إخفاء كل السكاشن
    document.querySelectorAll('.page-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    // إظهار السكشن المطلوب
    const target = document.getElementById(pageId);
    if(target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
}
// تأكد من إظهار أول صفحة عند تحميل التطبيق
window.onload = () => showPage('equipment-page');
