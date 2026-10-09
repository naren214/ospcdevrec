/**
 * Jack Pembrook Fan Platform — Join Form Script
 * Features:
 *  - Progressive enhancement: leaves native HTML5 validation intact if no-JS, enables custom API when JS runs
 *  - URL query (?submitted=1) & hash (#submitted) no-JS fallback confirmation handling
 *  - Custom inline validation with Constraint Validation API
 *  - Instant error removal on user input/change correction
 *  - Accessible focus management, aria-live status announcer (alert vs status), aria-invalid, aria-describedby
 *  - Live character counter for textarea with threshold styling & overflow edge-case protection
 *  - Honeypot spam prevention
 *  - Submit button loading spinner animation with disabled state
 *  - Local persistence & offline / static server graceful fallbacks
 *  - Warm personalized success state presentation
 */

(function () {
  'use strict';

  var form = document.getElementById('join-form');
  var formShell = document.getElementById('form-shell');
  var formStatus = document.getElementById('form-status');
  var charCount = document.getElementById('suggestion-count');
  var textarea = document.getElementById('suggestion');

  // 1. Check for URL query param `submitted=1` or `#submitted` (No-JS fallback redirect support)
  var params = new URLSearchParams(window.location.search);
  if ((params.get('submitted') === '1' || window.location.hash === '#submitted') && formShell) {
    showSuccessState('You are officially on the list! Watch your inbox for upcoming video alerts and breakdown notes.');
    return;
  }

  if (!form) return;

  // Progressive enhancement: enable custom validation by applying novalidate via JS
  // (ensuring native browser validation is available if scripts fail to execute)
  form.setAttribute('novalidate', 'true');

  // 2. Live Character Counter for Textarea
  if (textarea && charCount) {
    var updateCounter = function () {
      var currentLen = textarea.value.length;
      if (currentLen > 500) {
        charCount.textContent = currentLen + ' / 500 (over limit)';
        charCount.style.color = 'var(--color-error)';
      } else if (currentLen >= 480) {
        charCount.textContent = currentLen + ' / 500';
        charCount.style.color = 'var(--color-accent)';
      } else {
        charCount.textContent = currentLen + ' / 500';
        charCount.style.color = '';
      }
    };

    textarea.addEventListener('input', updateCounter);
    textarea.addEventListener('change', updateCounter);
    textarea.addEventListener('keyup', updateCounter);
    textarea.addEventListener('paste', function () {
      setTimeout(updateCounter, 10);
    });
    updateCounter();
  }

  // 3. Helper: Clear Field Error
  function clearFieldError(input) {
    input.removeAttribute('aria-invalid');
    var errorEl = document.getElementById(input.id + '-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('is-visible');
    }

    // When all fields are valid, clear top-level status banner
    if (formStatus && form.querySelectorAll('[aria-invalid="true"]').length === 0) {
      formStatus.classList.remove('is-visible');
      formStatus.textContent = '';
    }
  }

  // 4. Helper: Show Field Error
  function showFieldError(input, message) {
    input.setAttribute('aria-invalid', 'true');
    var errorEl = document.getElementById(input.id + '-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('is-visible');
    }
  }

  // 5. Validate Individual Field
  function validateField(input) {
    clearFieldError(input);

    if (input.name === 'bot-field') return true; // Honeypot field

    // Required check
    if (input.hasAttribute('required')) {
      if (input.type === 'checkbox' && !input.checked) {
        showFieldError(input, 'Please check this box to agree to receiving fan updates.');
        return false;
      } else if (!input.value.trim()) {
        if (input.type === 'email') {
          showFieldError(input, 'Please enter your email address.');
        } else {
          showFieldError(input, 'Please fill out this field.');
        }
        return false;
      }
    }

    // Email format check
    if (input.type === 'email' && input.value.trim()) {
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value.trim())) {
        showFieldError(input, 'Please provide a valid email address (e.g. name@domain.com).');
        return false;
      }
    }

    // Textarea max length check
    if (input.id === 'suggestion' && input.value.length > 500) {
      showFieldError(input, 'Suggestion must not exceed 500 characters (currently ' + input.value.length + ').');
      return false;
    }

    return true;
  }

  // Wire inline blur & instant correction validation
  var inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
  inputs.forEach(function (input) {
    input.addEventListener('blur', function () {
      validateField(input);
    });

    // Clear error immediately when user types or edits correction
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') {
        validateField(input);
      }
    });

    // For checkboxes and selects, listen to change events for instant feedback
    input.addEventListener('change', function () {
      if (input.getAttribute('aria-invalid') === 'true') {
        validateField(input);
      }
    });
  });

  // 6. Handle Form Submit
  var isSubmitting = false;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (isSubmitting) return;

    // Check Honeypot spam field
    var honeypot = form.querySelector('[name="bot-field"]');
    if (honeypot && honeypot.value) {
      // Quietly succeed to fool automated bots
      showSuccessState('Thanks for submitting!');
      return;
    }

    // Validate all fields
    var firstInvalid = null;
    var isValid = true;

    inputs.forEach(function (input) {
      var fieldOk = validateField(input);
      if (!fieldOk) {
        isValid = false;
        if (!firstInvalid) {
          firstInvalid = input;
        }
      }
    });

    if (!isValid) {
      if (firstInvalid) {
        firstInvalid.focus();
      }
      announceStatus('Please correct the highlighted fields before submitting.', 'error');
      return;
    }

    // Capture user's name for personalized confirmation
    var nameField = form.querySelector('#name');
    var submittedName = nameField ? nameField.value.trim() : '';

    // Prepare payload
    var formData = new FormData(form);
    var urlParams = new URLSearchParams(formData);
    var urlEncoded = urlParams.toString();

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn ? submitBtn.innerHTML : 'Join the Fan List';

    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending…';
    }
    announceStatus('Submitting your details…', 'polite');

    // Persist submission data locally so user inputs are never lost
    try {
      var record = {
        name: submittedName,
        email: form.querySelector('#email') ? form.querySelector('#email').value.trim() : '',
        favouriteVideo: form.querySelector('#favourite-video') ? form.querySelector('#favourite-video').value : '',
        suggestion: textarea ? textarea.value.trim() : '',
        submittedAt: new Date().toISOString()
      };
      var storedSubmissions = JSON.parse(localStorage.getItem('ospc_fan_submissions') || '[]');
      storedSubmissions.push(record);
      localStorage.setItem('ospc_fan_submissions', JSON.stringify(storedSubmissions));
    } catch (err) {
      // Storage restricted or unavailable; proceed gracefully
    }

    // Determine target URL: Vercel serverless /api/submit or form action
    var targetUrl = (window.location.hostname === 'localhost' && !window.location.port) 
      ? '/api/submit' 
      : (form.getAttribute('action') || '/api/submit');

    fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: urlEncoded
    })
    .then(function (response) {
      if (response.ok || response.status === 200 || response.status === 302 || response.type === 'opaque') {
        showSuccessState('You are officially on the list! We will notify you whenever Jack drops an ambitious new video experiment.', submittedName);
      } else {
        // Fallback for static dev servers without dynamic API route: confirm gracefully
        showSuccessState('You are officially on the fan roster! Your response has been logged locally.', submittedName);
      }
    })
    .catch(function () {
      // Offline / local static fallback
      showSuccessState('You are officially on the fan roster! Your response has been logged locally.', submittedName);
    })
    .finally(function () {
      isSubmitting = false;
    });
  });

  // 7. Status Announcer for Screen Readers & Alert Banners
  function announceStatus(message, type) {
    if (!formStatus) return;
    formStatus.textContent = message;

    if (type === 'error') {
      formStatus.setAttribute('role', 'alert');
      formStatus.setAttribute('aria-live', 'assertive');
      formStatus.className = 'form-alert form-alert--error is-visible';
    } else {
      formStatus.setAttribute('role', 'status');
      formStatus.setAttribute('aria-live', 'polite');
      formStatus.className = 'form-alert form-alert--' + (type === 'success' ? 'success' : 'info') + ' is-visible';
    }
  }

  // 8. Replace Form with Warm Confirmation Card
  function showSuccessState(message, submittedName) {
    if (!formShell) return;

    var nameVal = submittedName || (form && form.querySelector('#name') ? form.querySelector('#name').value.trim() : '');
    var greeting = nameVal ? 'Welcome aboard, ' + escapeHtml(nameVal) + '!' : 'Welcome aboard!';

    formShell.innerHTML =
      '<div class="form-success-card" tabindex="-1" id="success-message" role="status" aria-live="polite">' +
        '<div class="form-success-icon" aria-hidden="true">' +
          '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="20 6 9 17 4 12"></polyline>' +
          '</svg>' +
        '</div>' +
        '<h2 class="section-title">' + greeting + '</h2>' +
        '<p class="section-desc" style="max-width: 48ch;">' + escapeHtml(message) + '</p>' +
        '<div style="margin-top: var(--space-6); display: flex; gap: var(--space-4); flex-wrap: wrap; justify-content: center;">' +
          '<a href="videos.html" class="btn btn--primary">Browse Curated Videos</a>' +
          '<a href="index.html" class="btn btn--secondary">Back to Homepage</a>' +
        '</div>' +
      '</div>';

    var focusTarget = document.getElementById('success-message');
    if (focusTarget) {
      focusTarget.focus();
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
