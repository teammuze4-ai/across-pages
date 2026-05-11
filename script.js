// State Management
const defaultState = {
    isProfileCreated: false,
    user: {
        name: '',
        role: '',
        avatarSeed: '',
        coins: 150,
        equipped: {
            clothes: null,
            accessories: null
        },
        purchased: []
    },
    partner: {
        name: 'Sarah',
        role: 'Exchange Student',
        avatarSeed: 'Sarah'
    },
    diaries: [],
    prompts: {
        culture: [
            "What is a traditional dish you would recommend?",
            "What surprised you the most about the local etiquette?",
            "Describe a local festival or holiday you recently experienced.",
            "What are some popular slang words you've learned recently?"
        ],
        daily: [
            "What does your typical morning routine look like here?",
            "How do you usually commute, and what is it like?",
            "What is your favorite spot to relax in the city?",
            "Describe an interesting interaction you had with a local recently."
        ],
        major: [
            "What is the biggest difference in classes here compared to your home?",
            "Describe a project you are currently working on.",
            "What made you choose your major?",
            "How is the relationship between students and professors here?"
        ]
    },
    shopItems: [
        { id: 'c1', name: 'Basic Hoodie', price: 0, category: 'clothes', icon: 'fa-shirt', seedModifier: 'hoodie' },
        { id: 'c2', name: 'Hanbok', price: 100, category: 'clothes', icon: 'fa-user-tie', seedModifier: 'blazerAndShirt' },
        { id: 'c3', name: 'Streetwear', price: 150, category: 'clothes', icon: 'fa-vest', seedModifier: 'overall' },
        { id: 'a1', name: 'Glasses', price: 50, category: 'accessories', icon: 'fa-glasses', seedModifier: 'kurt' },
        { id: 'a2', name: 'Sunglasses', price: 80, category: 'accessories', icon: 'fa-sunglasses', seedModifier: 'wayfarers' },
        { id: 'a3', name: 'Cap', price: 120, category: 'accessories', icon: 'fa-hat-cowboy', seedModifier: 'hat' }
    ]
};

let state;
try {
    const saved = localStorage.getItem('acrossPagesState');
    state = saved ? JSON.parse(saved) : defaultState;
} catch (e) {
    state = defaultState;
}

function saveState() {
    localStorage.setItem('acrossPagesState', JSON.stringify(state));
}

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links li');
const views = document.querySelectorAll('.view');
const coinBalances = document.querySelectorAll('#coin-balance, #shop-coin-balance');
const diaryList = document.getElementById('diary-list');
const topicBtns = document.querySelectorAll('.topic-btn');
const promptText = document.getElementById('prompt-text');
const randomPromptBtn = document.getElementById('random-prompt-btn');
const diaryContent = document.getElementById('diary-content');
const submitDiaryBtn = document.getElementById('submit-diary-btn');
const shopTabs = document.querySelectorAll('.shop-tab');
const shopItemsContainer = document.getElementById('shop-items');
const avatarImages = document.querySelectorAll('#avatar-img, #large-avatar-img');

const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

let currentImageDataUrl = null;

