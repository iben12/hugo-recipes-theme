/**
 * Cooking Mode Module
 * Handles cooking mode UI for recipe steps with persistence, wake lock, and accessibility
 */

function CookingMode() {
  this.steps = [];
  this.currentStep = 0;
  this.wakeLock = null;
  this.isActive = false;
  this.previousFocus = null;
  this.stepView = null;
  this.stepCounter = null;
  this.ingredientsPanel = null;
  this.ingredientsToggle = null;
  this.prevButton = null;
  this.nextButton = null;
  this.exitButton = null;
  this.liveRegion = null;
  this.touchStartX = 0;
  this.touchStartY = 0;
  this.cookingModeBar = null;
  this.progressBar = null;
  this.cookingModePanels = null;
  this.cookingModeIngredients = null;
  this.cookingModeSteps = null;
  this.cookingModeNav = null;
  this.wakeLockIndicator = null;
  this.stepImageDialog = null;
  this.stepImageDialogImage = null;
}

CookingMode.prototype.init = function() {
  this.parseSteps();
  this.bindEvents();
  this.checkPersistence();
};

CookingMode.prototype.parseSteps = function() {
  const container = document.querySelector('[data-cooking-steps]');
  if (!container) {
    return;
  }

  this.steps = [];
  Array.from(container.querySelectorAll('ol')).forEach(function(list) {
    const stepElements = Array.from(list.children).filter(function(element) {
      return element.tagName === 'LI';
    });

    stepElements.forEach(function(element) {
      const sourceImages = Array.from(element.querySelectorAll('img'));
      const images = sourceImages.map(function(image) {
        return {
          src: image.getAttribute('src'),
          alt: image.getAttribute('alt') || ''
        };
      }).filter(function(image) {
        return image.src;
      });

      if (images.length > 0) {
        const imageParagraphs = Array.from(new Set(sourceImages.map(function(image) {
          return image.closest('p');
        }).filter(Boolean)));
        const gallery = document.createElement('div');
        gallery.className = 'recipe-step-gallery';
        if (images.length > 1) {
          gallery.classList.add('recipe-step-gallery--multiple');
        }

        sourceImages.forEach(function(image) {
          image.remove();
          gallery.appendChild(image);
        });

        imageParagraphs.forEach(function(paragraph) {
          if (!paragraph.textContent.trim() && !paragraph.querySelector('img')) {
            paragraph.remove();
          }
        });

        const lastImageParagraph = imageParagraphs[imageParagraphs.length - 1];
        if (lastImageParagraph && lastImageParagraph.parentElement === element) {
          lastImageParagraph.after(gallery);
        } else {
          element.appendChild(gallery);
        }
      }

      const stepContent = element.cloneNode(true);
      stepContent.querySelectorAll('img').forEach(function(image) {
        image.remove();
      });
      stepContent.querySelectorAll('.recipe-step-gallery').forEach(function(gallery) {
        gallery.remove();
      });

      this.steps.push({
        index: this.steps.length,
        element: element,
        html: stepContent.innerHTML,
        images: images
      });
    }, this);
  }, this);
};

