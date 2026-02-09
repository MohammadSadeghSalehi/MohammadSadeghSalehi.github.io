document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupNavigation();
    setupThemeToggle();
    setupMobileMenu();
});

function setupMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.getElementById('main-nav');

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('open');
            const icon = toggle.querySelector('i');
            if (nav.classList.contains('open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Close menu when clicking a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                toggle.querySelector('i').classList.remove('fa-times');
                toggle.querySelector('i').classList.add('fa-bars');
            });
        });
    }
}

async function fetchData() {
    try {
        // Use global variable from data.js
        if (typeof SITE_DATA === 'undefined') {
            throw new Error('SITE_DATA is not defined. Ensure data.js is loaded.');
        }

        const data = SITE_DATA;
        renderData(data);

        if (data.theme) {
            try {
                applyTheme(data.theme);
            } catch (themeErr) {
                console.error('Error applying theme:', themeErr);
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
        document.querySelector('.content-area').innerHTML = `<div style="text-align:center; padding:2rem;">
            <h2>Error Loading Content</h2>
            <p>${error.message}</p>
        </div>`;
    }
}

function renderData(data) {
    const setHtml = (id, content) => {
        const el = document.getElementById(id);
        if (el && content) el.innerHTML = content;
    };

    const setText = (id, content) => {
        const el = document.getElementById(id);
        if (el && content) el.textContent = content;
    };

    // Profile
    if (data.profile) {
        document.getElementById('profile-image').src = data.profile.image || '';
        setHtml('profile-name', data.profile.name); // Using innerHTML to allow links in name if desired
        setText('profile-role', data.profile.role);

        // Social Links
        const socialContainer = document.getElementById('social-links');
        if (socialContainer && data.profile.socials) {
            socialContainer.innerHTML = data.profile.socials.map(link => `
                <a href="${link.url}" target="_blank" aria-label="${link.name}" title="${link.name}">
                    <i class="${link.icon}"></i>
                </a>
            `).join('');
        }
    }

    // Bio - Supports HTML
    if (data.biography) {
        setHtml('bio-text', data.biography);
    }

    // Interests
    const interestsContainer = document.getElementById('interests-list');
    if (interestsContainer && data.interests) {
        interestsContainer.innerHTML = data.interests.map(item => `
            <span class="tag">${item}</span>
        `).join('');
    }

    // Education
    const educationContainer = document.getElementById('education-list');
    if (educationContainer && data.education) {
        educationContainer.innerHTML = data.education.map(item => `
            <div class="timeline-item">
                <div class="timeline-degree">${item.degree}</div>
                <div class="timeline-institution">${item.institution}</div>
                <div class="timeline-period">${item.period}</div>
            </div>
        `).join('');
    }

    // News
    const newsContainer = document.getElementById('news-list');
    if (newsContainer && data.news) {
        newsContainer.innerHTML = data.news.map(item => `
            <div class="card">
                <div class="card-header">
                    <span class="card-date">${item.date}</span>
                </div>
                <!-- Title supports links -->
                <h3 class="card-title">${item.title}</h3>
                <!-- Description supports Rich Text -->
                <div class="card-description">${item.description}</div>
            </div>
        `).join('');
    }

    // Projects
    const projectsContainer = document.getElementById('projects-list');
    if (projectsContainer && data.projects) {
        projectsContainer.innerHTML = data.projects.map(item => `
            <div class="card">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-description">
                    ${item.supervisors ? `<strong>Supervisors:</strong> ${item.supervisors}<br>` : ''}
                    ${item.partnership ? `<strong>Partnership:</strong> ${item.partnership}` : ''}
                </p>
                ${item.description ? `<div class="card-description rich-text mt-2">${item.description}</div>` : ''}
                ${item.link ? `
                    <div class="card-links">
                        <a href="${item.link}" target="_blank" class="btn-sm">More Info</a>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Publications
    const pubsContainer = document.getElementById('publications-list');
    if (pubsContainer && data.publications) {
        pubsContainer.innerHTML = data.publications.map(item => `
            <div class="card">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-description">
                    <strong>Authors:</strong> ${item.authors}<br>
                    <strong>Year:</strong> ${item.year}
                </p>
                <div class="card-links">
                    ${item.links && Array.isArray(item.links) ? item.links.map(link => `
                        <a href="${link.url}" target="_blank" class="btn-sm">${link.label}</a>
                    `).join('') : ''}
                </div>
            </div>
        `).join('');
    }

    // Talks
    const talksContainer = document.getElementById('talks-list');
    if (talksContainer && data.talks) {
        talksContainer.innerHTML = data.talks.map(item => `
            <div class="card">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-description">${item.event}</p>
            </div>
        `).join('');
    }

    // Teaching
    const teachingContainer = document.getElementById('teaching-list');
    if (teachingContainer && data.teaching) {
        teachingContainer.innerHTML = data.teaching.map(item => `
            <div class="card">
                <h3 class="card-title">${item.role}</h3>
                <p class="card-description">
                    <strong>Course:</strong> ${item.course}<br>
                    <strong>Period:</strong> ${item.period}<br>
                    <strong>Institution:</strong> ${item.institution}
                </p>
            </div>
        `).join('');
    }

    // Contact
    const contactContainer = document.getElementById('contact-list');
    if (contactContainer && data.profile && data.profile.socials) {
        contactContainer.innerHTML = data.profile.socials.map(link => `
            <li>
                <a href="${link.url}" target="_blank">
                    <i class="${link.icon}"></i> ${link.name}
                </a>
            </li>
        `).join('');
        // Add location and email directly if they exist
        if (data.profile.email) {
            const emailLi = document.createElement('li');
            emailLi.innerHTML = `<a href="mailto:${data.profile.email}"><i class="fas fa-envelope"></i> ${data.profile.email}</a>`;
            contactContainer.prepend(emailLi);
        }
        if (data.profile.location) {
            const locLi = document.createElement('li');
            locLi.innerHTML = `<span><i class="fas fa-map-marker-alt"></i> ${data.profile.location}</span>`;
            contactContainer.prepend(locLi);
        }
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.main-nav a');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);

            // Update UI
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });

            // Scroll to top of content on mobile
            if (window.innerWidth <= 768) {
                document.querySelector('.content-area').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function setupThemeToggle() {
    const btn = document.getElementById('theme-btn');
    const icon = btn.querySelector('i');

    // Check saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    btn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.body.removeAttribute('data-theme');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    });
}

function applyTheme(theme) {
    const root = document.documentElement;

    // Apply CSS Variables
    if (theme.primaryColor) root.style.setProperty('--primary-color', theme.primaryColor);
    if (theme.backgroundColor) root.style.setProperty('--bg-color', theme.backgroundColor);
    if (theme.textColor) root.style.setProperty('--text-color', theme.textColor);
    if (theme.sidebarColor) root.style.setProperty('--sidebar-bg', theme.sidebarColor);

    // Update Fluid Background
    if (window.updateFluidColors) {
        window.updateFluidColors(
            theme.primaryColor,
            theme.secondaryColor || '#8b5cf6',
            theme.backgroundColor
        );
    }
}