// Initialize App
function init() {
    if (!state.isProfileCreated) {
        document.getElementById('app').style.display = 'none';
        document.getElementById('onboarding-overlay').style.display = 'flex';
        setupOnboarding();
    } else {
        document.getElementById('app').style.display = 'flex';
        document.getElementById('onboarding-overlay').style.display = 'none';
        updateUserInfoUI();
        updateCoinDisplay();
        updateAvatar();
        renderFeed();
        renderShop('clothes');
        setupEventListeners();
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const viewId = e.currentTarget.dataset.view;
            switchView(viewId);
            
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // Write Diary Topics
    topicBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            topicBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const topic = e.currentTarget.dataset.topic;
            if (topic === 'free') {
                promptText.textContent = "Write about anything that comes to your mind today!";
                randomPromptBtn.style.display = 'none';
            } else {
                randomPromptBtn.style.display = 'inline-block';
                setRandomPrompt(topic);
            }
        });
    });

    randomPromptBtn.addEventListener('click', () => {
        const activeTopic = document.querySelector('.topic-btn.active').dataset.topic;
        setRandomPrompt(activeTopic);
    });

    // Image Upload
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImageDataUrl = e.target.result;
                imagePreview.src = currentImageDataUrl;
                imagePreviewContainer.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        }
    });

    removeImageBtn.addEventListener('click', () => {
        currentImageDataUrl = null;
        imageUpload.value = '';
        imagePreviewContainer.style.display = 'none';
    });

    // Submit Diary
    submitDiaryBtn.addEventListener('click', () => {
        const content = diaryContent.value.trim();
        if (content.length < 10) {
            alert('Please write a bit more! (At least 10 characters)');
            return;
        }

        const activeTopicBtn = document.querySelector('.topic-btn.active');
        const topicName = activeTopicBtn.textContent;

        const newDiary = {
            id: Date.now(),
            authorId: 'user',
            authorName: state.user.name,
            date: 'Just now',
            topic: topicName,
            content: content,
            image: currentImageDataUrl,
            reactions: { '👍': 0, '❤️': 0, '😂': 0, '😮': 0 },
            reactedByMe: { '👍': false, '❤️': false, '😂': false, '😮': false },
            comments: []
        };

        state.diaries.unshift(newDiary);
        state.user.coins += 50;
        
        diaryContent.value = '';
        currentImageDataUrl = null;
        imageUpload.value = '';
        imagePreviewContainer.style.display = 'none';
        
        saveState();
        updateCoinDisplay();
        renderFeed();
        
        showToast('Diary published! Earned 50 coins.', 'fa-coins');
        
        // Switch to feed
        navLinks[0].click();
    });

    // Shop Tabs
    shopTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            shopTabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderShop(e.currentTarget.dataset.category);
        });
    });
}

// Navigation
function switchView(viewId) {
    views.forEach(view => {
        view.classList.remove('active');
        if (view.id === `view-${viewId}`) {
            view.classList.add('active');
        }
    });

    if (viewId === 'profile') {
        renderProfile();
    }
}

// Helpers
function updateCoinDisplay() {
    coinBalances.forEach(el => el.textContent = state.user.coins);
}

