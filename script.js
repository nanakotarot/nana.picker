// --- State ---
let nameList = [];
let remainingList = [];
let drawHistory = [];
let groupResults = [];
let groupMode = 'size'; // 'size' or 'count'

// --- DOM Elements ---
const els = {
    input: document.getElementById('nameInput'),
    listPreview: document.getElementById('listPreview'),
    glCount: document.getElementById('globalCount'),
    poolCount: document.getElementById('poolCount'),
    remCount: document.getElementById('remainingCount'),
    winnerText: document.getElementById('winnerText'),
    drawBtn: document.getElementById('drawBtn'),
    dupCheck: document.getElementById('allowDuplicate'),
    drawNum: document.getElementById('drawPerRound'),
    history: document.getElementById('drawHistory'),
    // Group specific
    groupTotalCount: document.getElementById('groupTotalCount'),
    groupInput: document.getElementById('groupNumberInput'),
    estGroupCount: document.getElementById('estGroupCount'),
    groupResultGrid: document.getElementById('groupResultGrid'),
    modeCount: document.getElementById('modeCount'),
    modeSize: document.getElementById('modeSize')
};

// --- Init ---
window.addEventListener('DOMContentLoaded', () => {
    updateData();
    els.input.addEventListener('input', updateData);
    els.groupInput.addEventListener('input', updateGroupEstimation);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
});

// --- Navigation ---
function switchTab(tab) {
    document.querySelectorAll('.view-section').forEach(e => e.classList.remove('active'));
    document.getElementById(`view-${tab}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
    const map = { 'list': 0, 'draw': 1, 'group': 2 };
    document.querySelectorAll('.nav-item')[map[tab]].classList.add('active');

    if (tab === 'draw') resetDrawUI();
    if (tab === 'group') updateGroupEstimation();
}

// --- Data Management ---
function updateData() {
    nameList = els.input.value.split('\n').map(x => x.trim()).filter(x => x);
    els.glCount.textContent = `${nameList.length} 人`;
    els.groupTotalCount.textContent = nameList.length;

    // Detect duplicates
    const counts = {};
    nameList.forEach(n => counts[n] = (counts[n] || 0) + 1);

    // Render List Preview
    els.listPreview.innerHTML = nameList.map((n, i) => {
        const isDup = counts[n] > 1;
        const dupTag = isDup ? `<span style="background:#ff4757; color:white; font-size:0.75rem; padding:2px 6px; border-radius:4px; margin-left:8px;">重複</span>` : '';
        const dupStyle = isDup ? `style="background:#fff1f2; border-color:#ffccd5;"` : '';

        return `
        <div class="list-item" ${dupStyle}>
            <div class="list-idx">${i + 1}</div>
            <span>${n}</span>
            ${dupTag}
        </div>
    `;
    }).join('');

    // Reset draw pool stats only
    els.poolCount.textContent = nameList.length;

    // Update slider max if needed (at least 2 groups usually)
    const maxVal = Math.max(2, Math.floor(nameList.length / 2));
    // els.slider.max = Math.max(2, nameList.length); // Allow large groups? reference uses slider per person count
}

function addExampleData() {
    const examples = [
        '陳大文', '林小美', '張志明', '王曉華', '李建國',
        '吳雅婷', '蔡淑芬', '楊宗緯', '許瑋甯', '鄭伊健',
        '周杰倫', '蔡依林', '五月天'
    ];
    els.input.value = examples.join('\n');
    updateData();
}

function removeDuplicates() {
    const unique = [...new Set(els.input.value.split('\n').map(x => x.trim()).filter(x => x))];
    els.input.value = unique.join('\n');
    updateData();
    // Optional: visual feedback could be added here
}

// --- Draw Logic ---
function resetDrawUI() {
    remainingList = [...nameList];
    drawHistory = [];
    els.history.innerHTML = '';
    els.winnerText.textContent = '???';
    els.winnerText.classList.remove('gradient-pop');
    els.winnerText.style.color = '#2d3436';
    updateDrawStats();
}

function updateDrawStats() {
    els.remCount.textContent = remainingList.length;
    els.drawBtn.disabled = remainingList.length === 0 && !els.dupCheck.checked;
}

async function performDraw() {
    const count = parseInt(els.drawNum.value) || 1;
    const allowDup = els.dupCheck.checked;
    let pool = allowDup ? nameList : remainingList;

    if (pool.length === 0) { alert('所有名單已抽完！'); return; }

    els.drawBtn.disabled = true;
    els.winnerText.classList.remove('gradient-pop');
    els.winnerText.style.color = '#2d3436';

    const duration = 2000;
    const start = Date.now();

    const timer = setInterval(() => {
        if (Date.now() - start > duration) {
            clearInterval(timer);
            finalizeDraw(pool, count, allowDup);
        } else {
            const rnd = pool[Math.floor(Math.random() * pool.length)];
            els.winnerText.textContent = rnd;
        }
    }, 60);
}

function finalizeDraw(pool, count, allowDup) {
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const winners = shuffled.slice(0, Math.min(count, pool.length));

    if (winners.length > 1) {
        els.winnerText.classList.add('multi');
        els.winnerText.textContent = winners.join('  ');
    } else {
        els.winnerText.classList.remove('multi');
        els.winnerText.textContent = winners[0];
    }

    els.winnerText.classList.remove('anim-pop');
    void els.winnerText.offsetWidth;
    els.winnerText.classList.add('anim-pop');
    els.winnerText.classList.add('gradient-pop');

    fireConfetti();

    if (!allowDup) {
        remainingList = remainingList.filter(n => !winners.includes(n));
    }
    winners.forEach(w => {
        const tag = document.createElement('span');
        tag.style.cssText = "background:#fff; padding:4px 12px; border-radius:20px; font-size:0.85rem; border:1px solid #eee; color:#666;";
        tag.textContent = `🎉 ${w}`;
        els.history.prepend(tag);
    });
    updateDrawStats();
    els.drawBtn.disabled = false;
}

// --- Group Logic (Revised) ---
function setGroupMode(mode) {
    groupMode = mode;
    // Update UI
    if (mode === 'size') {
        els.modeSize.classList.add('active');
        els.modeSize.innerHTML = '<span class="check-icon">✓</span> 每組幾人';
        els.modeCount.classList.remove('active');
        els.modeCount.innerHTML = '分成幾組';
    } else {
        els.modeCount.classList.add('active');
        els.modeCount.innerHTML = '<span class="check-icon">✓</span> 分成幾組';
        els.modeSize.classList.remove('active');
        els.modeSize.innerHTML = '每組幾人';
    }
    updateGroupEstimation();
}

function updateGroupEstimation() {
    const val = parseInt(els.groupInput.value) || 1;
    const total = nameList.length;

    if (total === 0) {
        els.estGroupCount.textContent = "名單為空";
        return;
    }

    if (groupMode === 'size') {
        // Split by X people per group
        const estimatedGroups = Math.ceil(total / val);
        els.estGroupCount.textContent = `預計分為 ${estimatedGroups} 組 (最後一組可能少於 ${val} 人)`;
    } else {
        // Split into X groups
        const peoplePerGroup = Math.floor(total / val);
        const remainder = total % val;
        if (peoplePerGroup < 1) {
            els.estGroupCount.textContent = `人數不足以分成 ${val} 組`;
        } else {
            els.estGroupCount.textContent = `預計每組約 ${peoplePerGroup} 人 ${remainder > 0 ? `(有 ${remainder} 組多 1 人)` : ''}`;
        }
    }
}

function performGroup() {
    if (nameList.length === 0) { alert('請先輸入名單'); return; }

    const val = parseInt(els.groupInput.value) || 1;
    let shuffled = [...nameList].sort(() => 0.5 - Math.random());
    let groups = [];

    if (groupMode === 'size') {
        // Mode: By Size (e.g. 3 people per group)
        for (let i = 0; i < shuffled.length; i += val) {
            groups.push(shuffled.slice(i, i + val));
        }
    } else {
        // Mode: By Count (e.g. 3 groups total)
        // Initialize groups
        for (let i = 0; i < val; i++) groups.push([]);

        // Distribute
        shuffled.forEach((name, i) => {
            groups[i % val].push(name);
        });

        // Remove empty groups if any (shouldn't happen if validation passes but safe to check)
        groups = groups.filter(g => g.length > 0);
    }

    groupResults = groups;
    renderGroups(groups);
}

function renderGroups(groups) {
    els.groupResultGrid.innerHTML = '';
    groups.forEach((g, i) => {
        const card = document.createElement('div');
        card.className = 'group-card-modern anim-pop';
        card.style.animationDelay = `${i * 0.1}s`;

        const membersList = g.map(m => `
            <li class="gc-item"><span class="gc-dot"></span>${m}</li>
        `).join('');

        card.innerHTML = `
            <div class="gc-header">
                <div class="gc-title">第 ${i + 1} 組</div>
                <span class="gc-badge">${g.length} 人</span>
            </div>
            <ul class="gc-list">
                ${membersList}
            </ul>
        `;
        els.groupResultGrid.appendChild(card);
    });
}

function copyGroupText() {
    if (!groupResults.length) return;
    let text = groupResults.map((g, i) => `第 ${i + 1} 組 (${g.length}人):\n${g.join(', ')}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert('分組結果已複製！'));
}

