// سكريبت واجهة المستخدم - يتحكم في وظائف واجهة المستخدم popup.html

document.addEventListener('DOMContentLoaded', function() {
    // عناصر واجهة المستخدم
    const isEnabledCheckbox = document.getElementById('isEnabled');
    const autoDetectArabicCheckbox = document.getElementById('autoDetectArabic');
    const minArabicTextPercentageSlider = document.getElementById('minArabicTextPercentage');
    const percentageValueDisplay = document.getElementById('percentageValue');
    const whitelistedDomainsContainer = document.getElementById('whitelistedDomains');
    const blacklistedDomainsContainer = document.getElementById('blacklistedDomains');
    const whitelistDomainInput = document.getElementById('whitelistDomain');
    const blacklistDomainInput = document.getElementById('blacklistDomain');
    const addToWhitelistButton = document.getElementById('addToWhitelist');
    const addToBlacklistButton = document.getElementById('addToBlacklist');
    const currentPageInfoContainer = document.getElementById('currentPageInfo');
    const blacklistCurrentSiteButton = document.getElementById('blacklistCurrentSite');
    const whitelistCurrentSiteButton = document.getElementById('whitelistCurrentSite');
    
    // متغيرات لتخزين الإعدادات
    let settings = {
        isEnabled: true,
        autoDetectArabic: true,
        minArabicTextPercentage: 15,
        whitelistedDomains: [],
        blacklistedDomains: []
    };
    
    // متغيرات لتخزين معلومات الصفحة الحالية
    let currentPageInfo = {
        domain: '',
        hasArabicContent: false,
        arabicPercentage: 0,
        isTranslatedPage: false
    };
    
    // تحميل الإعدادات الحالية
    function loadSettings() {
        chrome.storage.sync.get(null, (loadedSettings) => {
            if (loadedSettings) {
                settings = {
                    isEnabled: loadedSettings.isEnabled !== undefined ? loadedSettings.isEnabled : true,
                    autoDetectArabic: loadedSettings.autoDetectArabic !== undefined ? loadedSettings.autoDetectArabic : true,
                    minArabicTextPercentage: loadedSettings.minArabicTextPercentage !== undefined ? loadedSettings.minArabicTextPercentage : 15,
                    whitelistedDomains: loadedSettings.whitelistedDomains || [],
                    blacklistedDomains: loadedSettings.blacklistedDomains || []
                };
                
                // تحديث واجهة المستخدم بالإعدادات المحملة
                updateUI();
            }
        });
    }
    
    // تحديث واجهة المستخدم بناءً على الإعدادات الحالية
    function updateUI() {
        isEnabledCheckbox.checked = settings.isEnabled;
        autoDetectArabicCheckbox.checked = settings.autoDetectArabic;
        minArabicTextPercentageSlider.value = settings.minArabicTextPercentage;
        percentageValueDisplay.textContent = settings.minArabicTextPercentage + '%';
        
        // تحديث قائمة المواقع المسموح بها
        whitelistedDomainsContainer.innerHTML = '';
        if (settings.whitelistedDomains.length === 0) {
            whitelistedDomainsContainer.innerHTML = '<div class="domain-item">لا توجد مواقع في القائمة</div>';
        } else {
            settings.whitelistedDomains.forEach((domain, index) => {
                const domainItem = document.createElement('div');
                domainItem.className = 'domain-item';
                domainItem.innerHTML = `
                    <span>${domain}</span>
                    <button data-index="${index}" class="remove-whitelist">حذف</button>
                `;
                whitelistedDomainsContainer.appendChild(domainItem);
            });
            
            // إضافة مستمعي الأحداث لأزرار الحذف
            document.querySelectorAll('.remove-whitelist').forEach(button => {
                button.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    settings.whitelistedDomains.splice(index, 1);
                    saveSettings();
                    updateUI();
                });
            });
        }
        
        // تحديث قائمة المواقع المحظورة
        blacklistedDomainsContainer.innerHTML = '';
        if (settings.blacklistedDomains.length === 0) {
            blacklistedDomainsContainer.innerHTML = '<div class="domain-item">لا توجد مواقع في القائمة</div>';
        } else {
            settings.blacklistedDomains.forEach((domain, index) => {
                const domainItem = document.createElement('div');
                domainItem.className = 'domain-item';
                domainItem.innerHTML = `
                    <span>${domain}</span>
                    <button data-index="${index}" class="remove-blacklist">حذف</button>
                `;
                blacklistedDomainsContainer.appendChild(domainItem);
            });
            
            // إضافة مستمعي الأحداث لأزرار الحذف
            document.querySelectorAll('.remove-blacklist').forEach(button => {
                button.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    settings.blacklistedDomains.splice(index, 1);
                    saveSettings();
                    updateUI();
                });
            });
        }
        
        // تحديث حالة أزرار الإجراءات السريعة بناءً على حالة الموقع الحالي
        updateQuickActionButtons();
    }
    
    // تحديث حالة أزرار الإجراءات السريعة
    function updateQuickActionButtons() {
        if (currentPageInfo.domain) {
            const isWhitelisted = settings.whitelistedDomains.some(domain => currentPageInfo.domain.includes(domain));
            const isBlacklisted = settings.blacklistedDomains.some(domain => currentPageInfo.domain.includes(domain));
            
            // تعطيل زر القائمة البيضاء إذا كان الموقع موجودًا بالفعل في القائمة البيضاء
            whitelistCurrentSiteButton.disabled = isWhitelisted;
            whitelistCurrentSiteButton.style.opacity = isWhitelisted ? '0.5' : '1';
            
            // تعطيل زر القائمة السوداء إذا كان الموقع موجودًا بالفعل في القائمة السوداء
            blacklistCurrentSiteButton.disabled = isBlacklisted;
            blacklistCurrentSiteButton.style.opacity = isBlacklisted ? '0.5' : '1';
        }
    }
    
    // حفظ الإعدادات
    function saveSettings() {
        chrome.storage.sync.set(settings, () => {
            // إرسال الإعدادات المحدثة إلى سكريبت الخلفية
            chrome.runtime.sendMessage({
                action: "updateSettings",
                settings: settings
            });
        });
    }
    
    // الحصول على معلومات الصفحة الحالية
    function getCurrentPageInfo() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const currentTab = tabs[0];
                const url = new URL(currentTab.url);
                currentPageInfo.domain = url.hostname;
                
                // التحقق مما إذا كان النطاق في القائمة البيضاء أو السوداء
                const isWhitelisted = settings.whitelistedDomains.some(domain => currentPageInfo.domain.includes(domain));
                const isBlacklisted = settings.blacklistedDomains.some(domain => currentPageInfo.domain.includes(domain));
                
                // طلب معلومات الصفحة من سكريبت المحتوى
                chrome.tabs.sendMessage(currentTab.id, { action: "getPageInfo" }, (response) => {
                    if (response) {
                        currentPageInfo.hasArabicContent = response.hasArabicContent;
                        currentPageInfo.arabicPercentage = response.arabicPercentage;
                        currentPageInfo.isTranslatedPage = response.isTranslatedPage;
                        
                        // تحديث عرض معلومات الصفحة
                        updatePageInfoDisplay(isWhitelisted, isBlacklisted);
                        
                        // تحديث حالة أزرار الإجراءات السريعة
                        updateQuickActionButtons();
                    } else {
                        // في حالة عدم وجود استجابة (ربما لم يتم تحميل سكريبت المحتوى بعد)
                        currentPageInfoContainer.innerHTML = `
                            <div>النطاق: ${currentPageInfo.domain}</div>
                            <div>حالة الكشف: <span class="badge badge-warning">غير متاح</span></div>
                            <div>قد لا يكون الامتداد نشطًا على هذه الصفحة.</div>
                        `;
                        
                        // تحديث حالة أزرار الإجراءات السريعة
                        updateQuickActionButtons();
                    }
                });
            }
        });
    }
    
    // تحديث عرض معلومات الصفحة
    function updatePageInfoDisplay(isWhitelisted, isBlacklisted) {
        let statusBadge = '';
        let statusText = '';
        
        if (isBlacklisted) {
            statusBadge = '<span class="badge badge-danger">محظور</span>';
            statusText = 'هذا الموقع في القائمة السوداء، لن يتم تطبيق التحسينات عليه.';
        } else if (isWhitelisted) {
            statusBadge = '<span class="badge badge-success">مسموح</span>';
            statusText = 'هذا الموقع في القائمة البيضاء، سيتم تطبيق التحسينات عليه دائمًا.';
        } else if (currentPageInfo.hasArabicContent) {
            statusBadge = '<span class="badge badge-success">محتوى عربي</span>';
            statusText = `تم اكتشاف محتوى عربي (${currentPageInfo.arabicPercentage.toFixed(1)}%)، سيتم تطبيق التحسينات.`;
        } else {
            statusBadge = '<span class="badge badge-warning">غير عربي</span>';
            statusText = `لم يتم اكتشاف محتوى عربي كافٍ (${currentPageInfo.arabicPercentage.toFixed(1)}%)، لن يتم تطبيق التحسينات.`;
        }
        
        let translationBadge = '';
        if (currentPageInfo.isTranslatedPage) {
            translationBadge = '<span class="badge badge-info">مترجم</span>';
        }
        
        currentPageInfoContainer.innerHTML = `
            <div>النطاق: ${currentPageInfo.domain}</div>
            <div>الحالة: ${statusBadge} ${translationBadge}</div>
            <div>${statusText}</div>
        `;
    }
    
    // إضافة الموقع الحالي إلى القائمة السوداء
    function blacklistCurrentSite() {
        if (currentPageInfo.domain && !settings.blacklistedDomains.includes(currentPageInfo.domain)) {
            // إزالة الموقع من القائمة البيضاء إذا كان موجودًا فيها
            const whitelistIndex = settings.whitelistedDomains.indexOf(currentPageInfo.domain);
            if (whitelistIndex !== -1) {
                settings.whitelistedDomains.splice(whitelistIndex, 1);
            }
            
            // إضافة الموقع إلى القائمة السوداء
            settings.blacklistedDomains.push(currentPageInfo.domain);
            saveSettings();
            updateUI();
            
            // إرسال أمر لتحديث حالة الصفحة الحالية
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updatePageStatus",
                        isBlacklisted: true
                    });
                }
            });
        }
    }
    
    // إضافة الموقع الحالي إلى القائمة البيضاء
    function whitelistCurrentSite() {
        if (currentPageInfo.domain && !settings.whitelistedDomains.includes(currentPageInfo.domain)) {
            // إزالة الموقع من القائمة السوداء إذا كان موجودًا فيها
            const blacklistIndex = settings.blacklistedDomains.indexOf(currentPageInfo.domain);
            if (blacklistIndex !== -1) {
                settings.blacklistedDomains.splice(blacklistIndex, 1);
            }
            
            // إضافة الموقع إلى القائمة البيضاء
            settings.whitelistedDomains.push(currentPageInfo.domain);
            saveSettings();
            updateUI();
            
            // إرسال أمر لتحديث حالة الصفحة الحالية
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updatePageStatus",
                        isWhitelisted: true
                    });
                }
            });
        }
    }
    
    // إضافة مستمعي الأحداث
    isEnabledCheckbox.addEventListener('change', function() {
        settings.isEnabled = this.checked;
        saveSettings();
        
        // إرسال أمر مباشر لتبديل حالة التحسينات في الصفحة الحالية
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "toggleEnhancement",
                    isEnabled: settings.isEnabled
                });
            }
        });
    });
    
    autoDetectArabicCheckbox.addEventListener('change', function() {
        settings.autoDetectArabic = this.checked;
        saveSettings();
    });
    
    minArabicTextPercentageSlider.addEventListener('input', function() {
        settings.minArabicTextPercentage = parseInt(this.value);
        percentageValueDisplay.textContent = settings.minArabicTextPercentage + '%';
    });
    
    minArabicTextPercentageSlider.addEventListener('change', function() {
        saveSettings();
    });
    
    addToWhitelistButton.addEventListener('click', function() {
        const domain = whitelistDomainInput.value.trim();
        if (domain && !settings.whitelistedDomains.includes(domain)) {
            settings.whitelistedDomains.push(domain);
            saveSettings();
            updateUI();
            whitelistDomainInput.value = '';
        }
    });
    
    addToBlacklistButton.addEventListener('click', function() {
        const domain = blacklistDomainInput.value.trim();
        if (domain && !settings.blacklistedDomains.includes(domain)) {
            settings.blacklistedDomains.push(domain);
            saveSettings();
            updateUI();
            blacklistDomainInput.value = '';
        }
    });
    
    // إضافة مستمعي الأحداث لأزرار الإجراءات السريعة
    blacklistCurrentSiteButton.addEventListener('click', blacklistCurrentSite);
    whitelistCurrentSiteButton.addEventListener('click', whitelistCurrentSite);
    
    // تحميل الإعدادات عند فتح النافذة المنبثقة
    loadSettings();
    
    // الحصول على معلومات الصفحة الحالية
    getCurrentPageInfo();
});