function getAvatarUrl(seed, clothes, accessories) {
    let url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`;
    if (clothes) {
        const item = state.shopItems.find(i => i.id === clothes);
        if (item && item.seedModifier) url += `&clothing=${item.seedModifier}`;
    }
    if (accessories) {
        const item = state.shopItems.find(i => i.id === accessories);
        if (item && item.seedModifier) {
            if (item.id === 'a3') {
                url += `&top=${item.seedModifier}`;
            } else {
                url += `&accessories=${item.seedModifier}`;
            }
        }
    }
    return url;
}

function updateAvatar() {
    const url = getAvatarUrl(state.user.avatarSeed || 'Felix', state.user.equipped.clothes, state.user.equipped.accessories);
    document.querySelectorAll('#avatar-img, #large-avatar-img, #profile-avatar-img').forEach(img => {
        if (img) img.src = url;
    });
}

function setRandomPrompt(topic) {
    const prompts = state.prompts[topic];
    const current = promptText.textContent;
    let next;
    do {
        next = prompts[Math.floor(Math.random() * prompts.length)];
    } while (next === current && prompts.length > 1);
    promptText.textContent = next;
}

function showToast(message, iconClass) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${message}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Render Feed
function renderFeed() {
    diaryList.innerHTML = '';
    
    state.diaries.forEach(diary => {
        const avatarColor = diary.authorId === 'partner' ? 'f4b6c2' : 'b6e3f4';
        const seed = diary.authorId === 'partner' ? state.partner.avatarSeed : 'Felix';
        
        // Construct avatar URL for the post author
        let postAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${avatarColor}`;
        if (diary.authorId === 'user') {
            postAvatarUrl = getAvatarUrl('Felix', state.user.equipped.clothes, state.user.equipped.accessories);
        }

        const entryHtml = `
            <article class="diary-entry">
                <div class="entry-header">
                    <div class="entry-author">
                        <div class="author-avatar ${diary.authorId === 'partner' ? 'partner' : ''}">
                            <img src="${postAvatarUrl}" alt="${diary.authorName}" style="width:100%;height:100%;border-radius:50%">
                        </div>
                        <div class="author-info">
                            <h4>${diary.authorName}</h4>
                            <span>${diary.date}</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="entry-topic">${diary.topic}</div>
                        ${diary.authorId === 'user' ? `
                            <div class="entry-actions" style="display: flex; gap: 8px;">
                                <button class="icon-btn edit-btn" onclick="editDiary(${diary.id})" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-pen"></i></button>
                                <button class="icon-btn delete-btn" onclick="deleteDiary(${diary.id})" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="entry-body">
                    <div id="diary-text-${diary.id}" class="diary-text" style="white-space: pre-wrap;">${diary.content}</div>
                    ${diary.image ? `<div id="entry-image-${diary.id}" class="entry-image"><img src="${diary.image}" alt="Diary Image"></div>` : ''}
                    <div class="reactions-bar">
                        ${['👍', '❤️', '😂', '😮'].map(emoji => `
                            <button class="reaction-btn ${diary.reactedByMe && diary.reactedByMe[emoji] ? 'reacted' : ''}" onclick="toggleReaction(${diary.id}, '${emoji}')">
                                ${emoji} <span>${diary.reactions ? diary.reactions[emoji] : 0}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="entry-footer">
                    <div class="comments-section" id="comments-${diary.id}">
                        ${renderComments(diary.comments, diary.id)}
                    </div>
                    <div class="add-comment">
                        <input type="text" id="comment-input-${diary.id}" placeholder="Write a comment in English...">
                        <button class="send-btn" onclick="addComment(${diary.id})">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
        diaryList.insertAdjacentHTML('beforeend', entryHtml);
    });
}

function renderComments(comments, diaryId) {
    if (comments.length === 0) return '<div class="no-comments" style="color:#94a3b8; font-size: 0.9rem;">No comments yet.</div>';
    
    return comments.map(comment => {
        // Ensure comment has ID
        if (!comment.id) comment.id = Date.now() + Math.random();
        
        const isUser = comment.author === state.user.name;
        const seed = isUser ? 'Felix' : state.partner.avatarSeed;
        const color = isUser ? 'b6e3f4' : 'f4b6c2';
        let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${color}`;
        if(isUser) avatarUrl = getAvatarUrl('Felix', state.user.equipped.clothes, state.user.equipped.accessories);

        return `
        <div class="comment" id="comment-${diaryId}-${comment.id}">
            <div class="author-avatar" style="border-radius:50%; overflow:hidden;">
                <img src="${avatarUrl}" alt="${comment.author}" style="width:100%;height:100%;">
            </div>
            <div class="comment-content" style="flex:1;">
                <span class="comment-author-name">${comment.author}</span>
                <div class="comment-bubble" id="comment-text-${diaryId}-${comment.id}">${comment.text}</div>
                ${isUser ? `
                    <div class="comment-actions" style="display:flex; gap:8px; margin-top:4px; font-size:0.8rem;">
                        <button onclick="editComment(${diaryId}, ${comment.id})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer;">Edit</button>
                        <button onclick="deleteComment(${diaryId}, ${comment.id})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer;">Delete</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `}).join('');
}

window.addComment = function(diaryId) {
    const input = document.getElementById(`comment-input-${diaryId}`);
    const text = input.value.trim();
    if (!text) return;

    const diary = state.diaries.find(d => d.id === diaryId);
    diary.comments.push({
        id: Date.now(),
        author: state.user.name,
        text: text
    });

    saveState();
    renderFeed(); // Re-render to show new comment
    showToast('Comment added!', 'fa-comment');
}

window.toggleReaction = function(diaryId, emoji) {
    const diary = state.diaries.find(d => d.id === diaryId);
    if (!diary.reactions) diary.reactions = { '👍': 0, '❤️': 0, '😂': 0, '😮': 0 };
    if (!diary.reactedByMe) diary.reactedByMe = { '👍': false, '❤️': false, '😂': false, '😮': false };

    if (diary.reactedByMe[emoji]) {
        diary.reactions[emoji]--;
        diary.reactedByMe[emoji] = false;
    } else {
        diary.reactions[emoji]++;
        diary.reactedByMe[emoji] = true;
    }
    
    saveState();
    renderFeed();
}

window.deleteDiary = function(diaryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
        state.diaries = state.diaries.filter(d => d.id !== diaryId);
        saveState();
        renderFeed();
        showToast('Diary deleted!', 'fa-trash');
    }
}

window.tempEditImages = {};

window.editDiary = function(diaryId) {
    const diary = state.diaries.find(d => d.id === diaryId);
    if (!diary) return;
    
    const textDiv = document.getElementById(`diary-text-${diaryId}`);
    if (!textDiv) return;

    window.tempEditImages[diaryId] = diary.image;

    // Use regular string instead of html template to avoid issues with unescaped quotes
    const currentContent = diary.content.replace(/"/g, '&quot;');
    textDiv.innerHTML = `
        <textarea id="edit-content-${diaryId}" style="width: 100%; min-height: 100px; background: rgba(0,0,0,0.2); color: white; border: 1px solid var(--primary-color); border-radius: 8px; padding: 10px; margin-bottom: 10px; font-family: inherit; font-size: 1rem;">${diary.content}</textarea>
        
        <div style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
            <div style="margin-bottom: 10px; font-size: 0.95rem; color: var(--text-secondary);">Attached Photo</div>
            <div id="edit-image-preview-container-${diaryId}" style="display: ${diary.image ? 'block' : 'none'}; position: relative; margin-bottom: 10px;">
                <img id="edit-image-preview-${diaryId}" src="${diary.image || ''}" style="max-width: 200px; max-height: 200px; border-radius: 8px; object-fit: cover;">
                <button onclick="removeTempEditImage(${diaryId})" style="position: absolute; top: 5px; left: 170px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div>
                <label for="edit-image-upload-${diaryId}" class="secondary-btn" style="cursor: pointer; display: inline-block; font-size: 0.85rem; padding: 6px 12px;">
                    <i class="fa-solid fa-image"></i> Change / Add Photo
                </label>
                <input type="file" id="edit-image-upload-${diaryId}" accept="image/*" style="display: none;" onchange="handleEditImageUpload(event, ${diaryId})">
            </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button class="primary-btn" style="padding: 6px 12px; font-size: 0.9rem;" onclick="saveEdit(${diaryId})">Save</button>
            <button class="secondary-btn" style="padding: 6px 12px; font-size: 0.9rem;" onclick="cancelEdit(${diaryId})">Cancel</button>
        </div>
    `;

    const existingImg = document.getElementById(`entry-image-${diaryId}`);
    if (existingImg) existingImg.style.display = 'none';
}

window.handleEditImageUpload = function(e, diaryId) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            window.tempEditImages[diaryId] = ev.target.result;
            const img = document.getElementById(`edit-image-preview-${diaryId}`);
            if(img) img.src = ev.target.result;
            const container = document.getElementById(`edit-image-preview-container-${diaryId}`);
            if(container) container.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

window.removeTempEditImage = function(diaryId) {
    window.tempEditImages[diaryId] = null;
    const container = document.getElementById(`edit-image-preview-container-${diaryId}`);
    if(container) container.style.display = 'none';
    const input = document.getElementById(`edit-image-upload-${diaryId}`);
    if(input) input.value = '';
}

window.cancelEdit = function(diaryId) {
    delete window.tempEditImages[diaryId];
    renderFeed();
}

window.saveEdit = function(diaryId) {
    const textarea = document.getElementById(`edit-content-${diaryId}`);
    if (!textarea) return;
    
    const newContent = textarea.value.trim();
    if (newContent.length > 0) {
        const diary = state.diaries.find(d => d.id === diaryId);
        diary.content = newContent;
        diary.image = window.tempEditImages[diaryId];
        delete window.tempEditImages[diaryId];
        saveState();
        renderFeed();
        showToast('Diary updated!', 'fa-check');
    } else {
        alert('Content cannot be empty.');
    }
}

// Comment Edit/Delete
window.deleteComment = function(diaryId, commentId) {
    if (confirm('Delete this comment?')) {
        const diary = state.diaries.find(d => d.id === diaryId);
        if(diary) {
            diary.comments = diary.comments.filter(c => c.id !== commentId);
            saveState();
            renderFeed();
            showToast('Comment deleted!', 'fa-trash');
        }
    }
}

window.editComment = function(diaryId, commentId) {
    const diary = state.diaries.find(d => d.id === diaryId);
    if (!diary) return;
    const comment = diary.comments.find(c => c.id === commentId);
    if (!comment) return;

    const textDiv = document.getElementById(`comment-text-${diaryId}-${commentId}`);
    if (!textDiv) return;
    
    textDiv.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">
            <input type="text" id="edit-comment-input-${commentId}" value="${comment.text.replace(/"/g, '&quot;')}" style="width:100%; background: rgba(255,255,255,0.1); border:1px solid var(--primary-color); padding:6px; color:white; border-radius:4px; font-family: inherit;">
            <div style="display:flex; gap:8px;">
                <button onclick="saveEditComment(${diaryId}, ${commentId})" class="primary-btn" style="padding:4px 10px; font-size:0.8rem;">Save</button>
                <button onclick="renderFeed()" class="secondary-btn" style="padding:4px 10px; font-size:0.8rem;">Cancel</button>
            </div>
        </div>
    `;
}

window.saveEditComment = function(diaryId, commentId) {
    const input = document.getElementById(`edit-comment-input-${commentId}`);
    if(!input) return;
    const newText = input.value.trim();
    if (newText) {
        const diary = state.diaries.find(d => d.id === diaryId);
        const comment = diary.comments.find(c => c.id === commentId);
        if(comment) comment.text = newText;
        saveState();
        renderFeed();
        showToast('Comment updated!', 'fa-check');
    } else {
        alert('Comment cannot be empty.');
    }
}

// Render Shop
function renderShop(category) {
    shopItemsContainer.innerHTML = '';
    const items = state.shopItems.filter(item => item.category === category);
    
    items.forEach(item => {
        const isPurchased = state.user.purchased.includes(item.id);
        const isEquipped = state.user.equipped[category] === item.id;
        const canAfford = state.user.coins >= item.price;
        
        let btnClass = 'expensive';
        let btnText = `Buy for ${item.price} <i class="fa-solid fa-coins"></i>`;
        
        if (isEquipped) {
            btnClass = 'equipped';
            btnText = 'Equipped';
        } else if (isPurchased) {
            btnClass = 'purchased';
            btnText = 'Equip';
        } else if (canAfford) {
            btnClass = 'affordable';
        }

        const itemHtml = `
            <div class="shop-item">
                <i class="fa-solid ${item.icon} item-icon"></i>
                <div class="item-name">${item.name}</div>
                ${!isPurchased ? `<div class="item-price">${item.price} <i class="fa-solid fa-coins"></i></div>` : '<div class="item-price">Owned</div>'}
                <button class="buy-btn ${btnClass}" onclick="handleShopAction('${item.id}')" ${!isPurchased && !canAfford ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>
        `;
        shopItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
}

window.handleShopAction = function(itemId) {
    const item = state.shopItems.find(i => i.id === itemId);
    const isPurchased = state.user.purchased.includes(itemId);
    
    if (isPurchased) {
        // Equip
        state.user.equipped[item.category] = itemId;
        saveState();
        updateAvatar();
        renderShop(item.category);
        renderFeed(); // Update avatars in feed
        showToast('Item equipped!', 'fa-shirt');
    } else {
        // Buy
        if (state.user.coins >= item.price) {
            state.user.coins -= item.price;
            state.user.purchased.push(itemId);
            saveState();
            updateCoinDisplay();
            renderShop(item.category);
            showToast('Item purchased!', 'fa-bag-shopping');
        }
    }
}

// Start
init();

// Onboarding Logic
function setupOnboarding() {
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            roleOptions.forEach(o => o.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            e.currentTarget.querySelector('input').checked = true;
        });
    });

    roleOptions[0].classList.add('selected');

    document.getElementById('create-profile-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('onboarding-name').value.trim();
        if (nameInput.length < 2) {
            alert('Please enter a valid name.');
            return;
        }

        const roleInput = document.querySelector('input[name="role"]:checked').value;

        state.user.name = nameInput;
        state.user.role = roleInput;
        state.user.avatarSeed = nameInput;
        state.isProfileCreated = true;
        
        saveState();
        
        document.getElementById('onboarding-overlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        
        updateUserInfoUI();
        updateCoinDisplay();
        updateAvatar();
        renderFeed();
        renderShop('clothes');
        setupEventListeners();
        
        showToast('Profile created successfully!', 'fa-user-check');
    });
}

function updateUserInfoUI() {
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) userNameEl.textContent = `${state.user.name} (${state.user.role})`;
}

