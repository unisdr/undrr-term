// Simple keyword search for the language index page.
// Filters term cards in the project listing by name.
// A more sophisticated Fuse.js-based search can be added later.

function initSearch(lang) {
  const input = document.getElementById('search');
  if (!input) return;

  const resultsDiv = document.getElementById('search-results');
  const resultsList = document.getElementById('search-results-list');
  const projectCards = document.querySelectorAll('.term-card');

  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();

    if (!q) {
      resultsDiv.style.display = 'none';
      projectCards.forEach(c => c.style.display = '');
      return;
    }

    // For now, just filter visible project cards by name match
    projectCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
}