CookingMode.prototype.buildCookingModeUI = function() {
  // Get recipe title
  const recipeTitle = document.querySelector('.recipe h1');
  const titleText = recipeTitle ? recipeTitle.textContent : 'Recipe';

  // Get ingredients list
  const ingredientsList = document.querySelector('.recipe__ingredients ul');
  const ingredientsHtml = ingredientsList ? ingredientsList.innerHTML : '';

  // Create top bar
  this.cookingModeBar = document.createElement('div');
  this.cookingModeBar.className = 'cooking-mode__bar';
  this.cookingModeBar.innerHTML = '\
    <h2 class="cooking-mode__title">' + titleText + '</h2>\
    <span class="cooking-mode__counter" aria-live="polite">1 / ' + this.steps.length + '</span>\
    <div class="cooking-mode__actions">\
      <button class="cooking-mode__btn cooking-mode__btn--ghost cooking-mode-exit" aria-label="Exit cooking mode">\
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">\
          <line x1="18" y1="6" x2="6" y2="18"></line>\
          <line x1="6" y1="6" x2="18" y2="18"></line>\
        </svg>\
      </button>\
      <button class="cooking-mode__btn cooking-mode__btn--ghost cooking-ingredients-toggle" aria-expanded="false" aria-controls="cooking-mode-ingredients">Show Ingredients</button>\
      <span class="cooking-mode__wake-lock" aria-hidden="true">\
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">\
          <path d="M18 8A6 6 0 0 0 6 8"></path>\
          <path d="M10 12V8"></path>\
          <path d="M14 12V8"></path>\
        </svg>\
      </span>\
    </div>\
  ';

  // Create progress bar
  this.progressBar = document.createElement('div');
  this.progressBar.className = 'cooking-mode__progress';
  this.progressBar.innerHTML = '\
    <div class="cooking-mode__progress-bar" style="width: ' + (100 / this.steps.length) + '%"></div>\
  ';

  // Create ingredients panel
  this.cookingModeIngredients = document.createElement('aside');
  this.cookingModeIngredients.className = 'cooking-mode__ingredients';
  this.cookingModeIngredients.id = 'cooking-mode-ingredients';
  this.cookingModeIngredients.setAttribute('aria-label', 'Ingredients');
  this.cookingModeIngredients.innerHTML = '\
    <div class="cooking-mode__ingredients-header">\
      <h3 class="cooking-mode__ingredients-title">Ingredients</h3>\
      <button class="cooking-mode__ingredients-close" aria-label="Close ingredients">\
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">\
          <line x1="18" y1="6" x2="6" y2="18"></line>\
          <line x1="6" y1="6" x2="18" y2="18"></line>\
        </svg>\
      </button>\
    </div>\
    <ul class="cooking-mode__ingredients-list">' + ingredientsHtml + '</ul>\
  ';

  // Create steps area with step view
  this.cookingModeSteps = document.createElement('main');
  this.cookingModeSteps.className = 'cooking-mode__steps';

  this.stepView = document.createElement('div');
  this.stepView.className = 'cooking-mode__step-view';
  this.stepView.setAttribute('role', 'region');
  this.stepView.setAttribute('aria-label', 'Current cooking step');
  this.stepView.setAttribute('aria-live', 'polite');
  this.cookingModeSteps.appendChild(this.stepView);

  this.stepImageDialog = document.createElement('dialog');
  this.stepImageDialog.className = 'cooking-mode__image-dialog';
  this.stepImageDialog.setAttribute('aria-label', 'Enlarged step image');

  const dialogClose = document.createElement('button');
  dialogClose.className = 'cooking-mode__image-dialog-close';
  dialogClose.type = 'button';
  dialogClose.setAttribute('aria-label', 'Close enlarged image');
  dialogClose.textContent = '×';
  this.stepImageDialogImage = document.createElement('img');
  this.stepImageDialogImage.className = 'cooking-mode__image-dialog-image';
  this.stepImageDialog.appendChild(dialogClose);
  this.stepImageDialog.appendChild(this.stepImageDialogImage);

  // Create panels container
  this.cookingModePanels = document.createElement('div');
  this.cookingModePanels.className = 'cooking-mode__panels';
  this.cookingModePanels.appendChild(this.cookingModeIngredients);
  this.cookingModePanels.appendChild(this.cookingModeSteps);

  // Create navigation
  this.cookingModeNav = document.createElement('nav');
  this.cookingModeNav.className = 'cooking-mode__nav';
  this.cookingModeNav.innerHTML = '\
    <button class="cooking-mode__nav-btn cooking-mode__nav-prev" aria-label="Previous step" disabled>\
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">\
        <polyline points="15 18 9 12 15 6"></polyline>\
      </svg>\
      <span>Previous</span>\
    </button>\
    <button class="cooking-mode__nav-btn cooking-mode__nav-next" aria-label="Next step">\
      <span>Next</span>\
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">\
        <polyline points="9 18 15 12 9 6"></polyline>\
      </svg>\
    </button>\
  ';

  // Create ARIA live region for step announcements
  if (!this.liveRegion) {
    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'cooking-live-region';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.padding = '0';
    this.liveRegion.style.margin = '-1px';
    this.liveRegion.style.overflow = 'hidden';
    this.liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    this.liveRegion.style.whiteSpace = 'nowrap';
    this.liveRegion.style.border = '0';
    document.body.appendChild(this.liveRegion);
  }

  // Insert all cooking mode UI elements at the beginning of body
  document.body.insertBefore(this.cookingModeBar, document.body.firstChild);
  document.body.insertBefore(this.progressBar, document.body.firstChild.nextSibling);
  document.body.insertBefore(this.cookingModePanels, document.body.firstChild.nextSibling.nextSibling);
  document.body.appendChild(this.cookingModeNav);
  document.body.appendChild(this.stepImageDialog);

  // Cache references to UI elements
  this.stepCounter = this.cookingModeBar.querySelector('.cooking-mode__counter');
  this.ingredientsToggle = this.cookingModeBar.querySelector('.cooking-ingredients-toggle');
  this.prevButton = this.cookingModeNav.querySelector('.cooking-mode__nav-prev');
  this.nextButton = this.cookingModeNav.querySelector('.cooking-mode__nav-next');
  this.exitButton = this.cookingModeBar.querySelector('.cooking-mode-exit');
  this.wakeLockIndicator = this.cookingModeBar.querySelector('.cooking-mode__wake-lock');
  this.updateWakeLockIndicator(false);
  this.ingredientsPanel = this.cookingModeIngredients;

  // Bind events for the new UI elements
  this.bindCookingModeEvents();
};

