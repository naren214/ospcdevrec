/**
 * Jack Pembrook Fan Platform — Main Core Script
 * Features: Accessible mobile navigation, Scroll reveal animations, Lite-embed YouTube facade
 * Zero external dependencies. Under 5 KB.
 */

(function () {
  'use strict';

  // --- 1. Accessible Mobile Navigation ---
  function initNavigation() {
    var toggleBtn = document.querySelector('.nav-toggle');
    var navMenu = document.querySelector('.nav-menu');

    if (!toggleBtn || !navMenu) return;

    function toggleNav(forceState) {
      var isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      var nextState = typeof forceState === 'boolean' ? forceState : !isExpanded;

      toggleBtn.setAttribute('aria-expanded', String(nextState));
      toggleBtn.setAttribute('aria-label', nextState ? 'Close menu' : 'Open menu');
      navMenu.classList.toggle('is-active', nextState);
    }

    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleNav();
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (navMenu.classList.contains('is-active') && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        toggleNav(false);
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu.classList.contains('is-active')) {
        toggleNav(false);
        toggleBtn.focus();
      }
    });

    // Close menu when window resized to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 840 && navMenu.classList.contains('is-active')) {
        toggleNav(false);
      }
    });
  }

  // --- 2. Lite-Embed YouTube Facade ---
  // Zero iframes or scripts loaded until user explicitly interacts!
  function initLiteEmbeds() {
    var embeds = document.querySelectorAll('.lite-embed');

    embeds.forEach(function (embed) {
      embed.addEventListener('click', function (e) {
        e.preventDefault();
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
        iframe.focus();
      });

      // Accessible keyboard activation for div[role="button"]
      embed.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          embed.click();
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
