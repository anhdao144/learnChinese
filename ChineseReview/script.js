// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const apiKeyInput = document.getElementById('apiKey');
const vocabInput = document.getElementById('vocabInput');
const questionCountInput = document.getElementById('questionCount');
const loadingDiv = document.getElementById('loading');
const exerciseForm = document.getElementById('exercise-form');
const exerciseContainer = document.getElementById('exercise-container');
const exerciseTitle = document.getElementById('exercise-title');
const checkBtn = document.getElementById('checkBtn');
const resultSection = document.getElementById('result-section');
const scoreContainer = document.getElementById('score-container');
const answerKeyContainer = document.getElementById('answer-key');

// Global state
let originalExercises = [];
let loadingTimer = null; // NEW: Variable to hold the timer interval

// Load data from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    const savedVocab = localStorage.getItem('chineseVocabList');
    const savedCount = localStorage.getItem('questionCount');

    if (savedApiKey) apiKeyInput.value = savedApiKey;
    if (savedVocab) vocabInput.value = savedVocab;
    if (savedCount) questionCountInput.value = savedCount;
});

// Event Listeners
generateBtn.addEventListener('click', handleGenerateExercises);
checkBtn.addEventListener('click', handleCheckAnswers);

// --- STEP 1: GENERATE EXERCISES (FIRST API CALL) ---
async function handleGenerateExercises() {
    const apiKey = apiKeyInput.value.trim();
    const vocabText = vocabInput.value.trim();
    const questionCount = questionCountInput.value;

    if (!apiKey || !vocabText || !questionCount) {
        alert('Vui lòng điền đầy đủ thông tin.');
        return;
    }

    localStorage.setItem('geminiApiKey', apiKey);
    localStorage.setItem('chineseVocabList', vocabText);
    localStorage.setItem('questionCount', questionCount);

    resetUI();
    // NEW: Use the setLoading function with a specific message
    setLoading(true, "AI đang soạn bài tập...");

    try {
        const hanziList = vocabText.split('\n').map(line => line.split(' - ')[0].trim()).filter(Boolean);
        if (hanziList.length === 0) throw new Error('Không tìm thấy chữ Hán nào hợp lệ.');

        const prompt = createGenerationPrompt(hanziList.join(', '), questionCount);
        const responseText = await callGeminiAPI(prompt, apiKey);

        const jsonString = responseText.replace(/```json\n?|```/g, '').trim();
        const data = JSON.parse(jsonString);

        originalExercises = data.exercises;
        renderExercises(originalExercises);

        exerciseTitle.textContent = `BÀI TẬP (${originalExercises.length} câu)`;
        exerciseForm.classList.remove('hidden');
    } catch (error) {
        alert(`Lỗi khi tạo bài tập: ${error.message}`);
        console.error(error);
    } finally {
        // NEW: Stop the loading state and timer
        setLoading(false);
    }
}

// --- STEP 2: CHECK ANSWERS (SECOND API CALL) ---
async function handleCheckAnswers() {
    const apiKey = apiKeyInput.value.trim();
    // NEW: Use the setLoading function for the grading process
    setLoading(true, "AI đang chấm bài và đưa ra nhận xét...");
    checkBtn.disabled = true;

    try {
        const userAnswers = originalExercises.map((_, index) => {
            const itemDiv = exerciseContainer.children[index];
            const textInput = itemDiv.querySelector('input[type="text"]');
            const radioInput = itemDiv.querySelector('input[type="radio"]:checked');
            if (textInput) return textInput.value.trim();
            if (radioInput) return radioInput.value;
            return "";
        });

        const submissionData = originalExercises.map((ex, index) => ({
            question: ex.question,
            correctAnswer: ex.answer,
            userAnswer: userAnswers[index]
        }));

        const gradingPrompt = createGradingPrompt(JSON.stringify(submissionData, null, 2));
        const gradingResponseText = await callGeminiAPI(gradingPrompt, apiKey);

        const jsonString = gradingResponseText.replace(/```json\n?|```/g, '').trim();
        const gradingResult = JSON.parse(jsonString);

        updateUIWithGrading(gradingResult.results);

    } catch (error) {
        alert(`Lỗi khi chấm bài: ${error.message}`);
        console.error(error);
    } finally {
        // NEW: Stop the loading state and timer
        setLoading(false);
    }
}


// --- PROMPT FUNCTIONS (Kept the 2-API-call logic) ---

function createGenerationPrompt(hanziString, count) {
    return `
        Bạn là một API tạo bài tập tiếng Trung, chỉ trả lời bằng JSON.
        Dựa vào từ vựng sau: ${hanziString}.
        Hãy tạo chính xác ${count} câu hỏi đa dạng.
        Yêu cầu định dạng JSON không có trường "explanation":
        {
          "exercises": [{"type": "...", "question": "...", "options": [...], "answer": "..."}]
        }
    `;
}