CookingMode.prototype.bindCookingModeEvents = function() {
  // Exit button
  if (this.exitButton) {
    this.exitButton.addEventListener('click', this.exit.bind(this));
  }

  // Navigation buttons
  if (this.prevButton) {
    this.prevButton.addEventListener('click', this.prev.bind(this));
  }
  if (this.nextButton) {
    this.nextButton.addEventListener('click', this.next.bind(this));
  }

  // Ingredients toggle (in top bar)
  if (this.ingredientsToggle) {
    this.ingredientsToggle.addEventListener('click', this.toggleIngredients.bind(this));
  }

  // Ingredients close button (in panel)
  const ingredientsClose = this.cookingModeIngredients.querySelector('.cooking-mode__ingredients-close');
  if (ingredientsClose) {
    ingredientsClose.addEventListener('click', this.toggleIngredients.bind(this));
  }

  const dialogClose = this.stepImageDialog.querySelector('.cooking-mode__image-dialog-close');
  dialogClose.addEventListener('click', function() {
    this.stepImageDialog.close();
  }.bind(this));

  this.stepImageDialog.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.stepImageDialog.close();
    }
  }.bind(this));

  this.stepImageDialog.addEventListener('click', function(event) {
    if (event.target === this.stepImageDialog) {
      this.stepImageDialog.close();
    }
  }.bind(this));

  this.stepView.addEventListener('click', function(event) {
    const imageButton = event.target.closest('.cooking-mode__step-image');
    if (!imageButton) return;

    this.stepImageDialogImage.src = imageButton.dataset.imageSrc;
    this.stepImageDialogImage.alt = imageButton.dataset.imageAlt;
    this.stepImageDialog.showModal();
  }.bind(this));
};

CookingMode.prototype.removeCookingModeUI = function() {
  if (this.cookingModeBar) {
    this.cookingModeBar.remove();
    this.cookingModeBar = null;
  }
  if (this.progressBar) {
    this.progressBar.remove();
    this.progressBar = null;
  }
  if (this.cookingModePanels) {
    this.cookingModePanels.remove();
    this.cookingModePanels = null;
  }
  if (this.cookingModeNav) {
    this.cookingModeNav.remove();
    this.cookingModeNav = null;
  }
  if (this.stepImageDialog) {
    this.stepImageDialog.remove();
    this.stepImageDialog = null;
    this.stepImageDialogImage = null;
  }
  this.cookingModeIngredients = null;
  this.cookingModeSteps = null;
};

CookingMode.prototype.goToStep = function(n) {
  if (this.steps.length === 0) return;

  // Clamp to valid range
  n = Math.max(0, Math.min(n, this.steps.length - 1));
  this.currentStep = n;

  const step = this.steps[n];
  if (!step) return;

  // Update step view
  this.stepView.innerHTML = '';
  const stepNumber = document.createElement('span');
  stepNumber.className = 'cooking-mode__step-number';
  stepNumber.textContent = n + 1;
  this.stepView.appendChild(stepNumber);

  const stepContent = document.createElement('div');
  stepContent.className = 'cooking-mode__step-content';
  stepContent.innerHTML = step.html;
  this.stepView.appendChild(stepContent);

  if (step.images.length > 0) {
    const imageList = document.createElement('div');
    imageList.className = 'cooking-mode__step-images';

    step.images.forEach(function(image) {
      const imageButton = document.createElement('button');
      imageButton.className = 'cooking-mode__step-image';
      imageButton.type = 'button';
      imageButton.dataset.imageSrc = image.src;
      imageButton.dataset.imageAlt = image.alt || 'Step ' + (n + 1) + ' image';
      imageButton.setAttribute('aria-label', 'Enlarge image for step ' + (n + 1));

      const thumbnail = document.createElement('img');
      thumbnail.src = image.src;
      thumbnail.alt = '';
      thumbnail.loading = 'lazy';
      imageButton.appendChild(thumbnail);
      imageList.appendChild(imageButton);
    });

    this.stepView.appendChild(imageList);
  }

  // Update step counter
  if (this.stepCounter) {
    this.stepCounter.textContent = (n + 1) + ' / ' + this.steps.length;
  }

  // Update progress bar
  if (this.progressBar) {
    const progressBarFill = this.progressBar.querySelector('.cooking-mode__progress-bar');
    if (progressBarFill) {
      progressBarFill.style.width = ((n + 1) / this.steps.length * 100) + '%';
    }
  }

  // Update button states
  if (this.prevButton) {
    this.prevButton.disabled = n === 0;
    this.prevButton.setAttribute('aria-disabled', n === 0);
  }
  if (this.nextButton) {
    this.nextButton.disabled = n === this.steps.length - 1;
    this.nextButton.setAttribute('aria-disabled', n === this.steps.length - 1);
  }

  // Announce step change
  if (this.liveRegion) {
    this.liveRegion.textContent = 'Step ' + (n + 1) + ' of ' + this.steps.length;
  }

  // Save to localStorage
  this.saveState();

  // Focus the step view for keyboard navigation
  this.stepView.setAttribute('tabindex', '-1');
  this.stepView.focus();
};

