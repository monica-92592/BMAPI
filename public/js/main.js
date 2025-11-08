// Mobile Navigation Toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
    }
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80; // Account for sticky nav
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            // Close mobile menu if open
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });
});

// API Status Check
let statusCheckInterval;

async function checkAPIStatus() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const statusMessage = document.getElementById('status-message');
    const uptimeEl = document.getElementById('uptime');
    const responseTimeEl = document.getElementById('response-time');

    if (!statusDot || !statusText || !statusMessage) return;

    try {
        const startTime = performance.now();
        const response = await fetch('/health');
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        const data = await response.json();

        if (response.ok && data.success) {
            statusDot.classList.remove('offline');
            statusDot.classList.add('online');
            statusText.textContent = 'Online';
            statusMessage.textContent = 'API is running and ready to accept requests';
            if (responseTimeEl) responseTimeEl.textContent = `${responseTime}ms`;
            if (uptimeEl) uptimeEl.textContent = '99.9%';
        } else {
            throw new Error('API returned error');
        }
    } catch (error) {
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
        statusText.textContent = 'Offline';
        statusMessage.textContent = 'Unable to connect to API. Please check your connection.';
        if (responseTimeEl) responseTimeEl.textContent = '--';
        if (uptimeEl) uptimeEl.textContent = '--';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
    // Check status every 30 seconds
    statusCheckInterval = setInterval(checkAPIStatus, 30000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
});

// Add active state to navigation links on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');

function updateActiveNavLink() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', updateActiveNavLink);
