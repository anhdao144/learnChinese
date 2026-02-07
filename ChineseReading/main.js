// Các biến toàn cục
let selectedHskLevel = 1;
let selectedVoice = null;
let availableVoices = [];

// Lắng nghe sự kiện khi trang được tải
document.addEventListener('DOMContentLoaded', function () {
    // Thiết lập sự kiện cho các cấp độ HSK
    document.querySelectorAll('.hsk-level').forEach(level => {
        level.addEventListener('click', function () {
            // Xóa lớp selected khỏi tất cả các cấp độ
            document.querySelectorAll('.hsk-level').forEach(el => {
                el.classList.remove('selected');
            });

            // Thêm lớp selected vào cấp độ được chọn
            this.classList.add('selected');

            // Cập nhật cấp độ HSK được chọn
            selectedHskLevel = parseInt(this.getAttribute('data-level'));

            // Lưu cấp độ HSK được chọn vào localStorage
            localStorage.setItem('selectedHskLevel', selectedHskLevel);
        });
    });

    // Thiết lập sự kiện cho nút tạo bài đọc
    document.getElementById('generateBtn').addEventListener('click', generateReadingExercise);

    // Tải API key từ localStorage
    const savedApiKey = localStorage.getItem('chineseReadingApiKey');
    const apiKeyInput = document.getElementById('apiKey');

    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    // Tải từ vựng từ localStorage
    const savedVocab = localStorage.getItem('chineseReadingVocab');
    const vocabText = document.getElementById('vocabText');

    if (savedVocab) {
        vocabText.value = savedVocab;
    } else {
        // Nếu không có từ vựng đã lưu, hiển thị ví dụ mẫu
        vocabText.value = `你好 (nǐ hǎo) - xin chào
谢谢 (xiè xiè) - cảm ơn
早上好 (zǎo shang hǎo) - chào buổi sáng
朋友 (péng you) - bạn bè
学习 (xué xí) - học tập
中文 (zhōng wén) - tiếng Trung
天气 (tiān qì) - thời tiết
今天 (jīn tiān) - hôm nay
明天 (míng tiān) - ngày mai
喜欢 (xǐ huān) - thích`;
    }

    // Tải cấp độ HSK được chọn từ localStorage
    const savedHskLevel = localStorage.getItem('selectedHskLevel');
    if (savedHskLevel) {
        selectedHskLevel = parseInt(savedHskLevel);
        const selectedLevelBtn = document.querySelector(`.hsk-level[data-level="${selectedHskLevel}"]`);
        if (selectedLevelBtn) {
            selectedLevelBtn.classList.add('selected');
        }
    }

    // Thiết lập sự kiện cho input API key
    apiKeyInput.addEventListener('input', function () {
        if (!this.value.trim()) {
            apiKeyInput.placeholder = "Nhập API Key";
            localStorage.removeItem('chineseReadingApiKey');
        } else {
            apiKeyInput.placeholder = "Nhập API Key";
            localStorage.setItem('chineseReadingApiKey', this.value.trim());
        }
    });

    // Thiết lập sự kiện cho textarea từ vựng để lưu tự động
    vocabText.addEventListener('input', function () {
        if (this.value.trim()) {
            localStorage.setItem('chineseReadingVocab', this.value);
        } else {
            localStorage.removeItem('chineseReadingVocab');
        }
    });

});

