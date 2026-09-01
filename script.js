document.addEventListener('DOMContentLoaded', () => {
    setupThemeToggle();
    fetchData();
    setupNavigation();
    setupMobileMenu();
    document.documentElement.classList.add('enhanced');
});

// Inline brand SVGs for venues that don't have FontAwesome icons
const BRAND_SVG = {
    arxiv: `<svg class="brand-logo" viewBox="0 0 512 512" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="#b31b1b" d="M85.7 96.5h67.3l67.5 81.6 18.6 24.7 18.6-24.7 67.4-81.6h67.3L286.5 247.4l140 168.1h-67.4l-79.6-96.4-23.3-30-23.3 30-79.6 96.4H85.8l140-168.1z"/></svg>`,
    huggingface: `<svg class="brand-logo" viewBox="0 0 95 88" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="#FFD21E" d="M47.21 76.07c19.4 0 35.13-15.73 35.13-35.13S66.61 5.81 47.21 5.81 12.08 21.54 12.08 40.94 27.81 76.07 47.21 76.07Z"/><path fill="#3A3B45" d="M81.37 41.18c0 18.6-15.27 33.7-34.13 33.7s-34.13-15.1-34.13-33.7 15.27-33.7 34.13-33.7 34.13 15.1 34.13 33.7Z" opacity=".15"/><circle cx="35" cy="42" r="5" fill="#3A3B45"/><circle cx="60" cy="42" r="5" fill="#3A3B45"/><path fill="#3A3B45" d="M37 56c0-1.1.9-2 2-2h17c1.1 0 2 .9 2 2v2c0 5.52-4.48 10-10 10s-10-4.48-10-10v-2Z"/><circle cx="22" cy="50" r="6" fill="#FF9D0B" opacity=".5"/><circle cx="73" cy="50" r="6" fill="#FF9D0B" opacity=".5"/></svg>`,
    x: `<svg class="brand-logo social-brand-logo" viewBox="0 0 1200 1227" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M714.2 519.3 1160.9 0h-105.9L667.2 450.9 357.3 0H0l468.5 681.8L0 1226.4h105.9l409.6-476.3 327.1 476.3h357.3L714.2 519.3Zm-145 168.5-47.5-67.9L144.1 79.7h162.5l304.9 436.2 47.5 67.9 396.1 566.9H892.6L569.2 687.8Z"/></svg>`
};

// Map publication link labels to FontAwesome icons
const LINK_ICON_MAP = {
    'doi': 'fas fa-link',
    'pdf': 'fas fa-file-pdf',
    'code': 'fab fa-github',
    'github': 'fab fa-github',
    'dataset': 'fas fa-database',
    'youtube': 'fab fa-youtube',
    'chapter': 'fas fa-book',
    'book': 'fas fa-book',
    'elsevier': 'fas fa-book',
    'springer': 'fas fa-book',
    'video': 'fas fa-video',
    'slides': 'fas fa-rectangle-list',
    'project': 'fas fa-up-right-from-square',
    'more info': 'fas fa-up-right-from-square',
    'scholar': 'fas fa-graduation-cap',
    'website': 'fas fa-globe',
    'preprint': 'fas fa-file-lines'
};

function iconForLink(label, url) {
    const lbl = (label || '').toLowerCase();
    const u = (url || '').toLowerCase();
    if (lbl.includes('arxiv') || u.includes('arxiv.org')) return { brand: 'arxiv' };
    if (lbl.includes('hugging') || u.includes('huggingface.co')) return { brand: 'huggingface' };
    if (lbl === 'x' || lbl.includes(' on x') || u.includes('x.com/')) return { brand: 'x' };
    if (lbl.includes('youtube') || u.includes('youtube.com') || u.includes('youtu.be')) return { fa: 'fab fa-youtube' };
    for (const k in LINK_ICON_MAP) {
        if (lbl.includes(k)) return { fa: LINK_ICON_MAP[k] };
    }
    return { fa: 'fas fa-up-right-from-square' };
}

function renderLinkIcon(label, url) {
    const r = iconForLink(label, url);
    if (r.brand) return BRAND_SVG[r.brand];
    return `<i class="${r.fa}"></i>`;
}

