import { monitorAuthState, firebaseLogout, getUserData, saveUserDetails } from "../firebase.js";

// Tell the monitor this is a 'private' page
let user = await monitorAuthState('private');

let userData = await getUserData(user.uid)


console.log(userData)


let userGreeting = document.querySelector('#userGreeting')

userGreeting.innerText =`Welcome, ${userData.fullName}`;





// 3. Logout
document.getElementById('logoutBtn')?.addEventListener('click', firebaseLogout);