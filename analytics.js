// Google Analytics 4
(function() {
    // Only run if user has consented
    if (localStorage.getItem('analyticsConsent') !== 'true') {
        return;
    }

    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-23J2GDK21Q';
    document.head.appendChild(script);

    // Configure GA4 exactly as Google provides
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-23J2GDK21Q');
})(); 