CookingMode.prototype.next = function() {
  if (this.currentStep < this.steps.length - 1) {
    this.goToStep(this.currentStep + 1);
  }
};

CookingMode.prototype.prev = function() {
  if (this.currentStep > 0) {
    this.goToStep(this.currentStep - 1);
  }
};

CookingMode.prototype.enter = function() {
  if (this.isActive) return;

  // Store previous focus for restoration on exit
  this.previousFocus = document.activeElement;

  // Build cooking mode UI
  this.buildCookingModeUI();

  // Add cooking-mode class to body
  document.body.classList.add('cooking-mode');

  // Show first step
  this.goToStep(0);

  // Request wake lock
  this.requestWakeLock();

  // Handle visibility change
  document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

  // Set initial ingredients panel state (closed on mobile, open on desktop)
  this.updateIngredientsPanel();

  this.isActive = true;
  this.saveState();

  // Trap focus in ingredients drawer if open
  this.trapFocus();
};

CookingMode.prototype.exit = function() {
  if (!this.isActive) return;

  // Remove cooking-mode class
  document.body.classList.remove('cooking-mode');

  // Release wake lock
  this.releaseWakeLock();

  // Remove visibility change listener
  document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

  // Remove cooking mode UI elements
  this.removeCookingModeUI();

  // Restore focus
  if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
    this.previousFocus.focus();
  }

  this.isActive = false;
  this.clearState();
};

CookingMode.prototype.requestWakeLock = function() {
  if (!('wakeLock' in navigator)) {
    this.updateWakeLockIndicator(false);
    return;
  }

  navigator.wakeLock.request('screen')
      .then(function(wakeLock) {
        if (!this.isActive) {
          wakeLock.release();
          return;
        }
        this.wakeLock = wakeLock;
        this.updateWakeLockIndicator(true);
        wakeLock.addEventListener('release', function() {
          this.wakeLock = null;
          this.updateWakeLockIndicator(false);
        }.bind(this));
      }.bind(this))
      .catch(function(err) {
        // Wake lock not available or denied - silent fallback
        this.updateWakeLockIndicator(false);
        console.debug('Wake lock unavailable:', err.name);
      }.bind(this));
};

CookingMode.prototype.updateWakeLockIndicator = function(isActive) {
  if (!this.wakeLockIndicator) return;

  const startButton = document.querySelector('.cooking-mode-toggle');
  const label = isActive
    ? startButton?.dataset.wakeLockActive
    : startButton?.dataset.wakeLockInactive;

  this.wakeLockIndicator.classList.toggle('active', isActive);
  if (label) {
    this.wakeLockIndicator.title = label;
  }
};

CookingMode.prototype.releaseWakeLock = function() {
  if (this.wakeLock) {
    this.wakeLock.release()
      .catch(function(err) {
        console.debug('Wake lock release failed:', err);
      });
    this.wakeLock = null;
  }
  this.updateWakeLockIndicator(false);
};

CookingMode.prototype.handleVisibilityChange = function() {
  if (document.hidden && this.wakeLock) {
    this.releaseWakeLock();
  } else if (!document.hidden && this.isActive && !this.wakeLock) {
    this.requestWakeLock();
  }
};

CookingMode.prototype.toggleIngredients = function() {
  if (!this.ingredientsPanel || !this.ingredientsToggle) return;

  const isOpen = this.ingredientsPanel.classList.toggle('cooking-ingredients-open');
  this.ingredientsToggle.setAttribute('aria-expanded', isOpen);
  this.ingredientsToggle.textContent = isOpen ? 'Hide Ingredients' : 'Show Ingredients';

  // Trap/restore focus for drawer
  if (isOpen) {
    this.trapFocus();
  }
};