// Profile Rendering
function renderProfile() {
    const nameEl = document.getElementById('profile-name');
    const roleEl = document.getElementById('profile-role');
    if (nameEl) nameEl.textContent = state.user.name;
    if (roleEl) roleEl.textContent = state.user.role;
    
    updateAvatar(); // updates profile-avatar-img

    const myDiaries = state.diaries.filter(d => d.authorId === 'user');
    let commentCount = 0;
    state.diaries.forEach(d => {
        d.comments.forEach(c => {
            if (c.author === state.user.name) commentCount++;
        });
    });

    const diariesCountEl = document.getElementById('profile-diaries-count');
    const commentsCountEl = document.getElementById('profile-comments-count');
    if (diariesCountEl) diariesCountEl.textContent = myDiaries.length;
    if (commentsCountEl) commentsCountEl.textContent = commentCount;

    const list = document.getElementById('my-diary-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (myDiaries.length === 0) {
        list.innerHTML = '<div style="color: var(--text-secondary); padding: 2rem; text-align: center;">No diaries written yet.</div>';
    } else {
        myDiaries.forEach(diary => {
            const url = getAvatarUrl(state.user.avatarSeed || 'Felix', state.user.equipped.clothes, state.user.equipped.accessories);
            const html = `
                <article class="diary-entry" style="margin-bottom: 1.5rem;">
                    <div class="entry-header">
                        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                            <div class="entry-author">
                                <div class="author-avatar"><img src="${url}" style="width:100%;height:100%;border-radius:50%;"></div>
                                <div class="author-info"><h4>${diary.authorName}</h4><span>${diary.date}</span></div>
                            </div>
                            <div class="entry-topic">${diary.topic}</div>
                        </div>
                    </div>
                    <div class="entry-body">
                        <div style="white-space: pre-wrap;">${diary.content}</div>
                        ${diary.image ? `<div class="entry-image"><img src="${diary.image}" style="max-width:100%; max-height:200px; object-fit:contain; border-radius:8px; margin-top:10px;"></div>` : ''}
                    </div>
                </article>
            `;
            list.insertAdjacentHTML('beforeend', html);
        });
    }
}
