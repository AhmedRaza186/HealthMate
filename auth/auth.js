import {
    firebaseLogin,
    firebaseSignup,
    saveUserDetails,
    monitorAuthState
} from "../firebase.js";

monitorAuthState('auth');
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

const tLogin = document.getElementById('toggleLogin');
const tSignup = document.getElementById('toggleSignup');
const lForm = document.getElementById('loginForm');
const sForm = document.getElementById('signupForm');

tSignup.addEventListener('click', () => {
    lForm.classList.add('hidden');
    sForm.classList.remove('hidden');
    tSignup.classList.add('active');
    tLogin.classList.remove('active');
});

tLogin.addEventListener('click', () => {
    sForm.classList.add('hidden');
    lForm.classList.remove('hidden');
    tLogin.classList.add('active');
    tSignup.classList.remove('active');
});




// Handle Login
lForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;

    try {
        await firebaseLogin(email, password);
        showToast("Login successful!", "success");
        setTimeout(() => {
            window.location.href = '../dashboard/dashboard.html';
        }, 1500);
    } catch (error) {
        let errorMessage = "An unknown error occurred.";

        switch (error.code) {
            case 'auth/invalid-credential':
                errorMessage = "Invalid email or password.";
                break;
            case 'auth/user-not-found':
                errorMessage = "No account found with this email.";
                break;
            case 'auth/wrong-password':
                errorMessage = "Incorrect password. Please try again.";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Too many failed attempts. Try again later.";
                break;
            case 'auth/network-request-failed':
                errorMessage = "Network error. Please check your connection.";
                break;
        }

        showToast(errorMessage, "error");
    }
});

// Handle Signup
sForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = sForm.querySelector('input[placeholder="Enter your name"]').value;
    const email = sForm.querySelector('input[type="email"]').value;
    const password = sForm.querySelector('input[type="password"]').value;

    try {
   // 1. Create the Auth Account
        const userCredential = await firebaseSignup(email, password);
        const user = userCredential.user;

        // 2. Save Details to Firestore using the new UID
        await saveUserDetails(user.uid, name, email);

        showToast("Account created!", "success");
        setTimeout(() => {
            window.location.href = '../dashboard/dashboard.html';
        }, 1500);

    } catch (error) {
        let errorMessage = "An unknown error occurred.";

        switch (error.code) {
            case 'auth/too-many-requests':
                errorMessage = "Too many failed attempts. Try again later.";
                break;
            case 'auth/email-already-in-use':
                errorMessage = "This email is already registered.";
                break;
            case 'auth/weak-password':
                errorMessage = "Password should be at least 6 characters.";
                break;
            case 'auth/network-request-failed':
                errorMessage = "Network error. Please check your connection.";
                break;
        }

        showToast(errorMessage, "error");
    }
});