// Hàm tạo bài luyện đọc
async function generateReadingExercise() {
    // Lấy từ vựng từ textarea
    const vocabText = document.getElementById('vocabText').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();

    // Kiểm tra từ vựng
    if (!vocabText) {
        showError('Vui lòng nhập từ vựng tiếng Trung HSK.');
        return;
    }

    // Hiển thị trạng thái loading
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('generateBtn').disabled = true;
    hideMessages();

    // Phân tích từ vựng nhập vào
    const vocabList = parseVocabulary(vocabText);

    try {
        // Kiểm tra API key
        if (!apiKey) {
            showError('Vui lòng nhập API key để sử dụng dịch vụ này.');
            return;
        }

        // Tạo prompt cho API
        const prompt = createPrompt(vocabList, selectedHskLevel);
        // Gọi API thực tế của Google AI Studio (Gemini)
        const response = await callGoogleAIStudioAPI(prompt, apiKey);

        // Hiển thị kết quả
        displayResult(response);

        // Hiển thị thông báo thành công
        showSuccess('Bài luyện đọc đã được tạo thành công!');
    } catch (error) {
        console.error('Lỗi khi gọi API:', error);
        showError('Có lỗi xảy ra khi tạo bài luyện đọc: ' + error.message);
    } finally {
        // Ẩn trạng thái loading
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('generateBtn').disabled = false;
    }
}

// Hàm phân tích từ vựng nhập vào
function parseVocabulary(vocabText) {
    const lines = vocabText.split('\n');
    const vocabList = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Phân tích từ vựng theo các định dạng khác nhau
        // Định dạng 1: 你好 (nǐ hǎo) - xin chào
        // Định dạng 2: 你好 - xin chào
        // Định dạng 3: 你好

        let chinese = '';
        let pinyin = '';
        let meaning = '';

        // Tìm pinyin trong ngoặc đơn
        const pinyinMatch = line.match(/\((.*?)\)/);
        if (pinyinMatch) {
            pinyin = pinyinMatch[1];
            chinese = line.substring(0, pinyinMatch.index).trim();
        } else {
            chinese = line;
        }

        // Tìm nghĩa sau dấu gạch ngang
        const dashIndex = line.indexOf('-');
        if (dashIndex !== -1) {
            meaning = line.substring(dashIndex + 1).trim();
            if (!pinyin) {
                chinese = line.substring(0, dashIndex).trim();
            }
        }

        // Xử lý trường hợp chỉ có từ tiếng Trung
        if (!pinyin && !meaning) {
            chinese = line;
        }

        // Loại bỏ ký tự đặc biệt từ chinese nếu có
        chinese = chinese.replace(/[()]/g, '').trim();

        vocabList.push({
            chinese: chinese || line,
            pinyin: pinyin,
            meaning: meaning
        });
    });

    return vocabList;
}

// Hàm tạo prompt cho API
function createPrompt(vocabList, hskLevel) {
    const vocabString = vocabList.map(v => {
        let str = v.chinese;
        if (v.pinyin) str += ` (${v.pinyin})`;
        if (v.meaning) str += ` - ${v.meaning}`;
        return str;
    }).join(', ');

    return `Bạn là một giáo viên tiếng Trung chuyên nghiệp. Hãy tạo một bài luyện đọc tiếng Trung HSK cấp độ ${hskLevel} sử dụng các từ vựng sau: ${vocabString}.

YÊU CẦU QUAN TRỌNG: Bạn PHẢI trả về DUY NHẤT một JSON object, không có bất kỳ văn bản giải thích nào khác.

Cấu trúc JSON bắt buộc:
{
  "title": "Tiêu đề bài đọc (bằng tiếng Việt)",
  "content": "Nội dung bài đọc (bằng tiếng Trung, khoảng 150-200 chữ, phải chứa tất cả từ vựng đã cho)",
  "vocabulary": [
    {
      "chinese": "từ tiếng Trung",
      "pinyin": "phiên âm pinyin",
      "meaning": "nghĩa tiếng Việt"
    }
  ],
  "hsk_level": ${hskLevel},
  "word_count": số lượng từ trong bài đọc,
  "questions": [
    {
      "question": "Câu hỏi về bài đọc",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "correct_answer": 0
    }
  ]
}

Lưu ý:
1. Bài đọc phải phù hợp với trình độ HSK ${hskLevel}
2. Sử dụng tất cả từ vựng đã cho trong bài đọc
3. Tạo 3 câu hỏi trắc nghiệm về bài đọc
4. Chỉ trả về JSON, không có văn bản nào khác`;
}

