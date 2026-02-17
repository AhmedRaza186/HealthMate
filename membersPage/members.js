
import { uploadImg } from "../cloudinary.js";
import { deleteReport, getReportData, getSingleMember, monitorAuthState, updateMemberData, uploadReportData } from "../firebase.js";

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

const params = new URLSearchParams(window.location.search);
let memberId = decodeURIComponent(params.get('id') || "");

if (!memberId) {
    window.location.href = "../dashboard/dashboard.html";
}
let allReports = [];
const reportsTableBody = document.getElementById('reportsTableBody');

let user = await monitorAuthState()
let memberData = await getSingleMember(user.uid, memberId)

displayMemberData(memberData)

if (user && memberId) {
    // Initial fetch from Firebase
    allReports = await getReportData(user.uid, memberId);
    displayReports(allReports); // Pass the data to the function
}


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
            showToast("Profile updated successfully!", 'success');
              setTimeout(() => {
                location.reload(); // Refresh to see the new entry in the table
            }, 2000) // Refresh to show new data
        } else {
            showToast("Update failed. Please try again.");
        }

    } catch (error) {
        console.error("Critical error during update:", error);
        showToast("An error occurred while saving.");
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

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- SUBMIT REPORT ---
reportForm.onsubmit = async (e) => {
    e.preventDefault();

    const submitBtn = reportForm.querySelector('.btn-save-vault');
    const originalBtnText = submitBtn.innerHTML;

    // UI Feedback
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    submitBtn.disabled = true;

    const file = document.getElementById('reportFile').files[0];
    if (!file) return showToast("Please select a file first!");

    try {
        const fileSize = formatBytes(file.size);
        // 1. Upload to Cloudinary (using your existing uploadImg)
        const fileUrl = await uploadImg(file);

        // 2. Prepare Data
        const reportData = {
            title: document.getElementById('reportTitle').value,
            category: document.getElementById('reportCategory').value,
            date: document.getElementById('reportDate').value,
            fileURL: fileUrl,
            fileName: file.name,
            size: fileSize
        };

        // 3. Save to Firestore
        const result = await uploadReportData(user.uid, memberId, reportData);
        await displayReports(allReports)
        if (result.success) {
            showToast("Report saved successfully!", 'success');
            setTimeout(() => {
                location.reload(); // Refresh to see the new entry in the table
            }, 2000)
        }
    } catch (error) {
        console.error("Upload failed:", error);
        showToast("Something went wrong.");
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


async function displayReports(reportsArray) {
    // 1. Check if we have data
    if (!reportsArray || reportsArray.length === 0) {
        reportsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No reports found.</td></tr>';
        return;
    }

    // 2. Clear the table
    reportsTableBody.innerHTML = '';

    // 3. Loop through the array passed to the function
    reportsArray.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="doc-name">
                    <i class="far fa-file-pdf"></i> 
                    <span>${report.title}</span>
                </div>
            </td>
            <td><span class="badge-category">${report.category || 'General'}</span></td>
            <td>${new Date(report.date).toLocaleDateString()}</td>
            <td>${report.size || 'N/A'}</td>
            <td>
                <div class="table-actions">
                    <a href="../reportReviewPage/reportReview.html?memberId=${memberId}&reportId=${report.id}" class="action-btn view" title="View">
                        <i class="fas fa-eye"></i>
                    </a>
                    <button class="action-btn delete" data-id="${report.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        reportsTableBody.appendChild(row);
    });

    // Add event delegation for the delete button
    // Add this at the end of your displayReports function or script
    reportsTableBody.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete');
        if (!deleteBtn) return;

        const reportId = deleteBtn.getAttribute('data-id');

        // 1. Confirm with the user
        if (confirm("Are you sure you want to delete this medical record? This cannot be undone.")) {

            // 2. UI Feedback
            const originalIcon = deleteBtn.innerHTML;
            deleteBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
            deleteBtn.style.pointerEvents = 'none';

            try {
                // 3. Call Firebase
                const result = await deleteReport(user.uid, memberId, reportId);

                if (result.success) {
                    // 4. Refresh the table (instantly shows the new state)
                    // 1. Remove from local array
                    allReports = allReports.filter(r => r.id !== reportId);

                    // 2. Refresh the UI with current filters applied
                    handleSearchFilterSort();
                    await displayReports(allReports);
                    showToast("Report deleted successfully", "success");
                } else {
                    throw new Error("Delete failed");
                }
            } catch (error) {
                deleteBtn.innerHTML = originalIcon;
                deleteBtn.style.pointerEvents = 'auto';

            }
        }
    });
}
const searchInput = document.querySelector('.search-wrapper input');
const categoryFilter = document.getElementById('reportCategoryFilter');
const sortSelect = document.getElementById('reportSortSelect');

function handleSearchFilterSort() {
    // Safety check: if allReports hasn't loaded yet, stop
    if (!allReports || allReports.length === 0) return;

    let filtered = [...allReports];

    // --- 1. Search Logic ---
    const query = searchInput ? searchInput.value.toLowerCase() : "";
    if (query) {
        filtered = filtered.filter(r => r.title.toLowerCase().includes(query));
    }

    // --- 2. Category Logic ---
    // Make sure your HTML <select id="reportCategoryFilter"> has value="all" for the first option
    if (categoryFilter) {
        const cat = categoryFilter.value;
        if (cat && cat !== "all") {
            filtered = filtered.filter(r => r.category === cat);
        }
    }

    // --- 3. Sort Logic ---
    if (sortSelect) {
        const sortVal = sortSelect.value;
        if (sortVal === "newest") {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sortVal === "oldest") {
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (sortVal === "alpha") {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        }
    }

    // Update UI
    displayReports(filtered);
}

if (searchInput) searchInput.addEventListener('input', handleSearchFilterSort);
if (categoryFilter) categoryFilter.addEventListener('change', handleSearchFilterSort);
if (sortSelect) sortSelect.addEventListener('change', handleSearchFilterSort);
await displayReports(allReports)