CookingMode.prototype.updateIngredientsPanel = function() {
  if (!this.ingredientsPanel || !this.ingredientsToggle) return;

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  if (isMobile) {
    this.ingredientsPanel.classList.remove('cooking-ingredients-open');
    this.ingredientsToggle.setAttribute('aria-expanded', 'false');
    this.ingredientsToggle.textContent = 'Show Ingredients';
  } else {
    this.ingredientsPanel.classList.add('cooking-ingredients-open');
    this.ingredientsToggle.setAttribute('aria-expanded', 'true');
    this.ingredientsToggle.textContent = 'Hide Ingredients';
  }
};

CookingMode.prototype.trapFocus = function() {
  // Focus trapping for ingredients drawer on mobile
  if (!this.ingredientsPanel || !this.ingredientsPanel.classList.contains('cooking-ingredients-open')) {
    return;
  }

  const focusableElements = this.ingredientsPanel.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Remove existing listener if any
  if (this.ingredientsPanel._trapFocusHandler) {
    this.ingredientsPanel.removeEventListener('keydown', this.ingredientsPanel._trapFocusHandler);
  }

  this.ingredientsPanel._trapFocusHandler = function handleTab(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  this.ingredientsPanel.addEventListener('keydown', this.ingredientsPanel._trapFocusHandler);
};

CookingMode.prototype.bindEvents = function() {
  // Start cooking button
  const startButton = document.querySelector('.cooking-mode-toggle');
  if (startButton) {
    startButton.addEventListener('click', this.enter.bind(this));
  }

  // Keyboard navigation
  document.addEventListener('keydown', this.handleKeydown.bind(this));

  // Touch/swipe navigation (on step view)
  // Note: stepView is created dynamically, so we'll use event delegation
  document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
  document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

  // Resize handler for ingredients panel
  window.addEventListener('resize', this.updateIngredientsPanel.bind(this));
};

CookingMode.prototype.handleKeydown = function(e) {
  if (!this.isActive) return;

  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      this.next();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      this.prev();
      break;
    case 'Escape':
      if (e.defaultPrevented || (this.stepImageDialog && this.stepImageDialog.open)) {
        return;
      }
      e.preventDefault();
      this.exit();
      break;
  }
};

CookingMode.prototype.handleTouchStart = function(e) {
  if (!this.isActive) return;
  // Only handle touches on the step view area
  if (this.stepView && this.stepView.contains(e.target)) {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
  }
};

CookingMode.prototype.handleTouchEnd = function(e) {
  if (!this.isActive) return;
  // Only handle touches on the step view area
  if (this.stepView && this.stepView.contains(e.target)) {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    // Only trigger swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        this.prev();
      } else {
        this.next();
      }
    }
  }
};

CookingMode.prototype.saveState = function() {
  if (!this.isActive || this.steps.length === 0) return;

  const recipeUrl = window.location.pathname;
  const state = {
    active: true,
    currentStep: this.currentStep,
    recipeUrl: recipeUrl
  };

  try {
    localStorage.setItem('cookingMode', JSON.stringify(state));
  } catch (e) {
    // localStorage unavailable (private browsing, quota exceeded)
    console.debug('Failed to save cooking mode state:', e);
  }
};

CookingMode.prototype.clearState = function() {
  try {
    localStorage.removeItem('cookingMode');
  } catch (e) {
    console.debug('Failed to clear cooking mode state:', e);
  }
};

CookingMode.prototype.checkPersistence = function() {
  try {
    const stored = localStorage.getItem('cookingMode');
    if (!stored) return;

    const state = JSON.parse(stored);
    if (!state.active) return;

    // Only restore if same recipe URL
    if (state.recipeUrl !== window.location.pathname) {
      this.clearState();
      return;
    }

    // Verify steps exist
    if (this.steps.length === 0) {
      this.clearState();
      return;
    }

    // Auto-enter cooking mode at saved step
    // Small delay to ensure DOM is ready
    setTimeout(function() {
      this.enter();
      this.goToStep(state.currentStep);
    }.bind(this), 0);
  } catch (e) {
    console.debug('Failed to restore cooking mode state:', e);
    this.clearState();
  }
};

// Initialize on DOM ready
function initializeCookingMode() {
  const cookingMode = new CookingMode();
  cookingMode.init();

  // Expose globally for debugging
  window.CookingMode = cookingMode;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCookingMode);
} else {
  initializeCookingMode();
}