// Hàm gọi OpenRouter API
async function callGoogleAIStudioAPI(prompt, apiKey) {
    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "model": "google/gemini-2.0-flash-001",
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("API Response Error:", errorText);
        throw new Error(`Lỗi API: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("API Response Data:", data);

    // Trích xuất nội dung từ phản hồi OpenRouter
    try {
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            const responseText = data.choices[0].message.content;
            console.log("Raw API Response Text:", responseText);

            // Loại bỏ các ký tự markdown (```json và ```
            let cleanedText = responseText.replace(/```json|```/g, '').trim();

            // Tìm và trích xuất JSON object
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonString = jsonMatch[0];
                console.log("Extracted JSON:", jsonString);
                const result = JSON.parse(jsonString);

                // Validate kết quả
                if (!result.content) {
                    throw new Error('API không trả về nội dung bài đọc');
                }

                return result;
            } else {
                // Nếu không tìm thấy JSON, tạo đối tượng từ văn bản
                console.warn("Không tìm thấy JSON trong phản hồi, sử dụng văn bản trực tiếp");
                return createFallbackResponse(cleanedText, vocabList, hskLevel);
            }
        } else {
            throw new Error('Cấu trúc phản hồi API không hợp lệ');
        }
    } catch (error) {
        console.error("Lỗi phân tích JSON:", error);
        throw new Error('Không thể phân tích phản hồi từ API. Lỗi: ' + error.message);
    }
}

// Hàm hỗ trợ: Lấy pinyin từ chữ Hán (đơn giản)
function getPinyinFromChinese(chinese) {
    const pinyinMap = {
        '你好': 'nǐ hǎo',
        '谢谢': 'xiè xiè',
        '早上好': 'zǎo shang hǎo',
        '朋友': 'péng you',
        '学习': 'xué xí',
        '中文': 'zhōng wén',
        '天气': 'tiān qì',
        '今天': 'jīn tiān',
        '明天': 'míng tiān',
        '喜欢': 'xǐ huān'
    };

    return pinyinMap[chinese] || '';
}

// Hàm hỗ trợ: Lấy nghĩa từ chữ Hán (đơn giản)
function getMeaningFromChinese(chinese) {
    const meaningMap = {
        '你好': 'xin chào',
        '谢谢': 'cảm ơn',
        '早上好': 'chào buổi sáng',
        '朋友': 'bạn bè',
        '学习': 'học tập',
        '中文': 'tiếng Trung',
        '天气': 'thời tiết',
        '今天': 'hôm nay',
        '明天': 'ngày mai',
        '喜欢': 'thích'
    };

    return meaningMap[chinese] || '';
}

// Hàm hiển thị kết quả
function displayResult(data) {
    const outputArea = document.getElementById('outputArea');

    // Tạo HTML cho từ vựng
    let vocabHTML = '';
    if (data.vocabulary && data.vocabulary.length > 0) {
        data.vocabulary.forEach(vocab => {
            vocabHTML += `
                <div class="vocab-item">
                    <strong>${vocab.chinese}</strong>
                    ${vocab.pinyin ? `<span class="pinyin"> (${vocab.pinyin})</span>` : ''}
                    ${vocab.meaning ? `<span class="meaning"> - ${vocab.meaning}</span>` : ''}
                </div>
            `;
        });
    }

    // Tạo HTML cho câu hỏi
    let questionsHTML = '';
    if (data.questions && data.questions.length > 0) {
        questionsHTML += `<h3><i class="fas fa-question-circle"></i> Câu Hỏi Luyện Tập</h3>`;
        data.questions.forEach((q, index) => {
            questionsHTML += `
                <div class="question-item">
                    <p><strong>Câu ${index + 1}:</strong> ${q.question}</p>
                    <div class="options">
                        ${q.options.map((opt, optIndex) => `
                            <div class="option">
                                <input type="radio" name="q${index}" id="q${index}o${optIndex}" value="${optIndex}">
                                <label for="q${index}o${optIndex}">${opt}</label>
                            </div>
                        `).join('')}
                    </div>
                    <button class="check-answer-btn" data-question="${index}" data-correct="${q.correct_answer}">
                        Kiểm tra đáp án
                    </button>
                    <div class="answer-result" id="answerResult${index}"></div>
                </div>
            `;
        });

        questionsHTML += `
            <div class="questions-controls">
                <button id="checkAllAnswers">Kiểm tra tất cả đáp án</button>
                <button id="showAllAnswers">Hiển thị đáp án</button>
            </div>
        `;
    }

    // Tạo toàn bộ nội dung
    const contentHTML = `
        <div class="reading-controls">
            <button id="readAllBtn" class="read-btn" title="Đọc toàn bộ nội dung">
                <i class="fas fa-volume-up"></i> Đọc
            </button>
            <button id="stopReadBtn" class="read-btn stop-btn" title="Dừng đọc" style="display: none;">
                <i class="fas fa-stop-circle"></i> Dừng
            </button>
            <select id="voiceSelector" class="voice-selector" title="Chọn giọng đọc">
                <option>Đang tải giọng...</option>
            </select>
            <span class="reading-hint">💡 Bôi đen để đọc từng đoạn</span>
        </div>
        <h3 style="color: #1976d2; margin-bottom: 15px;">${data.title || 'Bài Luyện Đọc'}</h3>
        <div class="reading-content">${data.content || 'Không có nội dung'}</div>
        
        <div class="reading-stats">
            <p><i class="fas fa-chart-bar"></i> Cấp độ: HSK ${data.hsk_level || selectedHskLevel}</p>
            <p><i class="fas fa-font"></i> Số chữ: ${data.word_count || (data.content ? data.content.length : 0)}</p>
            <p><i class="fas fa-clock"></i> Thời gian đọc ước tính: ${Math.ceil((data.word_count || 0) / 200)} phút</p>
        </div>
        
        ${vocabHTML ? `
        <div class="vocab-list">
            <h3><i class="fas fa-list-ul"></i> Từ Vựng Đã Sử Dụng (${data.vocabulary.length} từ)</h3>
            <div id="vocabDisplay">${vocabHTML}</div>
        </div>
        ` : ''}
        
        ${questionsHTML}
    `;

    outputArea.innerHTML = contentHTML;

    // Thêm sự kiện cho các nút kiểm tra đáp án
    if (data.questions && data.questions.length > 0) {
        // Sự kiện cho từng nút kiểm tra
        document.querySelectorAll('.check-answer-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const questionIndex = parseInt(this.getAttribute('data-question'));
                const correctAnswer = parseInt(this.getAttribute('data-correct'));
                const radioName = `q${questionIndex}`;
                const selectedOption = document.querySelector(`input[name="${radioName}"]:checked`);

                const resultDiv = document.getElementById(`answerResult${questionIndex}`);

                if (!selectedOption) {
                    resultDiv.innerHTML = `<p style="color: #f44336;">Vui lòng chọn một đáp án!</p>`;
                    return;
                }

                const selectedValue = parseInt(selectedOption.value);

                if (selectedValue === correctAnswer) {
                    resultDiv.innerHTML = `<p style="color: #4CAF50;">✓ Đúng! Đáp án chính xác.</p>`;
                } else {
                    resultDiv.innerHTML = `<p style="color: #f44336;">✗ Sai. Đáp án đúng là: ${data.questions[questionIndex].options[correctAnswer]}</p>`;
                }
            });
        });

        // Sự kiện cho nút kiểm tra tất cả
        document.getElementById('checkAllAnswers')?.addEventListener('click', function () {
            let allCorrect = true;

            data.questions.forEach((q, index) => {
                const radioName = `q${index}`;
                const selectedOption = document.querySelector(`input[name="${radioName}"]:checked`);
                const resultDiv = document.getElementById(`answerResult${index}`);

                if (!selectedOption) {
                    resultDiv.innerHTML = `<p style="color: #f44336;">Chưa chọn đáp án!</p>`;
                    allCorrect = false;
                    return;
                }

                const selectedValue = parseInt(selectedOption.value);

                if (selectedValue === q.correct_answer) {
                    resultDiv.innerHTML = `<p style="color: #4CAF50;">✓ Đúng</p>`;
                } else {
                    resultDiv.innerHTML = `<p style="color: #f44336;">✗ Sai</p>`;
                    allCorrect = false;
                }
            });

            if (allCorrect) {
                showSuccess('Chúc mừng! Bạn đã trả lời đúng tất cả các câu hỏi!');
            }
        });

        // Sự kiện cho nút hiển thị đáp án
        document.getElementById('showAllAnswers')?.addEventListener('click', function () {
            data.questions.forEach((q, index) => {
                const resultDiv = document.getElementById(`answerResult${index}`);
                resultDiv.innerHTML = `<p><strong>Đáp án:</strong> ${q.options[q.correct_answer]}</p>`;
            });
        });
    }

    // Khởi tạo chức năng đọc văn bản sau khi nội dung được hiển thị
    initializeTextToSpeechFeatures();
}

// Hàm hiển thị thông báo lỗi
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.style.display = 'block';

    // Ẩn thông báo sau 5 giây
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Hàm hiển thị thông báo thành công
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successDiv.style.display = 'block';

    // Ẩn thông báo sau 3 giây
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Hàm ẩn tất cả thông báo
function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// ==================== CHỨC NĂNG ĐỌC VĂN BẢN TIẾNG TRUNG ====================

// Biến toàn cục để lưu trạng thái đọc
let currentUtterance = null;
let isReading = false;

// Hàm lấy danh sách giọng hay sẵn
function getAvailableVoices() {
    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis) return;

    // Lấy danh sách giọng
    let voices = speechSynthesis.getVoices();
    
    // Nếu danh sách trống, đợi sự kiện voiceschanged
    if (voices.length === 0) {
        speechSynthesis.onvoiceschanged = function () {
            voices = speechSynthesis.getVoices();
            populateVoices(voices);
        };
    } else {
        populateVoices(voices);
    }
}

// Hàm điền danh sách giọng vào selector
function populateVoices(voices) {
    const voiceSelector = document.getElementById('voiceSelector');
    if (!voiceSelector) return;

    // Lọc giọng Trung Quốc
    const chineseVoices = voices.filter(voice => 
        voice.lang === 'zh-CN' || voice.lang === 'zh-Hans' || voice.name.toLowerCase().includes('chinese')
    );

    // Nếu không có giọng Trung Quốc, lấy tất cả giọng
    const voicesToUse = chineseVoices.length > 0 ? chineseVoices : voices;

    // Lưu danh sách giọng
    availableVoices = voicesToUse;

    // Xóa các option cũ
    voiceSelector.innerHTML = '';

    // Thêm các option mới
    voicesToUse.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' - Mặc định' : ''}`;
        voiceSelector.appendChild(option);

        // Chọn giọng đầu tiên theo mặc định
        if (index === 0 || voice.default) {
            voiceSelector.value = voice.name;
            if (!selectedVoice) {
                selectedVoice = voice;
            }
        }
    });
}

