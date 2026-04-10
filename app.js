/* ============================================
   THOUGHT GARDEN 🌿 — App Logic
   CBT Thought Record Diary
   ============================================ */

// ============= CONSTANTS =============
const STORAGE_KEY = 'thought-garden-entries';
const THEME_KEY = 'thought-garden-theme';

const WIZARD_STEPS = [
  {
    key: 'situation',
    emoji: '💭',
    title: 'what happened?',
    helper: 'describe the situation, event, or trigger that started this. it could be an event, a thought, a feeling, a memory, or even an image.',
    type: 'textarea',
    placeholder: 'i was at work when...',
  },
  {
    key: 'initialReaction',
    emoji: '🫧',
    title: 'how did you feel?',
    helper: 'what emotions came up? how intense was each one? rate them from 0 to 100%.',
    type: 'dynamic-emotions',
    placeholder: 'i felt my chest tighten and...',
  },
  {
    key: 'negativeThoughts',
    emoji: '🌀',
    title: 'what thoughts popped up?',
    helper: 'what negative or unhelpful thoughts did you notice? what\'s the "hot thought" — the one that hit hardest?',
    type: 'dynamic-thoughts',
    placeholder: '',
  },
  {
    key: 'supportingEvidence',
    emoji: '📋',
    title: 'evidence for the thought',
    helper: 'what hard evidence supports the hot thought? try to stick to facts, not feelings.',
    type: 'textarea',
    placeholder: 'the facts that support this thought are...',
  },
  {
    key: 'opposingEvidence',
    emoji: '✨',
    title: 'evidence against it',
    helper: 'what hard evidence goes against the hot thought? think about times when this wasn\'t true.',
    type: 'textarea',
    placeholder: 'on the other hand...',
  },
  {
    key: 'balancedThought',
    emoji: '🌿',
    title: 'a balanced view',
    helper: 'considering both sides, what\'s a more helpful and realistic way of thinking about this?',
    type: 'dynamic-thoughts',
    placeholder: '',
  },
  {
    key: 'outcome',
    emoji: '🌱',
    title: 'what did you learn?',
    helper: 'how do you feel now after reflecting? what can you take away from this for next time?',
    type: 'dynamic-emotions',
    placeholder: 'looking back, i notice that...',
  },
];

// ============= STATE =============
const state = {
  entries: [],
  currentView: 'diary',
  wizardStep: 0,
  wizardData: {},
  editingId: null,
  viewingId: null,
  darkMode: false,
  dropdownOpen: false,
  wizardDirection: 'forward',
};

