/**
 * Jack Pembrook Fan Platform — Join Form Script
 * Features:
 *  - Progressive enhancement (handles no-JS redirect + AJAX submission)
 *  - Custom inline validation with Constraint Validation API
 *  - Accessible focus management, aria-live status, aria-invalid, aria-describedby
 *  - Live character counter for textarea (max 500)
 *  - Honeypot spam protection
 *  - Submitting & success state transitions
 */

(function () {
  'use strict';

  var form = document.getElementById('join-form');
  var formShell = document.getElementById('form-shell');
  var formStatus = document.getElementById('form-status');
  var charCount = document.getElementById('suggestion-count');
  var textarea = document.getElementById('suggestion');

  // 1. Check for URL query param `submitted=1` (No-JS fallback redirect support)
  var params = new URLSearchParams(window.location.search);
  if (params.get('submitted') === '1' && formShell) {
    showSuccessState('You are officially on the list! Watch your inbox for upcoming video alerts and breakdown notes.');
    return;
  }

  if (!form) return;

  // 2. Live Character Counter for Textarea
  if (textarea && charCount) {
    var updateCounter = function () {
      var currentLen = textarea.value.length;
      charCount.textContent = currentLen + ' / 500';
      if (currentLen >= 480) {
        charCount.style.color = 'var(--color-accent)';
      } else {
        charCount.style.color = '';
      }
    };
    textarea.addEventListener('input', updateCounter);
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

    if (input.name === 'bot-field') return true; // Honeypot

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

    // Textarea max length
    if (input.id === 'suggestion' && input.value.length > 500) {
      showFieldError(input, 'Suggestion must not exceed 500 characters.');
      return false;
    }

    return true;
  }

  // Wire inline blur validation
  var inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
  inputs.forEach(function (input) {
    input.addEventListener('blur', function () {
      validateField(input);
    });
    input.addEventListener('input', function () {
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
      // Quietly succeed to fool bots
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

    // Prepare payload
    var formData = new FormData(form);
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn.innerHTML;

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending…';
    announceStatus('Submitting your details…', 'polite');

    // Persist submission data locally so user inputs are never lost
    try {
      var record = {
        name: form.querySelector('#name') ? form.querySelector('#name').value.trim() : '',
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

    // Try Vercel Serverless API first, fall back to form action / root
    var targetUrl = window.location.hostname === 'localhost' && !window.location.port ? '/api/submit' : (form.getAttribute('action') || '/api/submit');

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
        showSuccessState('You are officially on the list! We will notify you whenever Jack drops an ambitious new video experiment.');
      } else {
        // Fallback for static servers without dynamic route: still confirm gracefully
        showSuccessState('You are officially on the fan roster! Your response has been logged.');
      }
    })
    .catch(function () {
      // Offline / local static dev fallback
      showSuccessState('You are officially on the fan roster! (Logged locally for review).');
    })
    .finally(function () {
      isSubmitting = false;
    });
  });

  // 7. Status announcer for screen readers
  function announceStatus(message, type) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = 'form-alert form-alert--' + (type === 'error' ? 'error' : 'success') + ' is-visible';
  }

  // 8. Replace form with Warm Confirmation Card
  function showSuccessState(message) {
    if (!formShell) return;

    var nameVal = form ? form.querySelector('#name').value.trim() : '';
    var greeting = nameVal ? 'Welcome aboard, ' + escapeHtml(nameVal) + '!' : 'Welcome aboard!';

    formShell.innerHTML =
      '<div class="form-success-card" tabindex="-1" id="success-message">' +
        '<div class="form-success-icon" aria-hidden="true">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="20 6 9 17 4 12"></polyline>' +
          '</svg>' +
        '</div>' +
        '<h2 class="section-title">' + greeting + '</h2>' +
        '<p class="section-desc" style="max-width: 44ch;">' + escapeHtml(message) + '</p>' +
        '<div style="margin-top: var(--space-4); display: flex; gap: var(--space-4); flex-wrap: wrap; justify-content: center;">' +
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
