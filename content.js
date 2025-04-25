// سكريبت المحتوى - يطبق تحسينات اللغة العربية على صفحات الويب

(function () {
    'use strict';

    // متغيرات عامة
    let isEnabled = true;                // حالة تفعيل الامتداد
    let autoDetectArabic = true;         // الكشف التلقائي عن المحتوى العربي
    let minArabicTextPercentage = 15;    // النسبة المئوية الدنيا للنص العربي
    let whitelistedDomains = [];         // المواقع المسموح بها دائماً
    let blacklistedDomains = [];         // المواقع المحظورة دائماً
    let isTranslatedPage = false;        // هل الصفحة مترجمة بواسطة المتصفح
    
    // دالة للكشف عن النص العربي
    function detectArabicText() {
        // نمط للكشف عن الحروف العربية
        const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        
        // الحصول على نص الصفحة
        const bodyText = document.body.innerText || '';
        const textLength = bodyText.length;
        
        // إذا كانت الصفحة فارغة، لا نطبق التحسينات
        if (textLength < 100) {
            return { hasArabicContent: false, arabicPercentage: 0 };
        }
        
        // حساب عدد الحروف العربية
        let arabicCharsCount = 0;
        for (let i = 0; i < textLength; i++) {
            if (arabicPattern.test(bodyText[i])) {
                arabicCharsCount++;
            }
        }
        
        // حساب النسبة المئوية للنص العربي
        const arabicPercentage = (arabicCharsCount / textLength) * 100;
        const hasArabicContent = arabicPercentage >= minArabicTextPercentage;
        
        return { hasArabicContent, arabicPercentage };
    }
    
    // دالة للكشف عن صفحات الترجمة
    function detectTranslatedPage() {
        // الكشف عن علامات ترجمة Google
        const isGoogleTranslated = document.documentElement.classList.contains('translated-rtl') || 
                                  document.querySelector('.goog-te-banner-frame') !== null ||
                                  document.querySelector('.skiptranslate') !== null;
                                  
        // الكشف عن علامات ترجمة المتصفح الأخرى
        const hasTranslationMeta = document.querySelector('meta[name="translation"]') !== null;
        
        // الكشف عن تغييرات DOM التي تشير إلى الترجمة
        const hasTranslationAttributes = document.documentElement.hasAttribute('translate') || 
                                        document.body.hasAttribute('translate');
        
        return isGoogleTranslated || hasTranslationMeta || hasTranslationAttributes;
    }
    
    // دالة لتطبيق تحسينات اللغة العربية
    function applyArabicEnhancements(force = false) {
        // الحصول على اسم النطاق الحالي
        const currentDomain = window.location.hostname;
        
        // التحقق من القوائم البيضاء والسوداء
        const isWhitelisted = whitelistedDomains.some(domain => currentDomain.includes(domain));
        const isBlacklisted = blacklistedDomains.some(domain => currentDomain.includes(domain));
        
        // التحقق من حالة الترجمة
        isTranslatedPage = detectTranslatedPage();
        
        // تحديد ما إذا كان يجب تطبيق التحسينات
        let shouldApplyEnhancements = isEnabled && !isBlacklisted;
        
        // إذا كان الموقع في القائمة البيضاء، نطبق التحسينات بغض النظر عن الكشف التلقائي
        if (isWhitelisted) {
            shouldApplyEnhancements = isEnabled;
        } 
        // وإلا، نتحقق من الكشف التلقائي إذا كان مفعلاً
        else if (autoDetectArabic && !force) {
            const { hasArabicContent, arabicPercentage } = detectArabicText();
            shouldApplyEnhancements = shouldApplyEnhancements && hasArabicContent;
            
            // إبلاغ سكريبت الخلفية بنتيجة الكشف
            chrome.runtime.sendMessage({
                action: "reportArabicDetection",
                hasArabicContent: hasArabicContent,
                arabicPercentage: arabicPercentage
            }).catch(() => {
                // تجاهل أخطاء الاتصال
            });
        }
        
        // تطبيق أو إزالة فئة التحسينات
        if (shouldApplyEnhancements) {
            document.documentElement.classList.add('arabic-enhancer-active');
            
            // تعديلات إضافية للصفحات المترجمة
            if (isTranslatedPage) {
                applyTranslationFixes();
            }
        } else {
            document.documentElement.classList.remove('arabic-enhancer-active');
        }
    }
    
    // دالة لتطبيق إصلاحات خاصة بالصفحات المترجمة
    function applyTranslationFixes() {
        // إضافة فئة خاصة للصفحات المترجمة
        document.documentElement.classList.add('arabic-enhancer-translated');
        
        // تعديلات إضافية للتعامل مع مشاكل الترجمة
        const translationFixesCSS = `
            /* إصلاحات خاصة بالصفحات المترجمة */
            html.arabic-enhancer-active.arabic-enhancer-translated .skiptranslate,
            html.arabic-enhancer-active.arabic-enhancer-translated .goog-te-banner-frame {
                direction: ltr !important;
            }
            
            /* إصلاح تراكب النصوص في الصفحات المترجمة */
            html.arabic-enhancer-active.arabic-enhancer-translated input,
            html.arabic-enhancer-active.arabic-enhancer-translated textarea {
                text-align: right !important;
                direction: rtl !important;
            }
        `;
        
        // إضافة التنسيقات إلى الصفحة
        const style = document.createElement('style');
        style.id = 'arabic-enhancer-translation-fixes';
        style.textContent = translationFixesCSS;
        document.head.appendChild(style);
    }
    
    // دالة لتحديث الإعدادات
    function updateSettings(settings) {
        if (settings.isEnabled !== undefined) isEnabled = settings.isEnabled;
        if (settings.autoDetectArabic !== undefined) autoDetectArabic = settings.autoDetectArabic;
        if (settings.minArabicTextPercentage !== undefined) minArabicTextPercentage = settings.minArabicTextPercentage;
        if (settings.whitelistedDomains !== undefined) whitelistedDomains = settings.whitelistedDomains;
        if (settings.blacklistedDomains !== undefined) blacklistedDomains = settings.blacklistedDomains;
        
        // إعادة تطبيق التحسينات بناءً على الإعدادات الجديدة
        applyArabicEnhancements();
    }
    
    // الاستماع لرسائل من سكريبت الخلفية
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "settingsUpdated") {
            updateSettings(message.settings);
            sendResponse({ success: true });
        } else if (message.action === "toggleEnhancement") {
            // تبديل حالة التحسينات يدوياً
            isEnabled = message.isEnabled;
            applyArabicEnhancements(true); // تطبيق قسري
            sendResponse({ success: true });
        } else if (message.action === "getPageInfo") {
            // إرسال معلومات الصفحة الحالية
            const { hasArabicContent, arabicPercentage } = detectArabicText();
            sendResponse({
                domain: window.location.hostname,
                hasArabicContent: hasArabicContent,
                arabicPercentage: arabicPercentage,
                isTranslatedPage: isTranslatedPage
            });
        }
        return true; // للسماح بالرد غير المتزامن
    });
    
    // الحصول على الإعدادات الحالية عند بدء التشغيل
    chrome.runtime.sendMessage({ action: "getSettings" }, (settings) => {
        if (settings) {
            updateSettings(settings);
        } else {
            // تطبيق التحسينات بالإعدادات الافتراضية إذا لم تكن متوفرة
            applyArabicEnhancements();
        }
    });
    
    // مراقبة تغييرات DOM لإعادة تطبيق التحسينات عند الحاجة
    const observer = new MutationObserver((mutations) => {
        // التحقق مما إذا كانت التغييرات كبيرة بما يكفي لإعادة التقييم
        let significantChanges = false;
        
        for (const mutation of mutations) {
            // إذا تم إضافة عناصر جديدة
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    // التحقق من إضافة عناصر نصية كبيرة
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        (node.tagName === 'DIV' || node.tagName === 'SECTION' || 
                         node.tagName === 'ARTICLE' || node.tagName === 'MAIN')) {
                        significantChanges = true;
                        break;
                    }
                }
            }
            
            if (significantChanges) break;
        }
        
        // إعادة تطبيق التحسينات إذا كانت هناك تغييرات كبيرة
        if (significantChanges) {
            applyArabicEnhancements();
        }
    });
    
    // بدء مراقبة تغييرات DOM
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
    
    // تطبيق التحسينات عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyArabicEnhancements();
        });
    } else {
        applyArabicEnhancements();
    }
})();
