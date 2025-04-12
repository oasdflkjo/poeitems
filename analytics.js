// Google Analytics 4
(function() {
    // Only run if user has consented
    if (localStorage.getItem('analyticsConsent') !== 'true') {
        return;
    }

    try {
        // Load GA4 script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-23J2GDK21Q';
        script.onerror = function() {
            console.log('Analytics script blocked by ad blocker - this is expected');
        };
        document.head.appendChild(script);

        // Configure GA4 exactly as Google provides
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-23J2GDK21Q');
    } catch (e) {
        console.log('Analytics initialization failed - this is expected with ad blockers');
    }
})(); 