// Cookie consent banner
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has already consented
    if (localStorage.getItem('analyticsConsent') === 'true') {
        return; // User already consented, no need to show banner
    }

    // Create banner element
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 1000;
        font-family: Arial, sans-serif;
    `;

    // Create message
    const message = document.createElement('div');
    message.innerHTML = `
        This website uses Google Analytics to count anonymous page visits. 
        We do not collect personal data and IP addresses are anonymized.
        Note: If you use an ad blocker, analytics might be blocked.
    `;
    message.style.cssText = `
        flex: 1;
        margin-right: 20px;
        font-size: 14px;
    `;

    // Create accept button
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
    acceptButton.onclick = function() {
        localStorage.setItem('analyticsConsent', 'true');
        banner.remove();
        // Reload analytics after consent
        const script = document.createElement('script');
        script.src = 'analytics.js';
        document.head.appendChild(script);
    };

    // Add elements to banner
    banner.appendChild(message);
    banner.appendChild(acceptButton);

    // Add banner to page
    document.body.appendChild(banner);
}); 