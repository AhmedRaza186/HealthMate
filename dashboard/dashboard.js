import { uploadImg } from "../cloudinary.js";
import { monitorAuthState, firebaseLogout, getUserData, saveUserDetails, saveFamilyMember, getFamilyMembers, deleteFamilyMember } from "../firebase.js";

function showToast(message, type = 'error') {
   // 1. Check if container exists, if not, create it
   let container = document.getElementById('toast-container');
   if (!container) {
       container = document.createElement('div');
       container.id = 'toast-container';
       container.className = 'toast-container';
       document.body.appendChild(container);
   }

   // 2. Create the toast
   const toast = document.createElement('div');
   toast.className = `toast toast-${type}`;
   const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

   toast.innerHTML = `
       <i class="fas ${icon}"></i>
       <span>${message}</span>
   `;

   container.appendChild(toast);

   // 3. Remove logic
   setTimeout(() => {
       toast.style.opacity = '0';
       toast.style.transform = 'translateY(-20px)';
       setTimeout(() => toast.remove(), 500);
   }, 3000);
}
// Tell the monitor this is a 'private' page
let user = await monitorAuthState('private');

let userData = await getUserData(user.uid)


let userGreeting = document.querySelector('#userGreeting')

userGreeting.innerText = `Welcome, ${userData.fullName}`;


const modalOverlay = document.getElementById('modalOverlay');
const modalCard = modalOverlay.querySelector('.modal-card');
const addBtns = [document.getElementById('mobileAddBtn'), document.getElementById('emptyState')];

// Open Modal
addBtns.forEach(btn => {
    btn?.addEventListener('click', () => modalOverlay.classList.add('active'));
});

// Close Modal
document.getElementById('closeModal').addEventListener('click', () => modalOverlay.classList.remove('active'));

// Close if clicked outside the card
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

// for mobile
let startY = 0;
let currentY = 0;

modalCard.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    modalCard.style.transition = 'none'; // Disable transition while dragging for instant feedback
}, { passive: true });

modalCard.addEventListener('touchmove', (e) => {
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    // Only allow pulling downwards
    if (deltaY > 0) {
        modalCard.style.transform = `translateY(${deltaY}px)`;
    }
}, { passive: true });

modalCard.addEventListener('touchend', () => {
    modalCard.style.transition = 'transform 0.3s ease-out'; // Re-enable transition
    const deltaY = currentY - startY;

    if (deltaY > 150) {
        // If pulled down far enough, close it
        modalOverlay.classList.remove('active');
        // Reset position after the closing animation finishes
        setTimeout(() => {
            modalCard.style.transform = '';
        }, 300);
    } else {
        // Otherwise, snap back to position
        modalCard.style.transform = 'translateY(0)';
    }

    // Reset variables
    startY = 0;
    currentY = 0;
});

const familyGrid = document.querySelector('#familyGrid');
const addMemberForm = document.getElementById('addMemberForm');

// Load data on start
renderFamily();

// --- 2. IMAGE PREVIEW LOGIC ---
document.getElementById('memberPhoto').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('imagePreview').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// --- 3. RENDER FAMILY CARDS ---
// Replace your renderFamily function with this
async function renderFamily() {
    const members = await getFamilyMembers(user.uid);
    document.querySelector('.stat-value').innerText = members.length;

    familyGrid.innerHTML = `
        <div class="member-card add-card" id="emptyState">
            <i class="fas fa-plus-circle"></i>
            <p style="font-size: 0.9rem; font-weight: 600;">Add Member</p>
        </div>
    `;

    document.getElementById('emptyState').addEventListener('click', () => modalOverlay.classList.add('active'));

    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.onclick = () => window.location.
            href = `../membersPage/members.html?id=${member.id}&name=${encodeURIComponent(member.name)}`;

        // Transform URL for Card (Optimization)
        const photoSrc = member.photoURL
            ? member.photoURL.replace('/upload/', '/upload/w_200,h_200,c_fill,g_face,f_auto/')
            : null;

        card.innerHTML = `
        <button class="delete-btn" data-id="${member.id}">
            <i class="fas fa-trash-alt"></i>
        </button>
            <div class="member-card-header">
                ${photoSrc
                ? `<img src="${photoSrc}" alt="${member.name}" class="member-avatar">`
                : `<div class="member-avatar-placeholder"><i class="fas fa-user"></i></div>`
            }
            </div>
            <div class="member-info">
                <h3>${member.name}</h3>
                <div class="member-badges">
                    <span class="badge relation">${member.relation}</span>
                    <span class="badge age">${member.age} Yrs</span>
                </div>
            </div>
        `;
        // 2. Delete Click (Crucial part)
        const delBtn = card.querySelector('.delete-btn');
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // ✋ Stops the card click from firing!

            if (confirm(`Are you sure you want to delete ${member.name}?`)) {
                delBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                const result = await deleteFamilyMember(user.uid, member.id);
                if (result.success) {
                    showToast("Member deleted", 'success');
                    setTimeout(() => {
                        renderFamily();
                    }, 2000) // Refresh the list
                } else {
                    showToast("Could not delete member.");
                    delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                }
            }
        });

        familyGrid.appendChild(card);
    });
}

// --- 4. SAVE MEMBER LOGIC ---
addMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('.btn-save');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Creating Profile...";
    submitBtn.disabled = true;

    // Inside your submit listener...
    const file = document.getElementById('memberPhoto').files[0];
    let photoURL = null;

    try {
        if (file) {
            // You just call it like this. Simple and clean.
            photoURL = await uploadImg(file);

            // Optional: Cloudinary transformation for better performance
            photoURL = photoURL.replace('/upload/', '/upload/w_400,h_400,c_fill,g_face/');

        }

        const memberData = {
            name: document.getElementById('memberName').value,
            age: document.getElementById('memberAge').value,
            relation: document.getElementById('memberRelation').value,
            photoURL: photoURL
        };

        const result = await saveFamilyMember(user.uid, memberData);
        // ... reset form and close modal


        if (result.success) {
            addMemberForm.reset();
            document.getElementById('imagePreview').src = "../assets/default-user.png"; // Reset preview
            modalOverlay.classList.remove('active');
                       showToast("Member added", 'success');
                    setTimeout(() => {
                        renderFamily();
                    }, 2000) // Refresh the list

        }
    } catch (error) {
        showToast("Something went wrong!");
        console.error(error);
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});



// 3. Logout
document.querySelectorAll('.logout').forEach((btn) => {
    btn.addEventListener('click', firebaseLogout);
})

