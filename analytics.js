// Google Analytics 4 with IP anonymization
(function() {
    // Only run if user has consented
    if (localStorage.getItem('analyticsConsent') !== 'true') {
        return;
    }

    const GA_MEASUREMENT_ID = 'G-23J2GDK21Q';
    
    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Configure GA4
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    
    // Set up GA4 with privacy-friendly settings
    gtag('config', GA_MEASUREMENT_ID, {
        'anonymize_ip': true,
        'allow_google_signals': false,
        'allow_ad_personalization_signals': false
    });
})(); 