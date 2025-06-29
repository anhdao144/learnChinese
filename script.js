function extractUniqueCharacters(text) {
    const lines = text.split('\n');
    const characters = new Set();
    lines.forEach(line => {
        const hanzi = line.split('-')[0]?.trim();
        if (hanzi) {
            for (let char of hanzi) {
                if (/[\u4e00-\u9fff]/.test(char)) {
                    characters.add(char);
                }
            }
        }
    });
    return Array.from(characters);
}

function createGridSVG(id, size = 100) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("id", id);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.width = "100%";
    svg.style.height = "auto";

    const lines = [
        { x1: 0, y1: 0, x2: size, y2: size },
        { x1: size, y1: 0, x2: 0, y2: size },
        { x1: size / 2, y1: 0, x2: size / 2, y2: size },
        { x1: 0, y1: size / 2, x2: size, y2: size / 2 },
    ];

    lines.forEach(({ x1, y1, x2, y2 }) => {
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#ccc");
        svg.appendChild(line);
    });

    const border = document.createElementNS(ns, "rect");
    border.setAttribute("x", 0);
    border.setAttribute("y", 0);
    border.setAttribute("width", size);
    border.setAttribute("height", size);
    border.setAttribute("stroke", "#aaa");
    border.setAttribute("fill", "none");
    svg.appendChild(border);

    return svg;
}

function generatePractice() {
    const input = document.getElementById('inputText').value;
    const characters = extractUniqueCharacters(input);
    const output = document.getElementById('outputArea');
    output.innerHTML = '';

    characters.forEach((char, index) => {
        const block = document.createElement('div');
        block.className = 'char-block';

        // Tạo phần hiển thị mẫu chữ
        const svgId = `char-svg-${index}`;
        const svg = createGridSVG(svgId, 100);
        const wrapper = document.createElement('div');
        wrapper.className = 'svg-wrapper';
        wrapper.appendChild(svg);

        // Thêm Pinyin
        const pinyinDiv = document.createElement('div');
        pinyinDiv.className = 'pinyin-display';
        const pinyinContent = pinyinUtil.getPinyin(char, ' ', true);
        pinyinDiv.textContent = pinyinContent;
        wrapper.appendChild(pinyinDiv);

        // Tạo container cho các nút
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        // Nút phát âm
        const audioBtn = document.createElement('button');
        audioBtn.className = 'audio-btn';
        audioBtn.innerHTML = '🔊'; // Hoặc sử dụng icon từ thư viện khác
        audioBtn.onclick = () => responsiveVoice.speak(char, "Chinese Female");
        buttonContainer.appendChild(audioBtn);

        // Nút Xem lại nét
        const replayBtn = document.createElement('button');
        replayBtn.className = 'replay-btn';
        replayBtn.textContent = 'Xem lại nét';
        buttonContainer.appendChild(replayBtn);

        wrapper.appendChild(buttonContainer);

        block.appendChild(wrapper);

        // Khởi tạo writer mẫu
        setTimeout(() => {
            const writer = HanziWriter.create(svgId, char, {
                width: 100,
                height: 100,
                padding: 5,
                showCharacter: true,
                showOutline: true,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 100,
            });
            writer.animateCharacter();

            // Gán sự kiện cho nút xem lại
            replayBtn.onclick = () => writer.animateCharacter();
        }, 0);

        // Tạo các ô luyện viết
        const practiceArea = document.createElement('div');
        practiceArea.className = 'practice-boxes';

        // Tạo 2 ô luyện viết với cấu hình khác nhau
        const practiceConfigs = [
            { showOutline: true, label: "Có outline" },
            { showOutline: false, label: "Không outline" }
        ];

        practiceConfigs.forEach((config, i) => {
            const practiceContainer = document.createElement('div');
            practiceContainer.className = 'practice-container';

            const gridId = `practice-${index}-${i}`;
            const grid = createGridSVG(gridId, 100);
            practiceContainer.appendChild(grid);

            // Thêm nhãn để phân biệt
            const label = document.createElement('div');
            label.textContent = config.label;
            label.className = 'practice-label';
            practiceContainer.appendChild(label);

            const clearBtn = document.createElement('button');
            clearBtn.className = 'reset-btn';
            clearBtn.textContent = 'Xóa nét luyện viết';
            practiceContainer.appendChild(clearBtn);

            setTimeout(() => {
                let practiceWriter = HanziWriter.create(gridId, char, {
                    width: 100,
                    height: 100,
                    padding: 2,
                    showCharacter: false,
                    showOutline: config.showOutline,
                });

                // Hàm khởi tạo quiz
                const initQuiz = () => {
                    practiceWriter.quiz({
                        onComplete: () => {
                            // Tự động reset sau khi viết xong
                            setTimeout(initQuiz, 1000);
                        }
                    });
                };

                // Bắt đầu quiz lần đầu
                initQuiz();

                // Xử lý nút xóa
                clearBtn.onclick = () => {
                    practiceWriter.cancelQuiz();
                    practiceWriter.hideCharacter();
                    if (config.showOutline) {
                        practiceWriter.showOutline();
                    }
                    setTimeout(initQuiz, 100);
                };
            }, 0);

            practiceArea.appendChild(practiceContainer);
        });

        block.appendChild(practiceArea);
        output.appendChild(block);
    });
}