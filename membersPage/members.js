import { uploadImg } from "../cloudinary.js";
import { getSingleMember, monitorAuthState, updateMemberData, uploadReportData } from "../firebase.js";

const params = new URLSearchParams(window.location.search);
let memberId = decodeURIComponent(params.get('id') || "");
console.log(memberId)
if (!memberId) {
    window.location.href = "../dashboard/dashboard.html";
}

let user = await monitorAuthState()
let memberData = await getSingleMember(user.uid, memberId)
console.log(memberData)
displayMemberData(memberData)

function displayMemberData(memberData) {
    // --- DISPLAY DATA GLOBALLY ---

    // Identity
    document.getElementById('memberName').innerText = memberData.name || "Unknown";
    document.getElementById('memberRelation').innerText = memberData.relation || "Family Member";

    // Vitals
    document.getElementById('memberAge').innerText = `${memberData.age || '--'} Years`;

    // Blood Group logic
    const bloodGroupElement = document.querySelectorAll('.vital-card .value')[1];
    if (memberData.bloodGroup) {
        bloodGroupElement.innerText = memberData.bloodGroup;
    } else {
        bloodGroupElement.innerText = "---";
    }

    // Photo with fallback
    const photoImg = document.getElementById('memberPhoto');
    if (memberData.photoURL && memberData.photoURL !== "null") {
        photoImg.src = memberData.photoURL;
    } else {
        photoImg.src = "../assets/default-user.png";
    }

    // Serious Touch: Change Page Title
    document.title = `${memberData.name} | HealthMate`;
}


// --- MODAL TOGGLE LOGIC ---
const modal = document.getElementById('editProfileModal');
const editBtn = document.querySelector('.edit-pic-overlay'); // The camera icon on sidebar
const closeBtns = document.querySelectorAll('.close-modal');


// Open modal and PRE-FILL data
if (editBtn) {
    editBtn.onclick = () => {
        document.getElementById('editName').value = memberData.name;
        document.getElementById('editAge').value = memberData.age;
        document.getElementById('editRelation').value = memberData.relation;
        document.getElementById('editPhotoPreview').src = memberData.photoURL || "../assets/default-user.png";
        modal.style.display = 'flex';
    };
}

// Close logic
closeBtns.forEach(btn => {
    btn.onclick = () => modal.style.display = 'none';
});

// --- PHOTO PREVIEW LOGIC ---
document.getElementById('editPhotoInput').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('editPhotoPreview').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
};

const editForm = document.getElementById('editProfileForm');

editForm.onsubmit = async (e) => {
    e.preventDefault();
    
    // Show a loading state on the button
    const submitBtn = editForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;

    const fileInput = document.getElementById('editPhotoInput');
    const file = fileInput.files[0];
    let photoURL = memberData.photoURL; // Keep existing photo by default

    try {
        // 1. Handle Image Upload if a new file is selected
        if (file) {
            const uploadResult = await uploadImg(file, memberId);
            if (uploadResult && typeof uploadResult === 'string') {
                // Apply the transformation for a serious profile look
                photoURL = uploadResult.replace('/upload/', '/upload/w_400,h_400,c_fill,g_face/');
            }
        }

        // 2. Prepare Data Object
        const updatedInfo = {
            name: document.getElementById('editName').value,
            age: document.getElementById('editAge').value,
            relation: document.getElementById('editRelation').value,
            bloodGroup: document.getElementById('editBloodGroup').value, // Optional
            photoURL: photoURL
        };

        // 3. Update Firestore
        const result = await updateMemberData(user.uid, memberId, updatedInfo);

        if (result.success) {
            alert("Profile updated successfully!");
            location.reload(); // Refresh to show new data
        } else {
            alert("Update failed. Please try again.");
        }

    } catch (error) {
        console.error("Critical error during update:", error);
        alert("An error occurred while saving.");
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
};


const reportModal = document.querySelector('#reportModal');
const reportForm = document.getElementById('reportForm');
const openModalBtn = document.getElementById('openReportModal'); // Ensure you have this ID on your trigger button
const closeModalBtns = document.querySelectorAll('#closeReportModal,#cancelReport');

// --- TOGGLE MODAL ---
if (openModalBtn) {
    openModalBtn.onclick = () => reportModal.classList.add('active');
}

closeModalBtns.forEach(btn => {
    btn.onclick = () => reportModal.classList.remove('active');
});

// --- SUBMIT REPORT ---
reportForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const submitBtn = reportForm.querySelector('.btn-save-vault');
    const originalBtnText = submitBtn.innerHTML;
    
    // UI Feedback
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    submitBtn.disabled = true;

    const file = document.getElementById('reportFile').files[0];
    if (!file) return alert("Please select a file first!");

    try {
        // 1. Upload to Cloudinary (using your existing uploadImg)
        const fileUrl = await uploadImg(file);

        // 2. Prepare Data
        const reportData = {
            title: document.getElementById('reportTitle').value,
            category: document.getElementById('reportCategory').value,
            date: document.getElementById('reportDate').value,
            fileURL: fileUrl,
            fileName: file.name
        };

        // 3. Save to Firestore
        const result = await uploadReportData(user.uid, memberId, reportData);

        if (result.success) {
            alert("Report saved successfully!");
            location.reload(); // Refresh to see the new entry in the table
        }
    } catch (error) {
        console.error("Upload failed:", error);
        alert("Something went wrong.");
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
};
const dropZone = document.getElementById('dropZone');
const reportFile = document.getElementById('reportFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');

// Trigger file input when clicking the dashed box
dropZone.onclick = () => reportFile.click();

// Update text when file is selected
reportFile.onchange = (e) => {
    if (e.target.files.length > 0) {
        fileNameDisplay.innerText = e.target.files[0].name;
        fileNameDisplay.style.color = "var(--primary)";
        fileNameDisplay.style.fontWeight = "bold";
    }
};