/**
 * Jack Pembrook Fan Platform — Main Core Script
 * Features:
 *  - Fully accessible mobile navigation with focus trapping, Escape key closing, and focus return
 *  - High-performance lite-embed YouTube facade triggered by Space, Enter, and Click
 *  - Subtle scroll reveal animations with prefers-reduced-motion fail-safe
 * Zero external dependencies. Under 5 KB.
 */

(function () {
  'use strict';

  // --- 1. Accessible Mobile Navigation ---
  function initNavigation() {
    var toggleBtn = document.querySelector('.nav-toggle');
    var navMenu = document.querySelector('.nav-menu');

    if (!toggleBtn || !navMenu) return;

    function getFocusableElements() {
      return navMenu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    }

    function toggleNav(forceState) {
      var isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      var nextState = typeof forceState === 'boolean' ? forceState : !isExpanded;

      toggleBtn.setAttribute('aria-expanded', String(nextState));
      toggleBtn.setAttribute('aria-label', nextState ? 'Close menu' : 'Open menu');
      navMenu.classList.toggle('is-active', nextState);
    }

    // Toggle button click
    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willClose = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleNav();
      if (willClose) {
        toggleBtn.focus();
      }
    });

    // Close menu when clicking outside and return focus to toggle button
    document.addEventListener('click', function (e) {
      if (navMenu.classList.contains('is-active') && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        toggleNav(false);
        toggleBtn.focus();
      }
    });

    // Close menu when clicking any nav link within the menu
    navMenu.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link && navMenu.classList.contains('is-active')) {
        toggleNav(false);
      }
    });

    // Keyboard navigation: Escape key closes menu, Tab traps focus inside active nav
    document.addEventListener('keydown', function (e) {
      if (!navMenu.classList.contains('is-active')) return;

      // Close on Escape key and return focus to toggle button
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleNav(false);
        toggleBtn.focus();
        return;
      }

      // Focus trap within mobile menu when open
      if (e.key === 'Tab') {
        var focusables = getFocusableElements();
        if (!focusables || focusables.length === 0) return;

        var firstFocusable = focusables[0];
        var lastFocusable = focusables[focusables.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: if focus is on toggleBtn or first element, wrap to last item
          if (document.activeElement === toggleBtn) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab: if focus is on last element in menu, cycle back to toggleBtn
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            toggleBtn.focus();
          }
        }
      }
    });

    // Close menu gracefully when window resized to desktop (> 840px)
    window.addEventListener('resize', function () {
      if (window.innerWidth > 840 && navMenu.classList.contains('is-active')) {
        toggleNav(false);
      }
    });
  }

  // --- 2. Lite-Embed YouTube Facade ---
  // Zero iframes or external scripts loaded until user explicitly interacts!
  function initLiteEmbeds() {
    var embeds = document.querySelectorAll('.lite-embed');

    embeds.forEach(function (embed) {
      function activateEmbed(e) {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        var videoId = embed.getAttribute('data-video-id');
        var videoTitle = embed.getAttribute('data-title') || 'YouTube video player';

        if (!videoId || embed.classList.contains('is-loaded')) return;

        var iframe = document.createElement('iframe');
        iframe.setAttribute('src', 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0&modestbranding=1');
        iframe.setAttribute('title', videoTitle);
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        // Clear contents and insert iframe
        embed.innerHTML = '';
        embed.appendChild(iframe);
        embed.classList.add('is-loaded');

        // Transition semantics: remove button trigger attributes now that iframe is active
        embed.removeAttribute('role');
        embed.removeAttribute('tabindex');
        embed.removeAttribute('aria-label');

        iframe.focus();
      }

      // Mouse click trigger
      embed.addEventListener('click', activateEmbed);

      // Accessible keyboard activation for Space and Enter keys
      embed.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 13 || e.keyCode === 32) {
          e.preventDefault();
          activateEmbed(e);
        }
      });
    });
  }

  // --- 3. Subtle Scroll Reveal (IntersectionObserver) ---
  function initScrollReveals() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    document.documentElement.classList.add('js-ready');

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '120px 0px 60px 0px',
      threshold: 0.05
    });

    reveals.forEach(function (el) {
      // If already in or near viewport, mark visible immediately
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 80) {
        el.classList.add('is-visible');
      } else {
        observer.observe(el);
      }
    });

    // Failsafe: Ensure everything becomes visible after 800ms
    setTimeout(function () {
      reveals.forEach(function (el) {
        el.classList.add('is-visible');
      });
    }, 800);
  }

  // DOM ready initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initNavigation();
      initLiteEmbeds();
      initScrollReveals();
    });
  } else {
    initNavigation();
    initLiteEmbeds();
    initScrollReveals();
  }
})();
