// Check API status
async function checkAPIStatus() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const statusMessage = document.getElementById('status-message');
    const statusDot = statusIndicator.querySelector('.status-dot');

    try {
        const response = await fetch('/health');
        const data = await response.json();

        if (response.ok && data.success) {
            statusDot.classList.add('online');
            statusText.textContent = 'Online';
            statusMessage.textContent = 'API is running and ready to accept requests';
        } else {
            throw new Error('API returned error');
        }
    } catch (error) {
        statusDot.classList.add('offline');
        statusText.textContent = 'Offline';
        statusMessage.textContent = 'Unable to connect to API. Please check your connection.';
    }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Check API status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
    // Check status every 30 seconds
    setInterval(checkAPIStatus, 30000);
});