// --- Canvas Confetti ---
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animId = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function fireConfetti() {
    particles = [];
    const count = 500; // More particles
    const colors = ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'];

    for (let i = 0; i < count; i++) {
        // Spawn randomly across the WHOLE screen
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;

        // Random explosion velocity in all directions
        // Increase speed for more "pop"
        particles.push({
            x: x,
            y: y,
            w: Math.random() * 10 + 5,
            h: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 40, // High explosive velocity
            vy: (Math.random() - 0.5) * 40,
            gravity: 0.1,
            drag: 0.90, // Strong air resistance to stop them quickly
            tilt: Math.random() * 10,
            tiltAngle: Math.random() * Math.PI,
            tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
            opacity: 1,
            fade: Math.random() * 0.03 + 0.02 // Fast fade
        });
    }
    if (!animId) loopConfetti();
}

function loopConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;

        // Fade out
        p.opacity -= p.fade;

        // Physics
        const wobble = Math.sin(p.tiltAngle);
        p.y += wobble * 2;
        p.tilt = wobble * 15;

        if (p.opacity > 0) {
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.beginPath();
            ctx.lineWidth = p.h;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + (p.w / 2), p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.h / 2));
            ctx.stroke();
            ctx.restore();
        } else {
            particles.splice(i, 1);
        }
    });

    if (particles.length > 0) {
        animId = requestAnimationFrame(loopConfetti);
    } else {
        animId = null;
    }
}
