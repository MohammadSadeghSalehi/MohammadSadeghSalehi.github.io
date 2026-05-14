document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupNavigation();
    setupThemeToggle();
    setupMobileMenu();
});

// Map publication link labels to FontAwesome icons
const LINK_ICON_MAP = {
    'preprint': 'fas fa-file-lines',
    'arxiv': 'fas fa-file-lines',
    'doi': 'fas fa-link',
    'pdf': 'fas fa-file-pdf',
    'code': 'fab fa-github',
    'github': 'fab fa-github',
    'dataset': 'fas fa-database',
    'hugging face': 'fas fa-database',
    'huggingface': 'fas fa-database',
    'chapter': 'fas fa-book',
    'book': 'fas fa-book',
    'elsevier': 'fas fa-book',
    'video': 'fas fa-video',
    'slides': 'fas fa-rectangle-list',
    'project': 'fas fa-up-right-from-square',
    'more info': 'fas fa-up-right-from-square',
    'website': 'fas fa-globe'
};

function iconForLink(label) {
    if (!label) return 'fas fa-up-right-from-square';
    const key = label.toLowerCase();
    for (const k in LINK_ICON_MAP) {
        if (key.includes(k)) return LINK_ICON_MAP[k];
    }
    return 'fas fa-up-right-from-square';
}

function setupScrollReveal() {
    const targets = document.querySelectorAll('.reveal, .card, .timeline-item, .tag, .section-title, .subsection-title');
    targets.forEach(el => el.classList.add('reveal'));

    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                entry.target.style.transitionDelay = `${Math.min(i * 40, 240)}ms`;
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => io.observe(el));
}

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
    // Helper to parse "MMM-YY" dates (e.g., "Apr-25")
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        try {
            const parts = dateStr.split('-');
            if (parts.length !== 2) return new Date(dateStr); // Try standard parse if not MMM-YY
            const month = months[parts[0]];
            const year = 2000 + parseInt(parts[1]);
            if (isNaN(month) || isNaN(year)) return new Date(dateStr);
            return new Date(year, month);
        } catch (e) {
            return new Date(0);
        }
    };

    // Sort News: Newest first
    if (data.news && Array.isArray(data.news)) {
        data.news.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    }

    // Sort Publications: Newest year first
    if (data.publications && Array.isArray(data.publications)) {
        data.publications.sort((a, b) => {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return yearB - yearA;
        });
    }

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
        // Main Body Profile
        const profileImg = document.getElementById('profile-image');
        if (profileImg) profileImg.src = data.profile.image || '';

        setHtml('profile-name', data.profile.name);
        setText('profile-role', data.profile.role);
        setText('profile-tagline', data.profile.tagline || '');

        const badgesEl = document.getElementById('profile-badges');
        if (badgesEl && Array.isArray(data.profile.badges)) {
            badgesEl.innerHTML = data.profile.badges.map(b => `
                <span class="badge"><i class="${b.icon}"></i>${b.label}</span>
            `).join('');
        }

        // Social Links (Main Section)
        const socialMain = document.getElementById('social-links-main');
        if (socialMain && data.profile.socials) {
            socialMain.innerHTML = data.profile.socials.map(link => `
                <a href="${link.url}" target="_blank" aria-label="${link.name}" title="${link.name}">
                    <i class="${link.icon}"></i>
                </a>
            `).join('');
        }

        // Social Links (Nav Bar - Optional, keep valid if exists)
        const socialNav = document.getElementById('social-links-nav');
        if (socialNav && data.profile.socials) {
            // Maybe render just a few or all smaller? Rendering all for now.
            socialNav.innerHTML = data.profile.socials.map(link => `
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
                    <span class="card-date"><i class="far fa-calendar"></i>${item.date}</span>
                </div>
                <h3 class="card-title">${item.title}</h3>
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
                    ${item.supervisors ? `<i class="fas fa-user-tie meta-icon"></i>${item.supervisors}<br>` : ''}
                    ${item.partnership ? `<span class="badge"><i class="fas fa-handshake"></i>${item.partnership}</span>` : ''}
                </p>
                ${item.description ? `<div class="card-description rich-text mt-2">${item.description}</div>` : ''}
                ${item.link ? `
                    <div class="card-links">
                        <a href="${item.link}" target="_blank" class="btn-sm"><i class="fas fa-up-right-from-square"></i>More Info</a>
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
                <div class="card-header">
                    <div class="pub-badges">
                        ${item.journal ? `<span class="badge badge-venue"><i class="fas fa-bookmark"></i>${item.journal}</span>` : ''}
                        <span class="badge badge-year"><i class="far fa-calendar"></i>${item.year}</span>
                    </div>
                </div>
                <h3 class="card-title">${item.title}</h3>
                <p class="card-description">
                    <i class="fas fa-user-group meta-icon"></i>${item.authors}
                </p>
                <div class="card-links">
                    ${item.links && Array.isArray(item.links) ? item.links.map(link => `
                        <a href="${link.url}" target="_blank" class="btn-sm"><i class="${iconForLink(link.label)}"></i>${link.label}</a>
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
                <p class="card-description"><i class="fas fa-microphone meta-icon"></i>${item.event}</p>
            </div>
        `).join('');
    }

    // Trigger scroll-reveal after DOM is populated
    requestAnimationFrame(setupScrollReveal);

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

    const darkColors = {
        primary: '#60a5fa',
        secondary: '#3b82f6',
        bg: '#0f172a'
    };

    // Helper to apply colors
    const updateBg = (isDark) => {
        if (window.updateFluidColors && typeof SITE_DATA !== 'undefined') {
            if (isDark) {
                window.updateFluidColors(darkColors.primary, darkColors.secondary, darkColors.bg);
            } else {
                // Use data.js values for light mode
                window.updateFluidColors(
                    SITE_DATA.theme.primaryColor,
                    SITE_DATA.theme.secondaryColor,
                    SITE_DATA.theme.backgroundColor
                );
            }
        }
    };

    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        // Small timeout to ensure background.js is ready
        setTimeout(() => updateBg(true), 100);
    } else {
        setTimeout(() => updateBg(false), 100);
    }

    const applyToggle = () => {
        const currentTheme = document.body.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.body.removeAttribute('data-theme');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
            updateBg(false);
        } else {
            document.body.setAttribute('data-theme', 'dark');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
            updateBg(true);
        }
    };

    btn.addEventListener('click', () => {
        // Use View Transitions API where supported for a buttery cross-fade
        if (document.startViewTransition) {
            document.startViewTransition(() => applyToggle());
        } else {
            document.body.classList.add('theme-fading');
            applyToggle();
            setTimeout(() => document.body.classList.remove('theme-fading'), 320);
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
