const firebaseConfig = {
    apiKey: "AIzaSyCpWGIcX48iWtU3BsQp6VZGWLN6tDVpeNw",
    authDomain: "across-pages-e8fb7.firebaseapp.com",
    projectId: "across-pages-e8fb7",
    storageBucket: "across-pages-e8fb7.firebasestorage.app",
    messagingSenderId: "710401920800",
    appId: "1:710401920800:web:1c368eb0b5ae82a1ddd145"
};

// Initialize Firebase using Compat SDK
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

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
            accessories: null,
            skin: null,
            eyes: null
        },
        purchased: []
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
        { id: 'a3', name: 'Cap', price: 120, category: 'accessories', icon: 'fa-hat-cowboy', seedModifier: 'hat' },
        { id: 's1', name: 'Light Skin', price: 0, category: 'skin', icon: 'fa-palette', seedModifier: 'ffdbb4' },
        { id: 's2', name: 'Medium Skin', price: 0, category: 'skin', icon: 'fa-palette', seedModifier: 'd08b5b' },
        { id: 's3', name: 'Dark Skin', price: 0, category: 'skin', icon: 'fa-palette', seedModifier: '614335' },
        { id: 'e1', name: 'Happy Eyes', price: 0, category: 'eyes', icon: 'fa-eye', seedModifier: 'happy' },
        { id: 'e2', name: 'Heart Eyes', price: 0, category: 'eyes', icon: 'fa-heart', seedModifier: 'hearts' },
        { id: 'e3', name: 'Wink Eyes', price: 0, category: 'eyes', icon: 'fa-face-wink', seedModifier: 'wink' }
    ]
};

let state;
try {
    const saved = localStorage.getItem('acrossPagesState');
    state = saved ? JSON.parse(saved) : defaultState;
    if (!state.user.equipped.skin) state.user.equipped.skin = null;
    if (!state.user.equipped.eyes) state.user.equipped.eyes = null;
    
    // 로컬 스토리지의 구형 상점 데이터 덮어쓰기 (새 아이템 강제 업데이트)
    state.shopItems = defaultState.shopItems;
    
    // 항상 Firestore의 데이터만 보이도록 로컬에 남은 과거 일기들을 강제로 비웁니다.
    state.diaries = [];
} catch (e) {
    state = defaultState;
    state.diaries = [];
}

