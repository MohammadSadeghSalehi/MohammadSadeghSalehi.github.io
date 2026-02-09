document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupNavigation();
    setupThemeToggle();
});

async function fetchData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        renderData(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderData(data) {
    // Profile
    document.getElementById('profile-image').src = data.profile.image;
    document.getElementById('profile-name').textContent = data.profile.name;
    document.getElementById('profile-role').textContent = data.profile.role;
    
    // Social Links
    const socialContainer = document.getElementById('social-links');
    socialContainer.innerHTML = data.profile.socials.map(link => `
        <a href="${link.url}" target="_blank" aria-label="${link.name}" title="${link.name}">
            <i class="${link.icon}"></i>
        </a>
    `).join('');

    // Bio
    document.getElementById('bio-text').textContent = data.biography;

    // Interests
    const interestsContainer = document.getElementById('interests-list');
    interestsContainer.innerHTML = data.interests.map(item => `
        <span class="tag">${item}</span>
    `).join('');

    // Education
    const educationContainer = document.getElementById('education-list');
    educationContainer.innerHTML = data.education.map(item => `
        <div class="timeline-item">
            <div class="timeline-degree">${item.degree}</div>
            <div class="timeline-institution">${item.institution}</div>
            <div class="timeline-period">${item.period}</div>
        </div>
    `).join('');

    // News
    const newsContainer = document.getElementById('news-list');
    newsContainer.innerHTML = data.news.map(item => `
        <div class="card">
            <div class="card-header">
                <span class="card-date">${item.date}</span>
            </div>
            <h3 class="card-title">${item.title}</h3>
            <p class="card-description">${item.description}</p>
        </div>
    `).join('');

    // Projects
    const projectsContainer = document.getElementById('projects-list');
    projectsContainer.innerHTML = data.projects.map(item => `
        <div class="card">
            <h3 class="card-title">${item.title}</h3>
            <p class="card-description">
                <strong>Supervisors:</strong> ${item.supervisors}<br>
                ${item.partnership ? `<strong>Partnership:</strong> ${item.partnership}` : ''}
            </p>
            ${item.link ? `
                <div class="card-links">
                    <a href="${item.link}" target="_blank" class="btn-sm">More Info</a>
                </div>
            ` : ''}
        </div>
    `).join('');

    // Publications
    const pubsContainer = document.getElementById('publications-list');
    pubsContainer.innerHTML = data.publications.map(item => `
        <div class="card">
            <h3 class="card-title">${item.title}</h3>
            <p class="card-description">
                <strong>Authors:</strong> ${item.authors}<br>
                <strong>Year:</strong> ${item.year}
            </p>
            <div class="card-links">
                ${item.links.map(link => `
                    <a href="${link.url}" target="_blank" class="btn-sm">${link.label}</a>
                `).join('')}
            </div>
        </div>
    `).join('');

    // Talks
    const talksContainer = document.getElementById('talks-list');
    talksContainer.innerHTML = data.talks.map(item => `
        <div class="card">
            <h3 class="card-title">${item.title}</h3>
            <p class="card-description">${item.event}</p>
        </div>
    `).join('');

    // Teaching
    const teachingContainer = document.getElementById('teaching-list');
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

    // Contact
    const contactContainer = document.getElementById('contact-list');
    // Using profile info for contact
    // You could also iterate over profile.socials here if desired or specific contact entries
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
            if(window.innerWidth <= 768) {
                document.querySelector('.content-area').scrollIntoView({behavior: 'smooth'});
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