// Hàm khởi tạo chức năng đọc văn bản
function initializeTextToSpeechFeatures() {
    const readAllBtn = document.getElementById('readAllBtn');
    const stopReadBtn = document.getElementById('stopReadBtn');
    const voiceSelector = document.getElementById('voiceSelector');

    // Lấy danh sách giọng hay sẵn
    getAvailableVoices();

    // Khôi phục giọng đã lưu từ localStorage
    const savedVoice = localStorage.getItem('selectedVoice');
    if (voiceSelector && savedVoice) {
        voiceSelector.value = savedVoice;
        selectedVoice = availableVoices.find(v => v.name === savedVoice) || availableVoices[0] || null;
    }

    // Sự kiện chọn giọng đọc
    if (voiceSelector) {
        voiceSelector.addEventListener('change', function () {
            const voiceName = this.value;
            selectedVoice = availableVoices.find(v => v.name === voiceName) || availableVoices[0] || null;
            localStorage.setItem('selectedVoice', voiceName);
        });
    }

    // Sự kiện nút Đọc
    if (readAllBtn) {
        readAllBtn.addEventListener('click', function () {
            const contentElement = document.querySelector('.reading-content');

            if (contentElement) {
                const text = contentElement.innerText;
                speakText(text);
            }
        });
    }

    // Sự kiện nút Dừng
    if (stopReadBtn) {
        stopReadBtn.addEventListener('click', function () {
            stopSpeaking();
        });
    }

    // Sự kiện bôi đen để đọc
    document.addEventListener('mouseup', function () {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText && selectedText.length > 0) {
            // Đọc nếu người dùng bôi đen bất kỳ text nào
            speakText(selectedText);
        }
    });
}

