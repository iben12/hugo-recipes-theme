/**
 * Search field toggle behavior for header
 * Handles expand/collapse animation, focus management, and keyboard interactions
 */

function initializeSearchToggle() {
  const searchForm = document.querySelector(".site-search");
  const searchToggle = searchForm?.querySelector(".site-search__toggle");
  const searchInput = searchForm?.querySelector("#site-search-input");

  if (!searchForm || !searchToggle || !searchInput) {
    return;
  }

  let isOpen = false;

  function openSearch() {
    if (isOpen) return;
    isOpen = true;
    searchForm.classList.add("is-open");
    searchToggle.setAttribute("aria-expanded", "true");
    searchInput.setAttribute("aria-expanded", "true");
    searchInput.focus();
  }

  function closeSearch(restoreFocus = false) {
    if (!isOpen) return;
    isOpen = false;
    searchForm.classList.remove("is-open");
    searchToggle.setAttribute("aria-expanded", "false");
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.blur();
    if (restoreFocus) {
      searchToggle.focus();
    }
  }

  function toggleSearch() {
    if (isOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  }

  // Toggle on button click (works for both search and close icons)
  searchToggle.addEventListener("click", (event) => {
    event.preventDefault();
    toggleSearch();
  });

  // Open on input focus
  searchInput.addEventListener("focus", openSearch);

  // Close on Escape key (on input)
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch(true);
    }
  });

  // Close on Escape key globally when search is open
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeSearch(true);
    }
  });

  // Close when clicking outside
  document.addEventListener("click", (event) => {
    if (isOpen && !searchForm.contains(event.target)) {
      closeSearch();
    }
  });

  // Toggle on Enter/Space on toggle button
  searchToggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSearch();
    }
  });

  // Handle form submission
  searchForm.addEventListener("submit", (event) => {
    const query = searchInput.value.trim();
    if (!query) {
      event.preventDefault();
      closeSearch();
    }
    // Let the form submit naturally to /search/?q=<query>
  });

  // Clear input on page unload (so it doesn't survive navigation/reload)
  window.addEventListener("beforeunload", () => {
    searchInput.value = "";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSearchToggle);
} else {
  initializeSearchToggle();
}