function createGradingPrompt(submissionJson) {
    return `
        Bạn là một giáo viên tiếng Trung. Một học sinh vừa nộp bài làm:
        ${submissionJson}
        Nhiệm vụ: Xem xét từng câu, so sánh "userAnswer" với "correctAnswer". Đưa ra nhận xét ngắn gọn, hữu ích bằng tiếng Việt trong trường "explanation". Nếu đúng, hãy khuyến khích. Nếu sai, giải thích lỗi sai.
        Trả về kết quả dưới dạng JSON DUY NHẤT:
        {
          "results": [{"isCorrect": true/false, "explanation": "..."}]
        }
    `;
}

// --- API & UI HELPER FUNCTIONS ---

async function callGeminiAPI(prompt, apiKey) {
    // This function remains the same
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5 }
        }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Lỗi API: ${errorData.error.message}`);
    }
    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Phản hồi từ AI không có nội dung hợp lệ.");
    }
    return data.candidates[0].content.parts[0].text;
}

function renderExercises(exercises) {
    // This function remains the same
    exerciseContainer.innerHTML = '';
    exercises.forEach((ex, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'exercise-item';
        let content = `<p>${index + 1}. ${ex.question}</p>`;
        if ((ex.type === 'fill_in_the_blank' || ex.type === 'multiple_choice') && ex.options) {
            const optionsHtml = ex.options.map(option => `<label><input type="radio" name="q-${index}" value="${option}"> ${option}</label>`).join('');
            content += `<div class="options">${optionsHtml}</div>`;
        } else {
            content += `<input type="text" class="text-input" placeholder="Nhập câu trả lời của bạn...">`;
        }
        itemDiv.innerHTML = content;
        exerciseContainer.appendChild(itemDiv);
    });
}

function updateUIWithGrading(results) {
    // This function remains the same
    let score = 0;
    results.forEach((result, index) => {
        const itemDiv = exerciseContainer.children[index];
        const inputElement = itemDiv.querySelector('input[type="text"]') || itemDiv.querySelector('.options');

        if (result.isCorrect) {
            score++;
            inputElement.classList.add('correct');
        } else {
            inputElement.classList.add('incorrect');
        }

        if (result.explanation) {
            const explanationEl = document.createElement('div');
            explanationEl.className = 'explanation-text';
            explanationEl.innerHTML = `💡 <strong>Nhận xét:</strong> ${result.explanation}`;
            itemDiv.appendChild(explanationEl);
        }
    });

    document.querySelectorAll('#exercise-container input').forEach(input => input.disabled = true);
    checkBtn.disabled = true;

    displayResults(score, results.length);
}

// NEW: Central function to control loading state and timer
function setLoading(isLoading, message = "") {
    const loadingText = loadingDiv.querySelector('p');
    if (isLoading) {
        let seconds = 0;
        loadingText.textContent = `${message} (0s)`;
        loadingDiv.classList.remove('hidden');

        if (loadingTimer) clearInterval(loadingTimer);

        loadingTimer = setInterval(() => {
            seconds++;
            loadingText.textContent = `${message} (${seconds}s)`;
        }, 1000);
    } else {
        loadingDiv.classList.add('hidden');
        if (loadingTimer) {
            clearInterval(loadingTimer);
            loadingTimer = null;
        }
    }
}

function displayResults(score, total) {
    // This function remains the same
    scoreContainer.innerHTML = `Kết quả của bạn: <span>${score} / ${total}</span> câu đúng`;
    renderAnswerKey(originalExercises);
    resultSection.classList.remove('hidden');
    window.scrollTo({ top: resultSection.offsetTop, behavior: 'smooth' });
}

function renderAnswerKey(exercises) {
    // This function remains the same
    answerKeyContainer.innerHTML = '';
    exercises.forEach((ex, index) => {
        const keyItem = document.createElement('div');
        keyItem.className = 'answer-key-item';
        keyItem.innerHTML = `
            <div class="question">${index + 1}. ${ex.question}</div>
            <div class="correct-answer">Đáp án đúng: ${ex.answer}</div>
        `;
        answerKeyContainer.appendChild(keyItem);
    });
}

function resetUI() {
    // This function remains the same
    exerciseForm.classList.add('hidden');
    resultSection.classList.add('hidden');
    exerciseContainer.innerHTML = '';
    answerKeyContainer.innerHTML = '';
    scoreContainer.innerHTML = '';
    checkBtn.disabled = false;
    originalExercises = [];
}