// Hàm phát âm văn bản
function speakText(text) {
    // Dừng đọc hiện tại nếu đang đọc
    if (isReading) {
        stopSpeaking();
    }

    // Kiểm tra trình duyệt có hỗ trợ Web Speech API không
    const SpeechSynthesisUtterance = window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;
    const speechSynthesis = window.speechSynthesis;

    if (!SpeechSynthesisUtterance || !speechSynthesis) {
        showError('Trình duyệt của bạn không hỗ trợ chức năng đọc văn bản.');
        return;
    }

    // Tạo utterance mới
    currentUtterance = new SpeechSynthesisUtterance(text);

    // Thiết lập các tùy chọn đọc
    currentUtterance.lang = 'zh-CN'; // Tiếng Trung Quốc
    currentUtterance.rate = 0.9; // Tốc độ đọc (0.1 - 10)
    currentUtterance.pitch = 1; // Cao độ giọng (0.1 - 2)
    currentUtterance.volume = 1; // Âm lượng (0 - 1)
    
    // Sử dụng giọng đã chọn nếu có
    if (selectedVoice) {
        currentUtterance.voice = selectedVoice;
    }

    // Sự kiện khi bắt đầu đọc
    currentUtterance.onstart = function () {
        isReading = true;
        updateReadButtonState();
    };

    // Sự kiện khi kết thúc đọc
    currentUtterance.onend = function () {
        isReading = false;
        updateReadButtonState();
    };

    // Sự kiện khi có lỗi
    currentUtterance.onerror = function (event) {
        console.error('Lỗi đọc văn bản:', event);
        showError('Có lỗi xảy ra khi đọc văn bản: ' + event.error);
        isReading = false;
        updateReadButtonState();
    };

    // Phát âm
    speechSynthesis.speak(currentUtterance);
}

// Hàm dừng đọc
function stopSpeaking() {
    const speechSynthesis = window.speechSynthesis;
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
    isReading = false;
    updateReadButtonState();
}

// Hàm cập nhật trạng thái nút
function updateReadButtonState() {
    const readAllBtn = document.getElementById('readAllBtn');
    const stopReadBtn = document.getElementById('stopReadBtn');

    if (isReading) {
        if (readAllBtn) {
            readAllBtn.style.display = 'none';
        }
        if (stopReadBtn) {
            stopReadBtn.style.display = 'flex';
        }
    } else {
        if (readAllBtn) {
            readAllBtn.style.display = 'flex';
        }
        if (stopReadBtn) {
            stopReadBtn.style.display = 'none';
        }
    }
}


