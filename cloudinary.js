
// cloudinary.js
const url = "https://api.cloudinary.com/v1_1/dddcijrz6/image/upload";
const PRESET = "HealthMate";

export async function uploadImg(file) {
    // Create the formData here so your main logic stays clean
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);
    

    let response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    return data.secure_url;
}