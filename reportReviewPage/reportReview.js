
import { groqApi } from "../config.js";
import { getSingleMember, getSingleReport, monitorAuthState, saveAiAnalysis } from "../firebase.js";
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


// 1. Declare global variables so all functions can see them
let currentReport = null; 



let user = await monitorAuthState('private'); // Ensure user is logged in

    
    const params = new URLSearchParams(window.location.search);
    const memberId = params.get('memberId');
    let memberData = await getSingleMember(user.uid, memberId)
    const reportId = params.get('reportId');

    if (user && memberId && reportId) {
        loadReviewPage(memberId, reportId);
    } else {
        window.location.href = "../dashboard/dashboard.html";
    }


async function loadReviewPage(memberId, reportId) {
    // Store in the global variable
    currentReport = await getSingleReport(user.uid, memberId, reportId);
    
    if (!currentReport) {
        showToast("Report not found!");
        return;
    }

    document.getElementById('viewReportTitle').innerText = currentReport.title;

    const frame = document.getElementById('documentFrame');
    
    // Using an iframe for PDFs and an <img> for images
    if (currentReport.fileURL.toLowerCase().includes('.pdf')) {
        frame.innerHTML = `<iframe src="${currentReport.fileURL}" width="100%" height="600px" style="border:none;"></iframe>`;
    } else {
        frame.innerHTML = `<img src="${currentReport.fileURL}" alt="Report" style="max-width:100%; height:auto;">`;
    }
    // NEW: If AI analysis already exists in Firestore, show it immediately!
    if (currentReport.aiAnalysis) {
        aiArea.innerHTML = currentReport.aiAnalysis;
        analyzeBtn.innerHTML = `<i class="fas fa-sync-alt"></i> Re-Analyze`;
    }
        // Serious Touch: Change Page Title
    document.title = `${memberData.name} | ${currentReport.title} | HealthMate`;
}

// 3. AI Analysis Click Handler
const analyzeBtn = document.getElementById('analyzeBtn');
const aiArea = document.getElementById('aiResponseArea');

analyzeBtn.onclick = async () => {
    if (!currentReport) return;

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing...`;
    aiArea.innerHTML = `<div class="typing-indicator">AI is reading your report...</div>`;

    try {
         const aiHtml = await analyzeWithGroq(currentReport.fileURL);

// 2. Save to Firestore
        const saveResult = await saveAiAnalysis(user.uid, memberId, reportId, aiHtml);
        if (saveResult.success) {
            aiArea.innerHTML = aiHtml;
            analyzeBtn.innerHTML = `<i class="fas fa-check"></i> Analysis Saved`;
        }



    } catch (error) {
                aiArea.innerHTML = `
            <div class="ai-card">
                <p class="error">
                    Could not analyze report. Please try again later.
                </p>
            </div>
        `;

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `Analyze Report`;
    
    }
};
// 1. Function to convert Image URL to Base64
async function urlToBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();

    const mimeType = blob.type; // auto detect image type

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve({
                base64: reader.result.split(',')[1],
                mimeType
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
let myApi = groqApi
async function analyzeWithGroq(fileUrl) {
    const base64Image = await urlToBase64(fileUrl);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${myApi}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
  messages: [
    {
      role: "system",
      content: [
        { type: "text", text: `
You are a professional medical analyst. Analyze the uploaded medical report image and return structured HTML.
Follow this **two-part format**:

1. English Version (Heading: <h2>English Version</h2>) – summarize all sections (Description, Highlights, Questions to Ask Doctor, Precautions, Prohibited Things) in English first.
2. Roman Urdu Version (Heading: <h2>Roman Urdu Version</h2>) – translate the **entire English version** into clean Roman Urdu. 
   - Do NOT mix English and Roman Urdu inside sentences, except medical terms. 
   - Do NOT use urdu language or arabic just Roman Urdu
   - Use consistent spelling. 
   - Keep the same structure and classes for HTML (ai-card, ai-highlight, biomarker-row, status-badge).
   3. Write ai can make mistakes after all output

Example HTML structure:

<div class="ai-card">
  <h2>English Version</h2>
  <h4>Description</h4>
  <p>EN: Patient has slightly low hemoglobin and normal WBC count.</p>
  <h4>Highlights</h4>
  <ul>
    <li class="ai-highlight">EN: Hemoglobin slightly low</li>
  </ul>
  ...
  
  <h2>Roman Urdu Version</h2>
  <h4>Description</h4>
  <p>RU: Patient ka hemoglobin thoda low hai aur WBC normal hai.</p>
  <h4>Highlights</h4>
  <ul>
    <li class="ai-highlight">RU: Hemoglobin thoda low hai</li>
  </ul>
  ...
</div>

Always follow this structure and fill in all sections from the report image.` }
      ]
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Analyze this medical report image and return output in the above bilingual format" },
        { type: "image_url", image_url:{
            url :currentReport.fileURL
        }  }
      ]
    }
  ]
        })

    });

    if (!response.ok) {
        throw new Error("Groq API failed");
    }

    const data = await response.json();


    return data.choices[0].message.content;
}