function renderProfileBadge(badge) {
    const className = badge.featured ? 'badge badge-erdos' : 'badge';
    const icon = badge.icon ? `<i class="${escapeAttr(badge.icon)}" aria-hidden="true"></i>` : '';
    const value = badge.value ? `<strong class="badge-value">${escapeAttr(badge.value)}</strong>` : '';
    const content = `${icon}<span>${escapeAttr(badge.label)}</span>${value}`;

    if (!badge.url) return `<span class="${className}">${content}</span>`;

    const accessibleLabel = `${badge.label}${badge.value ? ` ${badge.value}` : ''} — view source`;
    return `<a class="${className}" href="${escapeAttr(badge.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(accessibleLabel)}" title="View verification on X">${content}</a>`;
}

function isEmailSocial(link) {
    const name = ((link && link.name) || '').toLowerCase();
    const url = ((link && link.url) || '').toLowerCase();
    return name === 'email' || url.startsWith('mailto:');
}

function renderSocialIcon(link) {
    const name = ((link && link.name) || '').toLowerCase();
    const icon = (link && link.icon) || '';
    const url = (link && link.url) || '';
    if (name === 'x' || icon === 'brand-x' || url.includes('x.com/')) {
        return BRAND_SVG.x;
    }
    return `<i class="${icon || 'fas fa-up-right-from-square'}"></i>`;
}

function getProfileEmail(profile) {
    if (!profile) return '';
    if (Array.isArray(profile.emailCodes) && profile.emailCodes.length) {
        return profile.emailCodes.map(code => String.fromCharCode(code)).join('');
    }
    return '';
}

function renderEmailButton(className = 'social-email-btn') {
    return `<button type="button" class="${className}" data-email-action aria-label="Email" title="Email">
        <i class="fas fa-envelope"></i>
    </button>`;
}

function renderSocialLinks(profile) {
    const links = ((profile && profile.socials) || []).filter(link => !isEmailSocial(link));
    const emailButton = getProfileEmail(profile) ? renderEmailButton() : '';
    return [
        emailButton,
        ...links.map(link => `
            <a href="${escapeAttr(link.url)}" target="_blank" rel="noopener" aria-label="${escapeAttr(link.name)}" title="${escapeAttr(link.name)}">
                ${renderSocialIcon(link)}
            </a>
        `)
    ].join('');
}

function setupEmailActions(profile) {
    const email = getProfileEmail(profile);
    if (!email) return;
    document.querySelectorAll('[data-email-action]').forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = `mailto:${email}`;
        });
    });
}

function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function revealSectionContent(section) {
    if (!section) return;
    section.querySelectorAll('.reveal').forEach(el => {
        el.style.transitionDelay = '0ms';
        el.classList.add('is-visible');
    });
}

function setupScrollReveal() {
    // Content stays in the document for crawlers and innerText.
    // Motion is a progressive enhancement only.
    document.documentElement.classList.add('enhanced');
    document.querySelectorAll('.card, .project-feature, .timeline-item').forEach(el => {
        el.classList.add('reveal', 'is-visible');
    });
}

function setupMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.getElementById('main-nav');

    if (toggle && nav) {
        const setOpen = (open) => {
            nav.classList.toggle('open', open);
            toggle.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        };

        toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setOpen(false));
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
            badgesEl.innerHTML = data.profile.badges.map(renderProfileBadge).join('');
        }

        // Social Links (Main Section)
        const socialMain = document.getElementById('social-links-main');
        if (socialMain) {
            socialMain.innerHTML = renderSocialLinks(data.profile);
        }

        // Social Links (Nav Bar - Optional, keep valid if exists)
        const socialNav = document.getElementById('social-links-nav');
        if (socialNav) {
            socialNav.innerHTML = renderSocialLinks(data.profile);
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
                ${item.image && item.image.src ? `
                    ${item.image.url ? `<a class="news-image-link" href="${escapeAttr(item.image.url)}" target="_blank" rel="noopener">` : '<div class="news-image-frame">'}
                        <img class="news-image" src="${escapeAttr(item.image.src)}" alt="${escapeAttr(item.image.alt || item.title)}" loading="lazy">
                    ${item.image.url ? '</a>' : '</div>'}
                ` : ''}
                <div class="card-description">${item.description}</div>
                ${item.links && Array.isArray(item.links) ? `
                    <div class="card-links">
                        ${item.links.map(link => `
                            <a href="${link.url}" target="_blank" rel="noopener" class="btn-sm">${renderLinkIcon(link.label, link.url)}${link.label}</a>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Projects
    const featured = (data.projects || []).filter(item => item.featured);
    const software = data.software || (data.projects || []).filter(item => item.kind === 'software' && !item.featured);
    const research = data.research || [];

    const featuredContainer = document.getElementById('featured-projects');
    if (featuredContainer) {
        featuredContainer.innerHTML = featured.map(item => `
            <article class="project-feature">
                <p class="eyebrow">${item.eyebrow || 'Software'}</p>
                <h3>${item.title}</h3>
                ${item.partnership ? `<p class="card-description"><span class="badge"><i class="fas fa-code-branch"></i>${item.partnership}</span></p>` : ''}
                ${item.description ? `<div class="card-description rich-text">${item.description}</div>` : ''}
                ${item.stats && item.stats.length ? `
                    <div class="project-feature-stats">
                        ${item.stats.map(stat => `<div><strong>${stat.value}</strong><span>${stat.label}</span></div>`).join('')}
                    </div>
                ` : ''}
                <div class="card-links">
                    ${(item.links && item.links.length ? item.links : (item.link ? [{ label: 'GitHub', url: item.link }] : [])).map(link => `
                        <a href="${link.url}" target="_blank" rel="noopener" class="btn-sm">${renderLinkIcon(link.label, link.url)}${link.label}</a>
                    `).join('')}
                </div>
            </article>
        `).join('');
    }

    const softwareContainer = document.getElementById('software-list');
    if (softwareContainer) {
        softwareContainer.innerHTML = software.map(item => `
            <article class="card">
                <h3 class="card-title">${item.title}</h3>
                ${item.description ? `<div class="card-description">${item.description}</div>` : ''}
                ${item.link ? `
                    <div class="card-links">
                        <a href="${item.link}" target="_blank" rel="noopener" class="btn-sm"><i class="fab fa-github"></i>GitHub</a>
                    </div>
                ` : ''}
            </article>
        `).join('');
    }

    const researchContainer = document.getElementById('research-list');
    if (researchContainer) {
        researchContainer.innerHTML = research.map(item => `
            <article class="card">
                <h3 class="card-title">${item.title}</h3>
                ${item.description ? `<div class="card-description">${item.description}</div>` : ''}
                <div class="card-links">
                    ${(item.links && item.links.length ? item.links : (item.link ? [{ label: 'More Info', url: item.link }] : [])).map(link => `
                        <a href="${link.url}" target="_blank" rel="noopener" class="btn-sm">${renderLinkIcon(link.label, link.url)}${link.label}</a>
                    `).join('')}
                </div>
            </article>
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
                        <a href="${link.url}" target="_blank" class="btn-sm">${renderLinkIcon(link.label, link.url)}${link.label}</a>
                    `).join('') : ''}
                </div>
            </div>
        `).join('');
    }

    // Talks
    const talksContainer = document.getElementById('talks-list');
    if (talksContainer && data.talks) {
        talksContainer.innerHTML = data.talks.map(item => `
            <div class="card talk-card ${item.videoId ? 'talk-card-featured' : ''}">
                ${item.date ? `
                    <div class="card-header">
                        <span class="card-date"><i class="far fa-calendar"></i>${item.date}</span>
                    </div>
                ` : ''}
                <h3 class="card-title">${item.title}</h3>
                <p class="card-description"><i class="fas fa-microphone meta-icon"></i>${item.event}</p>
                ${item.description ? `<p class="card-description talk-description">${item.description}</p>` : ''}
                ${item.videoId ? `
                    <div class="video-embed">
                        <iframe
                            width="560"
                            height="315"
                            src="https://www.youtube.com/embed/${encodeURIComponent(item.videoId)}"
                            title="${escapeAttr(item.title)}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerpolicy="strict-origin-when-cross-origin"
                            allowfullscreen
                            loading="lazy"></iframe>
                    </div>
                ` : ''}
                ${item.links && Array.isArray(item.links) ? `
                    <div class="card-links">
                        ${item.links.map(link => `
                            <a href="${link.url}" target="_blank" rel="noopener" class="btn-sm">${renderLinkIcon(link.label, link.url)}${link.label}</a>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderDatasetFeature(data.datasetFeature);

    // Trigger scroll-reveal after DOM is populated
    requestAnimationFrame(setupScrollReveal);

    // Contact
    const contactContainer = document.getElementById('contact-list');
    if (contactContainer && data.profile) {
        const socialLinks = (data.profile.socials || []).filter(link => !isEmailSocial(link));
        contactContainer.innerHTML = socialLinks.map(link => `
            <li>
                <a href="${escapeAttr(link.url)}" target="_blank" rel="noopener">
                    ${renderSocialIcon(link)} ${link.name}
                </a>
            </li>
        `).join('');
        if (getProfileEmail(data.profile)) {
            const emailLi = document.createElement('li');
            emailLi.innerHTML = `<button type="button" class="contact-email-btn" data-email-action><i class="fas fa-envelope"></i> Email</button>`;
            contactContainer.prepend(emailLi);
        }
        if (data.profile.location) {
            const locLi = document.createElement('li');
            locLi.innerHTML = `<span><i class="fas fa-map-marker-alt"></i> ${data.profile.location}</span>`;
            contactContainer.prepend(locLi);
        }
    }

    setupEmailActions(data.profile);
}

function renderDatasetFeature(feature) {
    const container = document.getElementById('dataset-feature');
    if (!container || !feature) return;

    const modes = Array.isArray(feature.modes) ? feature.modes : [];
    const activeMode = modes[0] || {};
    const preview = feature.preview || {};

    container.innerHTML = `
        <div class="dataset-feature">
            <div class="dataset-hero">
                <div class="dataset-copy">
                    <span class="dataset-eyebrow">${feature.eyebrow || 'Dataset'}</span>
                    <h3>${feature.title || ''}</h3>
                    <p>${feature.summary || ''}</p>
                    <div class="dataset-links">
                        ${(feature.links || []).map(link => `
                            <a href="${link.url}" target="_blank" rel="noopener" class="btn-sm">${renderLinkIcon(link.label, link.url)}${link.label}</a>
                        `).join('')}
                    </div>
                </div>
                <div class="dataset-stats">
                    ${(feature.stats || []).map(stat => `
                        <div class="dataset-stat">
                            <strong>${stat.value}</strong>
                            <span>${stat.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${preview.localMeshUrl ? `
                <div class="dataset-live-preview">
                    <div class="dataset-preview-card dataset-model-card">
                        <div class="dataset-preview-header">
                            <span>3D mesh</span>
                            <strong id="dataset-mesh-name">${preview.meshPath || preview.title || 'Sample mesh'}</strong>
                        </div>
                        <model-viewer
                            id="dataset-sample-model"
                            class="dataset-model-viewer"
                            src="${escapeAttr(preview.localMeshUrl)}"
                            alt="${escapeAttr(preview.title || 'AmaraSpatial-10K mesh preview')}"
                            camera-controls
                            auto-rotate
                            interaction-prompt="none"
                            shadow-intensity="0.75"
                            exposure="0.9"
                            loading="lazy">
                            <div class="dataset-model-fallback">
                                <i class="fas fa-cube"></i>
                                <span>3D mesh preview</span>
                            </div>
                        </model-viewer>
                        ${preview.meshSourceUrl ? `
                            <a class="dataset-source-link" href="${escapeAttr(preview.meshSourceUrl)}" target="_blank" rel="noopener">
                                ${renderLinkIcon('Hugging Face', preview.meshSourceUrl)}HF mesh shard
                            </a>
                        ` : ''}
                    </div>
                    <div class="dataset-preview-card dataset-seed-card">
                        <div class="dataset-preview-header">
                            <span>Reference seed</span>
                            <strong id="dataset-sample-title">${preview.title || 'HF sample asset'}</strong>
                        </div>
                        <div class="dataset-seed-media">
                            <img id="dataset-seed-image" class="dataset-seed-image" alt="Reference seed image from AmaraSpatial-10K" loading="lazy" hidden>
                            <div id="dataset-seed-placeholder" class="dataset-seed-placeholder">
                                <i class="fas fa-image"></i>
                                <span>Fetching Hugging Face preview</span>
                            </div>
                        </div>
                        <div class="dataset-sample-meta">
                            <p id="dataset-sample-text">${preview.description || ''}</p>
                            <div class="dataset-sample-stats" id="dataset-sample-stats"></div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="dataset-stage" data-active="${activeMode.id || ''}">
                <div class="dataset-visual">
                    <div class="dataset-core">
                        <i class="fas fa-cubes"></i>
                        <span>3D asset bank</span>
                    </div>
                    ${modes.map((mode, index) => {
                        const angle = ((index * 360 / Math.max(modes.length, 1)) - 90) * Math.PI / 180;
                        const x = 50 + Math.cos(angle) * 34;
                        const y = 50 + Math.sin(angle) * 34;
                        return `
                        <button class="dataset-node" type="button" data-mode="${mode.id}" aria-label="${escapeAttr(mode.label)} dataset view" title="${escapeAttr(mode.label)}" style="--node-x:${x}%; --node-y:${y}%">
                            <i class="${mode.icon}"></i>
                        </button>
                    `}).join('')}
                </div>

                <div class="dataset-panel">
                    <div class="dataset-mode-buttons">
                        ${modes.map((mode, index) => `
                            <button class="dataset-mode-btn ${index === 0 ? 'active' : ''}" type="button" data-mode="${mode.id}" aria-pressed="${index === 0 ? 'true' : 'false'}">
                                <i class="${mode.icon}"></i>
                                <span>${mode.label}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="dataset-mode-copy" aria-live="polite">
                        <h3 id="dataset-mode-heading">${activeMode.heading || ''}</h3>
                        <p id="dataset-mode-text">${activeMode.text || ''}</p>
                        <div class="dataset-mode-points" id="dataset-mode-points">
                            ${(activeMode.points || []).map(point => `<span>${point}</span>`).join('')}
                        </div>
                    </div>
                    <div class="dataset-pipeline">
                        ${(feature.pipeline || []).map(step => `
                            <div class="pipeline-step">
                                <strong>${step.label}</strong>
                                <span>${step.value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    const stage = container.querySelector('.dataset-stage');
    const heading = container.querySelector('#dataset-mode-heading');
    const text = container.querySelector('#dataset-mode-text');
    const points = container.querySelector('#dataset-mode-points');
    const buttons = container.querySelectorAll('[data-mode]');

    const setMode = (modeId) => {
        const mode = modes.find(item => item.id === modeId) || activeMode;
        if (!mode) return;

        stage.dataset.active = mode.id;
        heading.textContent = mode.heading || '';
        text.textContent = mode.text || '';
        points.innerHTML = (mode.points || []).map(point => `<span>${point}</span>`).join('');

        buttons.forEach(button => {
            const isActive = button.dataset.mode === mode.id;
            button.classList.toggle('active', isActive);
            if (button.classList.contains('dataset-mode-btn')) {
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            }
        });
    };

    buttons.forEach(button => {
        button.addEventListener('click', () => setMode(button.dataset.mode));
    });

    loadDatasetSample(feature);
}

function getHfImageSrc(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.src || value.url || '';
}

function formatDatasetNumber(value) {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'string') return value;
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function renderDatasetStat(label, value) {
    if (value === undefined || value === null || value === '') return '';
    return `<span><strong>${formatDatasetNumber(value)}</strong>${label}</span>`;
}

async function loadDatasetSample(feature) {
    const preview = feature && feature.preview;
    if (!preview || !preview.apiUrl) return;

    const seedImage = document.getElementById('dataset-seed-image');
    const seedPlaceholder = document.getElementById('dataset-seed-placeholder');
    const titleEl = document.getElementById('dataset-sample-title');
    const textEl = document.getElementById('dataset-sample-text');
    const statsEl = document.getElementById('dataset-sample-stats');
    const meshNameEl = document.getElementById('dataset-mesh-name');
    const modelEl = document.getElementById('dataset-sample-model');

    const applyFallback = () => {
        if (titleEl && preview.title) titleEl.textContent = preview.title;
        if (textEl && preview.description) textEl.textContent = preview.description;
        if (meshNameEl && preview.meshPath) meshNameEl.textContent = preview.meshPath;
        if (modelEl && preview.localMeshUrl) modelEl.setAttribute('src', preview.localMeshUrl);
    };

    applyFallback();

    try {
        const response = await fetch(preview.apiUrl, { mode: 'cors' });
        if (!response.ok) throw new Error(`HF row request failed: ${response.status}`);
        const payload = await response.json();
        const row = payload && payload.rows && payload.rows[0] && payload.rows[0].row;
        if (!row) return;

        const imageSrc = getHfImageSrc(row.seed_image) || getHfImageSrc(row.render_perspective);
        if (seedImage && imageSrc) {
            seedImage.src = imageSrc;
            seedImage.hidden = false;
            if (seedPlaceholder) seedPlaceholder.hidden = true;
        }

        if (titleEl) {
            titleEl.textContent = row.brief_description || row.asset_basename || row.asset_id || preview.title || 'HF sample asset';
        }
        if (textEl) {
            textEl.textContent = row.full_description || preview.description || '';
        }
        if (meshNameEl) {
            meshNameEl.textContent = row.mesh_path || preview.meshPath || 'Sample mesh';
        }
        if (statsEl) {
            statsEl.innerHTML = [
                renderDatasetStat('vertices', row.vertices),
                renderDatasetStat('faces', row.decimation_faces),
                renderDatasetStat('watertight', row.watertight_percent ? `${row.watertight_percent.toFixed(1)}%` : '')
            ].join('');
        }
    } catch (error) {
        console.warn('Could not fetch AmaraSpatial-10K sample row:', error);
        if (seedPlaceholder) {
            seedPlaceholder.innerHTML = '<i class="fas fa-image"></i><span>Hugging Face preview unavailable</span>';
        }
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
    const sections = document.querySelectorAll('main .section[id]');

    const setActive = (id) => {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', href);
            setActive(href.slice(1));
        });
    });

    if ('IntersectionObserver' in window) {
        const spy = new IntersectionObserver((entries) => {
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) setActive(visible.target.id);
        }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.6, 1] });
        sections.forEach(section => spy.observe(section));
    }

    const hashTarget = window.location.hash.substring(1);
    if (hashTarget && document.getElementById(hashTarget)) {
        setActive(hashTarget);
        requestAnimationFrame(() => {
            document.getElementById(hashTarget).scrollIntoView({ block: 'start' });
        });
    } else {
        setActive('about');
    }
}

function setupThemeToggle() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');

    const palettes = {
        light: { primary: '#0071e3', secondary: '#64d2ff', bg: '#f5f5f7', themeColor: '#f5f5f7' },
        dark: { primary: '#2997ff', secondary: '#64d2ff', bg: '#000000', themeColor: '#000000' }
    };

    const currentMode = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

    const syncFluid = (mode) => {
        const palette = palettes[mode];
        if (window.updateFluidColors) {
            window.updateFluidColors(palette.primary, palette.secondary, palette.bg);
        }
        const meta = document.querySelector('meta[name="theme-color"]:not([media])') || document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', palette.themeColor);
    };

    const applyMode = (mode) => {
        document.documentElement.setAttribute('data-theme', mode);
        document.body.setAttribute('data-theme', mode);
        localStorage.setItem('theme', mode);
        if (icon) {
            icon.classList.toggle('fa-sun', mode === 'dark');
            icon.classList.toggle('fa-moon', mode === 'light');
        }
        btn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        syncFluid(mode);
    };

    applyMode(currentMode());

    const toggle = () => applyMode(currentMode() === 'dark' ? 'light' : 'dark');

    btn.addEventListener('click', () => {
        if (document.startViewTransition) {
            document.startViewTransition(toggle);
        } else {
            document.body.classList.add('theme-fading');
            toggle();
            setTimeout(() => document.body.classList.remove('theme-fading'), 280);
        }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
        if (!localStorage.getItem('theme')) {
            applyMode(event.matches ? 'dark' : 'light');
        }
    });
}

function applyTheme() {
    const mode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const palettes = {
        light: ['#0071e3', '#64d2ff', '#f5f5f7'],
        dark: ['#2997ff', '#64d2ff', '#000000']
    };
    if (window.updateFluidColors) {
        window.updateFluidColors(...palettes[mode]);
    }
}