// ============= DATA LAYER =============
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.entries = raw ? JSON.parse(raw) : [];
  } catch {
    state.entries = [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function addEntry(entry) {
  const now = new Date().toISOString();
  entry.id = generateId();
  entry.createdAt = now;
  entry.updatedAt = now;
  state.entries.unshift(entry);
  saveEntries();
  return entry;
}

function updateEntry(id, data) {
  const idx = state.entries.findIndex(e => e.id === id);
  if (idx === -1) return null;
  state.entries[idx] = { ...state.entries[idx], ...data, updatedAt: new Date().toISOString() };
  saveEntries();
  return state.entries[idx];
}

function deleteEntry(id) {
  state.entries = state.entries.filter(e => e.id !== id);
  saveEntries();
}

function getEntry(id) {
  return state.entries.find(e => e.id === id) || null;
}

// ============= THEME =============
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    state.darkMode = saved === 'dark';
  } else {
    state.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  applyTheme();
}

function toggleTheme() {
  state.darkMode = !state.darkMode;
  localStorage.setItem(THEME_KEY, state.darkMode ? 'dark' : 'light');
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
}

// ============= ROUTER =============
function navigate(view, params = {}) {
  state.currentView = view;
  if (params.id) {
    if (view === 'detail') state.viewingId = params.id;
    if (view === 'wizard') state.editingId = params.id;
  }
  if (view === 'wizard' && !params.id) {
    state.editingId = null;
  }
  const hash = view === 'diary' ? '#/' :
               view === 'wizard' && state.editingId ? `#/edit/${state.editingId}` :
               view === 'wizard' ? '#/new' :
               view === 'detail' ? `#/entry/${state.viewingId}` : '#/';
  history.pushState(null, '', hash);
  render();
}

function handleRoute() {
  const hash = location.hash || '#/';
  if (hash === '#/' || hash === '#/diary' || hash === '') {
    state.currentView = 'diary';
  } else if (hash === '#/new') {
    state.currentView = 'wizard';
    state.editingId = null;
    initWizard();
  } else if (hash.startsWith('#/edit/')) {
    const id = hash.replace('#/edit/', '');
    state.currentView = 'wizard';
    state.editingId = id;
    const entry = getEntry(id);
    if (entry) initWizard(entry);
    else { state.currentView = 'diary'; }
  } else if (hash.startsWith('#/entry/')) {
    const id = hash.replace('#/entry/', '');
    state.currentView = 'detail';
    state.viewingId = id;
  } else {
    state.currentView = 'diary';
  }
  render();
}

// ============= WIZARD =============
function initWizard(existingEntry = null) {
  state.wizardStep = 0;
  state.wizardDirection = 'forward';
  if (existingEntry) {
    state.wizardData = JSON.parse(JSON.stringify(existingEntry));
  } else {
    state.wizardData = {
      situation: '',
      initialReaction: { description: '', emotions: [{ name: '', intensity: 50 }] },
      negativeThoughts: { thoughts: [{ thought: '', intensity: 50 }] },
      supportingEvidence: '',
      opposingEvidence: '',
      balancedThought: { thoughts: [{ thought: '', intensity: 50 }] },
      outcome: { description: '', emotions: [{ name: '', intensity: 50 }] },
    };
  }
}

function collectCurrentStepData() {
  const step = WIZARD_STEPS[state.wizardStep];
  const container = document.querySelector('.wizard-step');
  if (!container) return;

  if (step.type === 'textarea') {
    const textarea = container.querySelector('.input-field');
    if (textarea) state.wizardData[step.key] = textarea.value;
  } else if (step.type === 'dynamic-emotions') {
    const descArea = container.querySelector('.input-field');
    const rows = container.querySelectorAll('.dynamic-row');
    const emotions = [];
    rows.forEach(row => {
      const nameInput = row.querySelector('.emotion-name');
      const slider = row.querySelector('input[type="range"]');
      if (nameInput && slider) {
        emotions.push({ name: nameInput.value, intensity: parseInt(slider.value) });
      }
    });
    if (step.key === 'initialReaction') {
      state.wizardData.initialReaction = { description: descArea ? descArea.value : '', emotions };
    } else if (step.key === 'outcome') {
      state.wizardData.outcome = { description: descArea ? descArea.value : '', emotions };
    }
  } else if (step.type === 'dynamic-thoughts') {
    const rows = container.querySelectorAll('.dynamic-row');
    const thoughts = [];
    rows.forEach(row => {
      const input = row.querySelector('.thought-input');
      const slider = row.querySelector('input[type="range"]');
      if (input && slider) {
        thoughts.push({ thought: input.value, intensity: parseInt(slider.value) });
      }
    });
    if (step.key === 'negativeThoughts') {
      state.wizardData.negativeThoughts = { thoughts };
    } else if (step.key === 'balancedThought') {
      state.wizardData.balancedThought = { thoughts };
    }
  }
}

function nextWizardStep() {
  collectCurrentStepData();
  if (state.wizardStep < WIZARD_STEPS.length - 1) {
    state.wizardDirection = 'forward';
    state.wizardStep++;
    renderWizardContent();
  }
}

function prevWizardStep() {
  collectCurrentStepData();
  if (state.wizardStep > 0) {
    state.wizardDirection = 'backward';
    state.wizardStep--;
    renderWizardContent();
  }
}

function saveWizardEntry() {
  collectCurrentStepData();
  const data = state.wizardData;

  if (state.editingId) {
    updateEntry(state.editingId, data);
    showToast('entry updated! ✨', 'success');
    navigate('detail', { id: state.editingId });
  } else {
    const entry = addEntry(data);
    showToast('entry saved! 🌿', 'success');
    navigate('detail', { id: entry.id });
  }
}

// ============= RENDER =============
function render() {
  const app = document.getElementById('app');
  state.dropdownOpen = false;

  switch (state.currentView) {
    case 'diary':
      app.innerHTML = renderDiaryView();
      bindDiaryEvents();
      break;
    case 'wizard':
      app.innerHTML = renderWizardView();
      bindWizardEvents();
      break;
    case 'detail':
      app.innerHTML = renderDetailView();
      bindDetailEvents();
      break;
    default:
      app.innerHTML = renderDiaryView();
      bindDiaryEvents();
  }
}

// ---------- Diary View ----------
function renderDiaryView() {
  const entries = state.entries;
  const hasEntries = entries.length > 0;

  return `
    ${renderHeader({ showLogo: true, showSettings: true, showTheme: true })}
    <div class="content view-enter">
      ${hasEntries ? `
        <div class="page-header">
          <h1>your entries 📖</h1>
          <p class="page-subtitle">${entries.length} thought record${entries.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="diary-grid">
          ${entries.map(entry => renderEntryCard(entry)).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-emoji">🌱</div>
          <h2>no entries yet</h2>
          <p>start your first thought record to begin your reflection journey</p>
        </div>
      `}
    </div>
    <button class="fab ${!hasEntries ? 'fab-pulse' : ''}" id="fab-new" aria-label="New entry">
      <span class="fab-icon">+</span> new entry
    </button>
  `;
}

function renderEntryCard(entry) {
  const date = formatDate(entry.createdAt);
  const situation = entry.situation || 'no situation recorded';
  const emotions = entry.initialReaction?.emotions?.filter(e => e.name) || [];

  return `
    <div class="entry-card" data-id="${entry.id}" id="entry-card-${entry.id}">
      <div class="entry-card-date">📅 ${date}</div>
      <div class="entry-card-situation">${escapeHtml(situation)}</div>
      ${emotions.length > 0 ? `
        <div class="entry-card-emotions">
          ${emotions.map(e =>
            `<span class="emotion-badge ${getIntensityClass(e.intensity)}">${escapeHtml(e.name)} ${e.intensity}%</span>`
          ).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// ---------- Wizard View ----------
function renderWizardView() {
  if (!state.wizardData.situation && state.wizardData.situation !== '' && !state.editingId) {
    initWizard();
  }
  return `
    ${renderHeader({ showBack: true, backTarget: 'diary', title: state.editingId ? 'edit entry' : 'new entry' })}
    <div class="content">
      <div class="wizard-container">
        ${renderWizardProgress()}
        <div id="wizard-content">
          ${renderWizardStep()}
        </div>
      </div>
    </div>
  `;
}

function renderWizardProgress() {
  return `
    <div class="wizard-progress" role="progressbar" aria-valuenow="${state.wizardStep + 1}" aria-valuemax="${WIZARD_STEPS.length}">
      ${WIZARD_STEPS.map((_, i) => {
        const cls = i < state.wizardStep ? 'completed' : i === state.wizardStep ? 'active' : '';
        return `<div class="wizard-dot ${cls}"></div>`;
      }).join('')}
    </div>
  `;
}

function renderWizardStep() {
  const step = WIZARD_STEPS[state.wizardStep];
  const data = state.wizardData;
  let fieldHtml = '';

  if (step.type === 'textarea') {
    const value = data[step.key] || '';
    fieldHtml = `<textarea class="input-field" placeholder="${step.placeholder}" id="wizard-textarea">${escapeHtml(value)}</textarea>`;
  } else if (step.type === 'dynamic-emotions') {
    const obj = step.key === 'initialReaction' ? data.initialReaction : data.outcome;
    const desc = obj?.description || '';
    const emotions = obj?.emotions?.length ? obj.emotions : [{ name: '', intensity: 50 }];
    fieldHtml = `
      <textarea class="input-field" placeholder="${step.placeholder || 'describe how you felt...'}" id="wizard-textarea" style="min-height:80px;margin-bottom:var(--space-md)">${escapeHtml(desc)}</textarea>
      <label class="slider-label" style="margin-bottom:var(--space-sm);display:block">emotions & intensity</label>
      <div class="dynamic-rows" id="emotion-rows">
        ${emotions.map((e, i) => renderEmotionRow(e, i)).join('')}
      </div>
      <button class="add-row-btn" id="add-emotion-btn">+ add emotion</button>
    `;
  } else if (step.type === 'dynamic-thoughts') {
    const obj = step.key === 'negativeThoughts' ? data.negativeThoughts : data.balancedThought;
    const thoughts = obj?.thoughts?.length ? obj.thoughts : [{ thought: '', intensity: 50 }];
    fieldHtml = `
      <label class="slider-label" style="margin-bottom:var(--space-sm);display:block">thoughts & intensity</label>
      <div class="dynamic-rows" id="thought-rows">
        ${thoughts.map((t, i) => renderThoughtRow(t, i)).join('')}
      </div>
      <button class="add-row-btn" id="add-thought-btn">+ add thought</button>
    `;
  }

  const isFirst = state.wizardStep === 0;
  const isLast = state.wizardStep === WIZARD_STEPS.length - 1;

  return `
    <div class="wizard-step">
      <div class="wizard-step-header">
        <span class="wizard-step-emoji">${step.emoji}</span>
        <span class="wizard-step-title">${step.title}</span>
      </div>
      <p class="wizard-step-helper">${step.helper}</p>
      ${fieldHtml}
      <div class="wizard-nav">
        ${isFirst ? '<div></div>' : '<button class="btn btn-ghost" id="wizard-prev">← back</button>'}
        ${isLast
          ? '<button class="btn btn-primary" id="wizard-save">save entry 🌿</button>'
          : '<button class="btn btn-primary" id="wizard-next">next →</button>'
        }
      </div>
    </div>
  `;
}

function renderEmotionRow(emotion, index) {
  return `
    <div class="dynamic-row" data-index="${index}">
      <div class="dynamic-row-fields">
        <input type="text" class="text-input emotion-name" placeholder="emotion name" value="${escapeHtml(emotion.name || '')}" />
        <div class="slider-group">
          <input type="range" min="0" max="100" value="${emotion.intensity}" class="emotion-slider" />
          <span class="slider-value">${emotion.intensity}%</span>
        </div>
      </div>
      <button class="remove-row-btn" data-index="${index}" title="Remove">×</button>
    </div>
  `;
}

function renderThoughtRow(thought, index) {
  return `
    <div class="dynamic-row" data-index="${index}">
      <div class="dynamic-row-fields">
        <textarea class="text-input thought-input" placeholder="describe the thought..." style="min-height:60px;resize:vertical;line-height:1.5;padding:var(--space-sm) var(--space-md)">${escapeHtml(thought.thought || '')}</textarea>
        <div class="slider-group">
          <input type="range" min="0" max="100" value="${thought.intensity}" class="thought-slider" />
          <span class="slider-value">${thought.intensity}%</span>
        </div>
      </div>
      <button class="remove-row-btn" data-index="${index}" title="Remove">×</button>
    </div>
  `;
}

function renderWizardContent() {
  const progressEl = document.querySelector('.wizard-progress');
  const contentEl = document.getElementById('wizard-content');
  if (progressEl) progressEl.outerHTML = renderWizardProgress();
  if (contentEl) {
    contentEl.innerHTML = renderWizardStep();
    bindWizardStepEvents();
  }
}

// ---------- Detail View ----------
function renderDetailView() {
  const entry = getEntry(state.viewingId);
  if (!entry) {
    return `
      ${renderHeader({ showBack: true, backTarget: 'diary' })}
      <div class="content view-enter">
        <div class="empty-state">
          <div class="empty-state-emoji">🤷</div>
          <h2>entry not found</h2>
          <p>this entry may have been deleted</p>
        </div>
      </div>
    `;
  }

  const sections = [
    { emoji: '💭', title: 'situation / trigger', content: renderDetailText(entry.situation) },
    { emoji: '🫧', title: 'initial reaction', content: renderDetailEmotions(entry.initialReaction) },
    { emoji: '🌀', title: 'negative automatic thoughts', content: renderDetailThoughts(entry.negativeThoughts) },
    { emoji: '📋', title: 'supporting evidence', content: renderDetailText(entry.supportingEvidence) },
    { emoji: '✨', title: 'opposing evidence', content: renderDetailText(entry.opposingEvidence) },
    { emoji: '🌿', title: 'balanced alternative thought', content: renderDetailThoughts(entry.balancedThought) },
    { emoji: '🌱', title: 'outcome / learning', content: renderDetailEmotions(entry.outcome) },
  ];

  return `
    ${renderHeader({ showBack: true, backTarget: 'diary', title: 'entry' })}
    <div class="content view-enter">
      <div class="detail-date">📅 ${formatDate(entry.createdAt)} at ${formatTime(entry.createdAt)}</div>
      <div class="detail-actions">
        <button class="btn btn-secondary" id="edit-entry-btn">✏️ edit</button>
        <button class="btn btn-secondary" id="export-pdf-btn">📄 pdf</button>
        <button class="btn btn-danger" id="delete-entry-btn">🗑️ delete</button>
      </div>
      ${sections.map(s => `
        <div class="detail-section">
          <div class="detail-section-header">
            <span class="detail-section-emoji">${s.emoji}</span>
            <span class="detail-section-title">${s.title}</span>
          </div>
          ${s.content}
        </div>
      `).join('')}
    </div>
  `;
}

function renderDetailText(text) {
  if (!text) return '<p class="detail-text text-muted" style="font-style:italic">nothing recorded</p>';
  return `<p class="detail-text">${escapeHtml(text)}</p>`;
}

function renderDetailEmotions(data) {
  if (!data) return '<p class="detail-text text-muted" style="font-style:italic">nothing recorded</p>';
  let html = '';
  if (data.description) {
    html += `<p class="detail-text" style="margin-bottom:var(--space-md)">${escapeHtml(data.description)}</p>`;
  }
  const emotions = data.emotions?.filter(e => e.name) || [];
  if (emotions.length > 0) {
    html += '<div class="intensity-list">';
    emotions.forEach(e => {
      const cls = getIntensityLevel(e.intensity);
      html += `
        <div class="intensity-item">
          <span class="intensity-label">${escapeHtml(e.name)}</span>
          <div class="intensity-bar-track">
            <div class="intensity-bar-fill ${cls}" style="width:${e.intensity}%"></div>
          </div>
          <span class="intensity-value">${e.intensity}%</span>
        </div>
      `;
    });
    html += '</div>';
  }
  return html || '<p class="detail-text text-muted" style="font-style:italic">nothing recorded</p>';
}

function renderDetailThoughts(data) {
  if (!data) return '<p class="detail-text text-muted" style="font-style:italic">nothing recorded</p>';
  const thoughts = data.thoughts?.filter(t => t.thought) || [];
  if (thoughts.length === 0) {
    return '<p class="detail-text text-muted" style="font-style:italic">nothing recorded</p>';
  }
  let html = '<div class="intensity-list">';
  thoughts.forEach(t => {
    const cls = getIntensityLevel(t.intensity);
    html += `
      <div class="intensity-item">
        <span class="intensity-label">${escapeHtml(t.thought)}</span>
        <div class="intensity-bar-track">
          <div class="intensity-bar-fill ${cls}" style="width:${t.intensity}%"></div>
        </div>
        <span class="intensity-value">${t.intensity}%</span>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

// ---------- Header ----------
function renderHeader(opts = {}) {
  const { showLogo, showBack, backTarget, title, showSettings, showTheme } = opts;

  let leftHtml = '';
  if (showBack) {
    leftHtml = `<button class="header-back" id="header-back-btn">← ${title || 'back'}</button>`;
  } else if (showLogo) {
    leftHtml = `<a class="header-logo" id="header-logo">🌿 thought garden</a>`;
  }

  let rightHtml = '';
  if (showTheme) {
    rightHtml += `<button class="icon-btn" id="theme-toggle-btn" title="Toggle dark mode" aria-label="Toggle dark mode">${state.darkMode ? '☀️' : '🌙'}</button>`;
  }
  if (showSettings) {
    rightHtml += `
      <div class="dropdown-wrapper" id="settings-wrapper">
        <button class="icon-btn" id="settings-btn" title="Settings" aria-label="Settings">⚙️</button>
        ${state.dropdownOpen ? renderSettingsDropdown() : ''}
      </div>
    `;
  }

  return `
    <header class="header">
      <div class="header-left">${leftHtml}</div>
      <div class="header-right">${rightHtml}</div>
    </header>
  `;
}

function renderSettingsDropdown() {
  return `
    <div class="dropdown" id="settings-dropdown">
      <button class="dropdown-item" id="export-json-btn">
        <span class="dropdown-icon">📤</span> export entries (json)
      </button>
      <button class="dropdown-item" id="import-json-btn">
        <span class="dropdown-icon">📥</span> import entries (json)
      </button>
      <div class="dropdown-divider"></div>
      <button class="dropdown-item danger" id="clear-all-btn">
        <span class="dropdown-icon">🗑️</span> clear all entries
      </button>
    </div>
    <input type="file" class="file-input-hidden" id="import-file-input" accept=".json" />
  `;
}

// ============= EVENT BINDING =============
function bindDiaryEvents() {
  // FAB
  document.getElementById('fab-new')?.addEventListener('click', () => {
    initWizard();
    navigate('wizard');
  });

  // Entry cards
  document.querySelectorAll('.entry-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      navigate('detail', { id });
    });
  });

  bindHeaderEvents();
}

function bindWizardEvents() {
  bindHeaderEvents();
  bindWizardStepEvents();
}

function bindWizardStepEvents() {
  // Next / Prev / Save
  document.getElementById('wizard-next')?.addEventListener('click', nextWizardStep);
  document.getElementById('wizard-prev')?.addEventListener('click', prevWizardStep);
  document.getElementById('wizard-save')?.addEventListener('click', saveWizardEntry);

  // Sliders live update
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valueEl = slider.closest('.slider-group')?.querySelector('.slider-value');
    slider.addEventListener('input', () => {
      if (valueEl) valueEl.textContent = `${slider.value}%`;
    });
  });

  // Add emotion / thought
  document.getElementById('add-emotion-btn')?.addEventListener('click', () => {
    collectCurrentStepData();
    const step = WIZARD_STEPS[state.wizardStep];
    const key = step.key;
    if (key === 'initialReaction') {
      state.wizardData.initialReaction.emotions.push({ name: '', intensity: 50 });
    } else if (key === 'outcome') {
      state.wizardData.outcome.emotions.push({ name: '', intensity: 50 });
    }
    renderWizardContent();
  });

  document.getElementById('add-thought-btn')?.addEventListener('click', () => {
    collectCurrentStepData();
    const step = WIZARD_STEPS[state.wizardStep];
    const key = step.key;
    if (key === 'negativeThoughts') {
      state.wizardData.negativeThoughts.thoughts.push({ thought: '', intensity: 50 });
    } else if (key === 'balancedThought') {
      state.wizardData.balancedThought.thoughts.push({ thought: '', intensity: 50 });
    }
    renderWizardContent();
  });

  // Remove rows
  document.querySelectorAll('.remove-row-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      collectCurrentStepData();
      const step = WIZARD_STEPS[state.wizardStep];
      const idx = parseInt(btn.dataset.index);
      if (step.type === 'dynamic-emotions') {
        const key = step.key;
        if (key === 'initialReaction') {
          if (state.wizardData.initialReaction.emotions.length > 1) {
            state.wizardData.initialReaction.emotions.splice(idx, 1);
          }
        } else if (key === 'outcome') {
          if (state.wizardData.outcome.emotions.length > 1) {
            state.wizardData.outcome.emotions.splice(idx, 1);
          }
        }
      } else if (step.type === 'dynamic-thoughts') {
        const key = step.key;
        if (key === 'negativeThoughts') {
          if (state.wizardData.negativeThoughts.thoughts.length > 1) {
            state.wizardData.negativeThoughts.thoughts.splice(idx, 1);
          }
        } else if (key === 'balancedThought') {
          if (state.wizardData.balancedThought.thoughts.length > 1) {
            state.wizardData.balancedThought.thoughts.splice(idx, 1);
          }
        }
      }
      renderWizardContent();
    });
  });
}

function bindDetailEvents() {
  bindHeaderEvents();

  document.getElementById('edit-entry-btn')?.addEventListener('click', () => {
    const entry = getEntry(state.viewingId);
    if (entry) {
      initWizard(entry);
      navigate('wizard', { id: entry.id });
    }
  });

  document.getElementById('delete-entry-btn')?.addEventListener('click', () => {
    showDeleteModal(state.viewingId);
  });

  document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
    exportEntryPDF(state.viewingId);
  });
}

function bindHeaderEvents() {
  document.getElementById('header-back-btn')?.addEventListener('click', () => {
    navigate('diary');
  });

  document.getElementById('header-logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('diary');
  });

  document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
    toggleTheme();
    render();
  });

  document.getElementById('settings-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.dropdownOpen = !state.dropdownOpen;
    const wrapper = document.getElementById('settings-wrapper');
    if (wrapper) {
      const existing = wrapper.querySelector('.dropdown');
      if (existing) {
        existing.remove();
        const fileInput = wrapper.querySelector('.file-input-hidden');
        if (fileInput) fileInput.remove();
        state.dropdownOpen = false;
      } else {
        wrapper.insertAdjacentHTML('beforeend', renderSettingsDropdown());
        bindSettingsEvents();
        state.dropdownOpen = true;
      }
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (state.dropdownOpen && !e.target.closest('#settings-wrapper')) {
      const dropdown = document.querySelector('.dropdown');
      if (dropdown) dropdown.remove();
      const fileInput = document.querySelector('.file-input-hidden');
      if (fileInput) fileInput.remove();
      state.dropdownOpen = false;
    }
  }, { once: true });
}

function bindSettingsEvents() {
  document.getElementById('export-json-btn')?.addEventListener('click', exportJSON);
  document.getElementById('import-json-btn')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });
  document.getElementById('import-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJSON(file);
  });
  document.getElementById('clear-all-btn')?.addEventListener('click', () => {
    state.dropdownOpen = false;
    showClearAllModal();
  });
}

// ============= MODALS =============
function showModal(content) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `<div class="modal">${content}</div>`;
  overlay.classList.remove('hidden');

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideModal();
  });
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
}

function showDeleteModal(id) {
  showModal(`
    <div class="modal-title">delete this entry? 🗑️</div>
    <p class="modal-text">this can't be undone. the entry will be permanently removed from your diary.</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">cancel</button>
      <button class="btn btn-danger" id="modal-confirm-delete">delete</button>
    </div>
  `);

  document.getElementById('modal-cancel')?.addEventListener('click', hideModal);
  document.getElementById('modal-confirm-delete')?.addEventListener('click', () => {
    deleteEntry(id);
    hideModal();
    showToast('entry deleted', 'info');
    navigate('diary');
  });
}

function showClearAllModal() {
  showModal(`
    <div class="modal-title">clear all entries? 🗑️</div>
    <p class="modal-text">this will permanently delete all ${state.entries.length} entries from your diary. consider exporting first!</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">cancel</button>
      <button class="btn btn-danger" id="modal-confirm-clear">clear all</button>
    </div>
  `);

  document.getElementById('modal-cancel')?.addEventListener('click', hideModal);
  document.getElementById('modal-confirm-clear')?.addEventListener('click', () => {
    state.entries = [];
    saveEntries();
    hideModal();
    showToast('all entries cleared', 'info');
    navigate('diary');
  });
}

// ============= EXPORT / IMPORT =============
function exportJSON() {
  const data = JSON.stringify(state.entries, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `thought-garden-export-${formatDateFile(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('entries exported! 📤', 'success');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');

      // Merge: add entries that don't exist yet (by id)
      const existingIds = new Set(state.entries.map(e => e.id));
      let added = 0;
      imported.forEach(entry => {
        if (!entry.id) entry.id = generateId();
        if (!existingIds.has(entry.id)) {
          state.entries.push(entry);
          added++;
        }
      });

      // Sort by date
      state.entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      saveEntries();
      showToast(`imported ${added} new entries! 📥`, 'success');
      navigate('diary');
    } catch (err) {
      showToast('invalid file format 😅', 'error');
    }
  };
  reader.readAsText(file);
}

function exportEntryPDF(id) {
  const entry = getEntry(id);
  if (!entry) return;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Thought Record', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`${formatDate(entry.createdAt)} at ${formatTime(entry.createdAt)}`, margin, y);
    y += 4;
    doc.text('thought garden', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    // Sections
    const sections = [
      { title: 'Situation / Trigger', content: entry.situation },
      { title: 'Initial Reaction', content: formatEmotionsForPDF(entry.initialReaction) },
      { title: 'Negative Automatic Thoughts', content: formatThoughtsForPDF(entry.negativeThoughts) },
      { title: 'Supporting Evidence', content: entry.supportingEvidence },
      { title: 'Opposing Evidence', content: entry.opposingEvidence },
      { title: 'Balanced Alternative Thought', content: formatThoughtsForPDF(entry.balancedThought) },
      { title: 'Outcome / Learning', content: formatEmotionsForPDF(entry.outcome) },
    ];

    sections.forEach(section => {
      // Check for page break
      if (y > 260) {
        doc.addPage();
        y = margin;
      }

      // Section title
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(124, 154, 142); // sage color
      doc.text(section.title.toUpperCase(), margin, y);
      y += 2;

      // Underline
      doc.setDrawColor(232, 228, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Section content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(45, 45, 45);

      const text = section.content || 'Nothing recorded';
      const lines = doc.splitTextToSize(text, contentWidth);
      lines.forEach(line => {
        if (y > 275) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 5;
      });

      y += 6;
    });

    doc.save(`thought-record-${formatDateFile(new Date(entry.createdAt))}.pdf`);
    showToast('pdf exported! 📄', 'success');
  } catch (err) {
    console.error('PDF export failed:', err);
    showToast('pdf export failed — try again', 'error');
  }
}

function formatEmotionsForPDF(data) {
  if (!data) return '';
  let parts = [];
  if (data.description) parts.push(data.description);
  const emotions = data.emotions?.filter(e => e.name) || [];
  if (emotions.length > 0) {
    emotions.forEach(e => {
      parts.push(`${e.name}: ${e.intensity}%`);
    });
  }
  return parts.join('\n');
}

function formatThoughtsForPDF(data) {
  if (!data) return '';
  const thoughts = data.thoughts?.filter(t => t.thought) || [];
  return thoughts.map(t => `${t.thought} — ${t.intensity}%`).join('\n');
}

// ============= TOAST =============
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ============= UTILITIES =============
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'unknown date';
  }
}

function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function formatDateFile(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getIntensityClass(value) {
  if (value <= 35) return 'intensity-low';
  if (value <= 65) return 'intensity-mid';
  return 'intensity-high';
}

function getIntensityLevel(value) {
  if (value <= 35) return 'low';
  if (value <= 65) return 'mid';
  return 'high';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============= INIT =============
function init() {
  loadEntries();
  loadTheme();
  handleRoute();

  window.addEventListener('hashchange', handleRoute);

  // Handle keyboard nav in wizard
  document.addEventListener('keydown', (e) => {
    if (state.currentView !== 'wizard') return;
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      if (state.wizardStep < WIZARD_STEPS.length - 1) nextWizardStep();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (state.wizardStep > 0) prevWizardStep();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
