/**
 * Cooking Mode — The Sunday Table
 * Hands-free, step-by-step cooking overlay with voice control
 */

(function() {
  'use strict';

  // State
  const state = {
    isOpen: false,
    currentStep: 0,
    steps: [],
    ingredients: [],
    wakeLock: null,
    recognition: null,
    isListening: false,
    timers: new Map()
  };

  // DOM Elements
  const elements = {};

  // i18n strings (injected from template)
  const i18n = window.COOKING_I18N || {
    cookingMode: 'Cooking Mode',
    exitCookingMode: 'Exit Cooking Mode',
    cookingProgress: 'Cooking Progress',
    previousStep: 'Previous Step',
    nextStep: 'Next Step',
    voiceControl: 'Voice Control',
    voiceReady: 'Ready',
    voiceListening: 'Listening...',
    voiceError: 'Could not understand',
    timer: 'Timer',
    addTimer: 'Add Timer',
    ingredients: 'Ingredients',
    preparation: 'Preparation'
  };

  // Initialize when DOM is ready
  function init() {
    cacheElements();
    parseRecipeContent();
    bindEvents();
    initSpeechRecognition();
  }

  function cacheElements() {
    elements.trigger = document.querySelector('.cooking-mode-trigger');
    elements.overlay = document.getElementById('cooking-mode');
    elements.backdrop = elements.overlay?.querySelector('.cooking-mode__backdrop');
    elements.panel = elements.overlay?.querySelector('.cooking-mode__panel');
    elements.closeBtn = elements.overlay?.querySelector('.cooking-mode__close');
    elements.progressBar = elements.overlay?.querySelector('.cooking-mode__progress-bar');
    elements.prevBtn = elements.overlay?.querySelector('.cooking-mode__step-btn--prev');
    elements.nextBtn = elements.overlay?.querySelector('.cooking-mode__step-btn--next');
    elements.currentStepEl = elements.overlay?.querySelector('.cooking-mode__current-step');
    elements.totalStepsEl = elements.overlay?.querySelector('.cooking-mode__total-steps');
    elements.ingredientsList = elements.overlay?.querySelector('.cooking-mode__ingredients-list');
    elements.stepsList = elements.overlay?.querySelector('.cooking-mode__steps-list');
    elements.voiceBtn = elements.overlay?.querySelector('.cooking-mode__voice-btn');
    elements.voiceStatus = elements.overlay?.querySelector('.cooking-mode__voice-status');
    elements.timerBtn = elements.overlay?.querySelector('.cooking-mode__timer-btn');
  }

  function parseRecipeContent() {
    // Parse ingredients from the recipe page
    const ingredientItems = document.querySelectorAll('.recipe__ingredients li, .ingredients-list li');
    state.ingredients = Array.from(ingredientItems).map((li, index) => ({
      id: `ingredient-${index}`,
      text: li.textContent.trim(),
      checked: false,
      element: li
    }));

    // Parse steps from the recipe page
    const stepItems = document.querySelectorAll('.recipe__instructions ol li, .recipe__steps ol li, .cooking-mode__steps-list li');
    state.steps = Array.from(stepItems).map((li, index) => ({
      id: `step-${index}`,
      text: li.textContent.trim(),
      element: li,
      status: 'pending' // pending, active, done
    }));

    // Update total steps display
    if (elements.totalStepsEl) {
      elements.totalStepsEl.textContent = state.steps.length;
    }
  }

  function bindEvents() {
    // Trigger button
    elements.trigger?.addEventListener('click', openCookingMode);

    // Close button
    elements.closeBtn?.addEventListener('click', closeCookingMode);

    // Backdrop click
    elements.backdrop?.addEventListener('click', closeCookingMode);

    // Navigation buttons
    elements.prevBtn?.addEventListener('click', () => navigateStep(-1));
    elements.nextBtn?.addEventListener('click', () => navigateStep(1));

    // Voice control
    elements.voiceBtn?.addEventListener('click', toggleVoiceControl);

    // Timer button
    elements.timerBtn?.addEventListener('click', showTimerDialog);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);

    // Prevent scroll on body when open
    const observer = new MutationObserver(() => {
      if (state.isOpen) {
        document.body.classList.add('cooking-mode-active');
      } else {
        document.body.classList.remove('cooking-mode-active');
      }
    });
    observer.observe(elements.overlay, { attributes: true, attributeFilter: ['hidden'] });
  }

  function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      elements.voiceBtn?.setAttribute('disabled', 'true');
      elements.voiceBtn?.setAttribute('aria-hidden', 'true');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = document.documentElement.lang || 'hu-HU';

    state.recognition.onresult = handleSpeechResult;
    state.recognition.onerror = handleSpeechError;
    state.recognition.onend = handleSpeechEnd;
  }

  function handleSpeechResult(event) {
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      processVoiceCommand(finalTranscript.toLowerCase().trim());
    }
  }

  function processVoiceCommand(command) {
    // Hungarian and English commands
    const nextCommands = ['következő', 'next', 'tovább', 'continue'];
    const prevCommands = ['előző', 'previous', 'back', 'vissza'];
    const repeatCommands = ['ismétel', 'repeat', 'újra', 'again'];
    const ingredientCommands = ['hozzávalók', 'ingredients', 'mit kell'];
    const timerCommands = ['időzítő', 'timer', 'percre', 'minutes'];

    if (nextCommands.some(cmd => command.includes(cmd))) {
      navigateStep(1);
      speak('Következő lépés');
    } else if (prevCommands.some(cmd => command.includes(cmd))) {
      navigateStep(-1);
      speak('Előző lépés');
    } else if (repeatCommands.some(cmd => command.includes(cmd))) {
      speakCurrentStep();
    } else if (ingredientCommands.some(cmd => command.includes(cmd))) {
      speakIngredients();
    } else if (timerCommands.some(cmd => command.includes(cmd))) {
      // Extract number from command
      const match = command.match(/(\d+)\s*(perc|minute|min)/);
      if (match) {
        startTimer(parseInt(match[1], 10) * 60);
        speak(`${match[1]} perces időzítő elindítva`);
      } else {
        speak('Hány percre állítsam az időzítőt?');
      }
    }
  }

  function handleSpeechError(event) {
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      // Silent - just restart
    } else {
      console.warn('Speech recognition error:', event.error);
      elements.voiceStatus.textContent = i18n.voiceError;
      setTimeout(() => {
        elements.voiceStatus.textContent = i18n.voiceReady;
      }, 2000);
    }
  }

  function handleSpeechEnd() {
    if (state.isListening) {
      try {
        state.recognition.start();
      } catch (e) {
        // Already started or not allowed
      }
    }
  }

  function toggleVoiceControl() {
    if (!state.recognition) return;

    state.isListening = !state.isListening;
    elements.voiceBtn.setAttribute('aria-pressed', state.isListening);

    if (state.isListening) {
      elements.voiceStatus.textContent = i18n.voiceListening;
      elements.voiceBtn.classList.add('listening');
      try {
        state.recognition.start();
      } catch (e) {
        console.warn('Could not start speech recognition:', e);
      }
    } else {
      elements.voiceStatus.textContent = i18n.voiceReady;
      elements.voiceBtn.classList.remove('listening');
      state.recognition.stop();
    }
  }

  function openCookingMode() {
    if (state.isOpen) return;

    // Populate cooking mode content
    populateCookingMode();

    // Request wake lock
    requestWakeLock();

    // Show overlay
    elements.overlay.hidden = false;
    state.isOpen = true;

    // Focus management
    elements.closeBtn?.focus();

    // Announce to screen readers
    announce(i18n.cookingMode + ' ' + i18n.voiceReady);

    // Prevent body scroll
    document.body.classList.add('cooking-mode-active');
  }

  function closeCookingMode() {
    if (!state.isOpen) return;

    // Release wake lock
    releaseWakeLock();

    // Stop voice recognition
    if (state.isListening) {
      state.isListening = false;
      state.recognition?.stop();
    }

    // Clear any active timers
    clearAllTimers();

    // Hide overlay
    elements.overlay.hidden = true;
    state.isOpen = false;

    // Return focus to trigger
    elements.trigger?.focus();

    // Restore body scroll
    document.body.classList.remove('cooking-mode-active');
  }

  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        state.wakeLock = await navigator.wakeLock.request('screen');
        state.wakeLock.addEventListener('release', () => {
          state.wakeLock = null;
        });
      } catch (err) {
        console.warn('Wake lock failed:', err);
      }
    }
  }

  function releaseWakeLock() {
    if (state.wakeLock) {
      state.wakeLock.release();
      state.wakeLock = null;
    }
  }

  function populateCookingMode() {
    // Populate ingredients with checkboxes
    if (elements.ingredientsList && state.ingredients.length) {
      elements.ingredientsList.innerHTML = state.ingredients.map((ing, index) => `
        <li class="ingredient-item">
          <input type="checkbox" id="${ing.id}" data-index="${index}" ${ing.checked ? 'checked' : ''}>
          <label for="${ing.id}">${escapeHtml(ing.text)}</label>
        </li>
      `).join('');

      // Bind checkbox events
      elements.ingredientsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          state.ingredients[index].checked = e.target.checked;
          // Sync with main page
          const mainIngredient = document.querySelectorAll('.recipe__ingredients li, .ingredients-list li')[index];
          if (mainIngredient) {
            mainIngredient.style.opacity = e.target.checked ? '0.5' : '1';
            mainIngredient.style.textDecoration = e.target.checked ? 'line-through' : 'none';
          }
        });
      });
    }

    // Populate steps
    if (elements.stepsList && state.steps.length) {
      elements.stepsList.innerHTML = state.steps.map((step, index) => `
        <li data-step="${index}" class="${step.status}">
          <p>${escapeHtml(step.text)}</p>
        </li>
      `).join('');
    }

    // Reset to first step
    state.currentStep = 0;
    updateStepDisplay();
  }

  function navigateStep(direction) {
    const newStep = state.currentStep + direction;

    if (newStep < 0 || newStep >= state.steps.length) return;

    // Mark current as done
    if (state.steps[state.currentStep]) {
      state.steps[state.currentStep].status = 'done';
      const prevEl = elements.stepsList?.querySelector(`[data-step="${state.currentStep}"]`);
      prevEl?.classList.remove('cooking-step--active');
      prevEl?.classList.add('cooking-step--done');
    }

    state.currentStep = newStep;

    // Mark new as active
    if (state.steps[state.currentStep]) {
      state.steps[state.currentStep].status = 'active';
      const nextEl = elements.stepsList?.querySelector(`[data-step="${state.currentStep}"]`);
      nextEl?.classList.add('cooking-step--active');
      nextEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    updateStepDisplay();
    updateProgress();
    speakCurrentStep();
  }

  function updateStepDisplay() {
    if (elements.currentStepEl) {
      elements.currentStepEl.textContent = state.currentStep + 1;
    }

    // Update button states
    if (elements.prevBtn) elements.prevBtn.disabled = state.currentStep === 0;
    if (elements.nextBtn) elements.nextBtn.disabled = state.currentStep === state.steps.length - 1;

    // Update progress bar
    updateProgress();
  }

  function updateProgress() {
    const progress = state.steps.length > 0
      ? ((state.currentStep + 1) / state.steps.length) * 100
      : 0;
    elements.progressBar?.style.setProperty('width', `${progress}%`);
  }

  function speakCurrentStep() {
    if (state.steps[state.currentStep]) {
      speak(state.steps[state.currentStep].text);
    }
  }

  function speakIngredients() {
    const texts = state.ingredients.map(ing => ing.text).join('. ');
    speak(texts);
  }

  function speak(text) {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = document.documentElement.lang || 'hu-HU';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Prefer a natural voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.startsWith('hu') || v.lang.startsWith('en')
      ) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    }
  }

  function announce(text) {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.position = 'absolute';
    announcer.style.left = '-9999px';
    announcer.textContent = text;
    document.body.appendChild(announcer);
    setTimeout(() => announcer.remove(), 1000);
  }

  function showTimerDialog() {
    const minutes = prompt(i18n.addTimer + ' (perc):', '10');
    if (minutes && !isNaN(minutes) && minutes > 0) {
      startTimer(parseInt(minutes, 10) * 60);
    }
  }

  function startTimer(seconds) {
    const timerId = Date.now().toString();
    const endTime = Date.now() + seconds * 1000;

    const timer = {
      id: timerId,
      endTime,
      interval: setInterval(() => updateTimerDisplay(timerId), 1000)
    };

    state.timers.set(timerId, timer);

    // Show timer in UI
    showTimerUI(timerId, seconds);

    // Notify when done
    setTimeout(() => {
      timerComplete(timerId);
    }, seconds * 1000);
  }

  function showTimerUI(timerId, seconds) {
    const timerEl = document.createElement('div');
    timerEl.className = 'cooking-mode__timer';
    timerEl.dataset.timerId = timerId;
    timerEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <span class="timer-display">${formatTime(seconds)}</span>
      <button type="button" class="timer-cancel" aria-label="Cancel timer">×</button>
    `;

    const controls = document.querySelector('.cooking-mode__controls');
    controls?.insertBefore(timerEl, controls.firstChild);

    timerEl.querySelector('.timer-cancel')?.addEventListener('click', () => {
      clearTimer(timerId);
      timerEl.remove();
    });
  }

  function updateTimerDisplay(timerId) {
    const timer = state.timers.get(timerId);
    if (!timer) return;

    const remaining = Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
    const display = document.querySelector(`[data-timer-id="${timerId}"] .timer-display`);
    if (display) {
      display.textContent = formatTime(remaining);
    }

    if (remaining === 0) {
      clearInterval(timer.interval);
    }
  }

  function timerComplete(timerId) {
    const timer = state.timers.get(timerId);
    if (timer) {
      clearInterval(timer.interval);
      state.timers.delete(timerId);
    }

    const timerEl = document.querySelector(`[data-timer-id="${timerId}"]`);
    timerEl?.remove();

    // Notify
    speak('Időzítő lejárt');
    announce('Időzítő lejárt');

    // Visual feedback
    if (timerEl) {
      timerEl.style.animation = 'timerFlash 0.5s ease 3';
    }
  }

  function clearTimer(timerId) {
    const timer = state.timers.get(timerId);
    if (timer) {
      clearInterval(timer.interval);
      state.timers.delete(timerId);
    }
  }

  function clearAllTimers() {
    state.timers.forEach((_, id) => clearTimer(id));
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function handleKeydown(event) {
    if (!state.isOpen) return;

    switch (event.key) {
      case 'Escape':
        closeCookingMode();
        break;
      case 'ArrowRight':
      case ' ':
        if (event.target.tagName !== 'INPUT') {
          event.preventDefault();
          navigateStep(1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        navigateStep(-1);
        break;
      case 'Enter':
        if (event.target === elements.voiceBtn) {
          toggleVoiceControl();
        }
        break;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Expose for inline script to inject i18n
  window.CookingMode = {
    init,
    open: openCookingMode,
    close: closeCookingMode
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();