function saveState() {
    const stateToSave = { ...state, diaries: [] }; // Do not save diaries to localStorage anymore
    localStorage.setItem('acrossPagesState', JSON.stringify(stateToSave));
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

const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

let currentImageDataUrl = null;
let currentImageFile = null;

let unsubFirestore = null;
function startFirestoreListener() {
    if (unsubFirestore) return;
    unsubFirestore = db.collection("diaries").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        state.diaries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderFeed();
        if (document.getElementById('view-profile').classList.contains('active')) {
            renderProfile();
        }
    });
}

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
        startFirestoreListener();
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

    // Image/Video Upload
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            currentImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImageDataUrl = e.target.result;
                // Previews are complex for video, for now just show a generic icon or the video element
                if (file.type.startsWith('video/')) {
                    imagePreviewContainer.innerHTML = `<video src="${currentImageDataUrl}" style="max-width:200px;" controls></video> <button id="remove-image-btn" class="remove-btn"><i class="fa-solid fa-xmark"></i></button>`;
                } else {
                    imagePreviewContainer.innerHTML = `<img id="image-preview" src="${currentImageDataUrl}" alt="Preview"> <button id="remove-image-btn" class="remove-btn"><i class="fa-solid fa-xmark"></i></button>`;
                }
                
                document.getElementById('remove-image-btn').addEventListener('click', removeUpload);
                imagePreviewContainer.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        }
    });

    function removeUpload() {
        currentImageDataUrl = null;
        currentImageFile = null;
        imageUpload.value = '';
        imagePreviewContainer.style.display = 'none';
    }

    if(removeImageBtn) removeImageBtn.addEventListener('click', removeUpload);

    // Submit Diary
    submitDiaryBtn.addEventListener('click', async () => {
        const content = diaryContent.value.trim();
        if (content.length < 10) {
            alert('Please write a bit more! (At least 10 characters)');
            return;
        }

        const activeTopicBtn = document.querySelector('.topic-btn.active');
        const topicName = activeTopicBtn.textContent;
        
        let uploadedUrl = null;
        let isVideo = false;
        
        submitDiaryBtn.disabled = true;

        if (currentImageFile) {
            try {
                showToast('Uploading media to Storage...', 'fa-spinner fa-spin');
                const ext = currentImageFile.name.split('.').pop();
                const storageRef = storage.ref(`diaries/${Date.now()}_${state.user.name}.${ext}`);
                await storageRef.put(currentImageFile);
                uploadedUrl = await storageRef.getDownloadURL();
                isVideo = currentImageFile.type.startsWith('video/');
            } catch (err) {
                console.error(err);
                alert('Media upload failed!');
                submitDiaryBtn.disabled = false;
                return;
            }
        }

        const newDiary = {
            authorName: state.user.name,
            authorRole: state.user.role,
            authorAvatarUrl: getAvatarUrl(state.user.avatarSeed || 'Felix', state.user.equipped.clothes, state.user.equipped.accessories, state.user.equipped.skin, state.user.equipped.eyes),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            timestamp: Date.now(),
            topic: topicName,
            content: content,
            image: uploadedUrl,
            isVideo: isVideo,
            reactions: { '👍': 0, '❤️': 0, '😂': 0, '😮': 0 },
            reactedUsers: {},
            comments: []
        };

        try {
            await db.collection("diaries").add(newDiary);
            state.user.coins += 50;
            saveState();
            updateCoinDisplay();

            diaryContent.value = '';
            removeUpload();

            showToast('Diary published! Earned 50 coins.', 'fa-coins');

            // Switch to feed
            navLinks[0].click();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to publish diary: " + e.message);
        } finally {
            submitDiaryBtn.disabled = false;
        }
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

function getAvatarUrl(seed, clothes, accessories, skin, eyes) {
    let url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4&accessoriesProbability=100`;
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
    if (skin) {
        const item = state.shopItems.find(i => i.id === skin);
        if (item && item.seedModifier) url += `&skinColor=${item.seedModifier}`;
    }
    if (eyes) {
        const item = state.shopItems.find(i => i.id === eyes);
        if (item && item.seedModifier) url += `&eyes=${item.seedModifier}`;
    }
    return url;
}

function updateAvatar() {
    const url = getAvatarUrl(state.user.avatarSeed || 'Felix', state.user.equipped.clothes, state.user.equipped.accessories, state.user.equipped.skin, state.user.equipped.eyes);
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
window.renderFeed = function() {
    diaryList.innerHTML = '';

    state.diaries.forEach(diary => {
        const isUser = diary.authorName === state.user.name;
        const postAvatarUrl = diary.authorAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${diary.authorName}&backgroundColor=${isUser ? 'b6e3f4' : 'f4b6c2'}&accessoriesProbability=100`;

        const entryHtml = `
            <article class="diary-entry">
                <div class="entry-header">
                    <div class="entry-author">
                        <div class="author-avatar ${!isUser ? 'partner' : ''}">
                            <img src="${postAvatarUrl}" alt="${diary.authorName}" style="width:100%;height:100%;border-radius:50%">
                        </div>
                        <div class="author-info">
                            <h4>${diary.authorName}</h4>
                            <span>${diary.date}</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="entry-topic">${diary.topic}</div>
                        ${isUser ? `
                            <div class="entry-actions" style="display: flex; gap: 8px;">
                                <button class="icon-btn delete-btn" onclick="deleteDiary('${diary.id}')" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="entry-body">
                    <div id="diary-text-${diary.id}" class="diary-text" style="white-space: pre-wrap;">${diary.content}</div>
                    ${diary.image && diary.isVideo ? `<div id="entry-image-${diary.id}" class="entry-image"><video src="${diary.image}" controls style="max-width:100%; max-height:400px; border-radius:8px; display:block; margin-top:10px;"></video></div>` : 
                      diary.image ? `<div id="entry-image-${diary.id}" class="entry-image"><img src="${diary.image}" alt="Diary Image" style="max-width:100%; max-height:400px; border-radius:8px; display:block; margin-top:10px; object-fit:contain;"></div>` : ''}
                    <div class="reactions-bar">
                        ${['👍', '❤️', '😂', '😮'].map(emoji => `
                            <button class="reaction-btn ${(diary.reactedUsers && diary.reactedUsers[state.user.name] === emoji) ? 'reacted' : ''}" onclick="toggleReaction('${diary.id}', '${emoji}')">
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
                        <button class="send-btn" onclick="addComment('${diary.id}')">
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
    if (!comments || comments.length === 0) return '<div class="no-comments" style="color:#94a3b8; font-size: 0.9rem;">No comments yet.</div>';

    return comments.map(comment => {
        if (!comment.id) comment.id = Date.now().toString() + Math.random().toString();

        const isUser = comment.author === state.user.name;
        const avatarUrl = comment.authorAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author}&backgroundColor=${isUser ? 'b6e3f4' : 'f4b6c2'}`;

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
                        <button onclick="editComment('${diaryId}', '${comment.id}')" style="background:none; border:none; color:var(--text-secondary); cursor:pointer;">Edit</button>
                        <button onclick="deleteComment('${diaryId}', '${comment.id}')" style="background:none; border:none; color:var(--text-secondary); cursor:pointer;">Delete</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `}).join('');
}

window.addComment = async function (diaryId) {
    const input = document.getElementById(`comment-input-${diaryId}`);
    const text = input.value.trim();
    if (!text) return;

    const diary = state.diaries.find(d => d.id === diaryId);
    if (!diary) return;

    const newComments = [...(diary.comments || []), {
        id: Date.now().toString(),
        author: state.user.name,
        authorAvatarUrl: getAvatarUrl(state.user.avatarSeed || 'Felix', state.user.equipped.clothes, state.user.equipped.accessories, state.user.equipped.skin, state.user.equipped.eyes),
        text: text
    }];

    try {
        await db.collection("diaries").doc(diaryId).update({ comments: newComments });
        showToast('Comment added!', 'fa-comment');
    } catch (e) {
        console.error("Error adding comment: ", e);
    }
}

window.toggleReaction = async function (diaryId, emoji) {
    const diary = state.diaries.find(d => d.id === diaryId);
    if (!diary) return;

    let reactions = { ...diary.reactions } || { '👍': 0, '❤️': 0, '😂': 0, '😮': 0 };
    let reactedUsers = { ...diary.reactedUsers } || {};

    const currentReaction = reactedUsers[state.user.name];

    if (currentReaction === emoji) {
        reactions[emoji]--;
        delete reactedUsers[state.user.name];
    } else {
        if (currentReaction) {
            reactions[currentReaction]--;
        }
        reactions[emoji]++;
        reactedUsers[state.user.name] = emoji;
    }

    try {
        await db.collection("diaries").doc(diaryId).update({ reactions, reactedUsers });
    } catch (e) {
        console.error("Error updating reaction: ", e);
    }
}

window.deleteDiary = async function (diaryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            await db.collection("diaries").doc(diaryId).delete();
            showToast('Diary deleted!', 'fa-trash');
        } catch (e) {
            console.error("Error deleting diary: ", e);
        }
    }
}

// Comment Edit/Delete
window.deleteComment = async function (diaryId, commentId) {
    if (confirm('Delete this comment?')) {
        const diary = state.diaries.find(d => d.id === diaryId);
        if (diary) {
            const newComments = diary.comments.filter(c => c.id !== commentId && c.id.toString() !== commentId.toString());
            try {
                await db.collection("diaries").doc(diaryId).update({ comments: newComments });
                showToast('Comment deleted!', 'fa-trash');
            } catch (e) {
                console.error("Error deleting comment: ", e);
            }
        }
    }
}

window.editComment = function (diaryId, commentId) {
    const diary = state.diaries.find(d => d.id === diaryId);
    if (!diary) return;
    const comment = diary.comments.find(c => c.id === commentId || c.id.toString() === commentId.toString());
    if (!comment) return;

    const textDiv = document.getElementById(`comment-text-${diaryId}-${commentId}`);
    if (!textDiv) return;

    textDiv.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">
            <input type="text" id="edit-comment-input-${commentId}" value="${comment.text.replace(/"/g, '&quot;')}" style="width:100%; background: rgba(255,255,255,0.1); border:1px solid var(--primary-color); padding:6px; color:white; border-radius:4px; font-family: inherit;">
            <div style="display:flex; gap:8px;">
                <button onclick="saveEditComment('${diaryId}', '${commentId}')" class="primary-btn" style="padding:4px 10px; font-size:0.8rem;">Save</button>
                <button onclick="renderFeed()" class="secondary-btn" style="padding:4px 10px; font-size:0.8rem;">Cancel</button>
            </div>
        </div>
    `;
}

window.saveEditComment = async function (diaryId, commentId) {
    const input = document.getElementById(`edit-comment-input-${commentId}`);
    if (!input) return;
    const newText = input.value.trim();
    if (newText) {
        const diary = state.diaries.find(d => d.id === diaryId);
        if (diary) {
            const newComments = diary.comments.map(c => {
                if (c.id === commentId || c.id.toString() === commentId.toString()) {
                    return { ...c, text: newText };
                }
                return c;
            });
            try {
                await db.collection("diaries").doc(diaryId).update({ comments: newComments });
                showToast('Comment updated!', 'fa-check');
            } catch (e) {
                console.error("Error updating comment: ", e);
            }
        }
    } else {
        alert('Comment cannot be empty.');
    }
}

// Render Shop
function renderShop(category) {
    shopItemsContainer.innerHTML = '';
    const items = state.shopItems.filter(item => item.category === category);

    items.forEach(item => {
        const isPurchased = item.price === 0 || state.user.purchased.includes(item.id);
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

window.handleShopAction = async function (itemId) {
    const item = state.shopItems.find(i => i.id === itemId);
    const isPurchased = item.price === 0 || state.user.purchased.includes(itemId);

    if (isPurchased) {
        // Equip
        state.user.equipped[item.category] = itemId;
        saveState();
        updateAvatar();
        renderShop(item.category);
        
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
        startFirestoreListener();
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
window.renderProfile = function() {
    const nameEl = document.getElementById('profile-name');
    const roleEl = document.getElementById('profile-role');
    if (nameEl) nameEl.textContent = state.user.name;
    if (roleEl) roleEl.textContent = state.user.role;

    updateAvatar(); // updates profile-avatar-img

    const myDiaries = state.diaries.filter(d => d.authorName === state.user.name);
    let commentCount = 0;
    state.diaries.forEach(d => {
        if (d.comments) {
            d.comments.forEach(c => {
                if (c.author === state.user.name) commentCount++;
            });
        }
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
            const url = diary.authorAvatarUrl || getAvatarUrl(state.user.avatarSeed || 'Felix', state.user.equipped.clothes, state.user.equipped.accessories, state.user.equipped.skin, state.user.equipped.eyes);
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
                        ${diary.image && diary.isVideo ? `<div class="entry-image"><video src="${diary.image}" controls style="max-width:100%; max-height:200px; border-radius:8px; margin-top:10px;"></video></div>` :
                          diary.image ? `<div class="entry-image"><img src="${diary.image}" style="max-width:100%; max-height:200px; object-fit:contain; border-radius:8px; margin-top:10px;"></div>` : ''}
                    </div>
                </article>
            `;
            list.insertAdjacentHTML('beforeend', html);
        });
    }
}
